import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { ModuleTabIcon } from "@/components/navigation/module-tab-icon";
import {
  dashboardRedirect,
  hrefOption,
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
        tabBarActiveTintColor: themeColor.text,
        tabBarInactiveTintColor: themeColor.textMuted,
        tabBarStyle: {
          backgroundColor: themeColor.tabBar,
          borderTopColor: themeColor.border,
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

function optionsFor(tab: ModuleTab) {
  return {
    title: tab.title,
    tabBarIcon: ({ color }: { color: string }) => (
      <ModuleTabIcon tab={tab} color={color} />
    ),
    ...hrefOption(tab),
  };
}
