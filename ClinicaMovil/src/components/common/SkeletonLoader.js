/**
 * Componente: SkeletonLoader
 * 
 * Componente de skeleton loading para mostrar mientras se cargan datos.
 */

import React from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const SkeletonLoader = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style,
  variant = 'default' // 'default' | 'circle' | 'rounded'
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getBorderRadius = () => {
    switch (variant) {
      case 'circle':
        return typeof height === 'number' ? height / 2 : 50;
      case 'rounded':
        return borderRadius * 2;
      default:
        return borderRadius;
    }
  };

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: getBorderRadius(),
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Skeleton para lista de elementos
 */
export const SkeletonList = ({ count = 3, itemHeight = 60, spacing = 10 }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonLoader
          key={index}
          height={itemHeight}
          style={{ marginBottom: spacing }}
        />
      ))}
    </View>
  );
};

/**
 * Skeleton para tarjeta
 */
export const SkeletonCard = () => {
  return (
    <View style={styles.cardContainer}>
      <SkeletonLoader height={20} width="60%" style={styles.cardTitle} />
      <SkeletonLoader height={16} width="100%" style={styles.cardLine} />
      <SkeletonLoader height={16} width="80%" style={styles.cardLine} />
      <SkeletonLoader height={16} width="90%" style={styles.cardLine} />
    </View>
  );
};

/**
 * Skeleton para gráfico
 */
export const SkeletonChart = ({ width = '100%', height = 200 }) => {
  return (
    <View style={[styles.chartContainer, { width, height }]}>
      <SkeletonLoader height={height - 40} width="100%" />
      <View style={styles.chartLabels}>
        <SkeletonLoader height={16} width="20%" />
        <SkeletonLoader height={16} width="20%" />
        <SkeletonLoader height={16} width="20%" />
        <SkeletonLoader height={16} width="20%" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  listContainer: {
    padding: 16,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    marginBottom: 12,
  },
  cardLine: {
    marginBottom: 8,
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});

export default SkeletonLoader;


