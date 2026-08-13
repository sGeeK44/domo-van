// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it } from "vitest";

// The container is built when ContainerProvider is imported, so the switch has
// to be flipped before that import — hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { ContainerProvider, useContainer } = await import(
  "@/composition/ContainerProvider"
);
const { ModuleRegistryProvider, useModuleSlot } = await import(
  "@/composition/ModuleRegistryProvider"
);
const { FakeBluetooth } = await import("@/infrastructure/fake/FakeBluetooth");
const { useModulesLink } = await import("@/screens/hooks/useModulesLink");

type Radio = InstanceType<typeof FakeBluetooth>;

type Harness = {
  radio: Radio | null;
  deviceId: string | null;
  reconnectAll: () => void;
};

function Header({ harness }: { harness: Harness }) {
  const link = useModulesLink();
  const water = useModuleSlot("water");
  const container = useContainer();

  useEffect(() => {
    harness.radio = fakeRadio(container);
    harness.deviceId = water.pairing?.id ?? null;
    harness.reconnectAll = link.reconnectAll;
  });

  return (
    <dl>
      <dd data-testid="status">{link.status}</dd>
      <dd data-testid="can-reconnect">{String(link.canReconnect)}</dd>
      <dd data-testid="water-link">{water.link.status}</dd>
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

function renderHeader(): Harness {
  const harness: Harness = {
    radio: null,
    deviceId: null,
    reconnectAll: () => {},
  };

  render(
    <ContainerProvider>
      <ModuleRegistryProvider>
        <Header harness={harness} />
      </ModuleRegistryProvider>
    </ContainerProvider>,
  );

  return harness;
}

async function dropWaterLink(harness: Harness): Promise<void> {
  const { radio, deviceId } = harness;
  if (!radio || !deviceId) throw new Error("the water module never paired");

  await act(async () => {
    radio.dropLink(deviceId);
  });
  await waitFor(() => expect(shown("water-link")).toBe("offline"));
}

describe("the header's view of every paired module", () => {
  afterEach(cleanup);

  it("has nothing to reconnect while every module is online", async () => {
    renderHeader();

    await waitFor(() => expect(shown("status")).toBe("connected"));

    expect(shown("can-reconnect")).toBe("false");
  });

  it("has something to reconnect once a module drops", async () => {
    const harness = renderHeader();
    await waitFor(() => expect(shown("status")).toBe("connected"));

    await dropWaterLink(harness);

    expect(shown("status")).toBe("partial");
    expect(shown("can-reconnect")).toBe("true");
  });

  it("brings the dropped module back online", async () => {
    const harness = renderHeader();
    await waitFor(() => expect(shown("status")).toBe("connected"));
    await dropWaterLink(harness);

    await act(async () => {
      harness.reconnectAll();
    });

    await waitFor(() => expect(shown("status")).toBe("connected"));
    expect(shown("can-reconnect")).toBe("false");
  });
});
