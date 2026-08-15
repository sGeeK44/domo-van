import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Spacing } from "@/design-system/tokens";

/** Clears the accent bar of the card the row sits in, like the card's own label. */
const CONTENT_INSET = Spacing.s;

export type FieldRowProps = {
  /** A card holding several rows tells them apart with this. */
  testID?: string;
  children: ReactNode;
};

export function FieldRow({ testID = "field-row", children }: FieldRowProps) {
  return (
    <View testID={testID} style={styles.row}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: Spacing.m,
    paddingLeft: CONTENT_INSET,
  },
});
