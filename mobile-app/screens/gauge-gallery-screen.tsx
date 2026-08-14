import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BorderRadius,
  Button,
  GaugeBars,
  GaugeColumn,
  GaugeHero,
  GaugeRow,
  GaugeSetpointRow,
  GaugeSurface,
  OfflineCard,
  PageHeader,
  type Palette,
  Section,
  Spacing,
  useStyles,
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

/** The minimum cell is named by its label, the way a caller marks it. */
const CELLS = [
  { id: "c1", label: "C1", ratio: 0.78, value: "3.42" },
  { id: "c2", label: "C2", ratio: 0.76, value: "3.41" },
  { id: "c3", label: "C3", ratio: 0.84, value: "3.44" },
  { id: "c4", label: "C4 min", ratio: 0.7, value: "3.39" },
];

export default function GaugeGalleryScreen() {
  const colors = useThemeColor();
  const styles = useStyles(makeStyles);
  const [ratio, setRatio] = useState(HIGH);
  const percent = String(Math.round(ratio * 100));

  const water = {
    fillColor: colors.fill.cleanWater,
    lineColor: colors.line.cleanWater,
  };
  const heat = { fillColor: colors.fill.heat, lineColor: colors.line.heat };

  return (
    <SafeAreaView style={styles.screen}>
      <PageHeader title="Gauge gallery" />

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
          <Text style={styles.caption}>Radius {RADII.join(", ")} at 100 %</Text>
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
            style={styles.column}
            {...water}
          />
          <Button onPress={() => setRatio(ratio === HIGH ? LOW : HIGH)}>
            Toggle level
          </Button>
        </Section>

        <Section title="Gauge row">
          <Text style={styles.caption}>Filled, offline, empty slot</Text>
          <GaugeRow
            ratio={ratio}
            icon="water-drop"
            label="CLEAN WATER"
            subtitle={`${percent} L / 100 L`}
            value={{ amount: percent, unit: "%" }}
            onPress={() => setRatio(ratio === HIGH ? LOW : HIGH)}
            {...water}
          />
          <GaugeRow
            ratio={0}
            state="hatched"
            icon="bolt"
            label="BATTERY"
            subtitle="Last contact 15:08"
            subtitleTone="danger"
            action={{
              icon: "refresh",
              label: "RECONNECT",
              tone: "danger",
              onPress: () => {},
            }}
            {...water}
          />
          <GaugeRow
            ratio={0}
            state="hatched"
            icon="local-fire-department"
            label="HEATER"
            subtitle="no module"
            subtitleTone="muted"
            trailingAdd
            {...heat}
          />
        </Section>

        <Section title="Hero and bars">
          <Text style={styles.caption}>Hero at 82 %</Text>
          <GaugeHero
            ratio={0.82}
            fillColor={colors.fill.battery}
            lineColor={colors.line.battery}
            label="BATTERY"
            value={{ amount: "82", unit: "%" }}
            aside={{ value: "18 h", caption: "autonomy" }}
          />
          <Text style={styles.caption}>Cells at 78, 76, 84, 70 %</Text>
          <GaugeBars
            bars={CELLS}
            fillColor={colors.fill.battery}
            style={styles.cluster}
          />
        </Section>

        <Section title="Column gauge">
          <Text style={styles.caption}>
            Clean tank, then the grey tank draining
          </Text>
          <View style={styles.tanks}>
            <GaugeColumn
              ratio={ratio}
              label="CLEAN WATER"
              caption="100 L tank"
              value={{ amount: percent, unit: " L" }}
              footer="4 DAYS LEFT"
              {...water}
            />
            <GaugeColumn
              draining
              ratio={LOW}
              label="GREY WATER"
              caption="Draining"
              value={{ amount: "28", unit: " L" }}
              footer="VALVE OPEN"
              fillColor={colors.fill.greyWater}
              lineColor={colors.line.greyWater}
            />
          </View>
          <Text style={styles.caption}>
            Full tank: the 28 px corners clip the fill
          </Text>
          <View style={styles.tanks}>
            <GaugeColumn
              ratio={1}
              label="CLEAN WATER"
              caption="100 L tank"
              value={{ amount: "100", unit: " L" }}
              footer="6 DAYS LEFT"
              {...water}
            />
          </View>
        </Section>

        <Section title="Setpoint row">
          <Text style={styles.caption}>
            Live zone, then the same zone switched off
          </Text>
          <View style={styles.zonePair}>
            <GaugeSetpointRow
              ratio={0.52}
              setpointRatio={0.55}
              markerColor={colors.line.heat}
              fillColor={colors.fill.heat}
              label="SALON"
              value="21°"
              caption="19.4° · 62 %"
              onDecrease={() => {}}
              onIncrease={() => {}}
              onTogglePower={() => {}}
            />
            <GaugeSetpointRow
              ratio={0.52}
              setpointRatio={0.55}
              markerColor={colors.line.heat}
              fillColor={colors.fill.heat}
              label="CABINE"
              value="18°"
              caption="16.1° · 58 %"
              inert
              onDecrease={() => {}}
              onIncrease={() => {}}
              onTogglePower={() => {}}
            />
          </View>
          <Text style={styles.caption}>
            Target at 0 %, on the fill boundary, then at 100 %
          </Text>
          <View style={styles.zoneTrio}>
            {[0, 0.52, 1].map((setpoint) => (
              <GaugeSetpointRow
                key={setpoint}
                ratio={0.52}
                setpointRatio={setpoint}
                markerColor={colors.line.heat}
                fillColor={colors.fill.heat}
                label="SOUTE"
                value={`${Math.round(setpoint * 100)} %`}
                caption="target position"
                onDecrease={() => {}}
                onIncrease={() => {}}
                onTogglePower={() => {}}
              />
            ))}
          </View>
        </Section>

        <Section title="Offline card">
          <Text style={styles.caption}>Idle, then reconnecting</Text>
          <OfflineCard
            icon="bluetooth-disabled"
            title="BATTERY OFFLINE"
            lastContact="Last contact 15:08"
            action={{ icon: "refresh", label: "RECONNECT", onPress: () => {} }}
          />
          <OfflineCard
            icon="bluetooth-disabled"
            title="BATTERY OFFLINE"
            lastContact="Last contact 15:08"
            action={{
              icon: "bluetooth-searching",
              label: "CONNECTING",
              busy: true,
              onPress: () => {},
            }}
          />
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
    cluster: {
      height: 96,
    },
    tanks: {
      flexDirection: "row",
      gap: Spacing.m,
      height: 280,
    },
    // a setpoint row is flex: 1, as the heat screen stacks its zones
    zonePair: {
      height: 270,
      gap: Spacing.m,
    },
    zoneTrio: {
      height: 400,
      gap: Spacing.m,
    },
  });
