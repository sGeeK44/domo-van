import { describe, expect, it } from "vitest";
import { SerialQueue } from "@/domain/modules/SerialQueue";

function deferred() {
  let release = () => {};
  const done = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { done, release };
}

async function flushMicrotasks(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
}

describe("SerialQueue", () => {
  it("starts an idle task synchronously", () => {
    const queue = new SerialQueue();
    const steps: string[] = [];

    void queue.run(async () => {
      steps.push("ran");
    });

    expect(steps).toEqual(["ran"]);
  });

  it("holds a task back until the running one settles", async () => {
    const queue = new SerialQueue();
    const first = deferred();
    const steps: string[] = [];

    const running = queue.run(async () => {
      await first.done;
      steps.push("first");
    });
    const waiting = queue.run(async () => {
      steps.push("second");
    });

    expect(steps).toEqual([]);
    first.release();
    await Promise.all([running, waiting]);
    expect(steps).toEqual(["first", "second"]);
  });

  it("keeps running the queue after a task rejects", async () => {
    const queue = new SerialQueue();
    const failing = deferred();
    const steps: string[] = [];

    const rejected = queue.run(async () => {
      await failing.done;
      throw new Error("nope");
    });
    const waiting = queue.run(async () => {
      steps.push("second");
    });

    failing.release();
    await expect(rejected).rejects.toThrow("nope");
    await waiting;
    expect(steps).toEqual(["second"]);
  });

  it("queues a run re-entered from inside a running task", async () => {
    const queue = new SerialQueue();
    const steps: string[] = [];

    await queue.run(async () => {
      steps.push("a:start");
      void queue.run(async () => {
        steps.push("b:start");
        await Promise.resolve();
        steps.push("b:end");
      });
      await Promise.resolve();
      steps.push("a:end");
    });
    await flushMicrotasks();

    expect(steps).toEqual(["a:start", "a:end", "b:start", "b:end"]);
  });

  it("runs queued tasks in the order they were submitted", async () => {
    const queue = new SerialQueue();
    const first = deferred();
    const steps: string[] = [];

    const runs = [
      queue.run(async () => {
        await first.done;
        steps.push("first");
      }),
      queue.run(async () => {
        steps.push("second");
      }),
      queue.run(async () => {
        steps.push("third");
      }),
      queue.run(async () => {
        steps.push("fourth");
      }),
    ];

    first.release();
    await Promise.all(runs);

    expect(steps).toEqual(["first", "second", "third", "fourth"]);
  });

  it("resolves with the value the task returned", async () => {
    const queue = new SerialQueue();
    const blocked = deferred();

    const running = queue.run(async () => {
      await blocked.done;
      return "first";
    });
    const waiting = queue.run(async () => 42);

    blocked.release();

    await expect(running).resolves.toBe("first");
    await expect(waiting).resolves.toBe(42);
  });

  it("rejects and keeps the queue running when a task throws synchronously", async () => {
    const queue = new SerialQueue();
    const steps: string[] = [];

    const rejected = queue.run((): Promise<void> => {
      throw new Error("sync boom");
    });
    const waiting = queue.run(async () => {
      steps.push("second");
    });

    await expect(rejected).rejects.toThrow("sync boom");
    await waiting;
    expect(steps).toEqual(["second"]);
  });

  it("does not surface an ignored rejection as an unhandled rejection", async () => {
    const queue = new SerialQueue();
    const unhandled: unknown[] = [];
    const capture = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", capture);

    try {
      void queue.run(async () => {
        throw new Error("nobody is listening");
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    } finally {
      process.off("unhandledRejection", capture);
    }

    expect(unhandled).toEqual([]);
  });
});
