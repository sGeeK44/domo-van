// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createObservable, type MutableObservable } from "@/core/observable";
import { ThemeProvider, ToastProvider } from "@/design-system";
import type { Feedback } from "@/domain/Feedback";
import { createI18n } from "@/i18n/createI18n";
import {
  type FeedbackSource,
  useFeedbackToast,
} from "@/screens/hooks/useFeedbackToast";

/** Long enough for the toast to expire on its own, so a second one is visible as such. */
const AFTER_THE_TOAST = 3000;

type Reported = { lastFeedback: Feedback | null };

function failure(message: string): Feedback {
  return { key: "modules.admin.failed", params: { message } };
}

function Reader({ source }: { source: FeedbackSource }) {
  useFeedbackToast(source);
  return null;
}

function renderReader(): MutableObservable<Reported> {
  const source = createObservable<Reported>({ lastFeedback: null });

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

function report(source: MutableObservable<Reported>, lastFeedback: Feedback) {
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

  it("shows nothing again when the module repeats itself", () => {
    const source = renderReader();

    report(source, failure("ERR_CFG_RANGE"));
    elapse(AFTER_THE_TOAST);
    report(source, failure("ERR_CFG_RANGE"));

    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("shows the next report, once it differs", () => {
    const source = renderReader();

    report(source, failure("ERR_CFG_RANGE"));
    elapse(AFTER_THE_TOAST);
    report(source, failure("ERR_BUSY"));

    expect(screen.getByTestId("toast").textContent).toBe("Erreur: ERR_BUSY");
  });
});
