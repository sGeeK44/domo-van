import type { WriteOutcome } from "@/domain/SaveOutcome";

/** What a module reports for the UI to show: a key and what to interpolate. Copy lives in i18n/. */
export type Feedback = { key: FeedbackKey; params?: { message: string } };

/** Plain literals, since domain/ never reaches i18n/ — yet each one must exist in the dictionary. */
export type FeedbackKey =
  | "common.feedback.saved"
  | "common.feedback.notAnswered"
  | "common.feedback.unreachable"
  | "modules.admin.failed"
  | "water.feedback.openFailed"
  | "water.feedback.closeFailed"
  | "heater.feedback.setpointFailed"
  | "heater.feedback.startFailed"
  | "heater.feedback.stopFailed"
  | "heater.feedback.pidFailed";

export const SAVED: Feedback = { key: "common.feedback.saved" };

export function ackFailure(code: string): Feedback {
  return { key: "modules.admin.failed", params: { message: code } };
}

/** A refusal comes back as an ack and reports its own code; only silence has to name itself. */
export function unansweredWrite(outcome: WriteOutcome): Feedback | null {
  if (outcome.status === "timedOut") {
    return { key: "common.feedback.notAnswered" };
  }
  if (outcome.status === "unreachable") {
    return { key: "common.feedback.unreachable" };
  }
  return null;
}

/** `SAVED` is the one outcome that is not a failure: every other key reports one. */
export function isFailure(feedback: Feedback): boolean {
  return feedback.key !== SAVED.key;
}
