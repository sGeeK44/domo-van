import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Observable } from "@/core/observable";
import { useObservable } from "@/core/react/useObservable";
import { useToast } from "@/design-system";
import type { Feedback } from "@/domain/Feedback";

/** Any domain object that reports an outcome: every module the shell wraps has one. */
export type FeedbackSource = Observable<{ lastFeedback: Feedback | null }>;

const NOTHING_REPORTED: { lastFeedback: Feedback | null } = {
  lastFeedback: null,
};

/** How a failed write reaches the user; a screen fires its own toast for the action it sent. */
export function useFeedbackToast(source: FeedbackSource | null): void {
  const { t } = useTranslation();
  const toast = useToast();
  const { lastFeedback } = useObservable(source, NOTHING_REPORTED);
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (!lastFeedback) return;
    const reported = signatureOf(lastFeedback);
    if (reported === shown.current) return;

    shown.current = reported;
    toast.show(t(lastFeedback.key, lastFeedback.params));
  }, [lastFeedback, t, toast]);
}

/** A module repeating itself is one event: only a change is worth a toast. */
function signatureOf({ key, params }: Feedback): string {
  return `${key}|${params?.message ?? ""}`;
}
