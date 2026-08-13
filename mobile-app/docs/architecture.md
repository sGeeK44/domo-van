# Architecture

The app is layered, one-way only:

```
core → domain → infrastructure → app
```

`npm run arch` enforces it with `dependency-cruiser`; the rules live in
`.dependency-cruiser.json` and every one of them is `error`. CI runs it on
every pull request, so a violation blocks the merge.

## Layers

| directory | holds |
|---|---|
| `core/` | technical primitives with no business meaning — `observable`, `core/react/useObservable` |
| `domain/` | business logic and the **ports** it needs (`domain/ports/`), plus the module catalogue (`domain/modules/`) |
| `infrastructure/` | implementations of those ports — BLE transports, secure store |
| `composition/` | the composition root: the one place binding concretes to ports |
| `design-system/` | tokens, atoms, molecules, theme |
| `components/` | feature UI, renders domain objects with design-system primitives |
| `screens/` | page components |
| `app/` | expo-router routes only |

## Permission matrix

"May import" = the listed directories plus itself.

| layer | may import (local) | npm packages |
|---|---|---|
| `core` | — | **none**, except `core/react/**` → `react` only |
| `domain` | `core` | **none at all** |
| `infrastructure` | `core`, `domain` | any |
| `composition` | `core`, `domain`, `infrastructure` | any except `react-native-ble-plx` |
| `design-system` | `core` | react / react-native / expo-\* / svg — **not** ble-plx |
| `components` | `core`, `domain`, `design-system` (barrel only) | as design-system |
| `screens` | `core`, `domain`, `design-system` (barrel), `components`, `composition` | as design-system |
| `app` | `screens`, `composition`, `design-system` (barrel) | any |

`react-native-ble-plx` is confined to `infrastructure/ble/`. Everything else
sees a connected device through the `DeviceHandle` port and asks
`DeviceConnector` / `TransportFactory` to act on it.

## Rules of the road

- **A module system never builds its own transport.** `WaterSystem` and
  `HeaterSystem` take a `ModuleTransport`, `BatterySystem` a `BinaryTransport`.
  The channel-id map stays inside the system — it is firmware knowledge —
  while `serviceId` stays in infrastructure, so a system cannot reach another
  module's service.
- **Nothing outside `composition/createContainer.ts` constructs an adapter.**
  Screens get their systems from `useWaterSystem()` / `useHeaterSystem()` /
  `useBatterySystem()`, never from `new`.
- **`ModuleRegistry` owns the slots.** One slot per module type holds the
  pairing and the link state, and `composition/ModuleRegistryProvider.tsx`
  builds the registry once, starts it on mount and disposes it on unmount.
  Screens read a slot with `useModuleSlot(key)` and act through
  `useModuleRegistry()` — they never connect a device themselves.
- **`composition/ModuleSessions.ts` owns system lifetime**: one instance per
  **pairing**, not per connection. It is opened when the module is paired and
  disposed when it is unpaired, and it is the only file naming `WaterSystem` /
  `HeaterSystem` / `BatterySystem`.
- **A system outlives a link drop.** A drop only unbinds the persistent
  transport, so the domain objects — and the last values they hold — survive
  it; a reconnection rebinds those same objects and calls `resync()`. That is
  what lets a screen show the last known reading while the module is offline.
- **Connection is automatic**: the registry connects at startup and at
  pairing. There is no retry and no backoff — after a drop, the user asks for
  the reconnection.
- **Import the design system through its barrel** from outside
  `design-system/`, and always through concrete files from inside it — the
  barrel would close a cycle.
- **A route under `app/` is two lines**: import a screen, default-export it.
  Everything under `app/` is a route, so put no helper there. Both
  `_layout.tsx` stay real files: `app/_layout.tsx` exports
  `unstable_settings`, which expo-router reads off the route module.

## Running without hardware

```bash
EXPO_PUBLIC_FAKE_BLE=1 npm start
```

The app then runs with Bluetooth switched off. It boots already paired: the
three modules reach *online* on their own, so nothing has to be scanned or
tapped. Every value on Eau and Chauffage, and Bord's battery and environment
cards, comes from a fake. Bord's water and heater `StatusCard`s are still wired
to the `MOCK_WATER` / `MOCK_HEATER` constants in `screens/home-screen.tsx`, so
they disagree with Eau and Chauffage on purpose until #3 rewrites them.

`EXPO_PUBLIC_FAKE_BLE` is read **once**, by `createContainer()`, and it is the
only branch in the app. Expo inlines `EXPO_PUBLIC_*` at build time, so this is
a build-time switch, not a runtime setting. Anything other than exactly `"1"`
builds the BLE stack, so no fake is reachable unless you ask for one.

| container slot | real | fake |
|---|---|---|
| `bluetooth` | `Bluetooth` (ble-plx) | `FakeBluetooth` |
| `transports` | `BleTransportFactory` | `FakeTransportFactory` |
| `deviceRepository` | `SecureStoreDeviceRepository` | `InMemoryDeviceRepository` |

What the fake serves:

| module | source | reads |
|---|---|---|
| water | `scenarios/waterScenario.ts` | clean tank 100 L at 72 %, grey tank 80 L at 40 %, drain valve auto-closing after 45 s |
| heater | `scenarios/heaterScenario.ts` | four zones (21.5 / 19.0 / 17.5 / 23.0 °C), zones 0 and 3 running, indoor 21.5 °C / 45 % / 1013.2 hPa, outdoor 12.0 °C |
| battery | `scenarios/jkBmsFrames.ts` | a JK-BMS read-all reply — synthesised, not captured from the van: 4 cells, 13.20 V, +5.00 A, 98 % |

The fakes are firmware, not fixtures: they answer commands and keep what they
are told. Writing a setpoint and reading it back returns the new value, and a
write out of the firmware's range answers `ERR_CFG_RANGE`. That is why
`FakeTransportFactory` serves **one transport per (device, service)** — a
second one would be a second module, with no memory of the first.

`FakeBinaryTransport` is silent unless given a cadence, since a `BinaryTransport`
has no request/response shape to hang a reply off. The container passes it one,
so the battery screen refreshes the way a real BMS pushes telemetry unprompted.

### Adding a scenario

A `ChannelScenario` is `(command: string) => readonly string[]`: the frames the
firmware answers one command with, exactly as they come off the radio. A
`ModuleScenario` is one of those per channel id, keyed the way the module's
`*System` keys its channels.

1. Write the scenario next to its siblings in `infrastructure/fake/scenarios/`.
   Close over `let` state for anything the firmware remembers.
2. Register it in `FakeTransportFactory`'s `SCENARIOS`, under the module key.
   An unregistered service throws `UnscriptedServiceError` rather than going
   quiet.
3. Add the module to `ALL_MODULES` if it is new — `FakeBluetooth` advertises
   and pre-pairs one device per catalogue entry.

## Known gaps

- `no-orphans` is deliberately off: it would flag
  `design-system/atoms/icon-symbol.ios.tsx`, a platform variant no import
  resolves to. That file is therefore **not** covered by the arch check.
