/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import React, { type PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock expo-secure-store
const mockStore = new Map<string, string>();
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn((key: string) =>
    Promise.resolve(mockStore.get(key) ?? null)
  ),
  setItemAsync: vi.fn((key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    mockStore.delete(key);
    return Promise.resolve();
  }),
}));

// Mock react-native-ble-plx
vi.mock("react-native-ble-plx", () => ({
  Device: class {},
  Subscription: class {},
}));

import type { Bluetooth } from "@/core/bluetooth/Bluetooth";
import type { DeviceInfo } from "@/hooks/DeviceStorage";
import {
  ConnectedDeviceProvider,
  useConnectedDevice,
} from "@/hooks/useConnectedDevice";
import type { Device } from "react-native-ble-plx";

const createMockDevice = (id: string, name = "Test Device"): Device =>
  ({
    id,
    name,
    discoverAllServicesAndCharacteristics: vi.fn().mockResolvedValue(undefined),
    onDisconnected: vi.fn().mockReturnValue({ remove: vi.fn() }),
    cancelConnection: vi.fn().mockResolvedValue(undefined),
  } as unknown as Device);

const createDeviceInfo = (id: string, name = "Test Device"): DeviceInfo => ({
  id,
  name,
});

const createMockBluetooth = (
  mockDevice?: Device,
  shouldFail = false
): Bluetooth =>
  ({
    connect: shouldFail
      ? vi.fn().mockRejectedValue(new Error("Connection failed"))
      : vi.fn().mockResolvedValue(mockDevice ?? createMockDevice("default-id")),
    startScan: vi.fn(),
    stopScan: vi.fn(),
  } as unknown as Bluetooth);

const wrapper = ({ children }: PropsWithChildren) => (
  <ConnectedDeviceProvider>{children}</ConnectedDeviceProvider>
);

