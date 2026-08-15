import { afterEach, describe, expect, it, vi } from "vitest";
import type { Listener, Unsubscribe } from "@/core/observable";
import { ConfirmedWrite } from "@/domain/ConfirmedWrite";
import type { Channel } from "@/domain/ports/Channel";
import type { WriteOutcome } from "@/domain/SaveOutcome";

const TIMEOUT_MS = 3_000;

/** A channel whose answers the test decides, frame by frame. */
class ScriptedChannel implements Channel {
  readonly commands: string[] = [];
  private readonly listeners = new Set<Listener<string>>();
  private refusesWrites = false;

  listen(listener: Listener<string>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(command: string): Promise<void> {
    if (this.refusesWrites) return Promise.reject(new Error("radio down"));
    this.commands.push(command);
    return Promise.resolve();
  }

  answer(frame: string): void {
    for (const listener of [...this.listeners]) listener(frame);
  }

  refuseWrites(): void {
    this.refusesWrites = true;
  }
}

class TestClock {
  private millis = 0;

  read = (): number => this.millis;

  async advance(millis: number): Promise<void> {
    this.millis += millis;
    await vi.advanceTimersByTimeAsync(millis);
  }
}

async function flushMicrotasks(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
}

function track(outcome: Promise<WriteOutcome>): {
  settled: () => WriteOutcome | null;
} {
  let landed: WriteOutcome | null = null;
  void outcome.then((it) => {
    landed = it;
  });
  return { settled: () => landed };
}

describe("ConfirmedWrite", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("settles on the OK the module answers, not on the write leaving", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, () => 0, TIMEOUT_MS);

    const outcome = writes.send("CFG:T=45");
    await flushMicrotasks();
    const pending = track(outcome);

    expect(channel.commands).toEqual(["CFG:T=45"]);
    expect(pending.settled()).toBeNull();

    channel.answer("OK");

    await expect(outcome).resolves.toEqual({ status: "applied" });
  });

  it("carries the module's own code when the write is refused", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, () => 0, TIMEOUT_MS);

    const outcome = writes.send("CFG:V=1;H=99999");
    await flushMicrotasks();
    channel.answer("ERR_RANGE");

    await expect(outcome).resolves.toEqual({
      status: "rejected",
      code: "ERR_RANGE",
    });
  });

  it("reports a timeout when the module never answers, on a fake clock", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, clock.read, TIMEOUT_MS);

    const outcome = writes.send("CFG:T=45");
    await flushMicrotasks();
    await clock.advance(TIMEOUT_MS);

    await expect(outcome).resolves.toEqual({ status: "timedOut" });
  });

  it("holds the write open while the clock says the module is not late yet", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, clock.read, TIMEOUT_MS);

    const pending = track(writes.send("CFG:T=45"));
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 2);

    expect(pending.settled()).toBeNull();
  });

  it("queues the second write and gives each its own answer", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, () => 0, TIMEOUT_MS);

    const first = writes.send("CFG:T=45");
    const second = writes.send("CFG:T=60");
    await flushMicrotasks();
    expect(channel.commands).toEqual(["CFG:T=45"]);

    channel.answer("ERR_RANGE");
    await flushMicrotasks();
    expect(channel.commands).toEqual(["CFG:T=45", "CFG:T=60"]);
    channel.answer("OK");

    await expect(first).resolves.toEqual({
      status: "rejected",
      code: "ERR_RANGE",
    });
    await expect(second).resolves.toEqual({ status: "applied" });
  });

  it("settles nothing on an ack that answers no write of ours", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, () => 0, TIMEOUT_MS);

    channel.answer("OK");
    const pending = track(writes.send("CFG:T=45"));
    await flushMicrotasks();

    expect(pending.settled()).toBeNull();
  });

  it("reports a write the radio refused as unanswered", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, () => 0, TIMEOUT_MS);
    channel.refuseWrites();

    await expect(writes.send("CFG:T=45")).resolves.toEqual({
      status: "timedOut",
    });
  });

  it("settles a write left in flight when its owner is disposed", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, () => 0, TIMEOUT_MS);

    const outcome = writes.send("CFG:T=45");
    await flushMicrotasks();
    writes.dispose();

    await expect(outcome).resolves.toEqual({ status: "timedOut" });
  });
});
