import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import {
  BorderRadius,
  Button,
  FontSize,
  FontWeight,
  Opacity,
  type Palette,
  Spacing,
  useThemeColor,
} from "@/design-system";
import {
  type ModuleDescriptor,
  type ModuleKey,
  moduleForAdvertisement,
} from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { DiscoveredBluetoothDevice } from "@/domain/ports/BluetoothScanner";
import type { DeviceInfo } from "@/domain/ports/DeviceRepository";
import type { TranslationKey } from "@/i18n/keys";

export type DiscoveredModuleRowProps = {
  device: DiscoveredBluetoothDevice;
  slots: readonly ModuleSlot[];
  isPairing: boolean;
  onPair: (key: ModuleKey, device: DiscoveredBluetoothDevice) => void;
};

export function DiscoveredModuleRow({
  device,
  slots,
  isPairing,
  onPair,
}: DiscoveredModuleRowProps) {
  const module = moduleForAdvertisement(device.serviceUuids);
  if (!module) return null;

  const slot = slots.find((candidate) => candidate.module.key === module.key);

  return (
    <ResolvedRow
      device={device}
      module={module}
      pairing={slot?.pairing ?? null}
      isPairing={isPairing}
      onPair={onPair}
    />
  );
}

type ResolvedRowProps = {
  device: DiscoveredBluetoothDevice;
  module: ModuleDescriptor;
  pairing: DeviceInfo | null;
  isPairing: boolean;
  onPair: (key: ModuleKey, device: DiscoveredBluetoothDevice) => void;
};

function ResolvedRow({
  device,
  module,
  pairing,
  isPairing,
  onPair,
}: ResolvedRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const taken = takenKey(pairing, device.id);

  return (
    <View testID={`discovered-${device.id}`} style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.title}>{device.name}</Text>
        <Text style={styles.subtitle}>{device.id}</Text>
        <Text style={styles.subtitle}>{t(module.displayNameKey)}</Text>
      </View>

      {taken ? (
        <Text style={styles.occupied}>{t(taken)}</Text>
      ) : (
        <Button
          testID={`pair-${device.id}`}
          loading={isPairing}
          onPress={() => onPair(module.key, device)}
        >
          {t("modules.add.pair")}
        </Button>
      )}
    </View>
  );
}

function takenKey(
  pairing: DeviceInfo | null,
  deviceId: string,
): TranslationKey | null {
  if (!pairing) return null;
  return pairing.id === deviceId
    ? "modules.add.alreadyPaired"
    : "modules.add.slotTaken";
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.l,
      padding: Spacing.xl,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.surface,
    },
    text: {
      flex: 1,
      gap: Spacing.xxs,
    },
    title: {
      color: colors.text,
      fontSize: FontSize.m,
      fontWeight: `${FontWeight.extraBold}`,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      opacity: Opacity.subtle,
    },
    occupied: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
      opacity: Opacity.subtle,
    },
  });
