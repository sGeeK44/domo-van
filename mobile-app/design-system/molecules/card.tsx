import {
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useStyles } from "@/design-system/theme/use-styles";
import { FontSize, FontWeight, type Palette } from "@/design-system/tokens";

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
  const styles = useStyles(makeStyles);
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

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
    },
    header: {
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 10,
    },
    title: {
      color: colors.text,
      fontSize: FontSize.m,
      fontWeight: FontWeight.medium,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: FontSize.s,
      fontWeight: FontWeight.regular,
    },
  });
