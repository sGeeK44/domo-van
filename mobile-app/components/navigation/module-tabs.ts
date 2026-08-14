import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { TranslationKey } from "@/i18n/keys";

export type ModuleTab = {
  /** Route name under `app/(tabs)/`, which every module names after its key. */
  name: string;
  titleKey: TranslationKey;
  icon: string;
  visible: boolean;
  link: LinkState | null;
};

const DASHBOARD_TAB: ModuleTab = {
  name: "index",
  titleKey: "dashboard.tab",
  icon: "home",
  visible: true,
  link: null,
};

export const DASHBOARD_ROUTE = "/";

/** Unpairing the module whose tab is open leaves a dead route behind. */
export function dashboardRedirect(
  tabs: readonly ModuleTab[],
  pathname: string,
): typeof DASHBOARD_ROUTE | null {
  const open = tabs.find((tab) => pathname === `/${tab.name}`);
  return open && !open.visible ? DASHBOARD_ROUTE : null;
}

/** `href: null` hides the button and keeps the route registered, so nothing remounts on pairing. */
export function hrefOption(tab: ModuleTab): { href?: null } {
  return tab.visible ? {} : { href: null };
}

/** Every tab the bar registers: the dashboard, then one per module, hidden until paired. */
export function moduleTabs(slots: readonly ModuleSlot[]): readonly ModuleTab[] {
  return [
    DASHBOARD_TAB,
    ...slots.map((slot) => ({
      name: slot.module.key,
      titleKey: slot.module.tabTitleKey,
      icon: slot.module.tabIcon,
      visible: slot.pairing !== null,
      link: slot.link,
    })),
  ];
}
