import type { TextStyle } from "react-native";

export type ThemeName = "light" | "dark";

type DomainColors = {
  battery: string;
  cleanWater: string;
  greyWater: string;
  heat: string;
};

export type Palette = {
  screen: string;
  surface: string;
  sheet: string;
  chip: string;
  inset: string;
  off: string;
  dash: string;
  tabBar: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  inverse: string;
  onInverse: string;
  danger: string;
  success: string;
  hatchBase: string;
  hatchStripe: string;
  onFill: string;
  onFillMuted: string;
  onFillSurface: string;
  fill: DomainColors;
  line: DomainColors;
};

export const Colors: Record<ThemeName, Palette> = {
  light: {
    screen: "#F2F1EE",
    surface: "#FFFFFF",
    sheet: "#FFFFFF",
    chip: "#FFFFFF",
    inset: "#F2F1EE",
    off: "#E4E2DC",
    dash: "#C3C0B8",
    tabBar: "#E7E5E0",
    border: "rgba(0, 0, 0, 0.14)",
    text: "#101214",
    textSecondary: "#3F4448",
    textMuted: "#5A6167",
    inverse: "#101214",
    onInverse: "#FFFFFF",
    danger: "#C0271B",
    success: "#15803D",
    hatchBase: "#F7F6F3",
    hatchStripe: "#EBE9E4",
    onFill: "#101214",
    onFillMuted: "#3F4448",
    onFillSurface: "rgba(0, 0, 0, 0.12)",
    fill: {
      battery: "#9FE0B8",
      cleanWater: "#9BDCDC",
      greyWater: "#DCCDB2",
      heat: "#F0C79E",
    },
    line: {
      battery: "#0F7A36",
      cleanWater: "#0A6A6A",
      greyWater: "#6E5F49",
      heat: "#8A3F14",
    },
  },
  dark: {
    screen: "#101214",
    surface: "#1A1E21",
    sheet: "#1A1E21",
    chip: "#1E2226",
    inset: "#101214",
    off: "#23292E",
    dash: "#3A4045",
    tabBar: "#0B0D0E",
    border: "rgba(255, 255, 255, 0.16)",
    text: "#FFFFFF",
    textSecondary: "#DDE2E5",
    textMuted: "#9AA1A7",
    inverse: "#FFFFFF",
    onInverse: "#101214",
    danger: "#EF4444",
    success: "#22C55E",
    hatchBase: "#191D20",
    hatchStripe: "#212629",
    onFill: "#FFFFFF",
    onFillMuted: "#FFFFFF",
    onFillSurface: "rgba(0, 0, 0, 0.35)",
    fill: {
      battery: "#1E7A45",
      cleanWater: "#177E7E",
      greyWater: "#5C503F",
      heat: "#8A3F14",
    },
    line: {
      battery: "#4DE08A",
      cleanWater: "#5BE0E0",
      greyWater: "#A8926F",
      heat: "#FFB27A",
    },
  },
};

export const FontFamilies = [
  "Archivo_400Regular",
  "Archivo_500Medium",
  // Named by no text style yet: reserved for the typography migration (#5/#6).
  "Archivo_600SemiBold",
  "Archivo_700Bold",
  "Archivo_800ExtraBold",
  "Archivo_900Black",
  "SpaceMono_400Regular",
  "SpaceMono_700Bold",
] as const;

export type FontFamily = (typeof FontFamilies)[number];

/** Weights are reached through the family name: Android does not synthesise them for custom faces. */
export const TextStyles = {
  screenTitle: {
    fontFamily: "Archivo_900Black",
    fontSize: 26,
    lineHeight: 26,
    letterSpacing: -0.6,
  },
  sectionLabel: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 1.44,
  },
  cardLabel: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 13,
    lineHeight: 13,
    letterSpacing: 1.56,
  },
  rowTitle: {
    fontFamily: "Archivo_700Bold",
    fontSize: 16,
    lineHeight: 16,
    letterSpacing: 0,
  },
  body: {
    fontFamily: "Archivo_500Medium",
    fontSize: 17,
    lineHeight: 24.6,
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: "Archivo_400Regular",
    fontSize: 15,
    lineHeight: 22.5,
    letterSpacing: 0,
  },
  button: {
    fontFamily: "Archivo_900Black",
    fontSize: 17,
    lineHeight: 17,
    letterSpacing: 0,
  },
  buttonSmall: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0.72,
  },
  buttonMedium: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0.84,
  },
  metricSmall: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 24,
    lineHeight: 24,
    letterSpacing: 0,
  },
  metric: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -1.2,
  },
  metricMedium: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 40,
    lineHeight: 36,
    letterSpacing: -1.5,
  },
  metricLarge: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 64,
    lineHeight: 57.6,
    letterSpacing: -3,
  },
  metricHuge: {
    fontFamily: "Archivo_800ExtraBold",
    fontSize: 72,
    lineHeight: 62,
    letterSpacing: -3.5,
  },
  toast: {
    fontFamily: "Archivo_700Bold",
    fontSize: 13,
    lineHeight: 16.9,
    letterSpacing: 0,
  },
  mono: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0,
  },
  monoLabel: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 11,
    lineHeight: 11,
    letterSpacing: 1.1,
  },
  monoSmall: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 12,
    lineHeight: 14.4,
    letterSpacing: 0,
  },
  monoStrong: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 14,
    lineHeight: 14,
    letterSpacing: 0,
  },
  monoValue: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0,
  },
} as const satisfies Record<string, TextStyle & { fontFamily: FontFamily }>;

export type TextStyleName = keyof typeof TextStyles;

/** The unit is a smaller span inside the metric it follows. */
export const MetricUnitSize = {
  metric: 19,
  metricLarge: 30,
  metricHuge: 34,
} as const satisfies Partial<Record<TextStyleName, number>>;

export const FontSize = {
  xxs: 10,
  xs: 12,
  s: 14,
  m: 16,
  l: 18,
  xl: 20,
  xxl: 22,
  xxxl: 24,
} as const;

export const FontWeight = {
  thin: 100,
  extraLight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
  extraBold: 800,
} as const;

export const Spacing = {
  xxs: 4,
  xs: 6,
  s: 8,
  m: 10,
  l: 12,
  xl: 14,
  xxl: 16,
  gutter: 18,
  xxxl: 20,
  block: 24,
} as const;

export const BorderRadius = {
  xxs: 4,
  xs: 7,
  s: 12,
  m: 15,
  l: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  pill: 999,
} as const;

/** Gauge transition durations, in milliseconds. */
export const Motion = {
  fill: 500,
  marker: 300,
  drain: 1000,
} as const;

export const Opacity = {
  full: 1,
  high: 0.9,
  medium: 0.85,
  low: 0.75,
  subtle: 0.6,
  faint: 0.45,
  ghost: 0.2,
  dim: 0.18,
  muted: 0.12,
  overlay: 0.08,
  hint: 0.06,
} as const;
