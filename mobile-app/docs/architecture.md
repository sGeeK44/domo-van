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
| `composition/` | the composition root: the one place binding concretes to ports, plus the app-shell wiring that sits above the React tree (`appContainer`, the boot gate) |
| `design-system/` | tokens, atoms, molecules, theme |
| `components/` | feature UI, renders domain objects with design-system primitives |
| `screens/` | page components, plus the hooks they share (`screens/hooks/`) |
| `app/` | expo-router routes only |

The tokens, text styles, `useStyles`, `<Hatch/>`, the toast contract and the
colour guardrail are documented in [design-system.md](./design-system.md). The
gauge family — the primitive, its five variants and the rules they encode — has
its own section: [Gauges](./design-system.md#gauges).

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
  `useBatterySystem()`, or from `useModuleSystem(key)` when the key is a
  parameter, never from `new`. The persistent transports built by
  `composition/ModuleSessions.ts` are the one carve-out: they name no driver
  and no device API, they only decorate the `TransportFactory` the container
  injected, and one exists per pairing — session lifetime, which the container
  knows nothing about.
- **One boot gate, above the providers.** `composition/useAppReady.ts` ANDs
  every condition the first paint waits on — the bundled fonts, and the stored
  theme mode and language, both read by one `useAppPreferences` load — and lifts
  the splash once they all hold. It renders above
  `AppProviders`, so it takes its port from `composition/appContainer.ts`, the
  container built outside the React tree and handed down unchanged by
  `ContainerProvider`. A second gate elsewhere would paint a frame this one is
  still holding.
- **The design system receives persistence, it never imports it.**
  `composition/` may not import `design-system/` and `design-system/` may not
  import `domain/`, so `ThemeProvider` is mounted by `app/_layout.tsx`, the one
  place that sees both. It takes an `initialMode` value — already hydrated,
  which is what avoids a light→dark flash — and an `onModeChange` callback.
  Neither names a port; the write-through and its swallowed rejection live in
  `composition/useAppPreferences.ts`, which does the same for the language.
- **`ModuleRegistry` owns the slots.** One slot per module type holds the
  pairing and the link state. `composition/ModuleRegistryProvider.tsx` builds
  the registry inside its mount effect and disposes it on unmount; disposal is
  terminal, so a remount builds a fresh one rather than restarting a corpse.
  Screens read a slot with `useModuleSlot(key)` and act through
  `useModuleRegistry()`. On the dashboard a free slot is a hatched `GaugeRow`
  towards `/add-module`, and an offline one carries the time of its last contact
  and a *Reconnecter* action — `reconnect(key)` is already a no-op while
  connecting, so the button only mirrors that state.
  `screens/add-module-screen.tsx` is the exception: it still takes `bluetooth`
  from the container to run the pairing scan, which no slot owns.
- **`composition/ModuleSessions.ts` owns system lifetime**: one instance per
  **pairing**, not per connection. It is opened when the module is paired and
  disposed when it is unpaired, and it is the only file that constructs
  `WaterSystem` / `HeaterSystem` / `BatterySystem`.
- **A system outlives a link drop.** A drop only unbinds the persistent
  transport, so the domain objects — and the last values they hold — survive
  it; a reconnection rebinds those same objects and calls `resync()`. That is
  what lets a reconnection resume without a cold start. A tab still shows no
  value while its module is offline — `ModuleScreen` takes it over instead, and
  a last known reading is not a measurement.
- **Connection is automatic**: the registry connects at startup and at
  pairing. There is no retry and no backoff — after a drop, the user asks for
  the reconnection.
- **One vocabulary for a link, everywhere.** `components/home/link-view.ts`
  turns a `LinkState` into the tone of its dot, the line naming the time of
  last contact and the reconnection offer; `LinkBadge` draws the dot. Four
  surfaces go through them today and cannot drift apart: the tab icon, the
  dashboard card, the *Eau* / *Chauff* header and `ModuleScreen`'s takeover.
  The *Modules* row is task T5 of issue #3.
- **A module tab is a `ModuleScreen`**, and the screens have their own section
  below.
- **Import the design system through its barrel** from outside
  `design-system/`, and always through concrete files from inside it — the
  barrel would close a cycle.
- **A route under `app/` is two lines**: import a screen, default-export it.
  Everything under `app/` is a route, so put no helper there. **Two layout files
  are real code**, and they are the only two: `app/_layout.tsx`, which exports
  `unstable_settings` (expo-router reads it off the route module) and mounts the
  boot gate and the providers, and `app/settings/_layout.tsx`, whose whole job is
  a `Stack` with `headerShown: false` for the six settings routes — a
  `<Stack.Screen>` per form in the root layout would say the same thing six
  times. `app/(tabs)/_layout.tsx` is a two-liner over `screens/tabs-layout.tsx`,
  because the bar it draws reads the slots and the catalogue, which `app/` may
  not import.

## The screens

`screens/` holds one page component per route, plus the hooks they share. Four
of them draw the van — Bord, Eau, Chauffage, Batterie — and the three module
tabs are all the same shell.

### A dashboard card is not a module

`ModuleDescriptor.cards` lists the dashboard cards a module feeds, and the water
module lists two — clean and grey — while still yielding a single tab. **Card
count is not module count**, and neither is slot count: an unpaired or offline
module collapses to **one** hatched card whatever it declares, because there is
no reading to fill a second one with. That is why `MODULE_LABEL_KEY` exists
beside the catalogue's own `labelKey`: a single-card module reuses its card's
label, while water's *EAU PROPRE* and *EAU GRISE* name neither of the collapsed
card, so it carries `dashboard.modules.water`.

`components/home/dashboard-cards.ts` is the pure function behind the screen:
`(slots, readings) → DashboardCardView[]`. It owns the
`DashboardCardKey → fill.*` map, because the domain names no colour, and it
returns keys and numbers rather than sentences — the screen calls `t()`. The
environment tile strip below the cards is hidden while **no** module is paired.

### A module tab is a `ModuleScreen`

`screens/module-screen.tsx` owns the header and the three states a tab can be
in: an unpaired slot shows `ModuleLinkNotice`, an offline or connecting one is
taken over **entirely** by an `OfflineCard` carrying the time of last contact
and the reconnection, and an online one renders the screen's own content through
`children(system)`. It reads `useModuleSlot` and `useModuleRegistry`, which is
why it lives in `screens/` — `components/` may not import `composition/`. Its
header carries the module's title and its settings button only: the link already
shows as a dot on the tab, and the takeover carries the reconnection.

**The shell owns the whole page frame.** Everything a module tab used to set up
for itself belongs to `ModuleScreen`: the `SafeAreaView`, the `colors.screen`
background, the `flex: 1` filling the tab, and the content padding —
`Spacing.s` on top, `Spacing.gutter` left and right, nothing at the bottom
(`8 / 18 / 0`). A wrapped screen therefore returns a container carrying its
`gap`, and none of that frame: no `SafeAreaView`, no `screen` background, no
padding. Keeping the padding "because the container is needed for its `gap`"
double-pads the tab. The `flex: 1` the shell owns is the one filling the tab; a
wrapped screen still lays its own content out with `flex`, which is how a tall
`GaugeColumn` gets its height. The rule covers the **online branch**, the only
one `children` render on: `ModuleLinkNotice` and the takeover sit outside
`styles.content` and pad themselves, so a reader scanning `module-screen.tsx`
meets those two counter-examples before the rule.

### Heater writes go through `HeaterSystem`

`adjustZone(index, ±0.5)`, `toggleZone(index)`, `applyNightMode()` and
`stopAll()` live on the system; reads stay on the zones. Night mode is a flag
the screen cannot be trusted to clear, so every one of the four clears it, and
"any manual adjustment exits night mode" becomes enforceable in one place
instead of unenforceable in four call sites. `adjustZone` also starts a stopped
zone and clamps to 5–30 °C, inside `HeaterZone`'s own 0–50 °C firmware backstop.

Night mode is a **preset, not a toggle**: leaving it rewrites nothing. The day
targets it displaced live in the module, and the app never knew them.

### A confirmed write owns its channel's acks

**A write has four answers, not two.** `WriteOutcome` separates them because a
form has a different sentence for each, and collapsing any pair would make one of
those sentences a lie:

| status | what happened | what the user is told |
|---|---|---|
| `applied` | the module acked `OK`, or echoed back what we wrote | *Configuration envoyée au module* |
| `rejected` | the module answered `ERR_*`; it kept the value it had | the value was refused — with the code's field, where the code names one |
| `timedOut` | the write left the phone and the module confirmed nothing | *le module n'a pas confirmé* |
| `unreachable` | the write **never left the phone**: `channel.send` threw, or the transport was disposed mid-save | *module injoignable* |

`unreachable` and `timedOut` are the pair worth keeping apart. Nothing was
transmitted in the first, so *reconnect and try again* is actionable and the
module's state is certainly unchanged; something was transmitted in the second,
so the module may well hold the new value and the honest report is that it did
not confirm. One `failed` status covering both would send the user hunting for a
radio problem that is not there, or reassure them about a write that landed.

`ConfirmedWrite` correlates an ack with a command **by position**: the module
answers in order, and nothing in the protocol names the command an `OK` belongs
to. So a channel may only ever have one source of writes in flight.

`setSetpoint`, `start` and `stop` bypass it — they are the piloting path, and
their latency budget is a half-degree press — while `HeaterCfgProtocol` answers
`OK` to `SP:`, `START` and `STOP` as well as to `CFG:`. **Piloting and a PID
save must therefore never be live on the same mounted surface**: a `START`
landing while `CFG:KP=…` waits would settle the save as *applied*, and the
module's real answer — possibly `ERR_CFG_RANGE` — would then settle nothing.
The zone tab and the PID form are separate routes, which is what makes this
hold today; `HeaterSystem.test.ts` pins the behaviour so a change is visible.

**A write with no answer is verified, not guessed.** An ack is a single
unacknowledged notification and is lost far more easily than the write itself,
so concluding *failed* from silence would report a save the module applied. On
a timeout `ConfirmedWrite` sends the channel's readback — `CFG?`, which every
config protocol answers with the very command that set the value — and settles
`applied` when the module echoes what we wrote, `timedOut` when it echoes
anything else or says nothing at all. The readback frame flows through the
leaf's own listener on the way, so the snapshot ends on the module's real value
either way. The cost is a worst case of two windows, ~6 s, before a save
reports.

Bookkeeping the acks a timed-out write is still owed was tried first and
removed: positional correlation cannot tell a late ack from a lost one, and
guessing wrong in that direction poisons every later write on the channel.
`AdminModule` is the one channel with no readback — `AdminProtocol` answers
`ERR_UNKNOWN_CMD` to any query and the write reboots the module by design — so
there a timeout stays the honest answer.

### A toast confirms a coarse action, not every half-degree

The valve (opened, closed, auto-closed), the two heater presets and a
reconnection each fire one toast. A ± step and a zone power button fire
**none** — read literally, "every action that reaches a module confirms itself
through a toast" would fire one per half-degree, and the mockup fires none
there either. A success toast is the screen's own, fired where the command is
sent.

The failure path is not the screen's. `screens/hooks/useFeedbackToast.ts`
watches a domain object's `lastFeedback` and shows `t(key, params)` when it
changes; a module repeating itself is one event, not two toasts.

## The settings forms

Five forms — water identity, water tanks and valve, heater identity, heater PID,
battery information — differ by their cards and by nothing else. They live under
`app/settings/`, alongside `index.tsx` for Réglages, and they are reached from
three surfaces: a module tab's `tune` chip, a Réglages row, and the Modules
screen's `edit` button (identity only, and only for water and heater — the JK BMS
has no admin channel).

