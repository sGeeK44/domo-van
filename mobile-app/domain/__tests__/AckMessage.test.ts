import { describe, expect, it } from "vitest";
import { parseAckMessage } from "@/domain/AckMessage";

describe("parseAckMessage", () => {
  it("reads a positive acknowledgement", () => {
    expect(parseAckMessage("OK")).toEqual({ type: "ok" });
  });

  it("ignores the whitespace around the frame", () => {
    expect(parseAckMessage(" OK ")).toEqual({ type: "ok" });
  });

  it("keeps the reason of an error acknowledgement", () => {
    const ack = parseAckMessage("ERR_BAD_PIN");

    expect(ack).toEqual({ type: "error", code: "ERR_BAD_PIN" });
  });

  it("returns null on garbage", () => {
    expect(parseAckMessage("COUNTDOWN:12")).toBeNull();
  });
});
