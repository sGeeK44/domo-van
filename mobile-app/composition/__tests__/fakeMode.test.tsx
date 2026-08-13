// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

// The container is built when ContainerProvider is imported, so the switch has
// to be flipped before that import — hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { ContainerProvider } = await import("@/composition/ContainerProvider");
const { ModuleRegistryProvider, useModuleSlot } = await import(
  "@/composition/ModuleRegistryProvider"
);
const { useBatterySystem, useHeaterSystem, useWaterSystem } = await import(
  "@/composition/ModuleSystemsProvider"
);
const { useObservable } = await import("@/core/react/useObservable");
const { DEFAULT_BATTERY_SNAPSHOT } = await import(
  "@/domain/battery/BatteryTelemetry"
);

const NO_ENVIRONMENT = {
  temperatureCelsius: 0,
  exteriorTemperatureCelsius: 0,
  humidity: 0,
  pressureHPa: 0,
  lastMessage: null,
};

const NO_TANK = {
  capacityLiters: 0,
  heightMm: 0,
  percentage: 0,
  lastDistanceMm: null,
  lastMessage: null,
};

const NO_ZONE = {
  temperatureCelsius: 0,
  setpointCelsius: 0,
  isRunning: false,
  pidConfig: null,
  lastMessage: null,
};

/** Reads exactly what the four screens read, and shows it as they would. */
function Dashboard() {
  const water = useModuleSlot("water");
  const heater = useModuleSlot("heater");
  const battery = useModuleSlot("battery");

  const waterSystem = useWaterSystem();
  const heaterSystem = useHeaterSystem();
  const batterySystem = useBatterySystem();

  const clean = useObservable(waterSystem?.cleanTank ?? null, NO_TANK);
  const grey = useObservable(waterSystem?.greyTank ?? null, NO_TANK);
  const zone = useObservable(heaterSystem?.zones[0] ?? null, NO_ZONE);
  const environment = useObservable(
    heaterSystem?.environment ?? null,
    NO_ENVIRONMENT,
  );
  const pack = useObservable(batterySystem, DEFAULT_BATTERY_SNAPSHOT);

  const waterOnline = water.link.status === "online";
  const heaterOnline = heater.link.status === "online";
  const batteryOnline = battery.link.status === "online";

  return (
    <dl>
      <dd data-testid="water-link">{water.link.status}</dd>
      <dd data-testid="heater-link">{heater.link.status}</dd>
      <dd data-testid="battery-link">{battery.link.status}</dd>
      <dd data-testid="water-system">{waterSystem ? "live" : "none"}</dd>
      <dd data-testid="heater-system">{heaterSystem ? "live" : "none"}</dd>
      <dd data-testid="battery-system">{batterySystem ? "live" : "none"}</dd>
      <dd data-testid="clean-tank">
        {waterOnline ? `${clean.percentage}% / ${clean.capacityLiters}L` : "-"}
      </dd>
      <dd data-testid="grey-tank">
        {waterOnline ? `${grey.percentage}% / ${grey.capacityLiters}L` : "-"}
      </dd>
      <dd data-testid="zone-0">
        {heaterOnline
          ? `${zone.temperatureCelsius}°C > ${zone.setpointCelsius}°C`
          : "-"}
      </dd>
      <dd data-testid="environment">
        {heaterOnline
          ? `${environment.temperatureCelsius}°C ${environment.humidity}% ${environment.pressureHPa}hPa ${environment.exteriorTemperatureCelsius}°C`
          : "-"}
      </dd>
      <dd data-testid="battery">
        {batteryOnline ? `${pack.percentage}% ${pack.voltage}V` : "-"}
      </dd>
    </dl>
  );
}

function renderDashboard() {
  return render(
    <ContainerProvider>
      <ModuleRegistryProvider>
        <Dashboard />
      </ModuleRegistryProvider>
    </ContainerProvider>,
  );
}

function shown(testId: string): string {
  return screen.getByTestId(testId).textContent ?? "";
}

async function waitForConnection(): Promise<void> {
  await waitFor(() => {
    expect(shown("water-link")).toBe("online");
    expect(shown("heater-link")).toBe("online");
    expect(shown("battery-link")).toBe("online");
  });
}

describe("the app running on the fake transport", () => {
  afterEach(cleanup);

  it("brings every module online without a device in the room", async () => {
    renderDashboard();

    await waitForConnection();
  });

  it("gives every paired module a system of its own", async () => {
    renderDashboard();

    await waitForConnection();

    expect(shown("water-system")).toBe("live");
    expect(shown("heater-system")).toBe("live");
    expect(shown("battery-system")).toBe("live");
  });

  it("fills both water tanks with the level its scenario reports", async () => {
    renderDashboard();

    await waitForConnection();

    await waitFor(() => expect(shown("clean-tank")).toBe("72% / 100L"));
    expect(shown("grey-tank")).toBe("40% / 80L");
  });

  it("gives a heater zone a temperature and a setpoint", async () => {
    renderDashboard();

    await waitForConnection();

    await waitFor(() => expect(shown("zone-0")).toBe("21.5°C > 21°C"));
  });

  it("reports the four indoor readings the home screen shows", async () => {
    renderDashboard();

    await waitForConnection();

    await waitFor(() =>
      expect(shown("environment")).toBe("21.5°C 45% 1013.2hPa 12°C"),
    );
  });

  it("charges the battery gauge off the synthesised BMS frames", async () => {
    renderDashboard();

    await waitForConnection();

    await waitFor(() => expect(shown("battery")).toBe("98% 13.2V"));
  });

  it("leaves no screen showing its disconnected placeholder", async () => {
    renderDashboard();

    await waitForConnection();

    for (const testId of [
      "clean-tank",
      "grey-tank",
      "zone-0",
      "environment",
      "battery",
    ]) {
      expect(shown(testId)).not.toBe("-");
    }
  });
});
