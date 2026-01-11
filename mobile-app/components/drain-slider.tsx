import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS,
  interpolateColor
} from 'react-native-reanimated';
import { ThemedText } from './themed-text';
import { Colors } from '@/constants/theme';
import { IconSymbol } from './ui/icon-symbol';

const SLIDER_WIDTH = Dimensions.get('window').width - 60; // Adjust based on parent padding
const HANDLE_SIZE = 50;
const MAX_TRANSLATE = SLIDER_WIDTH - HANDLE_SIZE - 10;

export function DrainSlider({ onDrain }: { onDrain: () => void }) {
  const [isDraining, setIsDraining] = useState(false);
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = Math.min(
        Math.max(0, contextX.value + event.translationX),
        MAX_TRANSLATE
      );
    })
    .onEnd(() => {
      if (translateX.value > MAX_TRANSLATE * 0.8) {
        translateX.value = withSpring(MAX_TRANSLATE);
        runOnJS(setIsDraining)(true);
        runOnJS(onDrain)();
      } else {
        translateX.value = withSpring(0);
        runOnJS(setIsDraining)(false);
      }
    });

  const animatedHandleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const animatedTrackStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      translateX.value,
      [0, MAX_TRANSLATE],
      ['rgba(255, 94, 58, 0.1)', Colors.water.drain]
    );
    return {
      backgroundColor,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="warning" size={20} color={Colors.water.drain} />
        <ThemedText style={styles.headerText}>ZONE DE VIDANGE</ThemedText>
      </View>

      <ThemedText style={styles.instruction}>GLISSER POUR VIDANGER {">>>"}</ThemedText>

      <View style={styles.sliderTrack}>
        <Animated.View style={[styles.activeTrack, animatedTrackStyle]} />
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.handle, animatedHandleStyle]}>
            <IconSymbol name="delete" size={24} color="#333" />
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.statusContainer}>
        <ThemedText style={styles.statusText}>
          État vanne : <ThemedText style={{ fontWeight: 'bold' }}>{isDraining ? 'OUVERTE' : 'FERMÉE'}</ThemedText>
        </ThemedText>
        <IconSymbol 
          name={isDraining ? 'lock-open' : 'lock'} 
          size={16} 
          color="#FFD700" 
          style={{ marginLeft: 8 }} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.water.card,
    borderRadius: 25,
    padding: 20,
    marginTop: 20,
    borderWidth: 1.5,
    borderColor: Colors.water.drain,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerText: {
    color: Colors.water.drain,
    fontWeight: '900',
    fontSize: 18,
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  instruction: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 20,
    letterSpacing: 1.5,
    fontWeight: '600',
    opacity: 0.9,
  },
  sliderTrack: {
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    padding: 5,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  activeTrack: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
  },
  handle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    backgroundColor: '#FFF',
    borderRadius: HANDLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    zIndex: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
