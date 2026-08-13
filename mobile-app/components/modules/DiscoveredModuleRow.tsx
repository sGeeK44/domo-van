import { StyleSheet, Text, View } from "react-native";
import {
  BorderRadius,
  Button,
  FontSize,
  FontWeight,
  Opacity,
  Spacing,
  type ThemeColors,
  useThemeColor,
} from "@/design-system";
import {
  type ModuleKey,
  moduleForAdvertisement,
} from "@/domain/modules/ModuleDescriptor";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";

export type DiscoveredModuleRowProps = {
  device: DiscoveredBluetoothDevice;
  occupiedKeys: readonly ModuleKey[];
  isPairing: boolean;
  onPair: (key: ModuleKey, device: DiscoveredBluetoothDevice) => void;
};

export function DiscoveredModuleRow({
  device,
  occupiedKeys,
  isPairing,
  onPair,
}: DiscoveredModuleRowProps) {
  const colors = useThemeColor();
  const styles = getStyles(colors);

  const module = moduleForAdvertisement(device.serviceUuids);
  if (!module) return null;

  const occupied = occupiedKeys.includes(module.key);

  return (
    <View testID={`discovered-${device.id}`} style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{device.name}</Text>
        <Text style={styles.subtitle}>{device.id}</Text>
        <Text style={styles.subtitle}>{module.displayName}</Text>
      </View>

      {occupied ? (
        <Text style={styles.occupied}>Emplacement occupé</Text>
      ) : (
        <Button
          testID={`pair-${device.id}`}
          loading={isPairing}
          onPress={() => onPair(module.key, device)}
        >
          Appairer
        </Button>
      )}
    </View>
  );
}

const getStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.l,
      padding: Spacing.xl,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.background.secondary,
    },
    text: {
      flex: 1,
      gap: Spacing.xxs,
    },
    title: {
      color: colors.text.primary,
      fontSize: FontSize.m,
      fontWeight: `${FontWeight.extraBold}`,
    },
    subtitle: {
      color: colors.text.secondary,
      fontSize: FontSize.xs,
      opacity: Opacity.subtle,
    },
    occupied: {
      color: colors.text.secondary,
      fontSize: FontSize.xs,
      opacity: Opacity.subtle,
    },
  });
