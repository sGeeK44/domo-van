import { describe, expect, it } from "vitest";
import {
  dashboardRedirect,
  hrefOption,
  moduleTabs,
} from "@/components/navigation/module-tabs";
import {
  ALL_MODULES,
  type ModuleDescriptor,
} from "@/domain/modules/ModuleDescriptor";
import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";

function slot(
  module: ModuleDescriptor,
  paired: boolean,
  link: LinkState = { status: "offline", lastContactAt: null },
): ModuleSlot {
  return {
    module,
    pairing: paired
      ? { id: `${module.key}-1`, name: module.displayName }
      : null,
    link,
  };
}

function freeSlots(): ModuleSlot[] {
  return ALL_MODULES.map((module) => slot(module, false));
}

function pairedSlots(): ModuleSlot[] {
  return ALL_MODULES.map((module) => slot(module, true));
}

function visibleTitles(slots: readonly ModuleSlot[]): string[] {
  return moduleTabs(slots)
    .filter((tab) => tab.visible)
    .map((tab) => tab.title);
}

describe("the tabs a module registry asks for", () => {
  it("shows the dashboard alone while no module is paired", () => {
    expect(visibleTitles(freeSlots())).toEqual(["Bord"]);
  });

  it("shows a paired module next to the dashboard", () => {
    const slots = freeSlots().map((candidate) =>
      candidate.module.key === "water"
        ? slot(candidate.module, true)
        : candidate,
    );

    expect(visibleTitles(slots)).toEqual(["Bord", "Eau"]);
  });

  it("caps the bar at the dashboard and the three modules, in catalogue order", () => {
    expect(visibleTitles(pairedSlots())).toEqual([
      "Bord",
      "Batt",
      "Eau",
      "Chauff",
    ]);
  });

  it("keeps an unpaired module's route registered, so pairing remounts nothing", () => {
    const tabs = moduleTabs(freeSlots());

    expect(tabs.map((tab) => tab.name)).toEqual([
      "index",
      ...ALL_MODULES.map((module) => module.key),
    ]);
  });

  it("hides a tab with `href: null` and never by dropping its screen", () => {
    const [dashboard, battery] = moduleTabs([slot(ALL_MODULES[0], false)]);

    expect(hrefOption(dashboard)).not.toHaveProperty("href");
    expect(hrefOption(battery)).toEqual({ href: null });
  });

  it("sends back to the dashboard the user whose open tab was just unpaired", () => {
    expect(dashboardRedirect(moduleTabs(freeSlots()), "/water")).toBe("/");
  });

  it("leaves the user where they are while their tab is still paired", () => {
    const tabs = moduleTabs(pairedSlots());

    expect(dashboardRedirect(tabs, "/water")).toBeNull();
    expect(dashboardRedirect(tabs, "/")).toBeNull();
  });

  it("carries the link state of every module, and none for the dashboard", () => {
    const online: LinkState = { status: "online", since: 1 };
    const slots = ALL_MODULES.map((module) => slot(module, true, online));

    const [dashboard, ...modules] = moduleTabs(slots);
    expect(dashboard.link).toBeNull();
    expect(modules.map((tab) => tab.link)).toEqual([online, online, online]);
  });
});
