import { Tabs } from "expo-router";

import { IconSymbol } from "@/design-system";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function TabLayout() {
  const themeColor = useThemeColor();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColor["primary"]["500"],
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="water/index"
        options={{
          title: "Water",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="water-drop" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
