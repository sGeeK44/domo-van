import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { HeaterPresets } from "@/components/heater/heater-presets";
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
} from "@/domain/heater/HeaterPresets";
import type { HeaterSystem } from "@/domain/heater/HeaterSystem";
import {
  DEFAULT_ZONE_SNAPSHOT,
  type HeaterZoneSnapshot,
} from "@/domain/heater/HeaterZone";
import type { TranslationKey } from "@/i18n/keys";
import { ModuleScreen } from "@/screens/module-screen";

const ZONE_NAME_KEYS: readonly TranslationKey[] = [
  "heater.zones.zone1",
  "heater.zones.zone2",
  "heater.zones.zone3",
  "heater.zones.zone4",
];

/** The mockup's bar spans 10–30 °C, inside the 5–30 °C the targets are clamped to. */
const BAR_FLOOR_CELSIUS = 10;
const BAR_SPAN_CELSIUS = 20;

function zonePct(celsius: number): number {
  const ratio = (celsius - BAR_FLOOR_CELSIUS) / BAR_SPAN_CELSIUS;
  return Math.min(1, Math.max(0, ratio));
}

export default function HeaterScreen() {
  const router = useRouter();

  return (
    <ModuleScreen
      moduleKey="heater"
      titleKey="heater.zones.title"
      onSettingsPress={() => router.push("/heater-settings")}
    >
      {(heater) => <HeaterZones heater={heater} />}
    </ModuleScreen>
  );
}

function HeaterZones({ heater }: { heater: HeaterSystem }) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const toast = useToast();

  const nightMode = useObservable(heater.nightMode, false);
  const zones = [
    useObservable(heater.zones[0], DEFAULT_ZONE_SNAPSHOT),
    useObservable(heater.zones[1], DEFAULT_ZONE_SNAPSHOT),
    useObservable(heater.zones[2], DEFAULT_ZONE_SNAPSHOT),
    useObservable(heater.zones[3], DEFAULT_ZONE_SNAPSHOT),
  ];

  /** A ½ ° step stays silent; the preset it ends does not. */
  const reportNightModeLeft = () => {
    if (nightMode) toast.show(t("heater.toast.nightOff"));
  };

  const adjust = (index: number, deltaCelsius: number) => {
    void heater.adjustZone(index, deltaCelsius);
    reportNightModeLeft();
  };

  const toggle = (index: number) => {
    void heater.toggleZone(index);
    reportNightModeLeft();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.zones}>
        {zones.map((zone, index) => (
          <GaugeSetpointRow
            key={ZONE_NAME_KEYS[index]}
            testID={`heater-zone-${index}`}
            ratio={zonePct(zone.temperatureCelsius)}
            setpointRatio={zonePct(zone.setpointCelsius)}
            fillColor={colors.fill.heat}
            markerColor={colors.line.heat}
            // The mockup sets the zone name in caps; the dictionary carries it as a name.
            label={t(ZONE_NAME_KEYS[index]).toUpperCase()}
            value={`${zone.temperatureCelsius.toFixed(1)}°`}
            caption={zoneCaption(zone, t)}
            inert={!zone.isRunning}
            decreaseDisabled={zone.setpointCelsius <= MIN_SETPOINT_CELSIUS}
            increaseDisabled={zone.setpointCelsius >= MAX_SETPOINT_CELSIUS}
            onDecrease={() => adjust(index, -SETPOINT_STEP_CELSIUS)}
            onIncrease={() => adjust(index, SETPOINT_STEP_CELSIUS)}
            onTogglePower={() => toggle(index)}
          />
        ))}
      </View>
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
});
