/** Keys our own failures answer with — literals, since domain/ never reaches i18n/. */
export type ReportedErrorKey =
  | "common.errors.notConnected"
  | "common.errors.disposed";

/** A failure of our own making: the UI shows its key, never its message. */
export class ReportedError extends Error {
  constructor(
    readonly messageKey: ReportedErrorKey,
    message: string,
  ) {
    super(message);
  }
}
