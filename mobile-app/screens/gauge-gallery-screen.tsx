import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BorderRadius,
  Button,
  GaugeSurface,
  IconCircleButton,
  Motion,
  PageTitle,
  type Palette,
  Section,
  Spacing,
  useStyles,
  useTheme,
  useThemeColor,
} from "@/design-system";

/** Every radius the gauge family uses, so device checks cover all four at once. */
const RADII = [
  BorderRadius.m,
  BorderRadius.xl,
  BorderRadius.xxl,
  BorderRadius.xxxl,
];

const LOW = 0.28;
const HIGH = 0.72;

export default function GaugeGalleryScreen() {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const { colorScheme, setThemeMode } = useTheme();
  const [ratio, setRatio] = useState(HIGH);

  const water = {
    fillColor: colors.fill.cleanWater,
    lineColor: colors.line.cleanWater,
  };
  const heat = { fillColor: colors.fill.heat, lineColor: colors.line.heat };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <PageTitle>Gauge gallery</PageTitle>
        <IconCircleButton
          testID="theme-mode"
          icon={colorScheme === "dark" ? "light-mode" : "dark-mode"}
          onPress={() =>
            setThemeMode(colorScheme === "dark" ? "light" : "dark")
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Horizontal fill">
          <Text style={styles.caption}>0 %, 42 %, 100 %</Text>
          {[0, 0.42, 1].map((value) => (
            <GaugeSurface
              key={value}
              ratio={value}
              axis="horizontal"
              radius={BorderRadius.xxl}
              style={styles.row}
              {...water}
            />
          ))}
        </Section>

        <Section title="Vertical fill">
          <Text style={styles.caption}>0 %, 42 %, 100 %, hatched</Text>
          <View style={styles.columns}>
            {[0, 0.42, 1].map((value) => (
              <GaugeSurface
                key={value}
                ratio={value}
                axis="vertical"
                radius={BorderRadius.xxxl}
                style={styles.column}
                {...water}
              />
            ))}
            <GaugeSurface
              ratio={0}
              axis="vertical"
              hatched
              radius={BorderRadius.xxxl}
              style={styles.column}
              {...water}
            />
          </View>
        </Section>

        <Section title="Marker and outline">
          <Text style={styles.caption}>Setpoint marker at 55 %</Text>
          <GaugeSurface
            ratio={0.42}
            axis="horizontal"
            markerRatio={0.55}
            markerColor={colors.line.heat}
            radius={BorderRadius.xl}
            style={styles.row}
            {...heat}
          />
          <Text style={styles.caption}>Danger outline, solid then dashed</Text>
          <GaugeSurface
            ratio={0.42}
            axis="horizontal"
            outline={{ color: colors.danger, width: 2 }}
            radius={BorderRadius.xxl}
            style={styles.row}
            {...water}
          />
          <GaugeSurface
            ratio={0}
            axis="horizontal"
            hatched
            outline={{ color: colors.dash, style: "dashed", width: 2 }}
            radius={BorderRadius.xxl}
            style={styles.row}
            {...water}
          />
        </Section>

        <Section title="Corner clipping">
          <Text style={styles.caption}>Radius 15, 20, 24 and 28 at 100 %</Text>
          <View style={styles.columns}>
            {RADII.map((radius) => (
              <GaugeSurface
                key={radius}
                ratio={1}
                axis="vertical"
                radius={radius}
                style={styles.column}
                {...water}
              />
            ))}
          </View>
        </Section>

        <Section title="Level change">
          <Text style={styles.caption}>
            The fill sweeps to its new level, it never jumps
          </Text>
          <GaugeSurface
            ratio={ratio}
            axis="vertical"
            radius={BorderRadius.xxxl}
            duration={Motion.fill}
            style={styles.column}
            {...water}
          />
          <Button onPress={() => setRatio(ratio === HIGH ? LOW : HIGH)}>
            Toggle level
          </Button>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.screen,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: Spacing.xxl,
      paddingVertical: Spacing.l,
    },
    content: {
      paddingBottom: Spacing.block,
    },
    caption: {
      color: colors.textMuted,
      paddingBottom: Spacing.xxs,
    },
    row: {
      height: 96,
      backgroundColor: colors.surface,
    },
    columns: {
      flexDirection: "row",
      gap: Spacing.m,
    },
    column: {
      flex: 1,
      height: 180,
      backgroundColor: colors.surface,
    },
  });
