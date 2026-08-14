import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

type ColorScheme = "light" | "dark";

export type ThemeMode = "auto" | ColorScheme;

type ThemeContextType = {
  colorScheme: ColorScheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
  /** Resolved before the first paint, so no frame is painted in a mode the user replaced. */
  initialMode?: ThemeMode;
  /** Where the mode is persisted — the design system knows nothing of the store. */
  onModeChange?: (mode: ThemeMode) => void;
};

export function ThemeProvider({
  children,
  initialMode = "auto",
  onModeChange,
}: ThemeProviderProps) {
  // Read on every render, never copied into state: that is what makes Auto live.
  const systemColorScheme = useColorScheme();
  const [themeMode, setStoredMode] = useState<ThemeMode>(initialMode);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setStoredMode(mode);
      onModeChange?.(mode);
    },
    [onModeChange],
  );

  const value = useMemo(
    () => ({
      colorScheme:
        themeMode === "auto" ? (systemColorScheme ?? "dark") : themeMode,
      themeMode,
      setThemeMode,
    }),
    [themeMode, systemColorScheme, setThemeMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
