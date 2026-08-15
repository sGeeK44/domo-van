import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BorderRadius,
  Button,
  FontSize,
  FontWeight,
  IconSymbol,
  Opacity,
  type Palette,
  Spacing,
  useThemeColor,
} from "@/design-system";
import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { TranslationKey } from "@/i18n/keys";

export type ModuleSlotRowProps = {
  slot: ModuleSlot;
  /** Absent on a module with no admin channel: the JK BMS has no identity to edit. */
  onEdit?: () => void;
  onUnpair: () => void;
};

export function ModuleSlotRow({ slot, onEdit, onUnpair }: ModuleSlotRowProps) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { module, pairing, link } = slot;
  const state = linkStateCopy(link);

  if (!pairing) return null;

  const identity = (
    <View style={styles.text}>
      <Text style={styles.title}>{t(module.displayNameKey)}</Text>
      <Text style={styles.subtitle}>{pairing.name}</Text>
      <Text style={styles.subtitle}>{pairing.id}</Text>
      <Text style={styles.link}>{t(state.key, state.params)}</Text>
    </View>
  );

  return (
    <View testID={`module-slot-${module.key}`} style={styles.row}>
      {onEdit ? (
        <Pressable
          testID={`module-edit-${module.key}`}
          style={styles.identity}
          onPress={onEdit}
        >
          {identity}
          <IconSymbol name="chevron-right" size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.identity}>{identity}</View>
      )}

      <Button
        testID={`unpair-${module.key}`}
        variant="secondary"
        onPress={onUnpair}
      >
        {t("modules.list.unpair")}
      </Button>
    </View>
  );
}

type LinkStateCopy = { key: TranslationKey; params?: { time: string } };

function linkStateCopy(link: LinkState): LinkStateCopy {
  if (link.status === "online") return { key: "link.state.online" };
  if (link.status === "connecting") return { key: "link.state.connecting" };
  if (link.lastContactAt === null) return { key: "link.state.offline" };
  return {
    key: "link.state.offlineAt",
    params: { time: clockTime(link.lastContactAt) },
  };
}

function clockTime(at: number): string {
  const date = new Date(at);
  const pad = (part: number) => `${part}`.padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      gap: Spacing.m,
      padding: Spacing.xl,
      borderRadius: BorderRadius.m,
      backgroundColor: colors.surface,
    },
    identity: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.l,
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
    link: {
      color: colors.textMuted,
      fontSize: FontSize.xs,
    },
  });
