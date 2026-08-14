import type { ComponentProps } from "react";
import { LinkBadge } from "@/components/home/link-badge";
import type { ModuleTab } from "@/components/navigation/module-tabs";
import { IconSymbol } from "@/design-system";

const TAB_ICON_SIZE = 28;
const TAB_BADGE_SIZE = 8;

export type ModuleTabIconProps = {
  tab: ModuleTab;
  color: string;
};

export function ModuleTabIcon({ tab, color }: ModuleTabIconProps) {
  const icon = (
    <IconSymbol
      size={TAB_ICON_SIZE}
      name={asIconName(tab.icon)}
      color={color}
    />
  );
  if (!tab.link) return icon;

  return (
    <LinkBadge link={tab.link} size={TAB_BADGE_SIZE}>
      {icon}
    </LinkBadge>
  );
}

// The catalogue names an icon without knowing which set draws it.
export function asIconName(
  name: string,
): ComponentProps<typeof IconSymbol>["name"] {
  return name as ComponentProps<typeof IconSymbol>["name"];
}
