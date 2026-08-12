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

## Known gaps

- `composition/connection/` holds React state machines, not wiring. It is a
  temporary tenant until connection/pairing is rewritten.
- `no-orphans` is deliberately off: it would flag
  `design-system/atoms/icon-symbol.ios.tsx`, a platform variant no import
  resolves to. That file is therefore **not** covered by the arch check.
