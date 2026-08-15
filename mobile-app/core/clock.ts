/** Monotonic: an NTP correction stepping the wall clock back would hang a deadline for the size of the jump. */
export function sinceBoot(): number {
  return performance.now();
}
