import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { BleProvider } from "@/components/BleProvider";
import { MultiModuleConnectionProvider } from "@/hooks/useMultiModuleConnection";
import {
  BatteryDeviceProviderV2,
  HeaterDeviceProviderV2,
  WaterDeviceProviderV2,
} from "@/hooks/useModuleDevice";
import { ThemeProvider, useTheme } from "@/hooks/ThemeContext";

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppContent() {
  const { colorScheme } = useTheme();

  return (
    <NavigationThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <BleProvider>
        <WaterDeviceProviderV2>
          <HeaterDeviceProviderV2>
            <BatteryDeviceProviderV2>
              <MultiModuleConnectionProvider>
                <Stack>
                  <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                  />
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
                    name="modal"
                    options={{ presentation: "modal", title: "Modal" }}
                  />
                </Stack>
              </MultiModuleConnectionProvider>
            </BatteryDeviceProviderV2>
          </HeaterDeviceProviderV2>
        </WaterDeviceProviderV2>
      </BleProvider>
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
