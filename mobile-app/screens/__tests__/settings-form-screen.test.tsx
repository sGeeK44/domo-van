// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { Text } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

// createContainer reads this switch at import time, hence the dynamic imports below.
process.env.EXPO_PUBLIC_FAKE_BLE = "1";

const { pairOnly, renderModuleScreen } = await import("./moduleScreenHarness");
const { SettingsFormScreen } = await import("@/screens/settings-form-screen");
const { resetNavigation, routerStack, useRouter } = await import(
  "@/__mocks__/expo-router"
);

const FORM_ROUTE = "/settings/water-tanks";

/** The three surfaces a form is opened from, all by a push: tab, Réglages, Modules. */
const ENTRY_POINTS = ["/water", "/settings", "/modules"];

type WaterFormProps = { save?: { onPress: () => void; busy: boolean } };

function WaterForm({ save }: WaterFormProps) {
  return (
    <SettingsFormScreen
      moduleKey="water"
      crumbKey="modules.water.tab"
      titleKey="water.tanks.title"
      introKey="water.tanks.intro"
      noteKey="water.tanks.note"
      save={save}
    >
      {(system) => (
        <Text testID="tank">
          {String(system.cleanTank.getValue().percentage)}
        </Text>
      )}
    </SettingsFormScreen>
  );
}

async function onlineForm(props: WaterFormProps = {}) {
  const harness = renderModuleScreen(<WaterForm {...props} />);
  await pairOnly(harness, ["water"]);
  await screen.findByTestId("tank");

  return harness;
}

function pressBack() {
  fireEvent.click(screen.getByText("arrow-back"));
}

describe("the shell every settings form is built on", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
  });

  it("offers to pair instead of the form when the slot is free", async () => {
    const harness = renderModuleScreen(<WaterForm />);
    await pairOnly(harness, []);

    expect(await screen.findByTestId("module-unpaired")).toBeTruthy();
    expect(screen.queryByTestId("tank")).toBeNull();
  });

  // Planning decision 13: the row still navigates, the form shows the notice.
  it("takes the form over when the module is offline", async () => {
    const harness = await onlineForm();

    await act(async () => {
      harness.dropLink("fake-water");
    });

    expect(await screen.findByTestId("offline-card")).toBeTruthy();
    expect(screen.queryByTestId("tank")).toBeNull();
  });

  it("carries the crumb, the title, the intro and the note around the cards", async () => {
    await onlineForm();

    expect(screen.getByTestId("settings-header").textContent).toContain("Eau");
    expect(screen.getByText("Mesure des cuves")).toBeTruthy();
    expect(screen.getByText(/Le capteur mesure une distance/)).toBeTruthy();
    expect(screen.getByText(/Durée de vanne ≤ 300 s/)).toBeTruthy();
  });

  it("renders no save button on a read-only form", async () => {
    await onlineForm();

    expect(screen.queryByTestId("settings-form-save")).toBeNull();
  });

  it("saves the whole form through the one button the mockup draws", async () => {
    const onPress = vi.fn();
    await onlineForm({ save: { onPress, busy: false } });

    const button = screen.getByTestId("settings-form-save");

    expect(button.textContent).toBe("ENREGISTRER");
    fireEvent.click(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("ignores a second press while the first save is in flight", async () => {
    const onPress = vi.fn();
    await onlineForm({ save: { onPress, busy: true } });

    fireEvent.click(screen.getByTestId("settings-form-save"));

    expect(onPress).not.toHaveBeenCalled();
  });
});

// Acceptance example 4, once per surface a form is opened from.
describe("the back action of a settings form", () => {
  afterEach(() => {
    cleanup();
    resetNavigation();
  });

  it.each(
    ENTRY_POINTS,
  )("returns to %s, which pushed the form", async (from) => {
    const router = useRouter();
    router.push(from);
    router.push(FORM_ROUTE);
    await onlineForm();

    pressBack();

    expect(routerStack.at(-1)).toBe(from);
  });

  it("leaves the caller on the stack rather than swapping it out", async () => {
    const router = useRouter();
    router.push("/water");
    router.push(FORM_ROUTE);
    await onlineForm();

    pressBack();

    expect(routerStack).toEqual(["/(tabs)", "/water"]);
  });
});
