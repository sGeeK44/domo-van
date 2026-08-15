import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { DrainSection } from "@/components/water/drain-section";
import { clockTime, drainedLiters } from "@/components/water/drain-view";
import { useObservable } from "@/core/react/useObservable";
import { GaugeColumn, Spacing, useThemeColor, useToast } from "@/design-system";
import type { ClosureCause } from "@/domain/water/DrainValve";
import { DEFAULT_VALVE_STATE } from "@/domain/water/DrainValve";
import type { TankLevelSnapshot } from "@/domain/water/TankLevelSensor";
import { DEFAULT_TANK_SNAPSHOT } from "@/domain/water/TankLevelSensor";
import type { WaterSystem } from "@/domain/water/WaterSystem";
import type { TranslationKey } from "@/i18n/keys";
import { useFeedbackToast } from "@/screens/hooks/useFeedbackToast";
import { ModuleScreen } from "@/screens/module-screen";

export default function WaterScreen() {
  const router = useRouter();

  return (
    <ModuleScreen
      moduleKey="water"
      titleKey="modules.water.tab"
      onSettingsPress={() => router.push("/water-settings")}
    >
      {(system) => <WaterLevels system={system} />}
    </ModuleScreen>
  );
}

/** Where the drain started, so the grey tank can report what it has lost since. */
type DrainStart = { liters: number; at: Date };

function WaterLevels({ system }: { system: WaterSystem }) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const toast = useToast();

  const valveDevice = system.greyDrainValve;
  const clean = useObservable(system.cleanTank, DEFAULT_TANK_SNAPSHOT);
  const grey = useObservable(system.greyTank, DEFAULT_TANK_SNAPSHOT);
  const valve = useObservable(valveDevice, DEFAULT_VALVE_STATE);
  useFeedbackToast(valveDevice);
  useAutoClosedToast(valve.lastClosure);

  const [closeRequestedAt, setCloseRequestedAt] = useState<number | null>(null);
  const draining =
    valve.position === "open" && !withinOneTickOf(closeRequestedAt);

  const greyLiters = litersOf(grey);
  const start = useDrainStart(draining, greyLiters);

  const announce = async (write: Promise<void>, key: TranslationKey) => {
    await write;
    // A rejected write leaves the valve unknown and reports itself: useFeedbackToast says so instead.
    if (valveDevice.getValue().position !== "unknown") toast.show(t(key));
  };

  const openValve = () => {
    setCloseRequestedAt(null);
    void announce(valveDevice.open(), "water.drain.toast.opened");
  };

  const closeValve = () => {
    setCloseRequestedAt(sinceBoot());
    void announce(valveDevice.close(), "water.drain.toast.closedNow");
  };

  return (
    <View style={styles.container}>
      <View style={styles.tanks}>
        <View style={[styles.tank, { opacity: draining ? DIMMED : FULL }]}>
          <GaugeColumn
            testID="clean-tank"
            ratio={ratioOf(clean)}
            fillColor={colors.fill.cleanWater}
            lineColor={colors.line.cleanWater}
            label={t("water.levels.cleanTank")}
            caption={t("water.levels.cleanCaption", {
              capacity: clean.capacityLiters,
            })}
            value={{ amount: String(litersOf(clean)), unit: LITERS }}
            footer={t("water.levels.cleanFooter", {
              percentage: Math.round(clean.percentage),
            })}
          />
        </View>
        <View style={styles.tank}>
          <GaugeColumn
            testID="grey-tank"
            draining={draining}
            ratio={ratioOf(grey)}
            fillColor={colors.fill.greyWater}
            lineColor={colors.line.greyWater}
            label={t("water.levels.greyTank")}
            caption={
              draining
                ? t("water.levels.greyDrainingCaption")
                : t("water.levels.greyCaption", {
                    capacity: grey.capacityLiters,
                  })
            }
            value={{ amount: String(greyLiters), unit: LITERS }}
            footer={
              start
                ? t("water.levels.greyDrainingFooter", {
                    liters: drainedLiters(start.liters, greyLiters),
                    time: clockTime(start.at),
                  })
                : t("water.levels.greyFooter", {
                    percentage: Math.round(grey.percentage),
                    remaining: grey.capacityLiters - greyLiters,
                  })
            }
          />
        </View>
      </View>
      <DrainSection
        draining={draining}
        remainingSeconds={valve.remainingSeconds}
        autoCloseSeconds={valve.autoCloseSeconds}
        onOpen={openValve}
        onCloseNow={closeValve}
      />
    </View>
  );
}

/** The module closed itself: the one closure the user did not ask for, so the one worth saying. */
function useAutoClosedToast(lastClosure: ClosureCause | null): void {
  const { t } = useTranslation();
  const toast = useToast();
  // Seeded with what is already reported: mounting on a closed valve is not a closure.
  const reported = useRef(lastClosure);

  useEffect(() => {
    const previous = reported.current;
    reported.current = lastClosure;
    if (lastClosure === "auto" && previous !== "auto") {
      toast.show(t("water.drain.toast.autoClosed"));
    }
  }, [lastClosure, t, toast]);
}

/** The module pushes one COUNTDOWN a second, so a frame sent before the close lands within one. */
const MODULE_CADENCE_MS = 1000;

/** Past that one tick, a valve still counting down is genuinely open, and must say so again. */
function withinOneTickOf(requestedAt: number | null): boolean {
  return requestedAt !== null && sinceBoot() - requestedAt < MODULE_CADENCE_MS;
}

/** Monotonic: an NTP correction stepping the wall clock back would re-arm the guard. */
function sinceBoot(): number {
  return performance.now();
}

function useDrainStart(draining: boolean, liters: number): DrainStart | null {
  const [start, setStart] = useState<DrainStart | null>(null);

  useEffect(() => {
    setStart((known) => {
      if (!draining) return null;
      return known ?? { liters, at: new Date() };
    });
  }, [draining, liters]);

  return start;
}

/** The unit is its own smaller span inside the metric, and reads the same in every language. */
const LITERS = " L";

function ratioOf(tank: TankLevelSnapshot): number {
  return tank.percentage / 100;
}

function litersOf(tank: TankLevelSnapshot): number {
  return Math.round((tank.percentage / 100) * tank.capacityLiters);
}

/** The mockup's .55: the sibling stays readable while attention goes to the tank that is draining. */
const DIMMED = 0.55;
const FULL = 1;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.xxl,
  },
  tanks: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.l,
  },
  tank: {
    flex: 1,
  },
});
