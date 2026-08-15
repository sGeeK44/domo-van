# Design system

`design-system/` is domain-independent: it knows tokens, atoms, molecules and
the theme, and nothing about tanks, zones or batteries. Everything a component
draws — colour, spacing, radius, type — comes from `design-system/tokens.ts`.
No literal hex or `rgba()` outside that file; the guardrail below enforces it.

## Tokens

`Colors` is `Record<ThemeName, Palette>`: every token carries a light **and** a
dark value, so a missing pair is a type error. Read them through `useThemeColor()`
(or `useStyles`, below), never `Colors.dark` directly.

| Token | Meaning |
|---|---|
| `screen` | page background |
| `surface` | card / row background |
| `sheet` | bottom-sheet background |
| `scrim` | the dim behind a sheet: what it covers stays visible under it |
| `chip` | small inset pill background |
| `inset` | recessed background, equal to `screen` |
| `off` | inert / switched-off fill |
| `dash` | dashed placeholder stroke |
| `tabBar` | tab-bar background |
| `border` | hairline; a ring is a border coloured like `screen` |
| `text` | primary ink |
| `textSecondary` | second-level ink |
| `textMuted` | dimmed ink, captions and neutral status |
| `inverse` / `onInverse` | inverted surface and the ink on it (toast, primary button) |
| `danger` / `success` | error and confirmation |
| `dangerBorder` / `successBorder` | the translucent outline of a danger / success container |
| `dangerSurface` / `successSurface` | its tint: the progress trough, the banner background |
| `onDanger` | ink over a `danger` fill (the slide knob, *fermer maintenant*) |
| `hatchBase` / `hatchStripe` | the two `<Hatch/>` stripe colours |
| `onFill` / `onFillMuted` | ink over a `fill.*` surface |
| `onFillSurface` | translucent black for a control sitting **on** a fill, so the fill shows through. Light is `0.22`: at `0.12` the stepper read ~1.4:1 on the heat fill, under WCAG 1.4.11's 3:1 |
| `fill.{battery,cleanWater,greyWater,heat}` | the four domain fills, chosen by the caller |
| `line.{…}` | the matching stroke / accent for each fill |

`Spacing`, `BorderRadius`, `Opacity`, `FontWeight` and `FontSize` are the
numeric scales. `FontFamilies` lists the eight bundled Archivo / Space Mono
faces; a weight is reached by naming the face, never through `fontWeight`
(Android does not synthesise weights for custom faces).

`Motion` holds the gauge transition durations, in milliseconds:

| Duration | Value | Use |
|---|---|---|
| `Motion.fill` | 500 | a level moving to a new value |
| `Motion.marker` | 300 | a setpoint marker moving, independently of the fill |
| `Motion.drain` | 1000 | the slower sweep of a draining tank |

### The radius absorption

`BorderRadius` is deliberately coarse: 15 mockup values were normalised into 8
steps. The gauge mockups' 16 / 22 / 26 are **absorbed**, not re-added — the
deviation is at most 2 px and the hierarchy holds (bar < setpoint row <
dashboard row < column / hero). Do not re-add them.

| Mockup | Token | Δ | Form |
|---|---|---|---|
| 16 | `BorderRadius.m` = 15 | −1 | cell bar |
| 22 | `BorderRadius.xl` = 20 | −2 | setpoint row |
| 24 | `BorderRadius.xxl` = 24 | 0 | dashboard row |
| 26 | `BorderRadius.xxxl` = 28 | +2 | column, hero, offline card |

## Text styles

`TextStyles` collapses the mockups' 46 `font:` shorthands into named entries.
Each is a complete `TextStyle` (family, size, line-height, letter-spacing) and
carries **no** `fontWeight`. Spread one into a style: `{ ...TextStyles.toast }`.

