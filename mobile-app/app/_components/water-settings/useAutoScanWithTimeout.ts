import { useCallback, useEffect, useRef } from "react";

type Args = {
  enabled: boolean;
  isScanning: boolean;
  startScan: () => Promise<void>;
  stopScan: () => void;
  timeoutMs: number;
};

export function useAutoScanWithTimeout({
  enabled,
  isScanning,
  startScan,
  stopScan,
  timeoutMs,
}: Args) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoStartRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      didAutoStartRef.current = false;
      clearTimer();
      return;
    }

    if (!isScanning && !didAutoStartRef.current) {
      didAutoStartRef.current = true;
      void startScan();
    }
  }, [enabled, isScanning, startScan, clearTimer]);

  // Auto-stop scan after timeout while scanning.
  useEffect(() => {
    if (!enabled || !isScanning) {
      clearTimer();
      return;
    }

    clearTimer();
    timeoutRef.current = setTimeout(() => {
      stopScan();
    }, timeoutMs);

    return () => {
      clearTimer();
    };
  }, [enabled, isScanning, stopScan, timeoutMs, clearTimer]);
}
