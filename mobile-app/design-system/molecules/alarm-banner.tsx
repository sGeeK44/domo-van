import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { useStyles } from "@/design-system/theme/use-styles";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import {
  BorderRadius,
  type Palette,
  Spacing,
  TextStyles,
} from "@/design-system/tokens";

type IconName = ComponentProps<typeof IconSymbol>["name"];

export type AlarmBannerTone = "ok" | "alarm";

export type AlarmBannerProps = {
  tone: AlarmBannerTone;
  icon: IconName;
  /** Already translated and joined by the caller. */
  message: string;
};

const BANNER_HEIGHT = 58;
const ICON_SIZE = 22;
const BANNER_BORDER = 1;

export function AlarmBanner({ tone, icon, message }: AlarmBannerProps) {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const paint =
    tone === "ok"
      ? {
          backgroundColor: colors.successSurface,
          borderColor: colors.successBorder,
          ink: colors.success,
        }
      : {
          backgroundColor: colors.dangerSurface,
          borderColor: colors.dangerBorder,
          ink: colors.danger,
        };

  return (
    <View
      testID="alarm-banner"
      style={[
        styles.banner,
        {
          backgroundColor: paint.backgroundColor,
          borderColor: paint.borderColor,
        },
      ]}
    >
      <IconSymbol name={icon} size={ICON_SIZE} color={paint.ink} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    banner: {
      height: BANNER_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.l,
      paddingHorizontal: Spacing.xxl,
      borderRadius: BorderRadius.l,
      borderWidth: BANNER_BORDER,
    },
    message: {
      ...TextStyles.bannerText,
      flex: 1,
      color: colors.text,
    },
  });
