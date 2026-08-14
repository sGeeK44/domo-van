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
| `hatchBase` / `hatchStripe` | the two `<Hatch/>` stripe colours |
| `onFill` / `onFillMuted` | ink over a `fill.*` surface |
| `onFillSurface` | translucent black for a control sitting **on** a fill, so the fill shows through |
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
| `sectionLabel` | Archivo 800 | 12 / 12 | section label |
| `cardLabel` | Archivo 800 | 13 / 13 | card label |
| `rowTitle` | Archivo 700 | 16 / 16 | row heading |
| `body` | Archivo 500 | 17 / 24.6 | body copy |
| `bodySmall` | Archivo 400 | 15 / 22.5 | secondary copy |
| `button` | Archivo 900 | 17 / 17 | primary button |
| `buttonSmall` | Archivo 800 | 12 / 12 | compact button |
| `buttonMedium` | Archivo 800 | 14 / 14 | reconnect button |
| `metricSmall` | Archivo 800 | 24 / 24 | aside metric (autonomy) |
| `metric` | Archivo 800 | 34 / 34 | metric |
| `metricMedium` | Archivo 800 | 40 / 36 | zone temperature |
| `metricLarge` | Archivo 800 | 64 / 57.6 | hero metric |
| `metricHuge` | Archivo 800 | 72 / 62 | full-bleed metric |
| `toast` | Archivo 700 | 13 / 16.9 | toast |
| `mono` | Space Mono 700 | 12 / 12 | mono value |
| `monoLabel` | Space Mono 700 | 11 / 11 | mono label, cell id |
| `monoSmall` | Space Mono 400 | 12 / 14.4 | mono caption |
| `monoStrong` | Space Mono 700 | 14 / 14 | zone subtitle |
| `monoValue` | Space Mono 700 | 15 / 18 | gauge reading, column footer |

`MetricUnitSize` gives the unit span that sits inside a metric — the mockup
renders `72` and its `%` at two sizes in the same line. Key it by the metric's
own style: `metric` → 19, `metricLarge` → 30, `metricHuge` → 34.

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
| `components/home/battery-gauge.tsx` | #5 |
| `components/water/water-tank.tsx` | #5 |
| `components/heater/temperature-colors.ts` | #5 (the heat-dial gradient is domain logic) |
| `components/water/drain-slider.tsx` | #6 |
| `components/modules/UnpairSheet.tsx` | #6 |
| `components/water-settings/TankSettingsSection.tsx` | #7 (`ToastAndroid`) |
| `components/water-settings/ValveSettingsSection.tsx` | #7 (`ToastAndroid`) |
| `components/heater-settings/HeaterPidSection.tsx` | #7 (`ToastAndroid`) |
| `components/module-settings/AdminSection.tsx` | #7 (`ToastAndroid`) |

The list shrinks as #5, #6 and #7 rewrite those feature components onto the
tokens and the toast; #8 removes the guardrail's last non-permanent entry. No
`design-system/` file other than `tokens.ts` may appear here — a dedicated test
asserts it.
