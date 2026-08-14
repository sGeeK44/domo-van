// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfflineCard } from "@/design-system/molecules/gauges/offline-card";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";
import { Colors, type ThemeName } from "@/design-system/tokens";

const THEMES: ThemeName[] = ["light", "dark"];

// The icons reach the DOM as their own name, so they must differ to be told apart.
const ICON = "cloud-off";
const ACTION_ICON = "refresh";
const TITLE = "BATTERY OFFLINE";
const LAST_CONTACT = "Last contact 15:08";
const ACTION_LABEL = "RECONNECT";

function card(
  props: Partial<Parameters<typeof OfflineCard>[0]> = {},
  theme: ThemeName = "dark",
) {
  return (
    <ThemeProvider initialMode={theme}>
      <OfflineCard
        icon={ICON}
        title={TITLE}
        lastContact={LAST_CONTACT}
        action={{ icon: ACTION_ICON, label: ACTION_LABEL, onPress: () => {} }}
        {...props}
      />
    </ThemeProvider>
  );
}

function busy(theme: ThemeName) {
  return card(
    {
      action: {
        icon: ACTION_ICON,
        label: ACTION_LABEL,
        busy: true,
        onPress: () => {},
      },
    },
    theme,
  );
}

/** A themed StyleSheet reaches the DOM as a class, so the cascade has to be resolved. */
function paintOf(testID: string): CSSStyleDeclaration {
  return window.getComputedStyle(screen.getByTestId(testID));
}

function inkOf(text: string): string {
  return window.getComputedStyle(screen.getByText(text)).color;
}

/** The palette is written in hex; the DOM answers in rgb(). */
function rgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) =>
    Number.parseInt(hex.slice(start, start + 2), 16),
  );
  return `rgb(${r}, ${g}, ${b})`;
}

describe("an offline card", () => {
  afterEach(cleanup);

  it("hatches the whole card and reads its state, with no level to show", () => {
    render(card());

    // GaugeSurface hatches under its own testID, so this one proves the card is not built on it.
    expect(screen.getByTestId("offline-hatch")).toBeTruthy();
    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(LAST_CONTACT)).toBeTruthy();
    expect(screen.getByText(ACTION_LABEL)).toBeTruthy();
    expect(screen.getByText(ICON)).toBeTruthy();
    // An offline module has no reading to show.
    expect(screen.queryByTestId("gauge-fill")).toBeNull();
  });

  // The hatch runs to the corners, so only the card clips it back to its radius.
  it("clips the hatch to the rounded card", () => {
    render(card());

    // react-native-web expands overflow into its two axes; the shorthand reads empty.
    const { overflowX, overflowY } = paintOf("offline-card");

    expect([overflowX, overflowY]).toEqual(["hidden", "hidden"]);
  });

  // The hatch is absolute, so only paint order puts the content above it.
  it("draws the content after the hatch", () => {
    render(card());

    const order = screen
      .getByTestId("offline-hatch")
      .compareDocumentPosition(screen.getByText(TITLE));

    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // text, onFill and inverse are one ink in both themes: this pins the muted and danger inks only.
  it.each(THEMES)("reads as an error until a retry runs (%s)", (theme) => {
    const colors = Colors[theme];
    render(card({}, theme));

    expect(inkOf(TITLE)).toBe(rgb(colors.text));
    expect(inkOf(LAST_CONTACT)).toBe(rgb(colors.textMuted));
    expect(inkOf(ICON)).toBe(rgb(colors.textMuted));
    expect(inkOf(ACTION_LABEL)).toBe(rgb(colors.danger));
    expect(inkOf(ACTION_ICON)).toBe(rgb(colors.danger));
    expect(paintOf("offline-action").borderTopColor).toBe(rgb(colors.danger));
  });

  it.each(THEMES)("dims the action while reconnecting (%s)", (theme) => {
    const colors = Colors[theme];
    render(busy(theme));

    expect(inkOf(ACTION_LABEL)).toBe(rgb(colors.textMuted));
    expect(inkOf(ACTION_ICON)).toBe(rgb(colors.textMuted));
    expect(paintOf("offline-action").borderTopColor).toBe(
      rgb(colors.textMuted),
    );
    // Outlined, never filled: the card behind it stays hatched.
    expect(paintOf("offline-action").borderTopWidth).toBe("1.5px");
  });

  it("stays pressable while reconnecting", () => {
    const onPress = vi.fn();
    render(
      card({
        action: {
          icon: ACTION_ICON,
          label: ACTION_LABEL,
          busy: true,
          onPress,
        },
      }),
    );

    fireEvent.click(screen.getByTestId("offline-action"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
