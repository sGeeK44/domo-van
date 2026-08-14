import {
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useThemeColor } from "@/design-system/theme/use-theme-color";
import { FontSize, FontWeight, type ThemeColors } from "@/design-system/tokens";

export const Card = ({
  title,
  subtitle,
  children,
  style,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** How much room the card takes is the caller's layout, not the card's. */
  style?: StyleProp<ViewStyle>;
}) => {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
};

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.background.secondary,
      borderRadius: 20,
      padding: 20,
    },
    header: {
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 10,
    },
    title: {
      color: colors.text.primary,
      fontSize: FontSize.m,
      fontWeight: FontWeight.medium,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: FontSize.s,
      fontWeight: FontWeight.regular,
    },
  });
