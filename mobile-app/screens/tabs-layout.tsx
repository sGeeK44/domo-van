import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { ModuleTabIcon } from "@/components/navigation/module-tab-icon";
import {
  dashboardRedirect,
  type ModuleTab,
} from "@/components/navigation/module-tabs";
import { useThemeColor } from "@/design-system";
import { useModuleTabs } from "@/screens/hooks/useModuleTabs";

export default function TabsLayout() {
  const themeColor = useThemeColor();
  const tabs = useModuleTabs();
  const router = useRouter();
  const redirect = dashboardRedirect(tabs, usePathname());

  useEffect(() => {
    if (redirect) router.replace(redirect);
  }, [redirect, router]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColor["primary"]["500"],
        tabBarInactiveTintColor: themeColor["neutral"]["500"],
        tabBarStyle: {
          backgroundColor: themeColor["background"]["secondary"],
          borderTopColor: themeColor["background"]["primary"],
        },
        headerShown: false,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={optionsFor(tab)} />
      ))}
    </Tabs>
  );
}

// `href: null` hides the button and keeps the route mounted, so nothing remounts on pairing.
function optionsFor(tab: ModuleTab) {
  return {
    title: tab.title,
    tabBarIcon: ({ color }: { color: string }) => (
      <ModuleTabIcon tab={tab} color={color} />
    ),
    ...(tab.visible ? {} : { href: null }),
  };
}
