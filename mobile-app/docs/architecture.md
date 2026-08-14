# Architecture

The app is layered, one-way only:

```
core → i18n → domain → infrastructure → app
```

`i18n/` sits immediately after `core/`, but `domain/` does **not** import it: the
domain carries translation *keys* as plain string literals and never reads a
dictionary. See "Copy and translation" below.

`npm run arch` enforces it with `dependency-cruiser`; the rules live in
`.dependency-cruiser.json` and every one of them is `error`. CI runs it on
every pull request, so a violation blocks the merge.

## Layers

| directory | holds |
|---|---|
| `core/` | technical primitives with no business meaning — `observable`, `core/react/useObservable` |
| `i18n/` | the FR/EN dictionaries, the i18next instance and the typed key union |
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
| `i18n` | `core` | any |
| `domain` | `core` | **none at all** |
| `infrastructure` | `core`, `i18n`, `domain` | any |
| `composition` | `core`, `i18n`, `domain`, `infrastructure` | any except `react-native-ble-plx` |
| `design-system` | `core` — **never `i18n`** | react / react-native / expo-\* / svg — **not** ble-plx |
| `components` | `core`, `i18n`, `domain`, `design-system` (barrel only) | as design-system |
| `screens` | `core`, `i18n`, `domain`, `design-system` (barrel), `components`, `composition` | as design-system |
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
  `useBatterySystem()`, never from `new`. The persistent transports built by
  `composition/ModuleSessions.ts` are the one carve-out: they name no driver
  and no device API, they only decorate the `TransportFactory` the container
  injected, and one exists per pairing — session lifetime, which the container
  knows nothing about.
- **`ModuleRegistry` owns the slots.** One slot per module type holds the
  pairing and the link state. `composition/ModuleRegistryProvider.tsx` builds
  the registry inside its mount effect and disposes it on unmount; disposal is
  terminal, so a remount builds a fresh one rather than restarting a corpse.
  Screens read a slot with `useModuleSlot(key)` and act through
  `useModuleRegistry()`. On the dashboard a free slot is a dashed
  `EmptySlotCard` towards `/modules`, and an offline one carries the time of
  its last contact and a *Reconnecter* action — `reconnect(key)` is already a
  no-op while connecting, so the button only mirrors that state.
  `screens/add-module-screen.tsx` is the exception: it still takes `bluetooth`
  from the container to run the pairing scan, which no slot owns.
- **`composition/ModuleSessions.ts` owns system lifetime**: one instance per
  **pairing**, not per connection. It is opened when the module is paired and
  disposed when it is unpaired, and it is the only file that constructs
  `WaterSystem` / `HeaterSystem` / `BatterySystem`.
- **A system outlives a link drop.** A drop only unbinds the persistent
  transport, so the domain objects — and the last values they hold — survive
  it; a reconnection rebinds those same objects and calls `resync()`. That is
  what lets a reconnection resume without a cold start. A screen still hides
  the values while the module is offline — a last known reading is not a
  measurement.
- **Connection is automatic**: the registry connects at startup and at
  pairing. There is no retry and no backoff — after a drop, the user asks for
  the reconnection.
- **One vocabulary for a link, everywhere.** `components/home/link-view.ts`
  turns a `LinkState` into the tone of its dot, the line naming the time of
  last contact and the reconnection offer; `LinkBadge` draws the dot. Three
  surfaces go through them today and cannot drift apart: the tab icon, the
  dashboard card and the *Eau* / *Chauff* header. The *Modules* row is task T5
  of issue #3; nothing takes a screen over when its module goes offline.
- **Import the design system through its barrel** from outside
  `design-system/`, and always through concrete files from inside it — the
  barrel would close a cycle.
- **A route under `app/` is two lines**: import a screen, default-export it.
  Everything under `app/` is a route, so put no helper there. `app/_layout.tsx`
  stays a real file: it exports `unstable_settings`, which expo-router reads
  off the route module. `app/(tabs)/_layout.tsx` is a two-liner over
  `screens/tabs-layout.tsx`, because the bar it draws reads the slots and the
  catalogue, which `app/` may not import.

## Copy and translation

Every user-visible string goes through a key. `i18n/resources/fr.ts` is the
source of truth — the mockups are French — and `i18n/resources/en.ts` is a
**full** translation typed as `typeof fr`, so a missing or stray key fails
`npm run typecheck`. Keys read `<area>.<screen>.<element>`; the areas are
`common`, `link`, `modules`, `dashboard`, `water`, `heater` and `battery`.

- **`i18n/keys.ts` types `t()`.** It merges `CustomTypeOptions` into the
  `i18next` module, so `t('does.not.exist')` is a compile error and
  `TranslationKey` is the union of every dotted path the dictionary defines.
- **`domain/` carries keys, never copy.** `ModuleDescriptor.displayNameKey` and
  `.tabTitleKey` are typed as the template literals
  `` `modules.${ModuleKey}.name` `` / `` .tab ``. A literal is not an import, so
  `domain-has-no-framework` still holds, and the types stay assignable to
  `TranslationKey` without a cast — renaming a dictionary key breaks the
  consumer, not silently the UI.
