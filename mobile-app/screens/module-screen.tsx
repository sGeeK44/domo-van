import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { linkSubtitle, reconnectAction } from "@/components/home/link-view";
import { useLinkClock } from "@/components/home/use-link-clock";
import { ModuleLinkNotice } from "@/components/modules";
import { asIconName } from "@/components/navigation/module-tab-icon";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import type { LiveModuleSystems } from "@/composition/ModuleSessions";
import { useModuleSystem } from "@/composition/ModuleSystemsProvider";
import {
  OfflineCard,
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

type OfflineTakeoverProps = {
  module: ModuleDescriptor;
  link: LinkState;
  onReconnect: () => void;
};

function OfflineTakeover({ module, link, onReconnect }: OfflineTakeoverProps) {
  const { t } = useTranslation();
  const styles = useStyles(makeStyles);
  const now = useLinkClock(link);
  const offer = reconnectOffer(link, now);
  if (!offer) return null;

  const busy = offer.action.disabled;

  return (
    <View style={styles.takeover}>
      <OfflineCard
        icon={asIconName(module.tabIcon)}
        title={t("modules.notice.offlineTitle")}
        lastContact={t(offer.lastContact.key, offer.lastContact.params)}
        action={{
          icon: busy ? "bluetooth-searching" : "refresh",
          // The dictionary carries the sentence case every other button shows; this one is set in caps.
          label: t(offer.action.labelKey).toUpperCase(),
          busy,
          // OfflineCard draws no disabled state, so a busy action simply carries no press.
          onPress: busy ? IGNORE_PRESS : onReconnect,
        }}
      />
    </View>
  );
}

const IGNORE_PRESS = () => {};

/** What a link that is not online offers; an online one offers nothing and never reaches the takeover. */
function reconnectOffer(link: LinkState, now: number) {
  const lastContact = linkSubtitle(link, now);
  const action = reconnectAction(link);
  if (!lastContact || !action) return null;
  return { lastContact, action };
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
    // The page frame a wrapped screen must not repeat, see docs/architecture.md.
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
