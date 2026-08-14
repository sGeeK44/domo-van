import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import {
  alarmBanner,
  formatCurrent,
  formatTemperature,
  formatVoltage,
  heroAside,
  heroLabel,
} from "@/components/battery/battery-view";
import { CellBars } from "@/components/battery/cell-bars";
import type { Observable } from "@/core/observable";
import { useObservable } from "@/core/react/useObservable";
import {
  AlarmBanner,
  GaugeHero,
  Spacing,
  StatTile,
  useThemeColor,
} from "@/design-system";
import {
  type BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
} from "@/domain/battery/BatteryTelemetry";
import { ModuleScreen } from "@/screens/module-screen";

/** The battery module has no writable channel, so this screen sends nothing and toasts nothing. */
export default function BatteryScreen() {
  const router = useRouter();

  return (
    <ModuleScreen
      moduleKey="battery"
      titleKey="battery.overview.title"
      onSettingsPress={() => router.push("/battery-settings")}
    >
      {(system) => <BatteryDetail telemetry={system} />}
    </ModuleScreen>
  );
}

export type BatteryDetailProps = {
  /** The reading, not the system that carries it: a test states a pack without a BMS. */
  telemetry: Observable<BatterySnapshot>;
};

const FULL_CHARGE_PERCENTAGE = 100;
const PERCENT_UNIT = "%";
const ALARM_SEPARATOR = " · ";

export function BatteryDetail({ telemetry }: BatteryDetailProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const battery = useObservable(telemetry, DEFAULT_BATTERY_SNAPSHOT);
  const label = heroLabel(battery);
  const aside = heroAside(battery);
  const banner = alarmBanner(battery);

  return (
    <View style={styles.detail}>
      <GaugeHero
        testID="battery-hero"
        ratio={battery.percentage / FULL_CHARGE_PERCENTAGE}
        fillColor={colors.fill.battery}
        lineColor={colors.line.battery}
        label={t(label.key, label.params)}
        value={{
          amount: String(Math.round(battery.percentage)),
          unit: PERCENT_UNIT,
        }}
        aside={{
          value: aside.value,
          caption: t(aside.caption.key, aside.caption.params),
        }}
      />

      <View style={styles.strip}>
        <StatTile
          testID="stat-voltage"
          label={t("battery.detail.voltage")}
          value={formatVoltage(battery.voltage)}
        />
        <StatTile
          testID="stat-current"
          label={t("battery.detail.current")}
          value={formatCurrent(battery.current)}
        />
        <StatTile
          testID="stat-cycles"
          label={t("battery.detail.cycles")}
          value={String(battery.cycleCount)}
        />
      </View>

      <CellBars battery={battery} />

      <View style={styles.strip}>
        <StatTile
          testID="stat-mosfet"
          label={t("battery.detail.mosfet")}
          value={formatTemperature(battery.tempMos)}
        />
        <StatTile
          testID="stat-probe1"
          label={t("battery.detail.probe1")}
          value={formatTemperature(battery.tempCell1)}
        />
        <StatTile
          testID="stat-probe2"
          label={t("battery.detail.probe2")}
          value={formatTemperature(battery.tempCell2)}
        />
      </View>

      <AlarmBanner
        tone={banner.tone}
        icon={banner.icon}
        message={banner.messageKeys.map((key) => t(key)).join(ALARM_SEPARATOR)}
      />
    </View>
  );
}

// No frame of its own: ModuleScreen owns the safe area, the background and the padding.
const styles = StyleSheet.create({
  detail: {
    flex: 1,
    gap: Spacing.l,
  },
  strip: {
    flexDirection: "row",
    gap: Spacing.m,
  },
});