| Style | Family | Size / line-height | Use |
|---|---|---|---|
| `screenTitle` | Archivo 900 | 26 / 26 | page title |
| `formTitle` | Archivo 900 | 32 / 33.6 | settings form title |
| `crumb` | Archivo 800 | 20 / 20 | the module a form belongs to, in its header |
| `sectionLabel` | Archivo 800 | 12 / 12 | section label |
| `cardLabel` | Archivo 800 | 13 / 13 | card label |
| `rowTitle` | Archivo 700 | 16 / 16 | row heading |
| `labelStrong` | Archivo 700 | 14 / 14 | preset button, valve chip |
| `body` | Archivo 500 | 17 / 24.6 | body copy |
| `bodySmall` | Archivo 400 | 15 / 22.5 | secondary copy |
| `caption` | Archivo 400 | 12 / 16.8 | hint under a control |
| `bannerText` | Archivo 600 | 14 / 18.2 | alarm banner |
| `button` | Archivo 900 | 17 / 17 | primary button |
| `buttonSmall` | Archivo 800 | 12 / 12 | compact button |
| `buttonMedium` | Archivo 800 | 14 / 14 | reconnect button, slide label |
| `metricTile` | Archivo 800 | 20 / 20 | stat tile value |
| `metricSmall` | Archivo 800 | 24 / 24 | aside metric (autonomy) |
| `metric` | Archivo 800 | 34 / 34 | metric |
| `metricMedium` | Archivo 800 | 40 / 36 | zone temperature |
| `metricLarge` | Archivo 800 | 64 / 57.6 | column (tank) metric |
| `metricHuge` | Archivo 800 | 72 / 62 | hero metric |
| `toast` | Archivo 700 | 13 / 16.9 | toast |
| `mono` | Space Mono 700 | 12 / 12 | mono value |
| `monoLabel` | Space Mono 700 | 11 / 11 | mono label, cell id |
| `monoSmall` | Space Mono 400 | 12 / 14.4 | mono caption |
| `monoStrong` | Space Mono 700 | 14 / 14 | zone subtitle |
| `monoValue` | Space Mono 700 | 15 / 18 | gauge reading, column footer |
| `monoReadout` | Space Mono 700 | 20 / 20 | settings field value, read or typed |
| `monoMetric` | Space Mono 700 | 26 / 26 | countdown |

`MetricUnitSize` gives the unit span that sits inside a metric — the mockup
renders `72` and its `%` at two sizes in the same line. Key it by the metric's
own style: `metric` → 19, `metricLarge` → 30, `metricHuge` → 34.

### The letter-spacing absorptions

Two of the mockup's shorthands land on an entry that already exists, at a
deviation not worth a sixth style:

| Mockup | Entry | Δ |
|---|---|---|
| the valve chip's `700 13/1` | `labelStrong` (14 / 14) | +1 px |
| *GLISSER POUR OUVRIR*'s `.1em` tracking | `buttonMedium`'s `0.84` | −0.56 |

### The settings-kit absorptions

The settings mockups name five type steps; three of them already exist, and two
of the remaining shorthands land within a pixel of an entry:

| Mockup | Entry | Δ |
|---|---|---|
| the field label's `700 11px`, `.1em` mono | `monoLabel` (11 / 11, 1.1) | 0 |
| the group label's `800 12px`, `.12em` | `sectionLabel` (12 / 12, 1.44) | 0 |
| the card label's `800 13px`, `.12em` | `cardLabel` (13 / 13, 1.56) | 0 |
| the unit's `400 13px` mono | `monoSmall` (12 / 14.4) | −1 px |
| the nav row's subtitle `400 12px` mono | `monoSmall` | 0 |
| the segments' `800 13px` (langue) and `800 12px` (thème) | `buttonSmall` (12 / 12) | −1 / 0 |

The segments' two horizontal paddings — 16 px on langue, 13 px on thème — collapse
onto `Spacing.xl` (14) for the same reason: the two rails are one control, and
the mockup laid them out on separate screens.

## `useStyles`

```ts
const styles = useStyles(makeStyles);
// …
const makeStyles = (colors: Palette) =>
  StyleSheet.create({ card: { backgroundColor: colors.surface } });
```

`useStyles` reads the palette from the theme context and memoises the sheet on
it, so styles rebuild only when the theme flips. Reach for it whenever a
`StyleSheet` needs a colour; keep the factory at module scope so the memo holds.
A component that also needs a raw colour (an icon tint, a placeholder) still
calls `useThemeColor()` alongside it. A colourless sheet stays a plain
`StyleSheet.create`.

## `<Hatch/>`

`<Hatch style?/>` fills its parent with 7px diagonal stripes at 135° between
`hatchBase` and `hatchStripe`, on a `react-native-svg` `<Pattern>`. It sizes to
100 % of its container, so place it behind a gauge in an absolute-fill wrapper.
The gauges of #5 use it for the offline and empty-slot states.

## Gauges

