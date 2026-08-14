import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  FontSize,
  type Palette,
  Spacing,
  useThemeColor,
} from "@/design-system";

export type ModuleLinkNoticeProps = {
  deviceName: string | null;
  isConnecting: boolean;
  onReconnect: () => void;
};

/** What a settings screen shows instead of a form it cannot fill: the module is not reachable. */
export function ModuleLinkNotice({
  deviceName,
  isConnecting,
  onReconnect,
}: ModuleLinkNoticeProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (!deviceName) {
    return (
      <View testID="module-unpaired" style={styles.notice}>
        <Card
          title={t("modules.notice.unpairedTitle")}
          subtitle={t("modules.notice.unpairedSubtitle")}
        >
          <Text style={styles.text}>{t("modules.notice.unpairedBody")}</Text>
        </Card>
      </View>
    );
  }

  return (
    <View testID="module-offline" style={styles.notice}>
      <Card title={t("modules.notice.offlineTitle")} subtitle={deviceName}>
        <Text style={styles.text}>{t("modules.notice.offlineBody")}</Text>
        <Button testID="reconnect" loading={isConnecting} onPress={onReconnect}>
          {t("link.actions.reconnect")}
        </Button>
      </Card>
    </View>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    notice: {
      padding: Spacing.xl,
    },
    text: {
      color: colors.textMuted,
      fontSize: FontSize.s,
      paddingBottom: Spacing.l,
    },
  });
