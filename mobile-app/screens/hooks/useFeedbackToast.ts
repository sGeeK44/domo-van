import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Observable } from "@/core/observable";
import { useObservable } from "@/core/react/useObservable";
import { useToast } from "@/design-system";
import { type Feedback, isFailure } from "@/domain/Feedback";

/** The outcome a domain object reports: every module the shell wraps has one. */
export type FeedbackReport = { lastFeedback: Feedback | null };

/** Any domain object that reports an outcome. */
export type FeedbackSource = Observable<FeedbackReport>;

const NOTHING_REPORTED: FeedbackReport = { lastFeedback: null };

/** How a failed write reaches the user; a success stays silent, the screen confirms its own action. */
export function useFeedbackToast(source: FeedbackSource | null): void {
  const { t } = useTranslation();
  const toast = useToast();
  const { lastFeedback } = useObservable(source, NOTHING_REPORTED);
  // Seeded with what is already reported: a mount is not a change, and a remount must not re-toast.
  const lastReportedKey = useRef(lastFeedback && dedupeKeyOf(lastFeedback));

  useEffect(() => {
    if (!lastFeedback) return;
    const reported = dedupeKeyOf(lastFeedback);
    if (reported === lastReportedKey.current) return;

    lastReportedKey.current = reported;
    if (!isFailure(lastFeedback)) return;
    toast.show(t(lastFeedback.key, lastFeedback.params));
  }, [lastFeedback, t, toast]);
}

/** A module repeating itself is one event: only a change is worth a toast. */
function dedupeKeyOf({ key, params }: Feedback): string {
  return `${key}|${params?.message ?? ""}`;
}
