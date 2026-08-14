import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { AppProviders } from "@/composition/AppProviders";
import {
  BundledFonts,
  ThemeProvider,
  ToastProvider,
  useTheme,
} from "@/design-system";

export const unstable_settings = {
  anchor: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

function useAppReady() {
  const [fontsLoaded] = useFonts(BundledFonts);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return fontsLoaded;
}

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
          </Stack>
        </ToastProvider>
      </AppProviders>
      <StatusBar style="auto" />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const ready = useAppReady();

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
