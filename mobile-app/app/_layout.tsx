import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { AppProviders } from "@/composition/AppProviders";
import { ThemeProvider, useTheme } from "@/design-system";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const { colorScheme } = useTheme();

  return (
    <NavigationThemeProvider
      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <AppProviders>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      </AppProviders>
      <StatusBar style="auto" />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
