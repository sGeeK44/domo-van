// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnpairSheet } from "@/components/modules";
import { ThemeProvider } from "@/design-system";
import { createI18n } from "@/i18n/createI18n";

function renderSheet(isUnpairing: boolean) {
  const onCancel = vi.fn();

  render(
    <I18nextProvider i18n={createI18n("fr")}>
      <ThemeProvider>
        <UnpairSheet
          visible
          moduleName="Eau"
          deviceName="Cuve"
          isUnpairing={isUnpairing}
          onCancel={onCancel}
          onConfirm={() => {}}
        />
      </ThemeProvider>
    </I18nextProvider>,
  );

  return onCancel;
}

describe("the unpair sheet", () => {
  afterEach(cleanup);

  it("closes on the back gesture while it waits for the user", () => {
    const onCancel = renderSheet(false);

    fireEvent.keyUp(document, { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("ignores the back gesture while the unpair is in flight", () => {
    const onCancel = renderSheet(true);

    fireEvent.keyUp(document, { key: "Escape" });

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId("unpair-confirm")).toBeTruthy();
  });
});
