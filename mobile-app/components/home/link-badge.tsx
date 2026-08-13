import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { linkTone } from "@/components/home/link-view";
import { StatusBadge } from "@/design-system";
import type { LinkState } from "@/domain/modules/ModuleSlot";

export type LinkBadgeProps = PropsWithChildren<{
  link: LinkState;
  size?: number;
}>;

/** The one rendering of a link status, worn by a tab icon, a card or a row. */
export function LinkBadge({ link, size, children }: LinkBadgeProps) {
  return (
    <View style={styles.anchor}>
      {children}
      <StatusBadge status={linkTone(link)} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "relative",
  },
});
