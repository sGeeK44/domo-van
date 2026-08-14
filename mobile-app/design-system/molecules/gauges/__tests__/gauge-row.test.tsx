// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GaugeRow,
  type GaugeRowProps,
} from "@/design-system/molecules/gauges/gauge-row";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

// Colours no palette entry holds: a row painting a domain token instead of its props cannot pass.
const FILL = "rgb(255, 0, 255)";
const LINE = "rgb(0, 255, 255)";

const BASE = {
  ratio: 0.72,
  fillColor: FILL,
  lineColor: LINE,
  icon: "water-drop",
  label: "EAU CLAIRE",
  subtitle: "72 L / 100 L",
} as const satisfies GaugeRowProps;

const RECONNECT = {
  icon: "refresh",
  label: "RECONNECTER",
  tone: "danger",
  onPress: () => {},
} as const;

function row(props: Partial<GaugeRowProps>, theme: ThemeName = "dark") {
  return (
    <ThemeProvider initialMode={theme}>
      <GaugeRow {...BASE} {...props} />
    </ThemeProvider>
  );
}

function styleOf(testID: string): CSSStyleDeclaration {
  return screen.getByTestId(testID).style;
}

/** jsdom normalises every colour it is given to `rgb()`, the palette spells them in hex. */
function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((at) =>
    Number.parseInt(hex.slice(at, at + 2), 16),
  );
  return `rgb(${red}, ${green}, ${blue})`;
}

describe("a gauge row", () => {
  afterEach(cleanup);

  it("shows its reading over the fill, and no action", () => {
    render(row({ value: { amount: "72", unit: "%" } }));

    expect(screen.getByTestId("gauge-row-value").textContent).toBe("72%");
    expect(styleOf("gauge-fill").width).toBe("72%");
    expect(screen.getByText("EAU CLAIRE")).toBeTruthy();
    expect(screen.queryByTestId("gauge-row-action")).toBeNull();
    expect(screen.queryByTestId("gauge-hatch")).toBeNull();
  });

  it.each<ThemeName>([
    "light",
    "dark",
  ])("paints the %s row in the colours its caller chose, not in a token", (theme) => {
    render(row({}, theme));

    expect(styleOf("gauge-fill").backgroundColor).toBe(FILL);
    expect(styleOf("gauge-meniscus").backgroundColor).toBe(LINE);
  });

  it("hatches an offline module and offers its action instead of a reading", () => {
    render(
      row({
        state: "hatched",
        subtitle: "Hors ligne depuis 15:08",
        subtitleTone: "danger",
        value: { amount: "72", unit: "%" },
        action: RECONNECT,
      }),
    );

    expect(screen.getByTestId("gauge-hatch")).toBeTruthy();
    expect(screen.queryByTestId("gauge-fill")).toBeNull();
    expect(screen.queryByTestId("gauge-row-value")).toBeNull();
    expect(screen.getByText("RECONNECTER")).toBeTruthy();
  });

  it("marks no boundary on a hatched row", () => {
    render(row({ state: "hatched" }));
    expect(screen.queryByTestId("gauge-meniscus")).toBeNull();

    cleanup();
    render(row({}));
    expect(screen.getByTestId("gauge-meniscus")).toBeTruthy();
  });

  it("offers to fill an empty slot instead of reading it", () => {
    render(
      row({
        state: "hatched",
        subtitle: "aucun module",
        subtitleTone: "muted",
        trailingAdd: true,
      }),
    );

    expect(screen.getByTestId("gauge-hatch")).toBeTruthy();
    expect(screen.getByText("add")).toBeTruthy();
    expect(screen.queryByTestId("gauge-row-action")).toBeNull();
    expect(screen.queryByTestId("gauge-row-value")).toBeNull();
  });

  it.each<ThemeName>([
    "light",
    "dark",
  ])("warns in the %s palette's danger, never in a hard-coded red", (theme) => {
    render(row({ state: "hatched", subtitleTone: "danger" }, theme));

    expect(styleOf("gauge-row-subtitle").color).toBe(rgb(Colors[theme].danger));
  });

  it("runs the action it is given", () => {
    const onPress = vi.fn();
    render(row({ state: "hatched", action: { ...RECONNECT, onPress } }));

    fireEvent.click(screen.getByTestId("gauge-row-action"));

    expect(onPress).toHaveBeenCalledOnce();
  });

  it("opens the module it stands for when the whole card is pressed", () => {
    const onPress = vi.fn();
    render(row({ onPress }));

    fireEvent.click(screen.getByTestId("gauge-row"));

    expect(onPress).toHaveBeenCalledOnce();
  });
});
