import type { PropsWithChildren } from "react";
import {
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { LinkBadge } from "@/components/home/link-badge";
import { linkSubtitle, reconnectAction } from "@/components/home/link-view";
import { useLinkClock } from "@/components/home/use-link-clock";
import {
  Button,
  FontSize,
  type Palette,
  Spacing,
  useThemeColor,
} from "@/design-system";
import type { LinkState } from "@/domain/modules/ModuleSlot";

export type ModuleCardProps = PropsWithChildren<{
  link: LinkState;
  onReconnect: () => void;
  /** How much room the card takes is the caller's layout, not the card's. */
  style?: StyleProp<ViewStyle>;
}>;

export function ModuleCard({
  link,
  onReconnect,
  style,
  children,
}: ModuleCardProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const now = useLinkClock(link);
  const subtitle = linkSubtitle(link, now);
  const action = reconnectAction(link);

  return (
    <View style={[styles.card, style]}>
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

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    card: {
      gap: Spacing.s,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      textAlign: "center",
    },
  });
