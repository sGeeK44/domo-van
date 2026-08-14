// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { default: ModulesScreen } = await import("@/screens/modules-screen");
const { ModuleRegistry } = await import("@/domain/modules/ModuleRegistry");
const { InMemoryDeviceRepository } = await import(
  "@/infrastructure/fake/InMemoryDeviceRepository"
);
const { resetNavigation, routerHistory, routerStack, setOpenTab } =
  await import("@/__mocks__/expo-router");

/** Node only reports a rejection as unhandled once the current macrotask has drained. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function watchUnhandledRejections(): readonly unknown[] {
  const escaped: unknown[] = [];
  const collect = (reason: unknown) => escaped.push(reason);
  process.on("unhandledRejection", collect);
  onTestFinished(() => {
    process.off("unhandledRejection", collect);
  });
  return escaped;
}

async function openUnpairSheet(key: string): Promise<void> {
  fireEvent.click(screen.getByTestId(`unpair-${key}`));
  await screen.findByTestId("unpair-confirm");
}

async function confirmUnpair(): Promise<void> {
  await act(async () => {
    fireEvent.click(screen.getByTestId("unpair-confirm"));
  });
}

describe("the Modules screen", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  it("shows one row per paired module and a dashed placeholder per free slot", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);

    await pairOnly(harness, ["water"]);

    expect(screen.getByTestId("module-slot-water")).toBeTruthy();
    expect(screen.getByTestId("free-slot-heater")).toBeTruthy();
    expect(screen.getByTestId("free-slot-battery")).toBeTruthy();
    expect(screen.queryByTestId("module-slot-heater")).toBeNull();
  });

  it("offers the dev gauge gallery, the only way to reach it on a device", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["water"]);

    fireEvent.click(screen.getByTestId("gauge-gallery-link"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/gauge-gallery",
    });
  });

  it("frees the slot once, when the sheet is confirmed", async () => {
    const unpair = vi.spyOn(ModuleRegistry.prototype, "unpair");
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["water"]);
    unpair.mockClear();

    await openUnpairSheet("water");
    await confirmUnpair();

    await waitFor(() => {
      expect(screen.getByTestId("free-slot-water")).toBeTruthy();
    });
    expect(screen.queryByTestId("module-slot-water")).toBeNull();
    expect(unpair).toHaveBeenCalledTimes(1);
    expect(unpair).toHaveBeenCalledWith("water");
  });

  it("keeps the sheet open and names the failure when storage refuses to drop the pairing", async () => {
    const escaped = watchUnhandledRejections();
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["water"]);
    vi.spyOn(
      InMemoryDeviceRepository.prototype,
      "clearLastDevice",
    ).mockRejectedValue(new Error("Trousseau inaccessible."));

    await openUnpairSheet("water");
    await confirmUnpair();
    await act(async () => {
      await flush();
    });

    expect(screen.getByText("Trousseau inaccessible.")).toBeTruthy();
    expect(screen.getByTestId("unpair-confirm")).toBeTruthy();
    expect(escaped).toEqual([]);
  });

  it("keeps the paired module when the sheet is cancelled", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["heater"]);

    await openUnpairSheet("heater");
    fireEvent.click(screen.getByTestId("unpair-cancel"));

    expect(screen.getByTestId("module-slot-heater")).toBeTruthy();
    expect(screen.queryByTestId("free-slot-heater")).toBeNull();
  });

  it("returns to the one mounted dashboard when the unpaired module owns the open tab", async () => {
    setOpenTab("heater");
    routerStack.push("/modules");
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["heater"]);

    await openUnpairSheet("heater");
    await confirmUnpair();

    await waitFor(() => {
      expect(routerStack).toEqual(["/(tabs)"]);
    });
  });

  it("stays on the screen when another module owns the open tab", async () => {
    setOpenTab("water");
    routerStack.push("/modules");
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["water", "heater"]);

    await openUnpairSheet("heater");
    await confirmUnpair();

    await waitFor(() => {
      expect(screen.getByTestId("free-slot-heater")).toBeTruthy();
    });
    expect(routerStack).toEqual(["/(tabs)", "/modules"]);
  });

  it("opens the module's own settings from its row", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, ["water"]);

    fireEvent.click(screen.getByTestId("module-settings-water"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/water-settings",
    });
  });

  it("sends a free slot to the Ajouter screen", async () => {
    const harness = renderModuleScreen(<ModulesScreen />);
    await pairOnly(harness, []);

    fireEvent.click(screen.getByTestId("free-slot-water"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/add-module",
    });
  });
});
