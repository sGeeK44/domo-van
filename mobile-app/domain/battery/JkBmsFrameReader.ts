import {
  declaredFrameLength,
  findFrameStart,
  type JkBmsData,
  MIN_FRAME_SIZE,
  parseResponse,
} from "@/domain/battery/JkBmsProtocol";

/** The length field counts every byte after the two start bytes. */
const START_BYTES = 2;
/** A read-all reply of a 32-cell pack stays well under this. */
const MAX_FRAME_BYTES = 1024;
/** Ceiling on the pending bytes, so a frame that never completes cannot grow forever. */
const MAX_BUFFER_BYTES = 2 * MAX_FRAME_BYTES;

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
    this.dropOverflow();

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

    const frameLength = declaredFrameLength(new Uint8Array(this.buffer));
    if (frameLength === null) {
      return false;
    }
    if (frameLength < MIN_FRAME_SIZE || frameLength > MAX_FRAME_BYTES) {
      return this.resynchronise();
    }
    if (this.buffer.length < frameLength) {
      return false;
    }

    const frame = new Uint8Array(this.buffer.slice(0, frameLength));
    const parsed = parseResponse(frame);
    if (!parsed) {
      return this.resynchronise();
    }

    this.buffer = this.buffer.slice(frameLength);
    frames.push(parsed);
    return this.buffer.length > 0;
  }

  /** Drops the rejected start marker, so the next scan picks the following one. */
  private resynchronise(): boolean {
    this.buffer = this.buffer.slice(START_BYTES);
    return this.buffer.length > 0;
  }

  private dropOverflow(): void {
    if (this.buffer.length <= MAX_BUFFER_BYTES) return;
    this.buffer = this.buffer.slice(this.buffer.length - MAX_BUFFER_BYTES);
  }
}
