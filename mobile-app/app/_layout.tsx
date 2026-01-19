import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useColorScheme } from "react-native";
import { BleProvider } from "@/components/BleProvider";
import { MultiModuleConnectionProvider } from "@/hooks/useMultiModuleConnection";
import {
  HeaterDeviceProviderV2,
  WaterDeviceProviderV2,
} from "@/hooks/useModuleDevice";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <BleProvider>
          <WaterDeviceProviderV2>
            <HeaterDeviceProviderV2>
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
                    name="modal"
                    options={{ presentation: "modal", title: "Modal" }}
                  />
                </Stack>
              </MultiModuleConnectionProvider>
            </HeaterDeviceProviderV2>
          </WaterDeviceProviderV2>
        </BleProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
