import { describe, expect, it } from "vitest";
import { createFanout, type Source } from "@/core/fanout";

/** Counts what a fanout does to its source, which is all the source is for. */
function countingSource() {
  const counts = { opens: 0, closes: 0 };
  const open = (): Source => {
    counts.opens++;
    return {
      remove: () => {
        counts.closes++;
      },
    };
  };
  return { counts, open };
}

describe("createFanout", () => {
  it("registers each add, even when the same function subscribes twice", () => {
    const fanout = createFanout<string>(() => ({ remove: () => {} }));
    const seen: string[] = [];
    const same = (value: string) => seen.push(value);

    const stopFirst = fanout.add(same);
    fanout.add(same);

    expect(fanout.size).toBe(2);
    stopFirst();
    fanout.emit("x");
    expect(seen).toEqual(["x"]);
  });

  it("opens the source once however many listeners subscribe", () => {
    const { counts, open } = countingSource();
    const fanout = createFanout<string>(open);

    fanout.add(() => {});
    fanout.add(() => {});

    expect(counts.opens).toBe(1);
    expect(counts.closes).toBe(0);
  });

  it("delivers to the listeners in the order they subscribed", () => {
    const fanout = createFanout<string>(() => ({ remove: () => {} }));
    const order: string[] = [];
    fanout.add(() => order.push("first"));
    fanout.add(() => order.push("second"));

    fanout.emit("x");

    expect(order).toEqual(["first", "second"]);
  });

  it("re-opens the source for a listener arriving after the last one left", () => {
    const { counts, open } = countingSource();
    const fanout = createFanout<string>(open);

    fanout.add(() => {})();
    fanout.add(() => {});

    expect(counts).toEqual({ opens: 2, closes: 1 });
  });

  it("keeps delivering to the others when a listener throws", () => {
    const fanout = createFanout<string>(() => ({ remove: () => {} }));
    const seen: string[] = [];
    fanout.add(() => {
      throw new Error("listener blew up");
    });
    fanout.add((value) => seen.push(value));

    fanout.emit("x");

    expect(seen).toEqual(["x"]);
  });

  it("closes the source once when a listener unsubscribes twice", () => {
    const { counts, open } = countingSource();
    const fanout = createFanout<string>(open);
    const stopFirst = fanout.add(() => {});
    const stopSecond = fanout.add(() => {});

    stopFirst();
    stopFirst();
    expect(counts.closes).toBe(0);

    stopSecond();
    stopSecond();
    expect(counts.closes).toBe(1);
    expect(fanout.size).toBe(0);
  });

  it("serves the listeners a round started with, and only those", () => {
    const fanout = createFanout<string>(() => ({ remove: () => {} }));
    const seen: string[] = [];
    const stopLeaver = fanout.add((value) => seen.push(`leaver:${value}`));
    fanout.add(() => {
      stopLeaver();
      fanout.add((value) => seen.push(`latecomer:${value}`));
    });

    fanout.emit("x");

    expect(seen).toEqual(["leaver:x"]);
  });

  it("swallows a source that refuses to close", () => {
    const fanout = createFanout<string>(() => ({
      remove: () => {
        throw new Error("remove blew up");
      },
    }));

    const stop = fanout.add(() => {});

    expect(() => stop()).not.toThrow();
    expect(fanout.size).toBe(0);
  });

  it("registers nothing when the source fails to open", () => {
    let failNext = true;
    const fanout = createFanout<string>(() => {
      if (failNext) throw new Error("radio is off");
      return { remove: () => {} };
    });

    expect(() => fanout.add(() => {})).toThrow("radio is off");
    expect(fanout.size).toBe(0);

    failNext = false;
    const seen: string[] = [];
    fanout.add((value) => seen.push(value));
    fanout.emit("x");
    expect(seen).toEqual(["x"]);
  });
});