Everything measurable in the van is a level, so everything is drawn as a level:
a container filling from an edge, with a bright 2 px **meniscus** marking the
fill edge. The family lives in `design-system/molecules/gauges/` behind a
barrel, on top of one atom.

### `<GaugeSurface/>`, the primitive

`design-system/atoms/gauge-surface.tsx` owns all the geometry; every variant is
a layout placed inside it. It is domain-free — the caller supplies every colour.

| Prop | Meaning |
|---|---|
| `ratio` | 0..1, clamped; `NaN` collapses to 0 |
| `axis` | `"vertical"` fills bottom-up, `"horizontal"` left-to-right |
| `fillColor` / `lineColor` | the domain fill and its meniscus; omit `lineColor` for no boundary line |
| `markerRatio` / `markerColor` | a second 2 px line, independent of the fill (a setpoint) |
| `hatched` | replaces the fill with `<Hatch/>`: offline, or an empty slot |
| `radius`, `outline`, `duration`, `style`, `children` | the container, its ring, the sweep |
| `testID` | defaults to `gauge-surface`; every variant forwards its own, so a screen holding two of the same gauge can address one of them |

Rules the primitive holds, so no variant has to:

- **The axis belongs to the form, not to the domain.** The dashboard row fills
  left-to-right for battery *and* water; the tank column fills bottom-up. "Heat
  fills from the left" is true of the heat *screen*, whose zones are rows. Each
  variant fixes its own axis.
- **No meniscus at 0 % or 100 %.** Neither an empty nor a full surface has a
  boundary left to mark (`drawsMeniscus`). The mockup relied on the line being
  clipped off the edge, and on passing `transparent` on the all-zones-off heater
  card; React Native needs both rules stated.
- **The outline is an absolutely-positioned overlay ring**, not a border on the
  container — a border would shift the variant's content inward by its width.
- **`hatched` suppresses the fill, the meniscus and the marker.** A hatched
  surface shows no reading at all: a last known value is not a measurement.
- **The first paint does not sweep.** The shared value is *initialised* at the
  incoming ratio; only later changes animate.
- The **marker** carries a proportional inset, so it is not clipped away at
  ratio 0 or 1. The **meniscus** does not, so it starts clipping above
  `1 − 2/H`, `H` being the surface's extent along the fill axis: 0.989 on the
  186 px `GaugeHero`, where ratio 0.99 loses 0.14 px of the 2 px line, and
  higher still on the taller `GaugeColumn` and the full-width `GaugeRow`. A
  surface has to be under 100 px for 0.99 to push *most* of the line out, and
  the only ones that short are the `GaugeBars` bars, which draw no meniscus.
- The meniscus mounts and unmounts on the `ratio` **prop** while its position
  animates on the shared value, so it is wrong at **both** ends of the sweep: a
  0.9 → 1.0 change drops the line at once and the fill then sweeps on unmarked,
  and a 0.3 → 0 change unmounts the boundary for the whole drain rather than at
  the end of it. Recorded in `architecture.md`, not fixed here.

`Motion` (above) holds the durations. It is **duration-only**: the mockup's
drain is `1s linear`, the token keeps the second but the sweep runs on
Reanimated's default easing, so the ease-vs-linear distinction the mockup
encodes does not exist here.

**Worklets.** `design-system/atoms/gauge-geometry.ts` is the only place in
`design-system/` allowed to hold `"worklet"` helpers: a source-level test walks
the tree and fails on a directive in any other file, and checks that every
helper in that one carries it. A missing directive crashes on device while
every test still passes, because the vitest mock runs `useAnimatedStyle` on the
JS thread.

### The variants

| Variant | Form | Reach for it when |
|---|---|---|
| `GaugeRow` | horizontal, h 96, `r 24` | a dashboard card: icon + label + mono subtitle + right-aligned value. `state: "hatched"` covers offline **and** empty slot — they differ only in the copy and the trailing element |
| `GaugeColumn` | vertical, `flex: 1`, `r 28` | a tank: header block on top, metric and footer at the bottom. `draining` adds the danger outline, the danger meniscus and the tinted ink |
| `GaugeHero` | vertical, h 186, `r 28` | one dominant metric with an aside — the battery screen's headline |
| `GaugeBars` | a row of vertical bars, `r 15` | a cluster of cells; each bar draws **no** meniscus and sits on `surface`, never on `off` — an unfilled cell is a card, not a switched-off one |
| `GaugeSetpointRow` | horizontal, `flex: 1`, `r 20` | a heat zone: a live fill, a target marker on its own duration, three controls, and an `inert` state for a switched-off zone. `decreaseDisabled` / `increaseDisabled` mark a target sitting on a clamp bound: that stepper alone goes dim and sends nothing. `inert` never dims a stepper — pressing ± is how a switched-off zone comes back on |

