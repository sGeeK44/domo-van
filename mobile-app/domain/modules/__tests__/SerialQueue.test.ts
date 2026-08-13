import { describe, expect, it } from "vitest";
import { SerialQueue } from "@/domain/modules/SerialQueue";

function deferred() {
  let release = () => {};
  const done = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { done, release };
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
});
