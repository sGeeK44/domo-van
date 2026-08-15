import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ModuleLinkNotice, OfflineTakeover } from "@/components/modules";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import { useModuleSystem } from "@/composition/ModuleSystemsProvider";
import {
  Opacity,
  type Palette,
  SettingsHeader,
  Spacing,
  TextStyles,
  useStyles,
} from "@/design-system";
import type { ModuleKey } from "@/domain/modules/ModuleDescriptor";
import type { ModuleSlot } from "@/domain/modules/ModuleSlot";
import type { TranslationKey } from "@/i18n/keys";
import type { ModuleSystemFor } from "@/screens/module-screen";

export type SettingsFormSave = { onPress: () => void; busy: boolean };

export type SettingsFormScreenProps<K extends ModuleKey> = {
  moduleKey: K;
  crumbKey: TranslationKey;
  titleKey: TranslationKey;
  introKey: TranslationKey;
  noteKey?: TranslationKey;
  /** Absent on a read-only form: Batterie has no save button. */
  save?: SettingsFormSave;
  children: (system: ModuleSystemFor<K>) => ReactNode;
};

/** The shell every settings form shares: the crumb header, the title block, and the three module states. */
export function SettingsFormScreen<K extends ModuleKey>({
  moduleKey,
  crumbKey,
  titleKey,
  introKey,
  noteKey,
  save,
  children,
}: SettingsFormScreenProps<K>) {
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useStyles(makeStyles);
  const slot = useModuleSlot(moduleKey);
  const { reconnect } = useModuleRegistry();
  const system = useModuleSystem(moduleKey);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        {/* Back is a pop: the surface that pushed the form is where it returns. */}
        <SettingsHeader
          title={t(crumbKey)}
          variant="crumb"
          onBackPress={() => router.back()}
        />
        <FormBody
          slot={slot}
          onReconnect={() => void reconnect(moduleKey)}
          renderOnline={() =>
            system ? (
              <OnlineForm
                titleKey={titleKey}
                introKey={introKey}
                noteKey={noteKey}
                save={save}
              >
                {children(system)}
              </OnlineForm>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

type OnlineFormProps = {
  titleKey: TranslationKey;
  introKey: TranslationKey;
  noteKey?: TranslationKey;
  save?: SettingsFormSave;
  children: ReactNode;
};

function OnlineForm({
  titleKey,
  introKey,
  noteKey,
  save,
  children,
}: OnlineFormProps) {
  const { t } = useTranslation();
  const styles = useStyles(makeStyles);

  return (
    <>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{t(titleKey)}</Text>
        <Text style={styles.intro}>{t(introKey)}</Text>
      </View>
      <KeyboardAwareScrollView
        testID="settings-form-list"
        bottomOffset={KEYBOARD_OFFSET}
        style={styles.scroll}
        contentContainerStyle={styles.list}
      >
        {children}
        {save && <SaveButton save={save} />}
        {noteKey && <Text style={styles.note}>{t(noteKey)}</Text>}
      </KeyboardAwareScrollView>
    </>
  );
}

type FormBodyProps = {
  slot: ModuleSlot;
  renderOnline: () => ReactNode;
  onReconnect: () => void;
};

function FormBody({ slot, renderOnline, onReconnect }: FormBodyProps) {
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

  return renderOnline();
}

function SaveButton({ save }: { save: SettingsFormSave }) {
  const { t } = useTranslation();
  const styles = useStyles(makeStyles);

  return (
    <Pressable
      testID="settings-form-save"
      disabled={save.busy}
      onPress={save.onPress}
      style={[styles.save, save.busy && styles.saveBusy]}
    >
      <Text style={styles.saveLabel}>
        {t("common.actions.save").toUpperCase()}
      </Text>
    </Pressable>
  );
}

// How far above the keyboard the focused field's caret is kept; extraKeyboardSpace is
// what would pad the scroll instead, and the inline save button needs no clearance.
const KEYBOARD_OFFSET = 78;

/** The mockup's 60 / 20 save button, its label at the .04em of TextStyles.button's 17 px. */
const SAVE_HEIGHT = 60;
const SAVE_RADIUS = 20;
const SAVE_LETTER_SPACING = 0.68;

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    safeArea: {
      flex: 1,
    },
    titleBlock: {
      paddingTop: Spacing.xl,
      paddingHorizontal: Spacing.gutter,
      gap: Spacing.m,
    },
    title: {
      ...TextStyles.formTitle,
      color: colors.text,
    },
    intro: {
      ...TextStyles.bodySmall,
      color: colors.textMuted,
    },
    scroll: {
      flex: 1,
    },
    list: {
      gap: Spacing.l,
      paddingTop: Spacing.xxxl,
      paddingHorizontal: Spacing.gutter,
    },
    save: {
      height: SAVE_HEIGHT,
      borderRadius: SAVE_RADIUS,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.inverse,
      marginBottom: Spacing.gutter,
    },
    saveBusy: {
      opacity: Opacity.subtle,
    },
    saveLabel: {
      ...TextStyles.button,
      letterSpacing: SAVE_LETTER_SPACING,
      color: colors.onInverse,
    },
    note: {
      ...TextStyles.monoSmall,
      color: colors.textMuted,
      paddingBottom: Spacing.gutter,
    },
  });
