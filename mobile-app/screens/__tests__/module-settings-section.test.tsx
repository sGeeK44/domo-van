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

const { pairOnly, renderModuleScreen, switchableLanguage } = await import(
  "./moduleScreenHarness"
);
const { ModuleSettingsSection } = await import(
  "@/screens/module-settings-section"
);
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

describe("the module rows on Réglages", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
    vi.restoreAllMocks();
  });

  it("shows edit and unpair on a paired module, and an add button on a free slot", async () => {
    const harness = renderModuleScreen(<ModuleSettingsSection />);

    await pairOnly(harness, ["water"]);

    expect(screen.getByTestId("module-edit-water")).toBeTruthy();
    expect(screen.getByTestId("unpair-water")).toBeTruthy();
    expect(screen.getByTestId("add-slot-heater")).toBeTruthy();
    expect(screen.getByTestId("add-slot-battery")).toBeTruthy();
    expect(screen.queryByTestId("unpair-heater")).toBeNull();
  });

  it("frees the slot once, when the sheet is confirmed", async () => {
    const unpair = vi.spyOn(ModuleRegistry.prototype, "unpair");
    const harness = renderModuleScreen(<ModuleSettingsSection />);
    await pairOnly(harness, ["water"]);
    unpair.mockClear();

    await openUnpairSheet("water");
    await confirmUnpair();

    await waitFor(() => {
      expect(screen.getByTestId("add-slot-water")).toBeTruthy();
    });
    expect(screen.queryByTestId("unpair-water")).toBeNull();
    expect(unpair).toHaveBeenCalledTimes(1);
    expect(unpair).toHaveBeenCalledWith("water");
  });

  it("keeps the sheet open and names the failure when storage refuses to drop the pairing", async () => {
    const escaped = watchUnhandledRejections();
    const harness = renderModuleScreen(<ModuleSettingsSection />);
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

  // Acceptance example 7 says every screen, so a failure already on screen switches too.
  it("re-reads a displayed unpairing failure in the language chosen after it", async () => {
    watchUnhandledRejections();
    const { tree, switchTo } = switchableLanguage(<ModuleSettingsSection />);
    const harness = renderModuleScreen(tree);
    await pairOnly(harness, ["water"]);
    // A native store answers with what it likes; anything but an Error falls back to the key.
    vi.spyOn(
      InMemoryDeviceRepository.prototype,
      "clearLastDevice",
    ).mockRejectedValue("SecureStore is unavailable");

    await openUnpairSheet("water");
    await confirmUnpair();
    await act(async () => {
      await flush();
    });
    expect(screen.getByText("La dissociation a échoué.")).toBeTruthy();

    await act(async () => {
      switchTo("en");
    });

    expect(screen.getByText("Unpairing failed.")).toBeTruthy();
  });

  it("keeps the paired module when the sheet is cancelled", async () => {
    const harness = renderModuleScreen(<ModuleSettingsSection />);
    await pairOnly(harness, ["heater"]);

    await openUnpairSheet("heater");
    fireEvent.click(screen.getByTestId("unpair-cancel"));

    expect(screen.getByTestId("unpair-heater")).toBeTruthy();
    expect(screen.queryByTestId("add-slot-heater")).toBeNull();
  });

  it("returns to the one mounted dashboard when the unpaired module owns the open tab", async () => {
    setOpenTab("heater");
    routerStack.push("/settings");
    const harness = renderModuleScreen(<ModuleSettingsSection />);
    await pairOnly(harness, ["heater"]);

    await openUnpairSheet("heater");
    await confirmUnpair();

    await waitFor(() => {
      expect(routerStack).toEqual(["/(tabs)"]);
    });
  });

  it("stays on the screen when another module owns the open tab", async () => {
    setOpenTab("water");
    routerStack.push("/settings");
    const harness = renderModuleScreen(<ModuleSettingsSection />);
    await pairOnly(harness, ["water", "heater"]);

    await openUnpairSheet("heater");
    await confirmUnpair();

    await waitFor(() => {
      expect(screen.getByTestId("add-slot-heater")).toBeTruthy();
    });
    expect(routerStack).toEqual(["/(tabs)", "/settings"]);
  });

  // The JK BMS is third-party hardware with no admin channel, so it has no identity to edit.
  it("offers no identity to edit on the battery row", async () => {
    const harness = renderModuleScreen(<ModuleSettingsSection />);
    await pairOnly(harness, ["battery"]);

    expect(screen.getByTestId("unpair-battery")).toBeTruthy();
    expect(screen.queryByTestId("module-edit-battery")).toBeNull();
  });

  it("sends a free slot to the Ajouter screen", async () => {
    const harness = renderModuleScreen(<ModuleSettingsSection />);
    await pairOnly(harness, []);

    fireEvent.click(screen.getByTestId("add-slot-water"));

    expect(routerHistory).toContainEqual({
      method: "push",
      href: "/add-module",
    });
  });
});
