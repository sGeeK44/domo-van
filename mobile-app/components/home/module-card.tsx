import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinkBadge } from "@/components/home/link-badge";
import { linkSubtitle, reconnectAction } from "@/components/home/link-view";
import {
  Button,
  FontSize,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import type { LinkState } from "@/domain/modules/ModuleSlot";

export type ModuleCardProps = PropsWithChildren<{
  link: LinkState;
  onReconnect: () => void;
}>;

export function ModuleCard({ link, onReconnect, children }: ModuleCardProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const subtitle = linkSubtitle(link, Date.now());
  const action = reconnectAction(link);

  return (
    <View style={styles.card}>
      <LinkBadge link={link}>{children}</LinkBadge>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && (
        <Button
          variant="secondary"
          disabled={action.disabled}
          onPress={onReconnect}
        >
          {action.label}
        </Button>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flex: 1,
      gap: Spacing.s,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: FontSize.xs,
      textAlign: "center",
    },
  });
