// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  linkSubtitle,
  linkTone,
  reconnectAction,
} from "@/components/home/link-view";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";

// The container is built when ContainerProvider is imported, so the switch has
// to be flipped before that import — hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { ContainerProvider, useContainer } = await import(
  "@/composition/ContainerProvider"
);
const { ModuleRegistryProvider, useModuleRegistry, useModuleSlot } =
  await import("@/composition/ModuleRegistryProvider");
const { WATER_MODULE } = await import("@/domain/modules/ModuleDescriptor");
const { FakeBluetooth } = await import("@/infrastructure/fake/FakeBluetooth");
const { useModuleTabs } = await import("@/screens/hooks/useModuleTabs");

type Radio = InstanceType<typeof FakeBluetooth>;

type Harness = {
  radio: Radio | null;
  deviceId: string | null;
  pair: (key: ModuleKey, device: DiscoveredBluetoothDevice) => Promise<void>;
  unpair: (key: ModuleKey) => Promise<void>;
  reconnect: (key: ModuleKey) => Promise<void>;
};

function TabBar({ harness }: { harness: Harness }) {
  const tabs = useModuleTabs();
  const water = useModuleSlot("water");
  const { pair, unpair, reconnect } = useModuleRegistry();
  const container = useContainer();

  useEffect(() => {
    harness.radio = fakeRadio(container);
    harness.deviceId = water.pairing?.id ?? null;
    harness.pair = pair;
    harness.unpair = unpair;
    harness.reconnect = reconnect;
  });

  return (
    <dl>
      <dd data-testid="visible">
        {tabs
          .filter((tab) => tab.visible)
          .map((tab) => tab.title)
          .join(" ")}
      </dd>
      <dd data-testid="registered">{tabs.map((tab) => tab.name).join(" ")}</dd>
      <dd data-testid="tones">
        {tabs.map((tab) => (tab.link ? linkTone(tab.link) : "-")).join(" ")}
      </dd>
      <dd data-testid="water-contact">
        {linkSubtitle(water.link, Date.now()) ?? ""}
      </dd>
      <dd data-testid="water-action">
        {reconnectAction(water.link)?.label ?? ""}
      </dd>
    </dl>
  );
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

function renderTabBar(): Harness {
  const harness: Harness = {
    radio: null,
    deviceId: null,
    pair: async () => {},
    unpair: async () => {},
    reconnect: async () => {},
  };

  render(
    <ContainerProvider>
      <ModuleRegistryProvider>
        <TabBar harness={harness} />
      </ModuleRegistryProvider>
    </ContainerProvider>,
  );

  return harness;
}

async function advertisedWaterDevice(
  harness: Harness,
): Promise<DiscoveredBluetoothDevice> {
  const found: DiscoveredBluetoothDevice[] = [];
  await harness.radio?.startScan([WATER_MODULE.scanServiceUuid], (device) => {
    found.push(device);
  });
  const device = found[0];
  if (!device) throw new Error("no water module was advertised");
  return device;
}

async function dropWaterLink(harness: Harness): Promise<void> {
  const { radio, deviceId } = harness;
  if (!radio || !deviceId) throw new Error("the water module never paired");

  await act(async () => {
    radio.dropLink(deviceId);
  });
}

const ALL_TABS = "Bord Batt Eau Chauff";

describe("the tab bar a module registry feeds", () => {
  afterEach(cleanup);

  it("gives every stored pairing its tab and connects with no further action", async () => {
    renderTabBar();

    await waitFor(() => expect(shown("visible")).toBe(ALL_TABS));
    expect(shown("tones")).toBe("- connected connected connected");
  });

  it("comes back online on a restart, with no visit to a pairing screen", async () => {
    renderTabBar();
    await waitFor(() => expect(shown("tones")).toContain("connected"));
    cleanup();

    const restarted = renderTabBar();

    await waitFor(() =>
      expect(shown("tones")).toBe("- connected connected connected"),
    );
    expect(shown("visible")).toBe(ALL_TABS);
    expect(restarted.deviceId).toBe("fake-water");
  });

  it("turns the dot of a dropped module to its error state, keeping its tab", async () => {
    const harness = renderTabBar();
    await waitFor(() => expect(shown("visible")).toBe(ALL_TABS));

    await dropWaterLink(harness);

    expect(shown("tones")).toBe("- connected disconnected connected");
    expect(shown("visible")).toBe(ALL_TABS);
    expect(shown("water-contact")).toBe("Dernier contact à l'instant");
    expect(shown("water-action")).toBe("Reconnecter");
  });

  it("brings a dropped module back and drops the reconnection offer", async () => {
    const harness = renderTabBar();
    await waitFor(() => expect(shown("visible")).toBe(ALL_TABS));
    await dropWaterLink(harness);

    await act(() => harness.reconnect("water"));

    await waitFor(() =>
      expect(shown("tones")).toBe("- connected connected connected"),
    );
    expect(shown("water-action")).toBe("");
  });

  // Last: it leaves the shared fake container with the heater and battery unpaired.
  it("shows the dashboard alone until a module is paired", async () => {
    const harness = renderTabBar();
    await waitFor(() => expect(shown("visible")).toBe(ALL_TABS));

    await act(async () => {
      await harness.unpair("battery");
      await harness.unpair("water");
      await harness.unpair("heater");
    });
    expect(shown("visible")).toBe("Bord");
    expect(shown("registered")).toBe("index battery water heater");

    const device = await advertisedWaterDevice(harness);
    await act(() => harness.pair("water", device));

    await waitFor(() => expect(shown("visible")).toBe("Bord Eau"));
    expect(shown("tones")).toBe("- disconnected connected disconnected");
  });
});
