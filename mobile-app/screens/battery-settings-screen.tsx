import { useRouter } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModuleLinkNotice } from "@/components/modules";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import { useBatterySystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import {
  FontSize,
  type Palette,
  SettingsHeader,
  Spacing,
  useThemeColor,
} from "@/design-system";
import {
  BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
} from "@/domain/battery/BatteryTelemetry";
import { BATTERY_MODULE } from "@/domain/modules/ModuleDescriptor";

export default function BatterySettingsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { pairing, link } = useModuleSlot(BATTERY_MODULE.key);
  const { reconnect } = useModuleRegistry();
  const batterySystem = useBatterySystem();
  const battery = useObservable(batterySystem, DEFAULT_BATTERY_SNAPSHOT);

  const isOnline = link.status === "online";

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader
        title={t("battery.settings.title")}
        onBackPress={() => router.back()}
      />

      <ScrollView>
        {isOnline ? (
          <BatteryInfoSection battery={battery} colors={colors} />
        ) : (
          <ModuleLinkNotice
            deviceName={pairing?.name ?? null}
            isConnecting={link.status === "connecting"}
            onReconnect={() => void reconnect(BATTERY_MODULE.key)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type BatteryInfoSectionProps = {
  battery: BatterySnapshot;
  colors: Palette;
};

function BatteryInfoSection({ battery, colors }: BatteryInfoSectionProps) {
  const { t } = useTranslation();
  const styles = useMemo(() => createInfoStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("battery.settings.section")}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.charge")}</Text>
        <Text style={styles.value}>{battery.percentage}%</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.voltage")}</Text>
        <Text style={styles.value}>{battery.voltage.toFixed(2)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.current")}</Text>
        <Text style={styles.value}>{battery.current.toFixed(2)} A</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.power")}</Text>
        <Text style={styles.value}>{battery.power.toFixed(0)} W</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.mosTemperature")}</Text>
        <Text style={styles.value}>{battery.tempMos}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("battery.settings.cell1Temperature")}
        </Text>
        <Text style={styles.value}>{battery.tempCell1}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          {t("battery.settings.cell2Temperature")}
        </Text>
        <Text style={styles.value}>{battery.tempCell2}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.cellCount")}</Text>
        <Text style={styles.value}>{battery.cellCount}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.minCellVoltage")}</Text>
        <Text style={styles.value}>{battery.minCellVoltage.toFixed(3)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.maxCellVoltage")}</Text>
        <Text style={styles.value}>{battery.maxCellVoltage.toFixed(3)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.cellDelta")}</Text>
        <Text style={styles.value}>
          {(battery.cellDelta * 1000).toFixed(0)} mV
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.cycles")}</Text>
        <Text style={styles.value}>{battery.cycleCount}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.capacity")}</Text>
        <Text style={styles.value}>{battery.capacityAh.toFixed(1)} Ah</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.charging")}</Text>
        <Text style={styles.value}>
          {t(battery.isCharging ? "common.state.yes" : "common.state.no")}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.discharging")}</Text>
        <Text style={styles.value}>
          {t(battery.isDischarging ? "common.state.yes" : "common.state.no")}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{t("battery.settings.balancing")}</Text>
        <Text style={styles.value}>
          {t(
            battery.balancing
              ? "battery.settings.balancingOn"
              : "battery.settings.balancingOff",
          )}
        </Text>
      </View>

      {battery.hasAlarm && (
        <View style={styles.alarmRow}>
          <Text style={styles.alarmLabel}>{t("battery.settings.alarms")}</Text>
          <Text style={styles.alarmValue}>{battery.alarms.join(", ")}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screen,
    },
  });

const createInfoStyles = (colors: Palette) =>
  StyleSheet.create({
    section: {
      padding: Spacing.l,
      backgroundColor: colors.surface,
      marginHorizontal: Spacing.l,
      marginTop: Spacing.l,
      borderRadius: 12,
    },
    sectionTitle: {
      fontSize: FontSize.l,
      fontWeight: "600",
      color: colors.text,
      marginBottom: Spacing.m,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: Spacing.xs,
    },
    label: {
      fontSize: FontSize.m,
      color: colors.textMuted,
    },
    value: {
      fontSize: FontSize.m,
      color: colors.text,
      fontWeight: "500",
    },
    alarmRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: Spacing.xs,
      marginTop: Spacing.s,
      paddingTop: Spacing.s,
      borderTopWidth: 1,
      borderTopColor: colors.danger,
    },
    alarmLabel: {
      fontSize: FontSize.m,
      color: colors.danger,
      fontWeight: "600",
    },
    alarmValue: {
      fontSize: FontSize.m,
      color: colors.danger,
    },
  });
