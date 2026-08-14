// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SlideToConfirm } from "@/design-system/molecules/slide-to-confirm";
import { ThemeProvider } from "@/design-system/theme/ThemeContext";

const TRACK_WIDTH = 340;
/** 340 − 2 × Spacing.xs − 68, the travel the knob has inside its track. */
const TRAVEL = 260;

function control(onConfirm = () => {}) {
  return (
    <ThemeProvider initialMode="dark">
      <SlideToConfirm
        icon="chevron-right"
        label="GLISSER POUR OUVRIR"
        onConfirm={onConfirm}
      />
    </ThemeProvider>
  );
}

/** react-native-web hangs the onLayout handler on the node; jsdom lays nothing out on its own. */
function measureTrack(width: number) {
  const node = screen.getByTestId("slide-to-confirm") as HTMLElement & {
    __reactLayoutHandler?: (event: {
      nativeEvent: { layout: { width: number } };
    }) => void;
  };

  act(() =>
    node.__reactLayoutHandler?.({ nativeEvent: { layout: { width } } }),
  );
}

function grab() {
  fireEvent.mouseDown(screen.getByTestId("pan-gesture"), { clientX: 0 });
}

function dragTo(distance: number) {
  fireEvent.mouseMove(screen.getByTestId("pan-gesture"), { clientX: distance });
}

function release() {
  fireEvent.mouseUp(screen.getByTestId("pan-gesture"));
}

function knobOffset(): string {
  return screen.getByTestId("slide-knob").style.transform;
}

describe("a slide-to-confirm control", () => {
  afterEach(cleanup);

  it("fires nothing on a tap: opening takes a deliberate gesture", () => {
    const onConfirm = vi.fn();
    render(control(onConfirm));
    measureTrack(TRACK_WIDTH);

    grab();
    release();

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("follows the finger while the knob is held", () => {
    render(control());
    measureTrack(TRACK_WIDTH);

    grab();
    dragTo(120);

    expect(knobOffset()).toBe("translateX(120px)");
  });

  it("never lets the knob run past the end of its track", () => {
    render(control());
    measureTrack(TRACK_WIDTH);

    grab();
    dragTo(TRAVEL + 200);

    expect(knobOffset()).toBe(`translateX(${TRAVEL}px)`);
  });

  it("confirms once when the gesture passes two thirds of the travel", () => {
    const onConfirm = vi.fn();
    render(control(onConfirm));
    measureTrack(TRACK_WIDTH);

    grab();
    dragTo(TRAVEL * 0.7);
    release();

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("gives up a gesture that stops short, and springs the knob back", () => {
    const onConfirm = vi.fn();
    render(control(onConfirm));
    measureTrack(TRACK_WIDTH);

    grab();
    dragTo(TRAVEL * 0.6);
    release();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(knobOffset()).toBe("translateX(0px)");
  });

  it("confirms nothing while the track has not been measured", () => {
    const onConfirm = vi.fn();
    render(control(onConfirm));

    grab();
    dragTo(TRACK_WIDTH);
    release();

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
