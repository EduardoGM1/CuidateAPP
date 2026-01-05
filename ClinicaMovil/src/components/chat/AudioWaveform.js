/**
 * Componente: AudioWaveform
 * 
 * Componente para mostrar visualización de waveform (ondas de audio).
 * Muestra barras animadas que representan el audio.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const AudioWaveform = ({
  isActive = false,
  height = 50,
  color = '#6B9BD1',
  inactiveColor = '#E0E0E0',
  barCount = 25,
  barWidth = 3,
  barSpacing = 2,
}) => {
  const animations = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isActive) {
      // Animar todas las barras de forma aleatoria
      const anims = animations.map((anim, index) => {
        const delay = index * 50; // Delay escalonado para efecto de onda
        const randomHeight = 0.3 + Math.random() * 0.7; // Entre 0.3 y 1.0
        
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: randomHeight,
              duration: 300 + Math.random() * 200, // Duración variable
              useNativeDriver: false, // No usar native driver para SVG
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 300 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        );
      });

      // Iniciar todas las animaciones
      Animated.parallel(anims).start();
    } else {
      // Resetear todas las barras a altura mínima
      animations.forEach((anim) => {
        anim.setValue(0.3);
      });
    }
  }, [isActive, animations]);

  // Generar alturas de barras (simuladas)
  const barHeights = animations.map((anim, index) => {
    // Usar valores animados cuando está activo, o valores estáticos cuando no
    const baseHeight = 0.3 + (index % 3) * 0.1; // Variación básica
    return baseHeight;
  });

  const waveformWidth = (barWidth + barSpacing) * barCount - barSpacing;
  const maxBarHeight = height * 0.8; // 80% de la altura total

  return (
    <View style={[styles.container, { height }]}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${waveformWidth} ${height}`}
        preserveAspectRatio="none"
      >
        {barHeights.map((heightRatio, index) => {
          const barHeight = maxBarHeight * heightRatio;
          const x = index * (barWidth + barSpacing);
          const y = (height - barHeight) / 2;
          const fillColor = isActive ? color : inactiveColor;

          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={barWidth / 2}
              fill={fillColor}
              opacity={isActive ? 1 : 0.5}
            />
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AudioWaveform;

