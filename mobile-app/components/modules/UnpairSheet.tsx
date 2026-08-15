import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Modal, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BorderRadius,
  Button,
  Card,
  FontSize,
  type Palette,
  Spacing,
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
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => getStyles(colors), [colors]);
  // the modal window spans the whole screen, so the sheet clears the navigation bar itself
  const insets = useSafeAreaInsets();

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
        <View
          style={[styles.sheet, { paddingBottom: Spacing.xxl + insets.bottom }]}
        >
          <Card
            title={t("modules.unpair.title", { module: moduleName })}
            subtitle={deviceName}
          >
            <Text style={styles.warning}>{t("modules.unpair.warning")}</Text>

            <View style={styles.actions}>
              <Button
                testID="unpair-confirm"
                loading={isUnpairing}
                onPress={onConfirm}
              >
                {t("modules.unpair.confirm")}
              </Button>
              <Button
                testID="unpair-cancel"
                variant="secondary"
                disabled={isUnpairing}
                onPress={onCancel}
              >
                {t("common.actions.cancel")}
              </Button>
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    // a scrim, not a page: the Modules list stays visible behind the sheet
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: colors.scrim,
    },
    sheet: {
      padding: Spacing.xxl,
      backgroundColor: colors.screen,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
    },
    warning: {
      color: colors.textMuted,
      fontSize: FontSize.s,
      paddingBottom: Spacing.l,
    },
    actions: {
      gap: Spacing.m,
    },
  });
