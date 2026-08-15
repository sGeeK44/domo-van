import { afterEach, describe, expect, it, vi } from "vitest";
import type { Listener, Unsubscribe } from "@/core/observable";
import { CONFIG_READBACK, ConfirmedWrite } from "@/domain/ConfirmedWrite";
import type { Channel } from "@/domain/ports/Channel";
import type { WriteOutcome } from "@/domain/SaveOutcome";

const TIMEOUT_MS = 3_000;

/** A channel whose answers the test decides, frame by frame. */
class ScriptedChannel implements Channel {
  readonly commands: string[] = [];
  private readonly listeners = new Set<Listener<string>>();
  private refusesWrites = false;
  private hangsWrites = false;

  listen(listener: Listener<string>): Unsubscribe {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  send(command: string): Promise<void> {
    if (this.refusesWrites) return Promise.reject(new Error("radio down"));
    this.commands.push(command);
    if (this.hangsWrites) return new Promise<void>(() => {});
    return Promise.resolve();
  }

  answer(frame: string): void {
    for (const listener of [...this.listeners]) listener(frame);
  }

  refuseWrites(): void {
    this.refusesWrites = true;
  }

  /** The GATT operation that never comes back: the peripheral vanished mid-write. */
  hangWrites(): void {
    this.hangsWrites = true;
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

function writerOn(channel: Channel, clock: TestClock): ConfirmedWrite {
  return new ConfirmedWrite(channel, CONFIG_READBACK, clock.read, TIMEOUT_MS);
}

/** A write whose ack never comes back, and whose readback shows the module did not take it either. */
async function loseTheWrite(
  writes: ConfirmedWrite,
  channel: ScriptedChannel,
  clock: TestClock,
  reports: string,
): Promise<WriteOutcome> {
  const lost = writes.send("CFG:T=45");
  await flushMicrotasks();
  await clock.advance(TIMEOUT_MS);
  await flushMicrotasks();
  channel.answer(reports);
  return lost;
}

describe("ConfirmedWrite", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("settles on the OK the module answers, not on the write leaving", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, null, () => 0, TIMEOUT_MS);

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
    const writes = new ConfirmedWrite(channel, null, () => 0, TIMEOUT_MS);

    const outcome = writes.send("CFG:V=1;H=99999");
    await flushMicrotasks();
    channel.answer("ERR_RANGE");

    await expect(outcome).resolves.toEqual({
      status: "rejected",
      code: "ERR_RANGE",
    });
  });

  it("asks the module what it holds when no ack comes, and takes its word for applied", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = writerOn(channel, clock);

    const outcome = writes.send("CFG:T=45");
    await flushMicrotasks();
    await clock.advance(TIMEOUT_MS);
    await flushMicrotasks();
    expect(channel.commands).toEqual(["CFG:T=45", "CFG?"]);
    channel.answer("CFG:T=45");

    await expect(outcome).resolves.toEqual({ status: "applied" });
  });

  it("reports a timeout when the readback shows the module never took the write", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = writerOn(channel, clock);

    const outcome = writes.send("CFG:T=45");
    await flushMicrotasks();
    await clock.advance(TIMEOUT_MS);
    await flushMicrotasks();
    channel.answer("CFG:T=30");

    await expect(outcome).resolves.toEqual({ status: "timedOut" });
  });

  it("reports a timeout when the readback itself goes unanswered", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = writerOn(channel, clock);

    const outcome = writes.send("CFG:T=45");
    await flushMicrotasks();
    await clock.advance(TIMEOUT_MS);
    await flushMicrotasks();
    await clock.advance(TIMEOUT_MS);

    await expect(outcome).resolves.toEqual({ status: "timedOut" });
  });

  it("gives the retry after a lost ack its own answer", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = writerOn(channel, clock);
    await loseTheWrite(writes, channel, clock, "CFG:T=30");
    await flushMicrotasks();

    const retry = writes.send("CFG:T=45");
    await flushMicrotasks();
    await clock.advance(50);
    channel.answer("OK");

    await expect(retry).resolves.toEqual({ status: "applied" });
  });

  it("reports the module's refusal of a retry as a refusal, not as silence", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = writerOn(channel, clock);
    await loseTheWrite(writes, channel, clock, "CFG:T=30");
    await flushMicrotasks();

    const retry = writes.send("CFG:T=400");
    await flushMicrotasks();
    await clock.advance(50);
    channel.answer("ERR_RANGE");

    await expect(retry).resolves.toEqual({
      status: "rejected",
      code: "ERR_RANGE",
    });
  });

  it("keeps answering healthy writes after an ack was lost", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = writerOn(channel, clock);
    await loseTheWrite(writes, channel, clock, "CFG:T=30");
    await flushMicrotasks();

    const outcomes: WriteOutcome[] = [];
    for (const seconds of [50, 55, 60, 65, 70, 75]) {
      const healthy = writes.send(`CFG:T=${seconds}`);
      await flushMicrotasks();
      await clock.advance(200);
      channel.answer("OK");
      outcomes.push(await healthy);
    }

    expect(outcomes).toEqual(Array(6).fill({ status: "applied" }));
  });

  it("queues the second write and gives each its own answer", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, null, () => 0, TIMEOUT_MS);

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

  it("holds the write open while the clock says the module is not late yet", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    const writes = writerOn(channel, clock);

    const pending = track(writes.send("CFG:T=45"));
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS * 2);

    expect(pending.settled()).toBeNull();
    writes.dispose();
  });

  it("settles nothing on an ack that answers no write of ours", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, null, () => 0, TIMEOUT_MS);

    channel.answer("OK");
    const pending = track(writes.send("CFG:T=45"));
    await flushMicrotasks();

    expect(pending.settled()).toBeNull();
    writes.dispose();
  });

  it("tells a write that never left the phone from one the module ignored", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, null, () => 0, TIMEOUT_MS);
    channel.refuseWrites();

    await expect(writes.send("CFG:T=45")).resolves.toEqual({
      status: "unreachable",
    });
  });

  it("gives up on a write the radio never finishes taking", async () => {
    vi.useFakeTimers();
    const clock = new TestClock();
    const channel = new ScriptedChannel();
    channel.hangWrites();
    const writes = new ConfirmedWrite(channel, null, clock.read, TIMEOUT_MS);

    const hung = writes.send("CFG:T=45");
    await flushMicrotasks();
    await clock.advance(TIMEOUT_MS);

    await expect(hung).resolves.toEqual({ status: "timedOut" });
  });

  it("settles a write left in flight when its owner is disposed", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, null, () => 0, TIMEOUT_MS);

    const outcome = writes.send("CFG:T=45");
    await flushMicrotasks();
    writes.dispose();

    await expect(outcome).resolves.toEqual({ status: "unreachable" });
  });

  it("answers a write queued behind a dispose instead of waiting out its timeout", async () => {
    const channel = new ScriptedChannel();
    const writes = new ConfirmedWrite(channel, null, () => 0, TIMEOUT_MS);

    const inFlight = writes.send("CFG:T=45");
    const queued = writes.send("CFG:T=60");
    await flushMicrotasks();
    writes.dispose();

    await expect(inFlight).resolves.toEqual({ status: "unreachable" });
    await expect(queued).resolves.toEqual({ status: "unreachable" });
    expect(channel.commands).toEqual(["CFG:T=45"]);
  });
});
