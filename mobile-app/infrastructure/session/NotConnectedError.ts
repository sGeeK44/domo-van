import { ReportedError } from "@/domain/ReportedError";

/** Raised by a persistent transport asked to write while no session is bound. */
export class NotConnectedError extends ReportedError {
  constructor() {
    super(
      "common.errors.notConnected",
      "No BLE session is bound to this transport.",
    );
    this.name = "NotConnectedError";
  }
}
