import type { FontSource } from "expo-font";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

/** The single place readiness is decided: every boot gate ANDs into `ready`. */
export function useAppReady(fonts: Record<string, FontSource>): boolean {
  const [fontsLoaded, fontError] = useFonts(fonts);
  // useFonts never retries, so waiting on a failure would hold the splash for the process lifetime.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontError) {
      console.warn("Bundled fonts failed to load:", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch((error) => {
        console.warn("Failed to hide the splash screen:", error);
      });
    }
  }, [ready]);

  return ready;
}