describe("useConnectedDevice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("starts with null device and not connected", () => {
      const { result } = renderHook(() => useConnectedDevice(), { wrapper });

      expect(result.current.device).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });

    it("loads lastDevice from storage on mount", async () => {
      const storedDevice = createDeviceInfo(
        "stored-device-id",
        "Stored Device"
      );
      mockStore.set("water_module_last_device", JSON.stringify(storedDevice));

      const { result } = renderHook(() => useConnectedDevice(), { wrapper });

      await waitFor(() => {
        expect(result.current.lastDevice).toEqual(storedDevice);
      });
    });
  });

  describe("setDevice", () => {
    it("sets the device and updates isConnected", () => {
      const { result } = renderHook(() => useConnectedDevice(), { wrapper });
      const mockDevice = createMockDevice("test-device-id");

      act(() => {
        result.current.setDevice(mockDevice);
      });

      expect(result.current.device).toBe(mockDevice);
      expect(result.current.isConnected).toBe(true);
    });

    it("persists device info to storage when setting device", async () => {
      const { result } = renderHook(() => useConnectedDevice(), { wrapper });
      const deviceId = "persisted-device-id";
      const deviceName = "Persisted Device";
      const mockDevice = createMockDevice(deviceId, deviceName);

      act(() => {
        result.current.setDevice(mockDevice);
      });

      expect(result.current.lastDevice).toEqual({
        id: deviceId,
        name: deviceName,
      });
      expect(mockStore.get("water_module_last_device")).toBe(
        JSON.stringify({ id: deviceId, name: deviceName })
      );
    });

    it("sets device to null on disconnect", () => {
      const { result } = renderHook(() => useConnectedDevice(), { wrapper });
      const mockDevice = createMockDevice("test-id");

      act(() => {
        result.current.setDevice(mockDevice);
      });
      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.setDevice(null);
      });
      expect(result.current.device).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe("autoConnect", () => {
    it("does not connect when lastDevice is null", async () => {
      const { result } = renderHook(() => useConnectedDevice(), { wrapper });
      const bluetooth = createMockBluetooth();

      await act(async () => {
        await result.current.autoConnect(bluetooth);
      });

      expect(bluetooth.connect).not.toHaveBeenCalled();
      expect(result.current.isConnected).toBe(false);
    });

    it("does not connect when already connected", async () => {
      const storedDevice = createDeviceInfo("some-device", "Some Device");
      mockStore.set("water_module_last_device", JSON.stringify(storedDevice));
      const { result } = renderHook(() => useConnectedDevice(), { wrapper });
      const bluetooth = createMockBluetooth();

      // Wait for lastDevice to load
      await waitFor(() => {
        expect(result.current.lastDevice).toEqual(storedDevice);
      });

      // Set a device first
      act(() => {
        result.current.setDevice(createMockDevice("connected-device"));
      });

      await act(async () => {
        await result.current.autoConnect(bluetooth);
      });

      expect(bluetooth.connect).not.toHaveBeenCalled();
    });

    it("connects to last known device when available", async () => {
      const deviceId = "last-known-device";
      const storedDevice = createDeviceInfo(deviceId, "Last Known Device");
      mockStore.set("water_module_last_device", JSON.stringify(storedDevice));
      const mockDevice = createMockDevice(deviceId);
      const bluetooth = createMockBluetooth(mockDevice);

      const { result } = renderHook(() => useConnectedDevice(), { wrapper });

      // Wait for lastDevice to load
      await waitFor(() => {
        expect(result.current.lastDevice).toEqual(storedDevice);
      });

      await act(async () => {
        await result.current.autoConnect(bluetooth);
      });

      expect(bluetooth.connect).toHaveBeenCalledWith(deviceId);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.device).toBe(mockDevice);
    });

    it("sets isConnecting during connection attempt", async () => {
      const deviceId = "device-id";
      const storedDevice = createDeviceInfo(deviceId, "Device");
      mockStore.set("water_module_last_device", JSON.stringify(storedDevice));

      // Create a bluetooth mock that delays connection
      let resolveConnect: (device: Device) => void;
      const connectionPromise = new Promise<Device>((resolve) => {
        resolveConnect = resolve;
      });
      const bluetooth = {
        connect: vi.fn().mockReturnValue(connectionPromise),
        startScan: vi.fn(),
        stopScan: vi.fn(),
      } as unknown as Bluetooth;

      const { result } = renderHook(() => useConnectedDevice(), { wrapper });

      await waitFor(() => {
        expect(result.current.lastDevice).toEqual(storedDevice);
      });

      // Start connection (don't await)
      let connectPromise: Promise<void>;
      act(() => {
        connectPromise = result.current.autoConnect(bluetooth);
      });

      // Should be connecting
      expect(result.current.isConnecting).toBe(true);

      // Resolve the connection
      const mockDevice = createMockDevice(deviceId);
      await act(async () => {
        resolveConnect!(mockDevice);
        await connectPromise;
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isConnected).toBe(true);
    });

    it("handles connection failure gracefully", async () => {
      const deviceId = "failing-device";
      const storedDevice = createDeviceInfo(deviceId, "Failing Device");
      mockStore.set("water_module_last_device", JSON.stringify(storedDevice));
      const bluetooth = createMockBluetooth(undefined, true);

      const { result } = renderHook(() => useConnectedDevice(), { wrapper });

      await waitFor(() => {
        expect(result.current.lastDevice).toEqual(storedDevice);
      });

      await act(async () => {
        await result.current.autoConnect(bluetooth);
      });

      expect(bluetooth.connect).toHaveBeenCalledWith(deviceId);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
    });
  });

  describe("forgetDevice", () => {
    it("clears lastDevice from state and storage", async () => {
      const storedDevice = createDeviceInfo(
        "device-to-forget",
        "Device to Forget"
      );
      mockStore.set("water_module_last_device", JSON.stringify(storedDevice));

      const { result } = renderHook(() => useConnectedDevice(), { wrapper });

      await waitFor(() => {
        expect(result.current.lastDevice).toEqual(storedDevice);
      });

      await act(async () => {
        await result.current.forgetDevice();
      });

      expect(result.current.lastDevice).toBeNull();
      expect(mockStore.has("water_module_last_device")).toBe(false);
    });

    it("disconnects device if connected before forgetting", async () => {
      const deviceId = "connected-device";
      const mockDevice = createMockDevice(deviceId);

      const { result } = renderHook(() => useConnectedDevice(), { wrapper });

      // Set a connected device
      act(() => {
        result.current.setDevice(mockDevice);
      });

      // Wait for state to settle and verify connection
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.lastDevice).toEqual({
          id: deviceId,
          name: "Test Device",
        });
      });

      await act(async () => {
        await result.current.forgetDevice();
      });

      expect(mockDevice.cancelConnection).toHaveBeenCalled();
      expect(result.current.device).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.lastDevice).toBeNull();
      expect(mockStore.has("water_module_last_device")).toBe(false);
    });

    it("works even when no device is connected", async () => {
      const storedDevice = createDeviceInfo(
        "saved-but-not-connected",
        "Saved Device"
      );
      mockStore.set("water_module_last_device", JSON.stringify(storedDevice));

      const { result } = renderHook(() => useConnectedDevice(), { wrapper });

      await waitFor(() => {
        expect(result.current.lastDevice).toEqual(storedDevice);
      });

      // No device connected
      expect(result.current.device).toBeNull();

      await act(async () => {
        await result.current.forgetDevice();
      });

      expect(result.current.lastDevice).toBeNull();
      expect(mockStore.has("water_module_last_device")).toBe(false);
    });
  });
});
