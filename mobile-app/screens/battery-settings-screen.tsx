import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useModuleSlot } from "@/composition/ModuleRegistryProvider";
import { useBatterySystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import {
  FontSize,
  SettingsHeader,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import {
  BatterySnapshot,
  DEFAULT_BATTERY_SNAPSHOT,
} from "@/domain/battery/BatteryTelemetry";
import { BATTERY_MODULE } from "@/domain/modules/ModuleDescriptor";

export default function BatterySettingsScreen() {
  const colors = useThemeColor();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const { link } = useModuleSlot(BATTERY_MODULE.key);
  const batterySystem = useBatterySystem();
  const battery = useObservable(batterySystem, DEFAULT_BATTERY_SNAPSHOT);

  const isOnline = link.status === "online";

  return (
    <SafeAreaView style={styles.container}>
      <SettingsHeader title="Batterie" onBackPress={() => router.back()} />

      <ScrollView>
        {isOnline && <BatteryInfoSection battery={battery} colors={colors} />}
      </ScrollView>
    </SafeAreaView>
  );
}

type BatteryInfoSectionProps = {
  battery: BatterySnapshot;
  colors: ThemeColors;
};

function BatteryInfoSection({ battery, colors }: BatteryInfoSectionProps) {
  const styles = useMemo(() => createInfoStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informations Batterie</Text>

      <View style={styles.row}>
        <Text style={styles.label}>État de charge</Text>
        <Text style={styles.value}>{battery.percentage}%</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Tension totale</Text>
        <Text style={styles.value}>{battery.voltage.toFixed(2)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Courant</Text>
        <Text style={styles.value}>{battery.current.toFixed(2)} A</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Puissance</Text>
        <Text style={styles.value}>{battery.power.toFixed(0)} W</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Température MOS</Text>
        <Text style={styles.value}>{battery.tempMos}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Température cellule 1</Text>
        <Text style={styles.value}>{battery.tempCell1}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Température cellule 2</Text>
        <Text style={styles.value}>{battery.tempCell2}°C</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Nombre de cellules</Text>
        <Text style={styles.value}>{battery.cellCount}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Tension min cellule</Text>
        <Text style={styles.value}>{battery.minCellVoltage.toFixed(3)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Tension max cellule</Text>
        <Text style={styles.value}>{battery.maxCellVoltage.toFixed(3)} V</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Delta cellules</Text>
        <Text style={styles.value}>
          {(battery.cellDelta * 1000).toFixed(0)} mV
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Cycles</Text>
        <Text style={styles.value}>{battery.cycleCount}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Capacité</Text>
        <Text style={styles.value}>{battery.capacityAh.toFixed(1)} Ah</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>En charge</Text>
        <Text style={styles.value}>{battery.isCharging ? "Oui" : "Non"}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>En décharge</Text>
        <Text style={styles.value}>
          {battery.isDischarging ? "Oui" : "Non"}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Équilibrage</Text>
        <Text style={styles.value}>
          {battery.balancing ? "Actif" : "Inactif"}
        </Text>
      </View>

      {battery.hasAlarm && (
        <View style={styles.alarmRow}>
          <Text style={styles.alarmLabel}>Alarmes</Text>
          <Text style={styles.alarmValue}>{battery.alarms.join(", ")}</Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
  });

const createInfoStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    section: {
      padding: Spacing.l,
      backgroundColor: colors.background.secondary,
      marginHorizontal: Spacing.l,
      marginTop: Spacing.l,
      borderRadius: 12,
    },
    sectionTitle: {
      fontSize: FontSize.l,
      fontWeight: "600",
      color: colors.text.primary,
      marginBottom: Spacing.m,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: Spacing.xs,
    },
    label: {
      fontSize: FontSize.m,
      color: colors.text.secondary,
    },
    value: {
      fontSize: FontSize.m,
      color: colors.text.primary,
      fontWeight: "500",
    },
    alarmRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: Spacing.xs,
      marginTop: Spacing.s,
      paddingTop: Spacing.s,
      borderTopWidth: 1,
      borderTopColor: colors.danger["500"],
    },
    alarmLabel: {
      fontSize: FontSize.m,
      color: colors.danger["500"],
      fontWeight: "600",
    },
    alarmValue: {
      fontSize: FontSize.m,
      color: colors.danger["500"],
    },
  });
