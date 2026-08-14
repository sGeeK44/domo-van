/** What a module reports for the UI to show: a key and what to interpolate. Copy lives in i18n/. */
export type Feedback = { key: FeedbackKey; params?: { message: string } };

/** Plain literals, since domain/ never reaches i18n/ — yet each one must exist in the dictionary. */
export type FeedbackKey =
  | "common.feedback.saved"
  | "modules.admin.failed"
  | "water.feedback.autoCloseFailed"
  | "heater.feedback.setpointFailed"
  | "heater.feedback.startFailed"
  | "heater.feedback.stopFailed"
  | "heater.feedback.pidFailed";

export const SAVED: Feedback = { key: "common.feedback.saved" };

export function ackFailure(code: string): Feedback {
  return { key: "modules.admin.failed", params: { message: code } };
}