### `SettingsFormScreen` is the shell

`screens/settings-form-screen.tsx` owns the page frame and the **same three
states** a module tab has: an unpaired slot shows `ModuleLinkNotice`, an offline
or connecting one is taken over by `OfflineTakeover`, and an online one renders
`children(system)`. It is `ModuleScreen`'s shape, reused: a form returns cards and
nothing else — no `SafeAreaView`, no `screen` background, no padding.

What it varies is `crumbKey` / `titleKey` / `introKey` / `noteKey`, and a `save`
that is **optional**: Batterie is read-only, so it passes none and no button is
drawn. `components/battery-settings/battery-info-view.ts` is the pure
`(snapshot) → FormCardView[]` behind it, returning keys and numbers the screen
translates — the `components/home/link-view.ts` precedent. The card list is a
`KeyboardAwareScrollView` with a 78 px `bottomOffset`, so a focused field stays
above the keyboard; `KeyboardProvider` is mounted once, at the root of
`app/_layout.tsx`.

### Back returns to the caller, and no route param says so

Every entry point is a `push` onto the same stack, so `router.back()` already
lands on whichever of the three surfaces opened the form. There is no `from`
param because the stack is the state. What holds it true is negative: no
`replace` and no `dismissTo` anywhere under `app/settings/`, and a test per entry
point.

