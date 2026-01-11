import React from 'react';
import { StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { WaterTank } from '@/components/water-tank';
import { DrainSlider } from '@/components/drain-slider';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function WaterScreen() {
  const handleDrain = () => {
    console.log('Draining water...');
    // Implement actual draining logic here
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <ThemedView style={styles.header}>
          <ThemedView style={styles.statusRow}>
            <ThemedView style={styles.statusItem}>
              <ThemedView style={styles.iconCircle}>
                <IconSymbol name="bluetooth" size={14} color="#4CAF50" />
              </ThemedView>
              <ThemedText style={styles.statusText}>Connecté au Camion</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statusItem}>
              <IconSymbol name="battery-std" size={18} color="#FFFFFF" />
              <ThemedView style={{ marginLeft: 6 }}>
                <ThemedText style={styles.statusLabelText}>Batt Aux</ThemedText>
                <ThemedText style={styles.statusValueText}>12.8V</ThemedText>
              </ThemedView>
            </ThemedView>
          </ThemedView>
          
          <ThemedText type="title" style={styles.title}>
            Niveaux d{"'"}Eau
          </ThemedText>
        </ThemedView>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.tanksRow}>
            <WaterTank 
              // label="EAU PROPRE" 
              // subLabel="(150L)" 
              // volumeLabel="120L" 
              percentage={80} 
              // color={Colors.water.clean} 
            />
            <WaterTank 
              // label="EAU GRISE" 
              // subLabel="(Sale)" 
              // volumeLabel="35%"
              percentage={35} 
              // color={Colors.water.grey} 
            />
          </ThemedView>

          <DrainSlider onDrain={handleDrain} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statusValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  tanksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    backgroundColor: 'transparent',
  },
});
