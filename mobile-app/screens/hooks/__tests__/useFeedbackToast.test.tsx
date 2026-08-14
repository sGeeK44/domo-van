// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createObservable, type MutableObservable } from "@/core/observable";
import { ThemeProvider, ToastProvider } from "@/design-system";
import { type Feedback, SAVED } from "@/domain/Feedback";
import { createI18n } from "@/i18n/createI18n";
import {
  type FeedbackReport,
  type FeedbackSource,
  useFeedbackToast,
} from "@/screens/hooks/useFeedbackToast";

/** Long enough for the toast to expire on its own, so a second one is visible as such. */
const AFTER_THE_TOAST = 3000;

function failure(message: string): Feedback {
  return { key: "modules.admin.failed", params: { message } };
}

function Reader({ source }: { source: FeedbackSource }) {
  useFeedbackToast(source);
  return null;
}

function renderReader(
  alreadyReported: Feedback | null = null,
): MutableObservable<FeedbackReport> {
  const source = createObservable<FeedbackReport>({
    lastFeedback: alreadyReported,
  });

  render(
    <I18nextProvider i18n={createI18n("fr")}>
      <ThemeProvider>
        <ToastProvider>
          <Reader source={source} />
        </ToastProvider>
      </ThemeProvider>
    </I18nextProvider>,
  );

  return source;
}

function report(
  source: MutableObservable<FeedbackReport>,
  lastFeedback: Feedback,
) {
  act(() => source.setValue({ lastFeedback }));
}

function elapse(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("what a module reports", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("reaches the user as the translated toast", () => {
    const source = renderReader();

    report(source, failure("ERR_CFG_RANGE"));

    expect(screen.getByTestId("toast").textContent).toBe(
      "Erreur: ERR_CFG_RANGE",
    );
  });

  // The heater ACKs every write, so a success is the common case: the screen owns that confirmation.
  it("stays quiet about a write that went through", () => {
    const source = renderReader();

    report(source, SAVED);

    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("still shows the failure that follows a success", () => {
    const source = renderReader();

    report(source, SAVED);
    report(source, failure("ERR_BUSY"));

    expect(screen.getByTestId("toast").textContent).toBe("Erreur: ERR_BUSY");
  });

  it("shows nothing again when the module repeats itself", () => {
    const source = renderReader();

    report(source, failure("ERR_CFG_RANGE"));
    elapse(AFTER_THE_TOAST);
    report(source, failure("ERR_CFG_RANGE"));

    expect(screen.queryByTestId("toast")).toBeNull();
  });

  // What a takeover does on every reconnection: it unmounts the screen and mounts it back.
  it("stays quiet about a failure reported before it mounted", () => {
    renderReader(failure("ERR_CFG_RANGE"));

    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("still shows what the module reports after such a mount", () => {
    const source = renderReader(failure("ERR_CFG_RANGE"));

    report(source, failure("ERR_BUSY"));

    expect(screen.getByTestId("toast").textContent).toBe("Erreur: ERR_BUSY");
  });

  it("shows the next report, once it differs", () => {
    const source = renderReader();

    report(source, failure("ERR_CFG_RANGE"));
    elapse(AFTER_THE_TOAST);
    report(source, failure("ERR_BUSY"));

    expect(screen.getByTestId("toast").textContent).toBe("Erreur: ERR_BUSY");
  });
});
