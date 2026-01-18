/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    primary: {
      500: "#0a7ea4",
    },
    secondary: {
      500: "#687076",
    },
    info: {
      500: "#ECEDEE",
    },
    success: {
      500: "#008000",
    },
    warning: {
      500: "#FFA500",
    },
    danger: {
      500: "#FF0000",
    },
    neutral: {
      500: "#9BA1A6",
      600: "#687076",
    },
    water: {
      clean: "#29E1E1",
      grey: "#8E7B61",
    },
    heater: {
      warm: "#FF6B35",
      hot: "#E53935",
      cold: "#42A5F5",
    },
    background: {
      primary: "#131313",
      secondary: "#282828",
    },
  },
  dark: {
    primary: {
      500: "#0a7ea4",
    },
    secondary: {
      500: "#687076",
    },
    info: {
      500: "#ECEDEE",
    },
    success: {
      500: "#008000",
    },
    warning: {
      500: "#FFA500",
    },
    danger: {
      500: "#FF0000",
    },
    neutral: {
      500: "#9BA1A6",
      600: "#687076",
    },
    water: {
      clean: "#29E1E1",
      grey: "#8E7B61",
    },
    heater: {
      warm: "#FF6B35",
      hot: "#E53935",
      cold: "#42A5F5",
    },
    background: {
      primary: "#131313",
      secondary: "#282828",
    },
  },
};

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

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
