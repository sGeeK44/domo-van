import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  FontSize,
  Spacing,
  type ThemeColors,
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
  const colors = useThemeColor();
  const styles = useMemo(() => getStyles(colors), [colors]);

  if (!deviceName) {
    return (
      <View testID="module-unpaired" style={styles.notice}>
        <Card title="Aucun module appairé" subtitle="Emplacement libre">
          <Text style={styles.text}>
            Appairez ce module depuis l'écran Modules pour accéder à ses
            réglages.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View testID="module-offline" style={styles.notice}>
      <Card title="Module hors ligne" subtitle={deviceName}>
        <Text style={styles.text}>
          Les réglages s'affichent une fois le module reconnecté.
        </Text>
        <Button testID="reconnect" loading={isConnecting} onPress={onReconnect}>
          Reconnecter
        </Button>
      </Card>
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    notice: {
      padding: Spacing.xl,
    },
    text: {
      color: colors.text.secondary,
      fontSize: FontSize.s,
      paddingBottom: Spacing.l,
    },
  });
