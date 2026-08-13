// expo-router needs a native navigator, so tests resolve it to this stub and
// read the navigation a screen asked for off `routerHistory`.
export type RouterCall = { method: "push" | "replace" | "back"; href?: string };

export const routerHistory: RouterCall[] = [];

let openTab = "index";

export function resetNavigation(): void {
  routerHistory.length = 0;
  openTab = "index";
}

/** Which tab the stack screen under test was opened from. */
export function setOpenTab(name: string): void {
  openTab = name;
}

const router = {
  push: (href: string) => routerHistory.push({ method: "push", href }),
  replace: (href: string) => routerHistory.push({ method: "replace", href }),
  navigate: (href: string) => routerHistory.push({ method: "push", href }),
  back: () => routerHistory.push({ method: "back" }),
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
