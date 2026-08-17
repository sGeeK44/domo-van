// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type SettingsFormErrors,
  useSettingsForm,
} from "@/screens/hooks/useSettingsForm";

type TankDraft = { volume: string; height: string };

const REPORTED: TankDraft = { volume: "100", height: "800" };

/** The rule T5 carries: a volume that is not a positive integer never reaches the module. */
function validate(values: TankDraft): SettingsFormErrors<TankDraft> {
  return /^[1-9]\d*$/.test(values.volume)
    ? {}
    : { volume: "common.errors.send" };
}

/** The module had the last word: what it applied or refused is newer than the draft. */
const SETTLED = true;

function mountForm(onSave = vi.fn(async () => SETTLED)) {
  const { result, rerender } = renderHook(
    ({ reported }: { reported: TankDraft }) =>
      useSettingsForm({ reported, validate, onSave }),
    { initialProps: { reported: REPORTED } },
  );

  return {
    result,
    onSave,
    reports: (reported: TankDraft) => rerender({ reported }),
  };
}

describe("the settings draft", () => {
  afterEach(cleanup);

  // Acceptance example 1, first half: an untouched form follows the module.
  it("hydrates from a frame arriving before the first keystroke", () => {
    const form = mountForm();

    form.reports({ volume: "120", height: "850" });

    expect(form.result.current.values).toEqual({
      volume: "120",
      height: "850",
    });
    expect(form.result.current.dirty).toBe(false);
  });

  // Acceptance example 1, second half: the typed value survives the telemetry.
  it("keeps the typed value when a frame arrives after the first keystroke", () => {
    const form = mountForm();

    act(() => form.result.current.set("volume", "42"));
    form.reports({ volume: "120", height: "850" });

    expect(form.result.current.values.volume).toBe("42");
    expect(form.result.current.dirty).toBe(true);
  });

  it("freezes only the form, never a single field", () => {
    const form = mountForm();

    act(() => form.result.current.set("volume", "42"));
    form.reports({ volume: "120", height: "850" });

    expect(form.result.current.values.height).toBe("800");
  });

  it("resumes hydrating once the save settles", async () => {
    const form = mountForm();

    act(() => form.result.current.set("volume", "42"));
    await act(async () => {
      await form.result.current.save();
    });
    form.reports({ volume: "120", height: "850" });

    expect(form.result.current.dirty).toBe(false);
    expect(form.result.current.values.volume).toBe("120");
  });

  // A write that threw applied nothing, so throwing away what the user typed would lose it twice.
  it("keeps the draft when the save throws, and lets the caller see the throw", async () => {
    const form = mountForm(vi.fn(async () => Promise.reject(new Error("no"))));
    let raised: unknown = null;

    act(() => form.result.current.set("volume", "42"));
    await act(async () => {
      await form.result.current.save().catch((error) => {
        raised = error;
      });
    });

    expect(raised).toBeInstanceOf(Error);
    expect(form.result.current.dirty).toBe(true);
    expect(form.result.current.values.volume).toBe("42");
    expect(form.result.current.saving).toBe(false);
  });

  it("sends what is on screen, drafted or reported", async () => {
    const form = mountForm();

    act(() => form.result.current.set("volume", "42"));
    await act(async () => {
      await form.result.current.save();
    });

    expect(form.onSave).toHaveBeenCalledWith({ volume: "42", height: "800" });
  });

  it("blocks the save on an invalid field, so nothing reaches the module", async () => {
    const form = mountForm();

    act(() => form.result.current.set("volume", "0"));
    await act(async () => {
      await form.result.current.save();
    });

    expect(form.result.current.errors.volume).toBe("common.errors.send");
    expect(form.onSave).not.toHaveBeenCalled();
  });

  // The shell disables its button, but the hook cannot assume every caller's will be.
  it("refuses a second save while the first is still in flight", async () => {
    const settles: Array<() => void> = [];
    const form = mountForm(
      vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            settles.push(() => resolve(SETTLED));
          }),
      ),
    );

    let first: Promise<void> = Promise.resolve();
    act(() => {
      first = form.result.current.save();
      void form.result.current.save();
    });

    expect(form.onSave).toHaveBeenCalledTimes(1);

    await act(async () => {
      settles[0]?.();
      await first;
    });

    // The guard lifts once the first settles, so the form is saveable again.
    await act(async () => {
      const second = form.result.current.save();
      settles[1]?.();
      await second;
    });

    expect(form.onSave).toHaveBeenCalledTimes(2);
  });

  // The fields stay editable during the ack round-trip, so typing then must not be lost either.
  it("keeps a keystroke made while the save was in flight", async () => {
    let settle = () => {};
    const form = mountForm(
      vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            settle = () => resolve(SETTLED);
          }),
      ),
    );

    act(() => form.result.current.set("volume", "42"));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = form.result.current.save();
    });
    act(() => form.result.current.set("height", "900"));

    await act(async () => {
      settle();
      await pending;
    });
    form.reports({ volume: "120", height: "850" });

    expect(form.result.current.dirty).toBe(true);
    expect(form.result.current.values).toEqual({
      volume: "42",
      height: "900",
    });
  });

  it("marks itself saving only while the write is in flight", async () => {
    let settle = () => {};
    const form = mountForm(
      vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            settle = () => resolve(SETTLED);
          }),
      ),
    );

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = form.result.current.save();
    });
    expect(form.result.current.saving).toBe(true);

    await act(async () => {
      settle();
      await pending;
    });
    expect(form.result.current.saving).toBe(false);
  });

  // A write the module never confirmed is the one the user retries: the draft has to survive it.
  it("keeps the draft when the module never had the last word", async () => {
    const form = mountForm(vi.fn(async () => !SETTLED));

    act(() => form.result.current.set("volume", "42"));
    await act(async () => {
      await form.result.current.save();
    });
    form.reports({ volume: "120", height: "850" });

    expect(form.result.current.dirty).toBe(true);
    expect(form.result.current.values.volume).toBe("42");
  });
});

describe("the fields a form paints as refused", () => {
  afterEach(cleanup);

  // Between mount and the module's first answer, every field holds a value nobody typed.
  it("paints none of them before a save has been tried", () => {
    const form = mountForm();

    act(() => form.result.current.set("volume", "0"));

    expect(form.result.current.errors).toEqual({});
  });

  it("paints them from the press that the invalid field blocked", async () => {
    const form = mountForm();

    act(() => form.result.current.set("volume", "0"));
    await act(async () => {
      await form.result.current.save();
    });

    expect(form.result.current.errors.volume).toBe("common.errors.send");
    expect(form.onSave).not.toHaveBeenCalled();
  });

  it("clears the paint as soon as the field is fixed", async () => {
    const form = mountForm();

    act(() => form.result.current.set("volume", "0"));
    await act(async () => {
      await form.result.current.save();
    });
    act(() => form.result.current.set("volume", "120"));

    expect(form.result.current.errors).toEqual({});
  });
});
