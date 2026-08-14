import { ReportedError } from "@/domain/ReportedError";

/** Unlike NotConnectedError, no session will ever come back: a retry is pointless. */
export class TransportDisposedError extends ReportedError {
  constructor() {
    super("common.errors.disposed", "This transport has been disposed.");
    this.name = "TransportDisposedError";
  }
}
