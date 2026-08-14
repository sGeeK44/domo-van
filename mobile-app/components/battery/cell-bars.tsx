import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import {
  cellBars,
  cellsHeader,
  deltaLine,
} from "@/components/battery/battery-view";
import {
  GaugeBars,
  type Palette,
  Spacing,
  TextStyles,
  useStyles,
  useThemeColor,
} from "@/design-system";
import type { BatterySnapshot } from "@/domain/battery/BatteryTelemetry";

export type CellBarsProps = {
  battery: BatterySnapshot;
};

export function CellBars({ battery }: CellBarsProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const header = cellsHeader(battery);
  const delta = deltaLine(battery);
  const bars = cellBars(battery).map((bar) => ({
    id: bar.id,
    label: t(bar.label.key, bar.label.params),
    ratio: bar.ratio,
    value: bar.value,
  }));

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{t(header.key, header.params)}</Text>
        <Text
          testID="cell-delta"
          style={[
            styles.delta,
            {
              color:
                delta.tone === "success" ? colors.success : colors.textMuted,
            },
          ]}
        >
          {t(delta.copy.key, delta.copy.params)}
        </Text>
      </View>
      <GaugeBars
        bars={bars}
        fillColor={colors.fill.battery}
        style={styles.bars}
      />
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    section: {
      flex: 1,
      gap: Spacing.m,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: {
      ...TextStyles.sectionLabel,
      color: colors.textMuted,
    },
    delta: {
      ...TextStyles.mono,
    },
    bars: {
      flex: 1,
    },
  });
