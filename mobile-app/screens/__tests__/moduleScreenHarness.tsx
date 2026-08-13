import { act, render, waitFor } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { expect } from "vitest";
import {
  ContainerProvider,
  useContainer,
} from "@/composition/ContainerProvider";
import {
  ModuleRegistryProvider,
  useModuleRegistry,
  useModuleSlots,
} from "@/composition/ModuleRegistryProvider";
import { ThemeProvider } from "@/design-system";
import {
  ALL_MODULES,
  ALL_SCAN_SERVICE_UUIDS,
  type ModuleKey,
  moduleForAdvertisement,
} from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";
import type { FakeBluetooth } from "@/infrastructure/fake/FakeBluetooth";

export type ModulesHarness = {
  pair: (key: ModuleKey, device: DiscoveredBluetoothDevice) => Promise<void>;
  unpair: (key: ModuleKey) => Promise<void>;
  advertised: () => Promise<readonly DiscoveredBluetoothDevice[]>;
  stored: (key: ModuleKey) => Promise<DeviceInfo | null>;
  slots: () => readonly ModuleSlot[];
  dropLink: (deviceId: string) => void;
};

function unavailable(): never {
  throw new Error("the harness never mounted");
}

function Probe({ harness }: { harness: ModulesHarness }) {
  const { pair, unpair } = useModuleRegistry();
  const { bluetooth, deviceRepository } = useContainer();
  const slots = useModuleSlots();

  useEffect(() => {
    harness.pair = pair;
    harness.unpair = unpair;
    harness.slots = () => slots;
    harness.stored = (key) => deviceRepository.getLastDevice(key);
    harness.dropLink = (deviceId) =>
      (bluetooth as FakeBluetooth).dropLink(deviceId);
    harness.advertised = async () => {
      const found: DiscoveredBluetoothDevice[] = [];
      await bluetooth.startScan(ALL_SCAN_SERVICE_UUIDS, (device) =>
        found.push(device),
      );
      await bluetooth.stopScan();
      return found;
    };
  }, [harness, pair, unpair, slots, bluetooth, deviceRepository]);

  return null;
}

export function renderModuleScreen(screen: ReactNode): ModulesHarness {
  const harness: ModulesHarness = {
    pair: unavailable,
    unpair: unavailable,
    advertised: unavailable,
    stored: unavailable,
    slots: unavailable,
    dropLink: unavailable,
  };

  render(
    <ThemeProvider>
      <ContainerProvider>
        <ModuleRegistryProvider>
          <Probe harness={harness} />
          {screen}
        </ModuleRegistryProvider>
      </ContainerProvider>
    </ThemeProvider>,
  );

  return harness;
}

/** The container is a singleton, so a test states the pairings it needs rather than inheriting them. */
export async function pairOnly(
  harness: ModulesHarness,
  keys: readonly ModuleKey[],
): Promise<void> {
  await bootRestored(harness);
  const devices = await harness.advertised();

  await act(async () => {
    for (const module of ALL_MODULES) await harness.unpair(module.key);
    for (const key of keys) await harness.pair(key, advertising(devices, key));
  });
}

/** The registry claims the stored pairings on start, and would claim them back over a test's own. */
async function bootRestored(harness: ModulesHarness): Promise<void> {
  await waitFor(async () => {
    for (const module of ALL_MODULES) {
      const stored = await harness.stored(module.key);
      expect(pairedId(harness, module.key)).toBe(stored?.id ?? null);
    }
  });
}

function pairedId(harness: ModulesHarness, key: ModuleKey): string | null {
  const slot = harness
    .slots()
    .find((candidate) => candidate.module.key === key);
  return slot?.pairing?.id ?? null;
}

function advertising(
  devices: readonly DiscoveredBluetoothDevice[],
  key: ModuleKey,
): DiscoveredBluetoothDevice {
  const device = devices.find(
    (candidate) => moduleForAdvertisement(candidate.serviceUuids)?.key === key,
  );
  if (!device) throw new Error(`no fake device advertises "${key}"`);
  return device;
}