`OfflineCard` sits beside them but is not a gauge: a hatched card with an icon,
a title, the time of last contact and an outlined reconnect action whose ink
moves from `danger` to `textMuted` while `busy`.

### The four mockup deviations

The ticket and the mockup contradict each other in four places; #5 resolved them
here rather than in each variant:

| Point | Resolution |
|---|---|
| A hatched band above a draining fill | **Mockup wins.** Outline + meniscus + tinted ink only; no band. The sibling tank's `opacity: .55` is the caller's layout decision |
| The time of last contact on the offline state | **Ticket wins.** `OfflineCard` renders it, in `monoSmall` / `textMuted` |
| "the minimum cell dimmed" | **Mockup wins.** `GaugeBars` takes a per-bar label (`"C4 min"`); it ranks nothing and dims nothing |
| "legible on either side of the boundary" | **No per-position ink switch.** The four `fill.*` values share the card's luminance polarity, so `onFill` reads on both |

The drain colour is `danger`, not the mockup's raw unthemed orange — that hex
would not survive Clair, and the ticket's own wording says "danger outline,
danger meniscus".

### Looking at one

The four screens of #6 render every variant between them, so there is no gallery
route any more: Bord holds the rows and the hatched state, Eau the two columns
and their draining state, Chauffage the four setpoint rows and their `inert`
state, and Batterie the hero and the bars. #5 shipped a `__DEV__`-only gallery
route because it landed the family before any screen consumed it, which left the
rounded-corner clipping unverifiable on a device; #6 deleted that route.

## The screen components

Four forms the gauge family does not cover, all domain-free: they take formatted
strings and colours, and name no tank, zone or cell.

| Component | Form | Reach for it when |
|---|---|---|
| `StatTile` | `flex: 1`, h 68, `r 18` | a strip of readings: `monoLabel` name over a `metricTile` value |
| `AlarmBanner` | h 58, `r 18`, 1 px outline | one line of state, `tone: "ok"` or `"alarm"` |
| `SlideToConfirm` | h 80, `r 24`, a 68 px knob | an action too costly for a tap |
| `ProgressBar` | h 8, `r 4` | time or work left, on the caller's two colours |

### The tile-size absorption

The mockup draws the tile at three sizes, none of them a decision — the
dashboard strip, the battery stats and the battery temperatures were laid out
separately. One `StatTile` absorbs all three, so the three strips read as one
family:

| Mockup | height | radius | value |
|---|---|---|---|
| Bord tiles | 64 | 16 | 20 |
| battery stats | 74 | 18 | 22 |
| battery temps | 66 | 18 | 19 |
| **absorbed** | **68** | **`BorderRadius.l`** | **`metricTile`** |

### The knob-fit absorption

The spec over-constrains `SlideToConfirm`: `height 80` + `borderWidth 1.5` +
`padding Spacing.xs (6)` leaves a content box of `80 − 3 − 12 = 65`, **3 px too
tight for its own 68 px knob** — with `overflow: "hidden"` the knob is clipped
top and bottom and its corners read flattened. The outer geometry is what the
mockup shows, so the padding absorbs the conflict:

| | spec | absorbed |
|---|---|---|
| track padding | `Spacing.xs` (6) | `Spacing.xxs` (4) |
| content box | 65 (knob 68 clipped) | **69** (knob 68 fits) |
| travel | `width − 2 × Spacing.xs − 68` | `width − 2 × (1.5 + Spacing.xxs) − 68` |

The travel counts the border too: the spec's formula ignored the 3 px of
`borderWidth`, so the knob overhung the padding box at full travel.

### The slide gesture

