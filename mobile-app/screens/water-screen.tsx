import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { linkTone, reconnectAction } from "@/components/home/link-view";
import { DrainSlider } from "@/components/water/drain-slider";
import { WaterTank } from "@/components/water/water-tank";
import {
  useModuleRegistry,
  useModuleSlot,
} from "@/composition/ModuleRegistryProvider";
import { useWaterSystem } from "@/composition/ModuleSystemsProvider";
import { useObservable } from "@/core/react/useObservable";
import { PageHeader, type Palette, useThemeColor } from "@/design-system";
import { DEFAULT_VALVE_STATE } from "@/domain/water/DrainValve";
import { DEFAULT_TANK_SNAPSHOT } from "@/domain/water/TankLevelSensor";

export default function WaterScreen() {
  const { t } = useTranslation();
  const colors = useThemeColor();
  const styles = getStyles(colors);
  const router = useRouter();

  const { link } = useModuleSlot("water");
  const { reconnect } = useModuleRegistry();
  const isConnected = link.status === "online";
  const waterSystem = useWaterSystem();

  const clean = useObservable(
    waterSystem?.cleanTank ?? null,
    DEFAULT_TANK_SNAPSHOT,
  );
  const grey = useObservable(
    waterSystem?.greyTank ?? null,
    DEFAULT_TANK_SNAPSHOT,
  );
  const valve = useObservable(
    waterSystem?.greyDrainValve ?? null,
    DEFAULT_VALVE_STATE,
  );

  const handleDrain = () => {
    void waterSystem?.greyDrainValve.open();
  };
  const handleStopDrain = () => {
    void waterSystem?.greyDrainValve.close();
  };

  // Show 0 when disconnected
  const cleanCapacity = isConnected ? clean.capacityLiters : 0;
  const cleanPercentage = isConnected ? clean.percentage : 0;
  const greyCapacity = isConnected ? grey.capacityLiters : 0;
  const greyPercentage = isConnected ? grey.percentage : 0;

  // Valve state
  const isDraining = isConnected && valve.position === "open";
  const remainingSeconds = isConnected ? valve.remainingSeconds : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="default" />
      <SafeAreaView style={{ flex: 1 }}>
        <PageHeader
          title={t("water.levels.title")}
          onSettingsPress={() => router.push("/water-settings")}
          onBluetoothPress={() => void reconnect("water")}
          bluetoothStatus={linkTone(link)}
          bluetoothDisabled={reconnectAction(link)?.disabled ?? true}
        />
        <View style={styles.content}>
          <View style={styles.tanksRow}>
            <WaterTank
              name={t("water.levels.cleanTank")}
              capacity={cleanCapacity}
              percentage={cleanPercentage}
              color={colors.fill.cleanWater}
            />
            <WaterTank
              name={t("water.levels.greyTank")}
              capacity={greyCapacity}
              percentage={greyPercentage}
              color={colors.fill.greyWater}
            />
          </View>
          <DrainSlider
            isDraining={isDraining}
            remainingSeconds={remainingSeconds}
            onDrain={handleDrain}
            onStopDrain={handleStopDrain}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const getStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    content: {
      flex: 1,
      padding: 20,
      gap: 20,
    },
    tanksRow: {
      flex: 1,
      flexDirection: "row",
      alignSelf: "stretch",
      backgroundColor: "transparent",
      gap: 10,
    },
  });
