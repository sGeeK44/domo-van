import { FontSize, FontWeight, type ThemeColors } from "@/design-system/theme";
import { useThemeColor } from "@/hooks/use-theme-color";
import { StyleSheet, Text, View } from "react-native";

export const Card = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  return (
    <View style={styles.card}>
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
      flex: 1,
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
