import { useEffect, useState } from "react";
import type { LinkState } from "@/domain/modules/ModuleSlot";

const TICK_MS = 60_000;

/** Nothing emits while a module is offline, so its last-contact line needs its own clock. */
export function useLinkClock(link: LinkState): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (link.status === "online") return;

    setNow(Date.now());
    const ticker = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(ticker);
  }, [link.status]);

  return now;
}
