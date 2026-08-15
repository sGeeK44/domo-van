import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModuleLinkNotice, OfflineTakeover } from "@/components/modules";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import type { LiveModuleSystems } from "@/composition/ModuleSessions";
import { useModuleSystem } from "@/composition/ModuleSystemsProvider";
import { PageHeader, type Palette, Spacing, useStyles } from "@/design-system";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { TranslationKey } from "@/i18n/keys";

export type ModuleSystemFor<K extends ModuleKey> = NonNullable<
  LiveModuleSystems[K]
>;

export type ModuleScreenProps<K extends ModuleKey> = {
  moduleKey: K;
  titleKey: TranslationKey;
  onSettingsPress: () => void;
  /** Rendered only while the module is online: an offline tab has no reading to show. */
  children: (system: ModuleSystemFor<K>) => ReactNode;
};

/** The shell every module tab shares: one header, and the three states its content can be in. */
export function ModuleScreen<K extends ModuleKey>({
  moduleKey,
  titleKey,
  onSettingsPress,
  children,
}: ModuleScreenProps<K>) {
  const { t } = useTranslation();
  const styles = useStyles(makeStyles);
  const slot = useModuleSlot(moduleKey);
  const { reconnect } = useModuleRegistry();
  const system = useModuleSystem(moduleKey);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        {/* No bluetooth button: the link is a dot on the tab, and the takeover carries the reconnection. */}
        <PageHeader
          title={t(titleKey)}
          onSettingsPress={onSettingsPress}
          settingsIcon="tune"
        />
        <ModuleBody
          slot={slot}
          renderOnline={() => (system ? children(system) : null)}
          onReconnect={() => void reconnect(moduleKey)}
        />
      </SafeAreaView>
    </View>
  );
}

type ModuleBodyProps = {
  slot: ModuleSlot;
  renderOnline: () => ReactNode;
  onReconnect: () => void;
};

function ModuleBody({ slot, renderOnline, onReconnect }: ModuleBodyProps) {
  const styles = useStyles(makeStyles);

  if (!slot.pairing) {
    return (
      <ModuleLinkNotice
        deviceName={null}
        isConnecting={false}
        onReconnect={onReconnect}
      />
    );
  }

  if (slot.link.status !== "online") {
    return (
      <OfflineTakeover
        module={slot.module}
        link={slot.link}
        onReconnect={onReconnect}
      />
    );
  }

  return <View style={styles.content}>{renderOnline()}</View>;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    safeArea: {
      flex: 1,
    },
    // The page frame a wrapped screen must not repeat, see docs/architecture.md.
    content: {
      flex: 1,
      paddingTop: Spacing.s,
      paddingHorizontal: Spacing.gutter,
    },
  });
