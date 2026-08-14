import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BorderRadius,
  IconSymbol,
  Motion,
  type Palette,
  ProgressBar,
  SlideToConfirm,
  Spacing,
  TextStyles,
  useStyles,
  useThemeColor,
} from "@/design-system";

export type DrainSectionProps = {
  draining: boolean;
  /** What the module says is left of its own countdown; the app runs no timer of its own. */
  remainingSeconds: number;
  autoCloseSeconds: number;
  onOpen(): void;
  onCloseNow(): void;
};

const CHIP_ICON_SIZE = 18;
const ACTION_HEIGHT = 80;
const ACTION_ICON_SIZE = 28;

export function DrainSection({
  draining,
  remainingSeconds,
  autoCloseSeconds,
  onOpen,
  onCloseNow,
}: DrainSectionProps) {
  const styles = useStyles(makeStyles);

  return (
    <View testID="drain-section" style={styles.section}>
      {draining ? (
        <DrainingValve
          remainingSeconds={remainingSeconds}
          autoCloseSeconds={autoCloseSeconds}
          onCloseNow={onCloseNow}
        />
      ) : (
        <ClosedValve autoCloseSeconds={autoCloseSeconds} onOpen={onOpen} />
      )}
    </View>
  );
}

type ClosedValveProps = {
  autoCloseSeconds: number;
  onOpen(): void;
};

function ClosedValve({ autoCloseSeconds, onOpen }: ClosedValveProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>{t("water.drain.section")}</Text>
        <View style={styles.chip}>
          <IconSymbol
            name="lock"
            size={CHIP_ICON_SIZE}
            color={colors.textMuted}
          />
          <Text style={styles.chipLabel}>{t("water.drain.closed")}</Text>
        </View>
      </View>
      <SlideToConfirm
        icon="chevron-right"
        label={t("water.drain.slide")}
        onConfirm={onOpen}
        testID="drain-slide"
      />
      <Text style={styles.hint}>
        {t("water.drain.autoCloseHint", { seconds: autoCloseSeconds })}
      </Text>
    </>
  );
}

type DrainingValveProps = {
  remainingSeconds: number;
  autoCloseSeconds: number;
  onCloseNow(): void;
};

function DrainingValve({
  remainingSeconds,
  autoCloseSeconds,
  onCloseNow,
}: DrainingValveProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);

  return (
    <>
      <View style={styles.header}>
        <Text style={[styles.sectionLabel, styles.urgent]}>
          {t("water.drain.countdown")}
        </Text>
        <Text testID="drain-countdown" style={styles.remaining}>
          {t("water.drain.remaining", { seconds: remainingSeconds })}
        </Text>
      </View>
      <ProgressBar
        ratio={leftToRun(remainingSeconds, autoCloseSeconds)}
        troughColor={colors.dangerSurface}
        fillColor={colors.danger}
        duration={Motion.drain}
      />
      <Pressable
        testID="drain-close-now"
        onPress={onCloseNow}
        style={styles.closeNow}
      >
        <IconSymbol
          name="stop-circle"
          size={ACTION_ICON_SIZE}
          color={colors.onDanger}
        />
        <Text style={styles.closeNowLabel}>{t("water.drain.closeNow")}</Text>
      </Pressable>
    </>
  );
}

/** A module that never answered a config would divide the bar by zero. */
function leftToRun(remainingSeconds: number, autoCloseSeconds: number): number {
  return autoCloseSeconds > 0 ? remainingSeconds / autoCloseSeconds : 0;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    section: {
      gap: Spacing.l,
      paddingBottom: Spacing.s,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionLabel: {
      ...TextStyles.sectionLabel,
      color: colors.textMuted,
    },
    urgent: {
      color: colors.danger,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    chipLabel: {
      ...TextStyles.labelStrong,
      color: colors.text,
    },
    hint: {
      ...TextStyles.caption,
      color: colors.textMuted,
      textAlign: "center",
    },
    remaining: {
      ...TextStyles.monoMetric,
      color: colors.text,
    },
    closeNow: {
      height: ACTION_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.l,
      borderRadius: BorderRadius.xxl,
      backgroundColor: colors.danger,
    },
    closeNowLabel: {
      ...TextStyles.button,
      color: colors.onDanger,
    },
  });