`app/settings/_layout.tsx` therefore exports **no `unstable_settings`** — neither
`anchor` nor `initialRouteName`. Either one would seat Réglages under every form
as the group's first route, and a back press from a form opened off the *Eau* tab
would land on Réglages instead of on Eau. The absence is load-bearing, which is
why the file carries a comment saying so and the route test asserts the
identifier is not there.

### `useSettingsForm` owns the draft

`screens/hooks/useSettingsForm.ts` is the one place the telemetry rule lives:
**there is no draft until the first keystroke.** `values` is `draft ?? reported`,
so while `draft` is `null` every frame the module publishes flows straight
through, and from the first `set` the draft shadows it completely. A distance
frame landing while the volume field is being edited changes nothing on screen.
The draft is cleared — and hydration resumes — only when the module has the last
word, and only if nothing was typed since the save started (`current === sent`; a
keystroke since is newer than the module's answer).

**`onSave` returns whether the module has the last word**, not whether the save
succeeded. `components/settings/save-report.ts:moduleHasTheLastWord` answers
`true` for `applied` and for a failure whose every write was `rejected`: a refusal
is authoritative, the module told us it kept what it had, so the draft goes and
the field falls back to the reported value. `timedOut` and `unreachable` answer
`false` — silence is exactly what the user retries, so throwing the typed values
away would make the retry impossible.

**`errors` and `blocked` are two different questions.** `errors` is *what to
paint*, and it is empty until a save has been tried, so a field nobody has typed
in yet is never red on arrival. `blocked` is *would validation refuse a save*,
ungated — the screen needs it before any press. `save()` sets `tried` **before**
its early return, so a press refused by a field the user never touched still
paints the reason.

That leaves the refused press itself, which is what `savePress` handles: it calls
`save()` (which paints) and then, if `blocked`, fires `onBlocked` — a toast saying
*Corrige les champs en rouge*. Without it the button would be a dead control: the
field turns red somewhere off-screen and the press appears to have done nothing.
A blocked save sends no command at all.

### One save, one transaction, one sentence per kind of failure

A whole-form save is a domain method, never a `Promise.all` in a screen:
`AdminModule.saveIdentity` (one channel), `WaterSystem.saveTankAndValveConfig`
(three channels, five fields), `HeaterSystem.savePidConfig` (four channels, twelve
fields). `saveFields` writes **every** field before reporting and names every one
that failed — stopping at the first failure would leave the module in a state the
form cannot describe.

`saveMessage` groups the failures by `WriteOutcome.status` and emits one sentence
per group, naming the fields it covers. Naming one field out of four reads as *the
rest went through*; describing all four with the first one's status says a refused
field went silent, or the reverse.

The success toast is the **screen's** own, fired where the command is sent:
`useFeedbackToast` reports failures only, so a confirmation has nowhere else to
come from.

### Identity travels as one command

`AdminProtocol` gained `ID:NAME=<name>;PIN=<6 digits>`, which persists both
fields or neither and answers a single `OK` / `ERR_*`. It had to: `AdminListner`
reboots the module on any `OK`, so an identity save sent as `NAME:` then `PIN:`
always lost its second field to the restart. The admin channel is also the one
channel with **no readback** — `AdminProtocol` answers `ERR_UNKNOWN_CMD` to any
query — so there a timeout stays the honest answer, and `AdminModule` builds its
`ConfirmedWrite` with a `null` readback.

Because name and PIN are one command, one `ERR_*` covers both, and only the
module's code tells them apart: `identityFieldName` maps `ERR_NAME_*` /
`ERR_PIN_*` onto the field and falls back to *the module's identity*.

### Where the pieces live

| File | Holds |
|---|---|
| `screens/settings-form-screen.tsx` | the shell, its three states, the save button |
| `screens/hooks/useSettingsForm.ts` | the draft, `errors` / `blocked`, the telemetry rule |
| `screens/hooks/useReportedName.ts` | the name the module answers to — a slot's `pairing` is written once at pairing time, so a name we saw accepted is newer than the one the slot carries |
| `components/settings/save-report.ts` | outcome → sentence, `moduleHasTheLastWord`, `savePress` |
| `components/settings/identity-form.ts` | name and PIN validation, shared by both identity forms |
| `components/settings/IdentityCards.tsx` | the two identity cards, likewise shared |
| `components/settings/settings-rows.ts` | Réglages' module rows and the paired count |
| `components/water-settings/tank-form.ts` | tank and valve validation and command shaping |
| `components/heater-settings/pid-form-view.ts` | the four PID cards and gain validation |
| `components/heater/zone-names.ts` | `ZONE_NAME_KEYS` — **one** zone vocabulary, read by the piloting screen and the PID form alike |
| `components/battery-settings/battery-info-view.ts` | the read-only cards |
| `components/module-accent.ts` | `ModuleKey → fill.*`, because the design system names no module and the domain names no colour |

The kit these draw with — `AccentCard`, `FieldRow`, `FieldInput`,
`FieldReadout`, `SegmentedControl`, `NavRow` and `SettingsHeader`'s three
variants — is documented in
[design-system.md](./design-system.md#the-settings-form-kit).

### The language is hydrated before the first paint

`composition/useAppPreferences.ts` performs **one** `load()` on the boot path and
returns `{ hydrated, initialThemeMode, initialLanguage, saveThemeMode,
saveLanguage }`; a key-by-key read would paint the default first.
`composition/useAppReady.ts` ANDs `hydrated` with the fonts, so **no frame paints
in the wrong language or the wrong theme**.

`composition/LanguageProvider.tsx` then holds the live language: the i18next
instance is created **from the hydrated value** — module scope is where it used to
live, and that is what fixed the language for the process lifetime — and
`setLanguage` calls `changeLanguage` and writes through the repository without
waiting. A preference that fails to persist is a `console.warn`, not a crash.
`AppProviders` keeps `I18nextProvider` outermost, over `ContainerProvider`.

## Copy and translation

Every user-visible string goes through a key. `i18n/resources/fr.ts` is the
source of truth — the mockups are French — and `i18n/resources/en.ts` is a
**full** translation typed as `typeof fr`, so a missing or stray key fails
`npm run typecheck`. Keys read `<area>.<screen>.<element>`; the areas are
`common`, `link`, `modules`, `dashboard`, `water`, `heater`, `battery` and
`settings`.

- **`i18n/keys.ts` types `t()`.** It merges `CustomTypeOptions` into the
  `i18next` module, so `t('does.not.exist')` is a compile error and
  `TranslationKey` is the union of every dotted path the dictionary defines.
- **`domain/` carries keys, never copy.** `ModuleDescriptor.displayNameKey` and
  `.tabTitleKey` are typed as the template literals
  `` `modules.${ModuleKey}.name` `` / `` .tab ``. A literal is not an import, so
  `domain-has-no-framework` still holds, and the types stay assignable to
  `TranslationKey` without a cast — renaming a dictionary key breaks the
  consumer, not silently the UI. A domain **test** may import `@/i18n` — every
  arch rule excludes `__tests__/` — and
  `domain/modules/__tests__/ModuleDescriptor.test.ts` does, to prove each
  `labelKey` in the catalogue resolves to a real key. The rule binds shipped
  code; the assertion belongs next to the catalogue it guards.
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
- **The language comes from the device only when nothing is stored.**
  `i18n/language.ts` maps `expo-localization`'s `getLocales()[0].languageCode` to
  `fr` / `en`, `fr` otherwise — that is the fallback. A *chosen* language is the
  preferences port's, and the live instance is `LanguageProvider`'s; see
  "The language is hydrated before the first paint" above.
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
reading any more. A module tab never paints a substituted default: `ModuleScreen`
takes the tab over before any reading is asked for, so the `DEFAULT_*` snapshots
the screens pass `useObservable` are seed values, not an offline fallback.

`EXPO_PUBLIC_FAKE_BLE` is read **once**, by `createContainer()`, and it is the
only branch in the app. Expo inlines `EXPO_PUBLIC_*` at build time, so this is
a build-time switch, not a runtime setting. Anything other than exactly `"1"`
builds the BLE stack, so no fake is reachable unless you ask for one.

| container slot | real | fake |
|---|---|---|
| `bluetooth` | `Bluetooth` (ble-plx) | `FakeBluetooth` |
| `transports` | `BleTransportFactory` | `FakeTransportFactory` |
| `deviceRepository` | `SecureStoreDeviceRepository` | `InMemoryDeviceRepository` |
| `preferences` | `AsyncStoragePreferencesRepository` | `InMemoryPreferencesRepository` |

What the fake serves:

| module | source | reads |
|---|---|---|
| water | `scenarios/waterScenario.ts` | clean tank 100 L at 72 %, grey tank 80 L at 40 %, drain valve auto-closing after 45 s |
| heater | `scenarios/heaterScenario.ts` | four zones (21.5 / 19.0 / 17.5 / 23.0 °C), zones 0 and 3 running, indoor 21.5 °C / 45 % / 1013.2 hPa, outdoor 12.0 °C |
| battery | `scenarios/jkBmsFrames.ts` | a JK-BMS read-all reply — synthesised, not captured from the van: 4 cells, 13.20 V, +5.00 A, 98 % |

The fakes are firmware, not fixtures: they answer commands and keep what they
are told. Writing a setpoint and reading it back returns the new value, and a
write out of the firmware's range answers `ERR_CFG_RANGE`.

They carry **one deliberate lie**: a tank height of **9999 mm** is heard and
never answered. Real firmware answers every command, so silence is a radio
condition, not a scenario — but without it the timeout path (write, no ack,
readback, *the configuration was not applied*) cannot be reached off-vehicle,
and that path is the one the whole save reporting rests on. That is why
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

## Recorded, not fixed

Found while reviewing #6 and left deliberately: each is #7 or #8 work, and none
blocks the hardware validation. Written down so the next reader finds them
before rediscovering them.

#7 closed the entry that was its own: `useFeedbackToast` still announces failures
only, but each settings form now fires its own success toast where it sends, so
nothing was lost when the sections' hand-rolled `ToastAndroid` went — and with
those four sections deleted, `TOAST_ALLOWED` is empty.

**Behaviour**

- `DrainValve`'s restore-on-failure is **last-write-wins**. An `AUTO_CLOSED`
  landing while a `CLOSE` write is in flight is overwritten by the stale
  pre-write value when that write rejects. The clean shape is a conditional
  revert — restore only if nothing else moved the state meanwhile.
- **Firmware, not mobile**: `water-module/lib/program/TankValveListner.cpp:30`
  answers `CLOSE` with `closeValve("CLOSED")` and no `_isOpen` guard, so a tap
  landing just after an `AUTO_CLOSED` reports the closure as manual.
- `Feedback` carries no occurrence identity, so two identical failures in a row
  are one value change and produce one toast: a second failed close is silent.
- `formatRemainingTime` emits unlocalized user-facing copy (`"24h 51m"`) from
  `domain/battery/BatteryTelemetry.ts`. `no-domain-copy` is a French-spelling
  detector, so it misses it — this is the "nothing but review enforces that"
  case that section warns about.

**Rendering**

- `GaugeBars` does not forward `GaugeSurface`'s `hatched` prop, so an absent
  (0 V) battery cell draws as a flat `0.000` bar instead of a hatched one.
- `AlarmBanner` clips when all seven battery alarms are joined into its fixed
  58 px row — exactly when the pack is in trouble and the copy matters most.
- The meniscus is decided from the `ratio` prop while the fill animates, so it
  is wrong at both ends of a sweep (see the gauge section of
  [design-system.md](./design-system.md#gauges)). Planning decision 15 deferred
  the 0.9 → 1.0 case; #6 found the 0.3 → 0 one, which unmarks the boundary for
  a whole drain.

**Tests**

- `__mocks__/react-native-gesture-handler.tsx` over-permits activation: it
  fires `onEnd(true)` on every mouseup, where real RNGH gives no `onEnd` below
  its 15 px slop. RNGH ships `fireGestureHandler` / `getByGestureTestId` in
  `jestUtils`, which replay real state sequences.
- The shared harness has leaked state twice, found independently — a per-device
  cache in `FakeTransportFactory`, and a broken write outliving its test.
  `FakeChannel.restoreWrites`' caller loop iterates the write-recording
  side-channel rather than a registry of channels, so a channel nobody wrote to
  is never restored.

**The mockup**

- The battery aside is **arithmetically wrong**: it shows `14 h 20` for 164 Ah
  at −88 W / −6.6 A, which is ~25 h. Two reviewers confirmed it by two routes.
  The code is right; the mockup should carry the annotation.

## Hardware validation

`adb install` is blocked on the test phone, so every check runs by hand. The
list lives in the *Definition of done* of issue #6. One item is not in it and
belongs to whoever runs the pass:

- **Does Bord scroll?** It stacks fixed-height cards — measured at ~590 px for
  four cards plus the tile strip, against ~560 dp of usable height on a 640 dp
  phone — and carries no `ScrollView`. Whether the tile strip falls under the
  tab bar has to be **measured on the real phone**; the mockup's fixed frame
  cannot answer it.
