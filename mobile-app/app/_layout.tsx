import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { AppProviders } from "@/composition/AppProviders";
import { appContainer } from "@/composition/appContainer";
import type { LanguageProviderProps } from "@/composition/LanguageProvider";
import { useAppReady } from "@/composition/useAppReady";
import {
  BundledFonts,
  ThemeProvider,
  ToastProvider,
  useTheme,
} from "@/design-system";

export const unstable_settings = {
  anchor: "(tabs)",
};

SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn("Failed to hold the splash screen:", error);
});

type LanguagePreference = Omit<LanguageProviderProps, "children">;

function AppContent(language: LanguagePreference) {
  const { colorScheme } = useTheme();

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <AppProviders {...language}>
        <ToastProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modules" options={{ headerShown: false }} />
            <Stack.Screen name="add-module" options={{ headerShown: false }} />
            <Stack.Screen
              name="water-settings"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="heater-settings"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="battery-settings"
              options={{ headerShown: false }}
            />
          </Stack>
        </ToastProvider>
      </AppProviders>
      <StatusBar style="auto" />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const {
    ready,
    initialThemeMode,
    saveThemeMode,
    initialLanguage,
    saveLanguage,
  } = useAppReady(BundledFonts, appContainer.preferences);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        initialMode={initialThemeMode}
        onModeChange={saveThemeMode}
      >
        <AppContent
          initialLanguage={initialLanguage}
          onLanguageChange={saveLanguage}
        />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
