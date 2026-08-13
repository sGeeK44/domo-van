// expo-router needs a native navigator, so tests resolve it to this stub.
export type RouterCall = {
  method: "push" | "replace" | "back" | "dismissTo";
  href?: string;
};

const DASHBOARD = "/(tabs)";

export const routerHistory: RouterCall[] = [];

/** The routes the root stack holds, so a test sees the screens left mounted under the visible one. */
export const routerStack: string[] = [DASHBOARD];

let openTab = "index";

export function resetNavigation(): void {
  routerHistory.length = 0;
  routerStack.splice(0, routerStack.length, DASHBOARD);
  openTab = "index";
}

/** Which tab the stack screen under test was opened from. */
export function setOpenTab(name: string): void {
  openTab = name;
}

const router = {
  push: (href: string) => {
    routerHistory.push({ method: "push", href });
    routerStack.push(href);
  },
  /** REPLACE swaps the top route for a freshly keyed one; it never pops to a route already below. */
  replace: (href: string) => {
    routerHistory.push({ method: "replace", href });
    routerStack.splice(routerStack.length - 1, 1, href);
  },
  navigate: (href: string) => {
    routerHistory.push({ method: "push", href });
    routerStack.push(href);
  },
  back: () => {
    routerHistory.push({ method: "back" });
    routerStack.pop();
  },
  dismissTo: (href: string) => {
    routerHistory.push({ method: "dismissTo", href });
    const target = routerStack.lastIndexOf(href);
    if (target === -1) routerStack.push(href);
    else routerStack.length = target + 1;
  },
};

export function useRouter() {
  return router;
}

export function useRootNavigationState() {
  return {
    index: 0,
    routes: [
      { name: "(tabs)", state: { index: 0, routes: [{ name: openTab }] } },
    ],
  };
}
