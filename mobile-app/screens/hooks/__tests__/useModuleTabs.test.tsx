// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { TFunction } from "i18next";
import { useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  linkSubtitle,
  linkTone,
  reconnectAction,
} from "@/components/home/link-view";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { LinkState } from "@/domain/modules/ModuleSlot";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import type { DeviceRepository } from "@/domain/ports/DeviceRepository";
import { createI18n } from "@/i18n/createI18n";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { ContainerProvider, useContainer } = await import(
  "@/composition/ContainerProvider"
);
const { ModuleRegistryProvider, useModuleRegistry, useModuleSlot } =
  await import("@/composition/ModuleRegistryProvider");
const { WATER_MODULE } = await import("@/domain/modules/ModuleDescriptor");
const { FakeBluetooth, fakePairedDevices } = await import(
  "@/infrastructure/fake/FakeBluetooth"
);
const { useModuleTabs } = await import("@/screens/hooks/useModuleTabs");

// The container is a module singleton, so a test that unpairs leaks into the next one.
let sharedPairings: DeviceRepository | null = null;

type Radio = InstanceType<typeof FakeBluetooth>;

type Harness = {
  radio: Radio | null;
  deviceId: string | null;
  pair: (key: ModuleKey, device: DiscoveredBluetoothDevice) => Promise<void>;
  unpair: (key: ModuleKey) => Promise<void>;
  reconnect: (key: ModuleKey) => Promise<void>;
};

function TabBar({ harness }: { harness: Harness }) {
  const { t } = useTranslation();
  const tabs = useModuleTabs();
  const water = useModuleSlot("water");
  const { pair, unpair, reconnect } = useModuleRegistry();
  const container = useContainer();

  useEffect(() => {
    harness.radio = fakeRadio(container);
    sharedPairings = container.deviceRepository;
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
          .map((tab) => t(tab.titleKey))
          .join(" ")}
      </dd>
      <dd data-testid="registered">{tabs.map((tab) => tab.name).join(" ")}</dd>
      <dd data-testid="tones">
        {tabs.map((tab) => (tab.link ? linkTone(tab.link) : "-")).join(" ")}
      </dd>
      <dd data-testid="water-contact">{contactLine(water.link, t)}</dd>
      <dd data-testid="water-action">{actionLabel(water.link, t) ?? ""}</dd>
    </dl>
  );
}

function contactLine(link: LinkState, t: TFunction): string {
  const copy = linkSubtitle(link, Date.now());
  return copy ? t(copy.key, copy.params) : "";
}

function actionLabel(link: LinkState, t: TFunction): string | null {
  const action = reconnectAction(link);
  return action ? t(action.labelKey) : null;
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
    <I18nextProvider i18n={createI18n("fr")}>
      <ContainerProvider>
        <ModuleRegistryProvider>
          <TabBar harness={harness} />
        </ModuleRegistryProvider>
      </ContainerProvider>
    </I18nextProvider>,
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

  beforeEach(async () => {
    for (const [key, device] of fakePairedDevices()) {
      await sharedPairings?.setLastDevice(device, key);
    }
  });

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
