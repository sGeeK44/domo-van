// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DiscoveredModuleRow } from "@/components/modules";
import { ThemeProvider } from "@/design-system";
import { WATER_MODULE } from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";

function renderRow(device: DiscoveredBluetoothDevice) {
  render(
    <ThemeProvider>
      <DiscoveredModuleRow
        device={device}
        occupiedKeys={[]}
        isPairing={false}
        onPair={() => {}}
      />
    </ThemeProvider>,
  );
}

describe("a scan result", () => {
  afterEach(cleanup);

  it("names the module type its advertisement resolves to", () => {
    renderRow({
      id: "AA:BB:CC",
      name: "Cuve",
      serviceUuids: [WATER_MODULE.scanServiceUuid.toUpperCase()],
    });

    expect(screen.getByTestId("discovered-AA:BB:CC")).toBeTruthy();
    expect(screen.getByText(WATER_MODULE.displayName)).toBeTruthy();
  });

  // iOS can satisfy the scan filter and still report no service.
  it("is left out when no module type resolves", () => {
    renderRow({ id: "AA:BB:CC", name: "Cuve", serviceUuids: [] });

    expect(screen.queryByTestId("discovered-AA:BB:CC")).toBeNull();
  });
});
