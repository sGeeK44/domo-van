// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "@/design-system";
import GaugeGalleryScreen from "@/screens/gauge-gallery-screen";

/** A section that silently disappears takes an on-device check with it, so each is named. */
const SEEDED_SECTIONS = [
  "Horizontal fill",
  "Vertical fill",
  "Marker and outline",
  "Corner clipping",
  "Level change",
  "Gauge row",
  "Hero and bars",
  "Column gauge",
];

describe("the dev gauge gallery", () => {
  afterEach(cleanup);

  const renderGallery = () =>
    render(
      <ThemeProvider initialMode="dark">
        <GaugeGalleryScreen />
      </ThemeProvider>,
    );

  it("seeds a section for each thing a device check has to look at", () => {
    renderGallery();

    for (const title of SEEDED_SECTIONS) {
      expect(screen.getByText(title)).toBeTruthy();
    }
  });

  it("renders the hatch, the marker and the outline, not only plain fills", () => {
    renderGallery();

    expect(screen.getAllByTestId("gauge-fill").length).toBeGreaterThanOrEqual(
      SEEDED_SECTIONS.length,
    );
    expect(screen.getAllByTestId("gauge-hatch").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByTestId("gauge-marker").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByTestId("gauge-outline").length,
    ).toBeGreaterThanOrEqual(1);
  });
});
