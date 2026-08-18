import {
  FRAME_SIZE,
  findFrameHeader,
  isChecksumValid,
  type JkBmsCellInfo,
  parseCellInfo,
} from "@/domain/battery/JkBmsProtocol";

/** Ceiling on the pending bytes, so a frame that never completes cannot grow forever. */
const MAX_BUFFER_BYTES = 2048;

/**
 * Reassembles JK02 frames out of a byte stream: a 300-byte frame arrives
 * fragmented across several BLE notifications, and the BMS interleaves
 * "AT\r\n" keepalives between them.
 */
export class JkBmsFrameReader {
  private buffer: number[] = [];

  /** Appends a chunk and returns every cell-info frame it completed, in order. */
  read(chunk: Uint8Array): JkBmsCellInfo[] {
    for (const byte of chunk) {
      this.buffer.push(byte);
    }
    this.dropOverflow();

    const frames: JkBmsCellInfo[] = [];
    while (this.extractFrame(frames)) {
      // Keep going: a single chunk can complete more than one frame.
    }
    return frames;
  }

  reset(): void {
    this.buffer = [];
  }

  private extractFrame(frames: JkBmsCellInfo[]): boolean {
    const headerStart = findFrameHeader(new Uint8Array(this.buffer));
    if (headerStart === -1) {
      // No frame can start in these bytes — this eats the AT keepalives.
      this.buffer = [];
      return false;
    }
    if (headerStart > 0) {
      this.buffer = this.buffer.slice(headerStart);
    }
    if (this.buffer.length < FRAME_SIZE) {
      return false;
    }

    const frame = new Uint8Array(this.buffer.slice(0, FRAME_SIZE));
    if (!isChecksumValid(frame)) {
      // Drop the rejected header's first byte, so the next scan moves on.
      this.buffer = this.buffer.slice(1);
      return this.buffer.length > 0;
    }

    // A valid frame is consumed whole, whatever its record type.
    this.buffer = this.buffer.slice(FRAME_SIZE);
    const parsed = parseCellInfo(frame);
    if (parsed) {
      frames.push(parsed);
    }
    return this.buffer.length > 0;
  }

  private dropOverflow(): void {
    if (this.buffer.length <= MAX_BUFFER_BYTES) return;
    this.buffer = this.buffer.slice(this.buffer.length - MAX_BUFFER_BYTES);
  }
}
