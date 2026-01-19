import { Colors, FontSize, FontWeight } from "@/design-system/theme";
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
  const mode = useThemeColor();
  const styles = getStyles(mode);
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

const getStyles = (colors: typeof Colors.light | typeof Colors.dark) =>
  StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: colors["background"]["secondary"],
      borderRadius: 20,
      padding: 20,
    },
    header: {
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 10,
    },
    title: {
      color: colors.info["500"],
      fontSize: FontSize.m,
      fontWeight: FontWeight.medium,
    },
    subtitle: {
      color: colors.neutral["600"],
      fontSize: FontSize.s,
      fontWeight: FontWeight.regular,
    },
  });
