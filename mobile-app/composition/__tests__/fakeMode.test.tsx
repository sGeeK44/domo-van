// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

// The container is built when ContainerProvider is imported, so the switch has
// to be flipped before that import — hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { ContainerProvider } = await import("@/composition/ContainerProvider");
const {
  BatteryDeviceProviderV2,
  HeaterDeviceProviderV2,
  useBatteryDevice,
  useHeaterDevice,
  useWaterDevice,
  WaterDeviceProviderV2,
} = await import("@/composition/connection/useModuleDevice");
const { MultiModuleConnectionProvider, useMultiModuleConnection } =
  await import("@/composition/connection/useMultiModuleConnection");
const {
  ModuleSystemsProvider,
  useBatterySystem,
  useHeaterSystem,
  useWaterSystem,
} = await import("@/composition/ModuleSystemsProvider");
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
  const { globalStatus } = useMultiModuleConnection();
  const water = useWaterDevice();
  const heater = useHeaterDevice();
  const battery = useBatteryDevice();

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

  return (
    <dl>
      <dd data-testid="global-status">{globalStatus}</dd>
      <dd data-testid="water-connected">{String(water.isConnected)}</dd>
      <dd data-testid="heater-connected">{String(heater.isConnected)}</dd>
      <dd data-testid="battery-connected">{String(battery.isConnected)}</dd>
      <dd data-testid="clean-tank">
        {water.isConnected
          ? `${clean.percentage}% / ${clean.capacityLiters}L`
          : "-"}
      </dd>
      <dd data-testid="grey-tank">
        {water.isConnected
          ? `${grey.percentage}% / ${grey.capacityLiters}L`
          : "-"}
      </dd>
      <dd data-testid="zone-0">
        {heater.isConnected
          ? `${zone.temperatureCelsius}°C > ${zone.setpointCelsius}°C`
          : "-"}
      </dd>
      <dd data-testid="environment">
        {heater.isConnected
          ? `${environment.temperatureCelsius}°C ${environment.humidity}% ${environment.pressureHPa}hPa ${environment.exteriorTemperatureCelsius}°C`
          : "-"}
      </dd>
      <dd data-testid="battery">
        {battery.isConnected ? `${pack.percentage}% ${pack.voltage}V` : "-"}
      </dd>
    </dl>
  );
}

function renderDashboard() {
  return render(
    <ContainerProvider>
      <WaterDeviceProviderV2>
        <HeaterDeviceProviderV2>
          <BatteryDeviceProviderV2>
            <MultiModuleConnectionProvider>
              <ModuleSystemsProvider>
                <Dashboard />
              </ModuleSystemsProvider>
            </MultiModuleConnectionProvider>
          </BatteryDeviceProviderV2>
        </HeaterDeviceProviderV2>
      </WaterDeviceProviderV2>
    </ContainerProvider>,
  );
}

function shown(testId: string): string {
  return screen.getByTestId(testId).textContent ?? "";
}

async function waitForConnection(): Promise<void> {
  await waitFor(() => expect(shown("global-status")).toBe("connected"));
}

describe("the app running on the fake transport", () => {
  afterEach(cleanup);

  it("reaches connected on every module without a device in the room", async () => {
    renderDashboard();

    await waitForConnection();

    expect(shown("water-connected")).toBe("true");
    expect(shown("heater-connected")).toBe("true");
    expect(shown("battery-connected")).toBe("true");
  });

  it("fills both water tanks with the level its scenario reports", async () => {
    renderDashboard();

    await waitForConnection();

    expect(shown("clean-tank")).toBe("72% / 100L");
    expect(shown("grey-tank")).toBe("40% / 80L");
  });

  it("gives a heater zone a temperature and a setpoint", async () => {
    renderDashboard();

    await waitForConnection();

    expect(shown("zone-0")).toBe("21.5°C > 21°C");
  });

  it("reports the four indoor readings the home screen shows", async () => {
    renderDashboard();

    await waitForConnection();

    expect(shown("environment")).toBe("21.5°C 45% 1013.2hPa 12°C");
  });

  it("charges the battery gauge off the recorded BMS frames", async () => {
    renderDashboard();

    await waitForConnection();

    expect(shown("battery")).toBe("98% 13.2V");
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