- **A pure helper returns a key, not a sentence.** `components/home/link-view.ts`
  answers `{ key, params }` and `ModuleSlotRow` answers the same shape; the
  component calls `t()`. That keeps the helpers framework-free and their tests
  readable.
- **A module reports an outcome, not a sentence.** `domain/Feedback.ts` is that
  same shape for the `lastFeedback` field of `HeaterZone`, `EnvironmentData`,
  `DrainValve` and `TankLevelSensor`: `{ key: FeedbackKey; params? }`, where
  `FeedbackKey` is a union of literals every dictionary must define. A settings
  section shows `t(key, params)`, so switching the locale switches the toast.
- **A failure of ours names a key too.** `domain/ReportedError` carries a
  `messageKey`; `NotConnectedError` and `TransportDisposedError` extend it.
  `components/error-message.ts` shows that key, and falls back to the raw
  `Error.message` — a BLE-library message reaches the UI untranslated, since
  mapping a third-party string is guesswork.
- **The design system never translates.** `design-system-has-no-copy` forbids
  `design-system/` → `i18n/`: the toast takes a string the caller already ran
  through `t()`. `i18n-is-self-contained` forbids the layer from reaching
  anything to its right.
- **The language comes from the device.** `i18n/language.ts` maps
  `expo-localization`'s `getLocales()[0].languageCode` to `fr` / `en`, `fr`
  otherwise. Persisting a *chosen* language is the preferences port's job, not
  this layer's. `composition/AppProviders.tsx` mounts `I18nextProvider`
  outermost over one module-scope instance.
- **The guardrail.** `i18n/__tests__/no-literal-copy.test.ts` walks the TypeScript
  AST of `app/`, `components/`, `design-system/` and `screens/`, and fails on a
  copy-shaped literal in a JSX text node, a rendered child — including through
  `{a ? "x" : "y"}`, `{a || "x"}` and `{"x" + b}` — or a `title` / `subtitle` /
  `label` / `buttonLabel` / `placeholder` / `accessibility*` / `name` /
  `children` prop. `name` is skipped on an icon or a route tag, where it is an
  identifier. Two lists bound it: `NON_COPY` is permanent (units and notation —
  `hPa`, `mV`, `Ah`, `Kp`, `Ki`, `Kd`), while `ALLOWED` is per-file and each
  entry must name the issue that retires it. `ALLOWED` is **empty**: no scanned
  file still holds copy. What it does not see: a literal reached through a
  variable, a helper return or a call argument, and a prop outside that list —
  those still have to be caught in review.
- **The domain guardrail reads spelling, not meaning.**
  `i18n/__tests__/no-domain-copy.test.ts` fails on a string literal in `domain/`
  that carries a French diacritic or a French word from its list (`erreur`,
  `le`, `des`, `pour`, `cours`, …). Its `ALLOWED` list is **empty** and its ceiling is
  **0**, so any such literal fails CI. It is a spelling detector, not a copy
  detector: French with neither marker — *"Purge finie"* — passes, and so does
  English prose, which `domain/` legitimately carries in the messages of the
  errors it throws. A sentence the UI displays has to come from a `Feedback` or a
  `ReportedError` key; nothing but review enforces that.

## The tab bar

`screens/tabs-layout.tsx` renders one `<Tabs.Screen>` per entry of
`moduleTabs(slots)`: the dashboard, then one per module in catalogue order —
*Bord / Batt / Eau / Chauff*, never more.

- **A module tab appears with its pairing.** An unpaired module gets
  `href: null`, which hides the button and **keeps the route registered**, so
  pairing or unpairing a module remounts no navigator and resets no state.
  `NativeTabs`' `hidden` prop does remount it, hence the `href` route.
- **The route file is named after the module key**, which is what lets the
  layout loop instead of hardcoding a block per module.
- **The dot on the icon is the slot's own link**, drawn by the same
  `LinkBadge` as the dashboard card.

### Adding a module

1. Add a `ModuleDescriptor` to `ALL_MODULES` — `tabTitleKey` and `tabIcon`
   included, since the bar reads them off the catalogue — then add
   `modules.<key>.name` and `modules.<key>.tab` to both dictionaries.
2. Add `app/(tabs)/<key>.tsx`, a two-line route over its screen.
3. Give it a session in `composition/ModuleSessions.ts` and, for a fake
   install, a scenario in `infrastructure/fake/`.

## Running without hardware

```bash
EXPO_PUBLIC_FAKE_BLE=1 npm start
```

The app then runs with Bluetooth switched off. It boots already paired: the
three modules reach *online* on their own, so nothing has to be scanned or
tapped, and the bar shows all four tabs. Every value on the screens, Bord's
water and heater cards included, comes from a fake — Bord holds no hardcoded
reading any more. The water and heater screens still substitute a zeroed
default while their module is offline.

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
