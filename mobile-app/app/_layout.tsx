import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { BleProvider } from "@/components/BleProvider";
import { ConnectedDeviceProvider } from "@/hooks/useConnectedDevice";
import { HeaterDeviceProviderV2 } from "@/hooks/useModuleDevice";
import { useColorScheme } from "react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <BleProvider>
          <ConnectedDeviceProvider>
            <HeaterDeviceProviderV2>
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
                  name="modal"
                  options={{ presentation: "modal", title: "Modal" }}
                />
              </Stack>
            </HeaterDeviceProviderV2>
          </ConnectedDeviceProvider>
        </BleProvider>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
