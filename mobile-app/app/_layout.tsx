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

function AppContent() {
  const { colorScheme } = useTheme();

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <AppProviders>
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
            <Stack.Screen
              name="gauge-gallery"
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
  const { ready, initialThemeMode, saveThemeMode } = useAppReady(
    BundledFonts,
    appContainer.preferences,
  );

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        initialMode={initialThemeMode}
        onModeChange={saveThemeMode}
      >
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
