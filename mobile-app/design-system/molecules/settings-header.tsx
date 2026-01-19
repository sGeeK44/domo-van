import { IconSymbol } from "@/design-system/atoms/icon-symbol";
import { FontSize, FontWeight, Spacing, TextColors } from "@/design-system/theme";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type SettingsHeaderProps = {
  title: string;
  onBackPress: () => void;
};

export function SettingsHeader({ title, onBackPress }: SettingsHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBackPress} hitSlop={10}>
        <IconSymbol name="arrow-back" size={22} color={TextColors.primary} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.s,
    paddingBottom: Spacing.l,
  },
  title: {
    color: TextColors.primary,
    fontSize: FontSize.xl,
    fontWeight: `${FontWeight.extraBold}`,
  },
  spacer: {
    width: 22,
  },
});
