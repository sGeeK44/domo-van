import { useMemo } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import {
  BorderRadius,
  Button,
  Card,
  FontSize,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";

export type UnpairSheetProps = {
  visible: boolean;
  moduleName: string;
  deviceName: string;
  isUnpairing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function UnpairSheet({
  visible,
  moduleName,
  deviceName,
  isUnpairing,
  onCancel,
  onConfirm,
}: UnpairSheetProps) {
  const colors = useThemeColor();
  const styles = useMemo(() => getStyles(colors), [colors]);

  // the hardware back gesture reaches the sheet too, and an unpair in flight owns the slot
  const dismiss = () => {
    if (!isUnpairing) onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Card title={`Dissocier ${moduleName}`} subtitle={deviceName}>
            <Text style={styles.warning}>
              L'emplacement redevient libre. Les réglages restent dans le module
              et reviennent s'il est appairé à nouveau.
            </Text>

            <View style={styles.actions}>
              <Button
                testID="unpair-confirm"
                loading={isUnpairing}
                onPress={onConfirm}
              >
                Dissocier
              </Button>
              <Button
                testID="unpair-cancel"
                variant="secondary"
                disabled={isUnpairing}
                onPress={onCancel}
              >
                Annuler
              </Button>
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // a scrim, not a page: the Modules list stays visible behind the sheet
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    sheet: {
      padding: Spacing.xxl,
      backgroundColor: colors.background.primary,
      borderTopLeftRadius: BorderRadius.l,
      borderTopRightRadius: BorderRadius.l,
    },
    warning: {
      color: colors.text.secondary,
      fontSize: FontSize.s,
      paddingBottom: Spacing.l,
    },
    actions: {
      gap: Spacing.m,
    },
  });
