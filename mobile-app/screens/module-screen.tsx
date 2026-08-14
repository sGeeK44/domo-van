import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { linkSubtitle, reconnectAction } from "@/components/home/link-view";
import { useLinkClock } from "@/components/home/use-link-clock";
import { ModuleLinkNotice } from "@/components/modules";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import type { LiveModuleSystems } from "@/composition/ModuleSessions";
import { useModuleSystem } from "@/composition/ModuleSystemsProvider";
import {
  OfflineCard,
  type OfflineCardProps,
  PageHeader,
  type Palette,
  Spacing,
  useStyles,
} from "@/design-system";
import type {
  ModuleDescriptor,
  ModuleKey,
} from "@/domain/modules/ModuleDescriptor";
import type { LinkState, ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { TranslationKey } from "@/i18n/keys";

type ModuleSystemFor<K extends ModuleKey> = NonNullable<LiveModuleSystems[K]>;

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
        <PageHeader title={t(titleKey)} onSettingsPress={onSettingsPress} />
        <ModuleBody
          slot={slot}
          content={() => (system ? children(system) : null)}
          onReconnect={() => void reconnect(moduleKey)}
        />
      </SafeAreaView>
    </View>
  );
}

type ModuleBodyProps = {
  slot: ModuleSlot;
  /** Called only on the online branch, so an offline tab never reads a stale value. */
  content: () => ReactNode;
  onReconnect: () => void;
};

function ModuleBody({ slot, content, onReconnect }: ModuleBodyProps) {
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

  return <View style={styles.content}>{content()}</View>;
}

type OfflineTakeoverProps = {
  module: ModuleDescriptor;
  link: LinkState;
  onReconnect: () => void;
};

function OfflineTakeover({ module, link, onReconnect }: OfflineTakeoverProps) {
  const { t } = useTranslation();
  const styles = useStyles(makeStyles);
  const now = useLinkClock(link);
  const lastContact = linkSubtitle(link, now);
  const action = reconnectAction(link);
  // Both answer null for an online link, which the shell renders its screen for instead.
  if (!lastContact || !action) return null;

  const busy = action.disabled;

  return (
    <View style={styles.takeover}>
      <OfflineCard
        icon={iconName(module.tabIcon)}
        title={t("modules.notice.offlineTitle")}
        lastContact={t(lastContact.key, lastContact.params)}
        action={{
          icon: busy ? "bluetooth-searching" : "refresh",
          // The dictionary carries the sentence case every other button shows; this one is set in caps.
          label: t(action.labelKey).toUpperCase(),
          busy,
          onPress: onReconnect,
        }}
      />
    </View>
  );
}

// The catalogue names an icon without knowing which set draws it.
function iconName(name: string): OfflineCardProps["icon"] {
  return name as OfflineCardProps["icon"];
}

/** The mockup centres the takeover on 0 / 18 / 40, and no Spacing step lands on 40. */
const TAKEOVER_BOTTOM = 40;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    safeArea: {
      flex: 1,
    },
    // The shell's own 8 / 18 / 0, so a screen it wraps carries no padding of its own.
    content: {
      flex: 1,
      paddingTop: Spacing.s,
      paddingHorizontal: Spacing.gutter,
    },
    takeover: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: Spacing.gutter,
      paddingBottom: TAKEOVER_BOTTOM,
    },
  });
