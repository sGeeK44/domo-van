import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { linkSubtitle, reconnectAction } from "@/components/home/link-view";
import { useLinkClock } from "@/components/home/use-link-clock";
import { asIconName } from "@/components/navigation/module-tab-icon";
import { OfflineCard, Spacing } from "@/design-system";
import type { ModuleDescriptor } from "@/domain/modules/ModuleDescriptor";
import type { LinkState } from "@/domain/modules/ModuleSlot";

export type OfflineTakeoverProps = {
  module: ModuleDescriptor;
  link: LinkState;
  onReconnect: () => void;
};

/** What a tab and a settings form both show instead of their content while the module is away. */
export function OfflineTakeover({
  module,
  link,
  onReconnect,
}: OfflineTakeoverProps) {
  const { t } = useTranslation();
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

const styles = StyleSheet.create({
  takeover: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.gutter,
    paddingBottom: TAKEOVER_BOTTOM,
  },
});
