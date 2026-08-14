import { act, render, waitFor } from "@testing-library/react";
import { type ReactNode, useEffect } from "react";
import { I18nextProvider } from "react-i18next";
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
import { createI18n } from "@/i18n/createI18n";
import type { FakeBluetooth } from "@/infrastructure/fake/FakeBluetooth";
import type { FakeModuleTransport } from "@/infrastructure/fake/FakeModuleTransport";
import type { FakeTransportFactory } from "@/infrastructure/fake/FakeTransportFactory";

export type ModulesHarness = {
  pair: (key: ModuleKey, device: DiscoveredBluetoothDevice) => Promise<void>;
  unpair: (key: ModuleKey) => Promise<void>;
  advertised: () => Promise<readonly DiscoveredBluetoothDevice[]>;
  stored: (key: ModuleKey) => Promise<DeviceInfo | null>;
  slots: () => readonly ModuleSlot[];
  dropLink: (deviceId: string) => void;
  forgetFirmware: () => void;
  /** Pushes a frame from a module's firmware, the way an unsolicited one arrives. */
  firmwareFrame: (key: ModuleKey, channelId: string, frame: string) => void;
};

function unavailable(): never {
  throw new Error("the harness never mounted");
}

function Probe({ harness }: { harness: ModulesHarness }) {
  const { pair, unpair } = useModuleRegistry();
  const { bluetooth, deviceRepository, transports } = useContainer();
  const slots = useModuleSlots();

  useEffect(() => {
    harness.pair = pair;
    harness.unpair = unpair;
    harness.slots = () => slots;
    harness.stored = (key) => deviceRepository.getLastDevice(key);
    harness.dropLink = (deviceId) =>
      (bluetooth as FakeBluetooth).dropLink(deviceId);
    harness.forgetFirmware = () =>
      (transports as FakeTransportFactory).forgetAll();
    harness.firmwareFrame = (key, channelId, frame) =>
      firmwareOf(slots, transports as FakeTransportFactory, key)
        .channel(channelId)
        .emit(frame);
    harness.advertised = async () => {
      const found: DiscoveredBluetoothDevice[] = [];
      await bluetooth.startScan(ALL_SCAN_SERVICE_UUIDS, (device) =>
        found.push(device),
      );
      await bluetooth.stopScan();
      return found;
    };
  }, [harness, pair, unpair, slots, bluetooth, deviceRepository, transports]);

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
    forgetFirmware: unavailable,
    firmwareFrame: unavailable,
  };

  render(
    <I18nextProvider i18n={createI18n("fr")}>
      <ThemeProvider>
        <ContainerProvider>
          <ModuleRegistryProvider>
            <Probe harness={harness} />
            {screen}
          </ModuleRegistryProvider>
        </ContainerProvider>
      </ThemeProvider>
    </I18nextProvider>,
  );

  return harness;
}

/**
 * The container is a singleton, so a test states the pairings it needs rather than
 * inheriting them — and meets a firmware that kept nothing an earlier test wrote.
 */
export async function pairOnly(
  harness: ModulesHarness,
  keys: readonly ModuleKey[],
): Promise<void> {
  await bootRestored(harness);
  const devices = await harness.advertised();

  await act(async () => {
    for (const module of ALL_MODULES) await harness.unpair(module.key);
    harness.forgetFirmware();
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

function firmwareOf(
  slots: readonly ModuleSlot[],
  transports: FakeTransportFactory,
  key: ModuleKey,
): FakeModuleTransport {
  const slot = slots.find((candidate) => candidate.module.key === key);
  const deviceId = slot?.pairing?.id;
  // A module without a service id speaks over a binary transport, which scripts no channel.
  const serviceId = slot?.module.serviceId;
  if (!deviceId || !serviceId) {
    throw new Error(`no channel-speaking fake is paired as "${key}"`);
  }

  const firmware = transports.servedModule(deviceId, serviceId);
  if (!firmware) throw new Error(`no firmware was served for "${key}"`);
  return firmware;
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
