// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it } from "vitest";
import { DiscoveredModuleRow } from "@/components/modules";
import { ThemeProvider } from "@/design-system";
import { WATER_MODULE } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";
import { createI18n } from "@/i18n/createI18n";
import type { Language } from "@/i18n/language";

function renderRow(
  device: DiscoveredBluetoothDevice,
  slots: readonly ModuleSlot[] = [],
  language: Language = "fr",
) {
  render(
    <I18nextProvider i18n={createI18n(language)}>
      <ThemeProvider>
        <DiscoveredModuleRow
          device={device}
          slots={slots}
          isPairing={false}
          onPair={() => {}}
        />
      </ThemeProvider>
    </I18nextProvider>,
  );
}

function waterSlot(pairing: DeviceInfo | null): ModuleSlot {
  return {
    module: WATER_MODULE,
    pairing,
    link: { status: "offline", lastContactAt: null },
  };
}

function waterDevice(id: string): DiscoveredBluetoothDevice {
  return {
    id,
    name: "Cuve",
    serviceUuids: [WATER_MODULE.scanServiceUuid.toUpperCase()],
  };
}

describe("a scan result", () => {
  afterEach(cleanup);

  it("names the module type its advertisement resolves to", () => {
    renderRow(waterDevice("AA:BB:CC"));

    expect(screen.getByTestId("discovered-AA:BB:CC")).toBeTruthy();
    expect(screen.getByText("Module d'eau")).toBeTruthy();
  });

  // iOS can satisfy the scan filter and still report no service.
  it("is left out when no module type resolves", () => {
    renderRow({ id: "AA:BB:CC", name: "Cuve", serviceUuids: [] });

    expect(screen.queryByTestId("discovered-AA:BB:CC")).toBeNull();
  });

  it("reads as already paired when it is the device holding the slot", () => {
    renderRow(waterDevice("AA:BB:CC"), [
      waterSlot({ id: "AA:BB:CC", name: "Cuve" }),
    ]);

    expect(screen.getByText("Déjà appairé")).toBeTruthy();
    expect(screen.queryByTestId("pair-AA:BB:CC")).toBeNull();
  });

  it("reads as a taken slot when another device holds it", () => {
    renderRow(waterDevice("DD:EE:FF"), [
      waterSlot({ id: "AA:BB:CC", name: "Cuve" }),
    ]);

    expect(screen.getByText("Emplacement occupé")).toBeTruthy();
    expect(screen.queryByTestId("pair-DD:EE:FF")).toBeNull();
  });

  it("stays pairable while its slot is free", () => {
    renderRow(waterDevice("AA:BB:CC"), [waterSlot(null)]);

    expect(screen.getByTestId("pair-AA:BB:CC")).toBeTruthy();
  });

  it("reads in English once the device locale says so", () => {
    renderRow(
      waterDevice("AA:BB:CC"),
      [waterSlot({ id: "AA:BB:CC", name: "Cuve" })],
      "en",
    );

    expect(screen.getByText("Water module")).toBeTruthy();
    expect(screen.getByText("Already paired")).toBeTruthy();
  });
});
