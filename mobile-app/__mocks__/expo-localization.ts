// the real module reaches expo-modules-core, which has no host outside a native runtime
export type Locale = { languageCode: string | null };

let locales: Locale[] = [{ languageCode: "fr" }];

export function getLocales(): Locale[] {
  return locales;
}

export function setLocalesForTest(next: Locale[]): void {
  locales = next;
}