`SlideToConfirm` confirms past **68 %** of the knob's travel
(`trackWidth − 2 × (TRACK_BORDER + TRACK_PADDING) − 68`) and springs back below
it, so a tap fires nothing — the drain valve's rule, held by the control rather than by a screen.
It measures its own track through `onLayout` and confirms nothing until it has,
and it **never reads or writes a shared value during render**: doing so desyncs
Reanimated from the Fabric commit (the fix commit `db70094` bought). A pan RNGH
**cancels** — the OS steals the touch, a takeover unmounts the content under the
finger — ends with `onEnd(_, success: false)` and confirms nothing however far
the knob travelled. Tests drive it through
`__mocks__/react-native-gesture-handler.tsx`, which turns a mouse drag into the
pan callbacks and a `pointercancel` into the cancelled pan.

## The settings form kit

Six shapes the five settings forms and the Réglages screen share. Domain-free
like the gauges: the caller passes the colour, the copy and the value, already
formatted.

| Component | Form | Reach for it when |
|---|---|---|
| `AccentCard` | `r 20`, `bg surface`, a 5 px bar down the left edge | a group of fields under a label. `accent` is the module's `fill.*`, chosen by the caller |
| `FieldReadout` | `flex: 1`; a `monoReadout` value and a dim unit | a value the module publishes and the app does not edit |
| `FieldInput` | h 56, `r 15`, `bg inset`, a 1.5 px border | an editable value. The unit sits **outside** the input, so it is never part of what the user types |
| `SegmentedControl` | 36 px segments on an `inset` rail | a short closed list — langue, thème |
| `NavRow` | h 68, `r 18`, a 40 px chip | a row that opens a screen |
| `SettingsHeader` `variant="crumb"` | back arrow, the crumb, a spacer of the arrow's own width | the header of a settings form; `variant="title"` is the page header the other screens already use |

Rules the kit holds:

- **`invalid` is the mockup's unused slot.** The prototype's field border is
  always transparent because it has no validation; a form that refuses a value
  needs a visible one, so `invalid` paints `danger` at the same 1.5 width.
- **`dimmed` is not `disabled`.** An unpaired module's row goes to
  `Opacity.faint` and still navigates — the form it opens is what explains the
  emptiness.
- **A segment press reports a change, never the state.** Pressing the option
  already in place calls nothing.
- **The design system names no module.** `AccentCard` takes `accent` and
  `NavRow` takes `iconBackground` as colours; the `ModuleKey → fill.*` map lives
  in `components/`, beside the `DashboardCardKey → fill.*` map.

## The barrel

Import the design system through `@/design-system` from anywhere outside it, and
through concrete files (`@/design-system/theme/use-styles`) from inside it. The
`no-deep-design-system-import` arch rule blocks a deep import from a consumer.

## The toast

`useToast()` returns `{ show(message: string): void }` — the app's single
feedback channel. `show` replaces the current message and restarts a 2200 ms
timer, so a second call swaps rather than stacks. The **message is already
translated**: the caller does `show(t('water.valve.opened'))`. The design system
imports nothing from `i18n/` (the `design-system-has-no-copy` arch rule).

## The colour guardrail

`design-system/__tests__/no-literal-color.test.ts` walks `app/`, `components/`,
`design-system/` and `screens/` and fails on a `#rrggbb` or `rgba()` literal, and
on any `ToastAndroid` call — the native toast bypasses the channel above. Two
per-file exception maps bound it, each entry naming the issue that retires it:

| File | Retired by |
|---|---|
| `design-system/tokens.ts` | permanent — the palette itself |
| `components/water-settings/TankSettingsSection.tsx` | #7 (`ToastAndroid`) |
| `components/water-settings/ValveSettingsSection.tsx` | #7 (`ToastAndroid`) |
| `components/heater-settings/HeaterPidSection.tsx` | #7 (`ToastAndroid`) |
| `components/module-settings/AdminSection.tsx` | #7 (`ToastAndroid`) |

#6 emptied the colour half of the list of everything but the scrim, by deleting
the four feature components that carried a raw hex; #7 gave that scrim the
`scrim` token, so the colour half is down to the permanent `tokens.ts`. Once the
four settings sections are rewritten, the toast half goes with them.

Two tests keep the list from lying: no `design-system/` file other than
`tokens.ts` may appear in it, and **this table must name exactly the same files
as the maps in the test** — an entry deleted from the code and left in the doc
fails CI, which is how the four dead #6 rows above were caught.

`i18n/__tests__/no-literal-copy.test.ts` runs the same shape over copy. Its
`ALLOWED` map is **empty** since #6 deleted the gauge gallery.
