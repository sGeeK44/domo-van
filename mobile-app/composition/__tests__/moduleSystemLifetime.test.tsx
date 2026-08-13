// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { Fragment, StrictMode, useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";

// The container is built when ContainerProvider is imported, so the switch has
// to be flipped before that import — hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { ContainerProvider, useContainer } = await import(
  "@/composition/ContainerProvider"
);
const { ModuleRegistryProvider, useModuleRegistry, useModuleSlot } =
  await import("@/composition/ModuleRegistryProvider");
const { useWaterSystem } = await import("@/composition/ModuleSystemsProvider");
const { useObservable } = await import("@/core/react/useObservable");
const { WaterSystem } = await import("@/domain/water/WaterSystem");
const { FakeBluetooth } = await import("@/infrastructure/fake/FakeBluetooth");

type Water = InstanceType<typeof WaterSystem>;
type Radio = InstanceType<typeof FakeBluetooth>;

type Harness = {
  deviceId: string | null;
  reconnect: () => Promise<void>;
  radio: Radio | null;
};

const NO_TANK = {
  capacityLiters: 0,
  heightMm: 0,
  percentage: 0,
  lastDistanceMm: null,
  lastMessage: null,
};

/** Two of these stand for two components of the same screen. */
function WaterConsumer({ testId, seen }: { testId: string; seen: Water[] }) {
  const system = useWaterSystem();
  const clean = useObservable(system?.cleanTank ?? null, NO_TANK);

  useEffect(() => {
    if (system) seen.push(system);
  }, [system, seen]);

  return <dd data-testid={testId}>{`${clean.percentage}%`}</dd>;
}

function WaterLink({ harness }: { harness: Harness }) {
  const { pairing, link } = useModuleSlot("water");
  const { reconnect } = useModuleRegistry();
  const container = useContainer();

  useEffect(() => {
    harness.deviceId = pairing?.id ?? null;
    harness.reconnect = () => reconnect("water");
  }, [harness, pairing, reconnect]);

  useEffect(() => {
    harness.radio = fakeRadio(container);
  }, [harness, container]);

  return <dd data-testid="water-link">{link.status}</dd>;
}

function fakeRadio(container: { bluetooth: unknown }): Radio {
  const { bluetooth } = container;
  if (!(bluetooth instanceof FakeBluetooth)) {
    throw new Error("this test needs the fake container");
  }
  return bluetooth;
}

function shown(testId: string): string {
  return screen.getByTestId(testId).textContent ?? "";
}

function last<T>(values: T[]): T | undefined {
  return values[values.length - 1];
}

describe("the lifetime of a module system", () => {
  afterEach(cleanup);

  it("serves the whole screen from a single instance", async () => {
    const { gauge, panel } = renderWaterScreen();

    await waitFor(() => expect(shown("water-link")).toBe("online"));

    expect(last(gauge)).toBeInstanceOf(WaterSystem);
    expect(last(gauge)).toBe(last(panel));
  });

  it("keeps that instance across a link drop and a reconnection", async () => {
    const { gauge, panel, harness } = renderWaterScreen();

    await waitFor(() => expect(shown("water-link")).toBe("online"));
    const paired = last(gauge);

    await dropLink(harness);
    expect(shown("water-link")).toBe("offline");
    expect(last(gauge)).toBe(paired);

    await act(() => harness.reconnect());
    await waitFor(() => expect(shown("water-link")).toBe("online"));

    expect(last(gauge)).toBe(paired);
    expect(last(panel)).toBe(paired);
    expect(gauge).toHaveLength(1);
  });

  it("comes online through the double mount strict mode performs", async () => {
    const { gauge, harness } = renderWaterScreen(StrictMode);

    await waitFor(() => expect(shown("water-link")).toBe("online"));

    expect(last(gauge)).toBeInstanceOf(WaterSystem);

    await dropLink(harness);
    await act(() => harness.reconnect());
    await waitFor(() => expect(shown("water-link")).toBe("online"));
  });

  it("keeps the last reading a dropped module reported", async () => {
    const { harness } = renderWaterScreen();

    await waitFor(() => expect(shown("water-gauge")).toBe("72%"));

    await dropLink(harness);

    expect(shown("water-link")).toBe("offline");
    expect(shown("water-gauge")).toBe("72%");
  });
});

function renderWaterScreen(Wrapper = Fragment) {
  const gauge: Water[] = [];
  const panel: Water[] = [];
  const harness: Harness = {
    deviceId: null,
    reconnect: () => Promise.resolve(),
    radio: null,
  };

  render(
    <Wrapper>
      <ContainerProvider>
        <ModuleRegistryProvider>
          <WaterLink harness={harness} />
          <WaterConsumer testId="water-gauge" seen={gauge} />
          <WaterConsumer testId="water-panel" seen={panel} />
        </ModuleRegistryProvider>
      </ContainerProvider>
    </Wrapper>,
  );

  return { gauge, panel, harness };
}

async function dropLink(harness: Harness): Promise<void> {
  const { radio, deviceId } = harness;
  if (!radio || !deviceId) throw new Error("the water module never paired");

  await act(async () => {
    radio.dropLink(deviceId);
  });
  await waitFor(() => expect(shown("water-link")).toBe("offline"));
}
