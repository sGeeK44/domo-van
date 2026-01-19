import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useColorScheme } from "react-native";

type ColorScheme = "light" | "dark";

type ThemeContextType = {
  colorScheme: ColorScheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme() ?? "dark";
  const [colorScheme, setColorScheme] = useState<ColorScheme>(systemColorScheme);

  const toggleTheme = useCallback(() => {
    setColorScheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
