import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { HeaterPresets } from "@/components/heater/heater-presets";
import { ZONE_NAME_KEYS } from "@/components/heater/zone-names";
import { useObservable } from "@/core/react/useObservable";
import {
  GaugeSetpointRow,
  Spacing,
  useThemeColor,
  useToast,
} from "@/design-system";
import {
  MAX_SETPOINT_CELSIUS,
  MIN_SETPOINT_CELSIUS,
  SETPOINT_STEP_CELSIUS,
  zoneRatio,
} from "@/domain/heater/HeaterPresets";
import type { HeaterSystem } from "@/domain/heater/HeaterSystem";
import type { HeaterZoneSnapshot } from "@/domain/heater/HeaterZone";
import { useFeedbackToast } from "@/screens/hooks/useFeedbackToast";
import { ModuleScreen } from "@/screens/module-screen";

export default function HeaterScreen() {
  const router = useRouter();

  return (
    <ModuleScreen
      moduleKey="heater"
      titleKey="heater.zones.title"
      onSettingsPress={() => router.push("/settings/heater-pid")}
    >
      {(heater) => <HeaterZones heater={heater} />}
    </ModuleScreen>
  );
}

function HeaterZones({ heater }: { heater: HeaterSystem }) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const toast = useToast();

  const nightMode = useObservable(heater.nightMode);
  const zones = [
    useObservable(heater.zones[0]),
    useObservable(heater.zones[1]),
    useObservable(heater.zones[2]),
    useObservable(heater.zones[3]),
  ];

  useFeedbackToast(heater.zones[0]);
  useFeedbackToast(heater.zones[1]);
  useFeedbackToast(heater.zones[2]);
  useFeedbackToast(heater.zones[3]);

  return (
    <View style={styles.screen}>
      <View style={styles.zones}>
        {zones.map((zone, index) => (
          <GaugeSetpointRow
            key={ZONE_NAME_KEYS[index]}
            testID={`heater-zone-${index}`}
            ratio={zoneRatio(zone.temperatureCelsius)}
            setpointRatio={zoneRatio(zone.setpointCelsius)}
            fillColor={colors.fill.heat}
            markerColor={colors.line.heat}
            // The mockup sets the zone name in caps; the dictionary carries it as a name.
            label={t(ZONE_NAME_KEYS[index]).toUpperCase()}
            value={`${zone.temperatureCelsius.toFixed(1)}°`}
            caption={zoneCaption(zone, t)}
            inert={!zone.isRunning}
            // A stopped zone takes either step: pressing one is how it comes back on.
            decreaseDisabled={
              zone.isRunning && zone.setpointCelsius <= MIN_SETPOINT_CELSIUS
            }
            increaseDisabled={
              zone.isRunning && zone.setpointCelsius >= MAX_SETPOINT_CELSIUS
            }
            onDecrease={() =>
              void heater.adjustZone(index, -SETPOINT_STEP_CELSIUS)
            }
            onIncrease={() =>
              void heater.adjustZone(index, SETPOINT_STEP_CELSIUS)
            }
            onTogglePower={() => void heater.toggleZone(index)}
          />
        ))}
      </View>
      <View style={styles.presets}>
        <HeaterPresets
          nightMode={nightMode}
          onNightMode={() => {
            void heater.applyNightMode();
            toast.show(t("heater.toast.nightOn"));
          }}
          onStopAll={() => {
            void heater.stopAll();
            toast.show(t("heater.toast.allStopped"));
          }}
        />
      </View>
    </View>
  );
}

function zoneCaption(zone: HeaterZoneSnapshot, t: TFunction): string {
  if (!zone.isRunning) return t("heater.zone.stopped");
  return t("heater.zone.target", {
    temperature: zone.setpointCelsius.toFixed(1),
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  zones: {
    flex: 1,
    gap: Spacing.m,
  },
  // The page's vertical rhythm, kept off the reusable bar: the shell's frame ends at 0.
  presets: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.s,
  },
});
