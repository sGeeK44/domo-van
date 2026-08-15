// the real module reaches expo-modules-core, which has no host outside a native runtime
export type ExpoConfig = { version?: string };

let expoConfig: ExpoConfig | null = { version: "1.4.0" };

export function setExpoConfigForTest(next: ExpoConfig | null): void {
  expoConfig = next;
}

export default {
  get expoConfig(): ExpoConfig | null {
    return expoConfig;
  },
};
