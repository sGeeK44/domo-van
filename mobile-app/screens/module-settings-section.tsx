import { useRootNavigationState, useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { type ErrorReport, errorMessage } from "@/components/error-message";
import { UnpairSheet } from "@/components/modules";
import { moduleSettingsRows } from "@/components/settings/settings-rows";
import {
  useModuleRegistry,
  useModuleSlots,
} from "@/composition/ModuleRegistryProvider";
import {
  FontSize,
  IconCircleButton,
  NavRow,
  type Palette,
  Spacing,
  useStyles,
  useThemeColor,
} from "@/design-system";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";

/** Réglages reaches the same three forms the module tabs' tune chip does. */
const FORM_ROUTE = {
  water: "/settings/water-tanks",
  heater: "/settings/heater-pid",
  battery: "/settings/battery-info",
} as const satisfies Record<ModuleKey, string>;

/** The only way into an identity form — and the JK BMS has no admin channel to reach. */
const IDENTITY_ROUTE = {
  water: "/settings/water-identity",
  heater: "/settings/heater-identity",
} as const;

type EditableModule = keyof typeof IDENTITY_ROUTE;

function hasIdentityForm(key: ModuleKey): key is EditableModule {
  return key in IDENTITY_ROUTE;
}

const ADD_MODULE_ROUTE = "/add-module";
const DASHBOARD_ROUTE = "/(tabs)";

export function ModuleSettingsSection() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const router = useRouter();

  const slots = useModuleSlots();
  const { unpair } = useModuleRegistry();
  const navigationState = useRootNavigationState();

  const [leaving, setLeaving] = useState<ModuleSlot | null>(null);
  const [isUnpairing, setIsUnpairing] = useState(false);
  const [error, setError] = useState<ErrorReport | null>(null);

  const confirmUnpair = async () => {
    if (!leaving || isUnpairing) return;
    const key = leaving.module.key;

    setIsUnpairing(true);
    setError(null);
    try {
      await unpair(key);
      // replace would stack a second tabs navigator over the first; dismissTo pops back to it
      if (openTabName(navigationState) === key) {
        router.dismissTo(DASHBOARD_ROUTE);
      }
      setLeaving(null);
    } catch (cause: unknown) {
      // the slot is already free in memory but storage still holds the pairing, so it would come back at the next launch
      setError({ cause, fallbackKey: "modules.list.unpairFailed" });
    } finally {
      setIsUnpairing(false);
    }
  };

  return (
    <>
      {error && (
        <Text style={styles.error}>
          {errorMessage(error.cause, t, error.fallbackKey)}
        </Text>
      )}

      {moduleSettingsRows(slots, colors).map((row) => {
        const key = row.moduleKey;
        const identityRoute = hasIdentityForm(key) ? IDENTITY_ROUTE[key] : null;

        return (
          <NavRow
            key={key}
            testID={`settings-row-${key}`}
            icon={row.icon}
            iconBackground={row.iconBackground}
            title={t(row.titleKey)}
            subtitle={t(row.subtitleKey)}
            dimmed={!row.paired}
            onPress={() => router.push(FORM_ROUTE[key])}
            trailing={
              row.paired ? (
                <View style={styles.actions}>
                  {identityRoute && (
                    <IconCircleButton
                      testID={`module-edit-${key}`}
                      icon="edit"
                      accessibilityLabel={t("settings.rows.editIdentity")}
                      onPress={() => router.push(identityRoute)}
                    />
                  )}
                  <IconCircleButton
                    testID={`unpair-${key}`}
                    icon="delete"
                    accessibilityLabel={t("modules.list.unpair")}
                    onPress={() => setLeaving(slotOf(slots, key))}
                  />
                </View>
              ) : (
                <IconCircleButton
                  testID={`add-slot-${key}`}
                  icon="add"
                  accessibilityLabel={t("dashboard.addModule")}
                  onPress={() => router.push(ADD_MODULE_ROUTE)}
                />
              )
            }
          />
        );
      })}

      <UnpairSheet
        visible={leaving !== null}
        moduleName={leaving ? t(leaving.module.displayNameKey) : ""}
        deviceName={leaving?.pairing?.name ?? ""}
        isUnpairing={isUnpairing}
        onCancel={() => setLeaving(null)}
        onConfirm={confirmUnpair}
      />
    </>
  );
}

function slotOf(
  slots: readonly ModuleSlot[],
  key: ModuleKey,
): ModuleSlot | null {
  return slots.find((candidate) => candidate.module.key === key) ?? null;
}

type NavigationSnapshot = {
  index?: number;
  routes?: readonly { name: string; state?: NavigationSnapshot }[];
};

/** A tab route is named after the module it shows, so the open tab reads as a module key. */
function openTabName(
  state: NavigationSnapshot | undefined,
): ModuleKey | undefined {
  const tabs = state?.routes?.find((route) => route.name === "(tabs)")?.state;
  if (!tabs?.routes || tabs.index === undefined) return undefined;
  const name = tabs.routes[tabs.index]?.name;
  return name === "water" || name === "heater" || name === "battery"
    ? name
    : undefined;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    error: {
      color: colors.danger,
      fontSize: FontSize.xs,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.s,
    },
  });
