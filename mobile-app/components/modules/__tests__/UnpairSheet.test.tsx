// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnpairSheet } from "@/components/modules";
import { ThemeProvider } from "@/design-system";

function renderSheet(isUnpairing: boolean) {
  const onCancel = vi.fn();

  render(
    <ThemeProvider>
      <UnpairSheet
        visible
        moduleName="Eau"
        deviceName="Cuve"
        isUnpairing={isUnpairing}
        onCancel={onCancel}
        onConfirm={() => {}}
      />
    </ThemeProvider>,
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
