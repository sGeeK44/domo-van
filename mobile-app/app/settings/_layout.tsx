import { Stack } from "expo-router";

// No initialRouteName: it would seat Réglages under every form, and back would land there
// instead of on the tab the user opened the form from.
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
