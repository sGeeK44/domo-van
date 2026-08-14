import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type {
  CardCopy,
  DashboardCardView,
} from "@/components/home/dashboard-cards";
import { linkSubtitle, reconnectAction } from "@/components/home/link-view";
import { useLinkClock } from "@/components/home/use-link-clock";
import { asIconName } from "@/components/navigation/module-tab-icon";
import { GaugeRow, useThemeColor } from "@/design-system";
import type { LinkState } from "@/domain/modules/ModuleSlot";

export type DashboardCardProps = {
  view: DashboardCardView;
  /** The card of a free slot offers to fill it. */
  onAdd(): void;
  /** Every other card opens the module's own tab. */
  onOpen(): void;
  onReconnect(): void;
};

export function DashboardCard(props: DashboardCardProps) {
  switch (props.view.state) {
    case "reading":
      return <ReadingCard {...props} view={props.view} />;
    case "unpaired":
      return <UnpairedCard {...props} view={props.view} />;
    case "offline":
      return <OfflineCardRow {...props} view={props.view} />;
  }
}

type CardOf<S extends DashboardCardView["state"]> = Extract<
  DashboardCardView,
  { state: S }
>;

function ReadingCard({
  view,
  onOpen,
}: DashboardCardProps & { view: CardOf<"reading"> }) {
  const { t } = useTranslation();
  const colors = useThemeColor();

  return (
    <GaugeRow
      testID={cardTestID(view)}
      ratio={view.ratio}
      fillColor={colors.fill[view.tint]}
      lineColor={colors.line[view.tint]}
      icon={asIconName(view.icon)}
      label={t(view.labelKey)}
      subtitle={say(t, view.subtitle)}
      value={view.value}
      onPress={onOpen}
    />
  );
}

function UnpairedCard({
  view,
  onAdd,
}: DashboardCardProps & { view: CardOf<"unpaired"> }) {
  const { t } = useTranslation();
  const colors = useThemeColor();

  return (
    <GaugeRow
      testID={cardTestID(view)}
      state="hatched"
      ratio={0}
      fillColor={colors.fill[view.tint]}
      lineColor={colors.line[view.tint]}
      icon={asIconName(view.icon)}
      label={t(view.labelKey)}
      subtitle={t("dashboard.emptySlot.hint")}
      subtitleTone="muted"
      trailingAdd
      onPress={onAdd}
    />
  );
}

function OfflineCardRow({
  view,
  onOpen,
  onReconnect,
}: DashboardCardProps & { view: CardOf<"offline"> }) {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const offer = reconnectOffer(view.link, useLinkClock(view.link));
  if (!offer) return null;

  const busy = offer.action.disabled;

  return (
    <GaugeRow
      testID={cardTestID(view)}
      state="hatched"
      ratio={0}
      fillColor={colors.fill[view.tint]}
      lineColor={colors.line[view.tint]}
      icon={asIconName(view.icon)}
      label={t(view.labelKey)}
      subtitle={t(offer.lastContact.key, offer.lastContact.params)}
      subtitleTone={busy ? "muted" : "danger"}
      action={{
        icon: busy ? "bluetooth-searching" : "refresh",
        // The dictionary carries the sentence case every other button shows; this one is set in caps.
        label: t(offer.action.labelKey).toUpperCase(),
        tone: busy ? "muted" : "danger",
        // GaugeRow's action draws no disabled state, so a busy one simply carries no press.
        onPress: busy ? IGNORE_PRESS : onReconnect,
      }}
      onPress={onOpen}
    />
  );
}

const IGNORE_PRESS = () => {};

export function cardTestID(view: DashboardCardView): string {
  return `dashboard-card-${view.id}`;
}

/** Every card testID the dashboard can draw, so a test counts cards and nothing else. */
export const DASHBOARD_CARD_TEST_ID = /^dashboard-card-/;

function say(t: TFunction, copy: CardCopy): string {
  const named = Object.entries(copy.keyParams ?? {}).map(([name, key]) => [
    name,
    t(key),
  ]);
  return t(copy.key, { ...copy.params, ...Object.fromEntries(named) });
}

/** What a link that is not online offers; an online one never reaches this card. */
function reconnectOffer(link: LinkState, now: number) {
  const lastContact = linkSubtitle(link, now);
  const action = reconnectAction(link);
  if (!lastContact || !action) return null;
  return { lastContact, action };
}
