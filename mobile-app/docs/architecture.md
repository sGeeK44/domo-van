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
- **`ModuleSystemsProvider` owns system lifetimes**: one instance per connected
  device, disposed on device change or unmount. It carries no policy — no
  retry, no timeout, no reconnection.
- **Provider ordering in `composition/AppProviders.tsx` is load-bearing** and
  nothing type-checks it: `ModuleSystemsProvider` and
  `MultiModuleConnectionProvider` both call `useWaterDevice()`, which throws
  outside the three device providers.
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

Every screen then renders real data with Bluetooth switched off. The app boots
already paired: the three modules reach *connected* on their own, so nothing
has to be scanned or tapped.

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
| battery | `scenarios/jkBmsFrames.ts` | a recorded JK-BMS read-all reply: 4 cells, 13.20 V, +5.00 A, 98 % |

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

- `composition/connection/` holds React state machines, not wiring. It is a
  temporary tenant until connection/pairing is rewritten.
- `no-orphans` is deliberately off: it would flag
  `design-system/atoms/icon-symbol.ios.tsx`, a platform variant no import
  resolves to. That file is therefore **not** covered by the arch check.
