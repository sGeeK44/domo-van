// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "@/design-system/molecules/toast";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";

let show: (message: string) => void = () => {
  throw new Error("the toast provider did not render");
};

function ToastCaller() {
  show = useToast().show;
  return null;
}

function renderToast() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <ToastCaller />
      </ToastProvider>
    </ThemeProvider>,
  );
}

function elapse(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("the toast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("holds a single slot: a second message replaces the first and restarts the timer", () => {
    renderToast();

    act(() => show("A"));
    elapse(1000);
    act(() => show("B"));

    expect(screen.getAllByTestId("toast")).toHaveLength(1);
    expect(screen.getByTestId("toast").textContent).toBe("B");

    elapse(2000);
    expect(screen.getByTestId("toast").textContent).toBe("B");

    elapse(300);
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("leaves no timer behind when it unmounts before the message expires", () => {
    const { unmount } = renderToast();

    act(() => show("A"));
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
