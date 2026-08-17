import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
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
      <ToastProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modules" options={{ headerShown: false }} />
          <Stack.Screen name="add-module" options={{ headerShown: false }} />
          {/* One entry for the whole group: app/settings/_layout.tsx hides each form's header. */}
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          {/* Nothing reaches these three any more; T8 deletes the routes and these entries with them. */}
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
      <KeyboardProvider>
        <ThemeProvider
          initialMode={initialThemeMode}
          onModeChange={saveThemeMode}
        >
          <AppProviders
            initialLanguage={initialLanguage}
            onLanguageChange={saveLanguage}
          >
            <AppContent />
          </AppProviders>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
