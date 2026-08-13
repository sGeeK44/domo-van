import { describe, expect, it } from "vitest";
import {
  BATTERY_MODULE,
  HEATER_MODULE,
  type ModuleDescriptor,
  WATER_MODULE,
} from "@/domain/modules/ModuleDescriptor";
import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";
import {
  aggregateLinkStatus,
  reconnectableKeys,
} from "@/domain/modules/ModulesLink";

const ONLINE: LinkState = { status: "online", since: 1_000 };
const CONNECTING: LinkState = { status: "connecting" };
const OFFLINE: LinkState = { status: "offline", lastContactAt: 500 };

function paired(module: ModuleDescriptor, link: LinkState): ModuleSlot {
  return { module, pairing: { id: `${module.key}-1`, name: "d" }, link };
}

function free(module: ModuleDescriptor): ModuleSlot {
  return {
    module,
    pairing: null,
    link: { status: "offline", lastContactAt: null },
  };
}

describe("the status of every paired module at once", () => {
  it("is disconnected when nothing is paired", () => {
    const slots = [free(WATER_MODULE), free(HEATER_MODULE)];

    expect(aggregateLinkStatus(slots)).toBe("disconnected");
    expect(aggregateLinkStatus([])).toBe("disconnected");
  });

  it("is connected when every paired module is online", () => {
    const slots = [
      paired(WATER_MODULE, ONLINE),
      paired(HEATER_MODULE, ONLINE),
      free(BATTERY_MODULE),
    ];

    expect(aggregateLinkStatus(slots)).toBe("connected");
  });

  it("is partial when only some paired modules are online", () => {
    const slots = [
      paired(WATER_MODULE, ONLINE),
      paired(HEATER_MODULE, OFFLINE),
    ];

    expect(aggregateLinkStatus(slots)).toBe("partial");
  });

  it("is disconnected when every paired module is offline", () => {
    const slots = [
      paired(WATER_MODULE, OFFLINE),
      paired(HEATER_MODULE, OFFLINE),
    ];

    expect(aggregateLinkStatus(slots)).toBe("disconnected");
  });

  it("is loading as soon as one paired module is connecting", () => {
    const slots = [
      paired(WATER_MODULE, ONLINE),
      paired(HEATER_MODULE, CONNECTING),
      paired(BATTERY_MODULE, OFFLINE),
    ];

    expect(aggregateLinkStatus(slots)).toBe("loading");
  });

  it("ignores the link a free slot carries", () => {
    const slots = [{ ...free(WATER_MODULE), link: ONLINE }];

    expect(aggregateLinkStatus(slots)).toBe("disconnected");
  });
});

describe("the modules a reconnect would act on", () => {
  it("names every paired module that is offline", () => {
    const slots = [
      paired(WATER_MODULE, OFFLINE),
      paired(HEATER_MODULE, ONLINE),
      paired(BATTERY_MODULE, OFFLINE),
    ];

    expect(reconnectableKeys(slots)).toEqual(["water", "battery"]);
  });

  it("names none when every paired module is online", () => {
    const slots = [
      paired(WATER_MODULE, ONLINE),
      paired(HEATER_MODULE, ONLINE),
      paired(BATTERY_MODULE, ONLINE),
    ];

    expect(reconnectableKeys(slots)).toEqual([]);
  });

  it("names none while a module is still connecting", () => {
    expect(reconnectableKeys([paired(WATER_MODULE, CONNECTING)])).toEqual([]);
  });

  it("names no module that was never paired", () => {
    expect(reconnectableKeys([free(WATER_MODULE)])).toEqual([]);
  });
});
