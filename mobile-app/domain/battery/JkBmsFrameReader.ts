import {
  findFrameStart,
  hasCompleteFrame,
  type JkBmsData,
  parseResponse,
} from "@/domain/battery/JkBmsProtocol";

/** Offset of the 16-bit big-endian frame length, right after the start bytes. */
const LENGTH_OFFSET = 2;
/** The length field counts every byte after the two start bytes. */
const START_BYTES = 2;

/**
 * Reassembles JK BMS frames out of a byte stream: notifications arrive in
 * chunks that split frames and may carry several of them.
 */
export class JkBmsFrameReader {
  private buffer: number[] = [];

  /** Appends a chunk and returns every frame it completed, in order. */
  read(chunk: Uint8Array): JkBmsData[] {
    for (const byte of chunk) {
      this.buffer.push(byte);
    }

    const frames: JkBmsData[] = [];
    while (this.extractFrame(frames)) {
      // Keep going: a single chunk can complete more than one frame.
    }
    return frames;
  }

  reset(): void {
    this.buffer = [];
  }

  private extractFrame(frames: JkBmsData[]): boolean {
    const frameStart = findFrameStart(new Uint8Array(this.buffer));
    if (frameStart === -1) {
      this.buffer = [];
      return false;
    }
    if (frameStart > 0) {
      this.buffer = this.buffer.slice(frameStart);
    }
    if (!hasCompleteFrame(new Uint8Array(this.buffer))) {
      return false;
    }

    const length =
      (this.buffer[LENGTH_OFFSET] << 8) | this.buffer[LENGTH_OFFSET + 1];
    const frameLength = length + START_BYTES;
    const frame = new Uint8Array(this.buffer.slice(0, frameLength));
    this.buffer = this.buffer.slice(frameLength);

    const parsed = parseResponse(frame);
    if (parsed) {
      frames.push(parsed);
    }
    return this.buffer.length > 0;
  }
}
