/**
 * Utilidad: animations
 * 
 * Funciones y configuraciones para animaciones mejoradas.
 */

import { Animated, Easing } from 'react-native';

/**
 * Configuración de animación de fade in
 */
export const fadeInAnimation = (duration = 300) => {
  return {
    toValue: 1,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  };
};

/**
 * Configuración de animación de fade out
 */
export const fadeOutAnimation = (duration = 300) => {
  return {
    toValue: 0,
    duration,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  };
};

/**
 * Configuración de animación de slide
 */
export const slideAnimation = (toValue, duration = 300) => {
  return {
    toValue,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  };
};

/**
 * Configuración de animación de scale
 */
export const scaleAnimation = (toValue = 1, duration = 300) => {
  return {
    toValue,
    duration,
    easing: Easing.out(Easing.back(1.5)),
    useNativeDriver: true,
  };
};

/**
 * Animación de bounce
 */
export const bounceAnimation = (duration = 600) => {
  return {
    toValue: 1,
    duration,
    easing: Easing.bounce,
    useNativeDriver: true,
  };
};

/**
 * Crear animación de entrada para lista
 */
export const createListEntryAnimation = (index, delay = 50) => {
  const opacity = new Animated.Value(0);
  const translateY = new Animated.Value(20);

  Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      delay: index * delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      delay: index * delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
  ]).start();

  return {
    opacity,
    transform: [{ translateY }],
  };
};

/**
 * Animación de pulso para botones
 */
export const createPulseAnimation = () => {
  const animatedValue = new Animated.Value(1);

  const pulse = () => {
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.1,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return {
    animatedValue,
    pulse,
    style: {
      transform: [{ scale: animatedValue }],
    },
  };
};

/**
 * Animación de shake para errores
 */
export const createShakeAnimation = () => {
  const animatedValue = new Animated.Value(0);

  const shake = () => {
    Animated.sequence([
      Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(animatedValue, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  return {
    animatedValue,
    shake,
    style: {
      transform: [{ translateX: animatedValue }],
    },
  };
};

/**
 * Animación de rotación
 */
export const createRotationAnimation = (duration = 1000) => {
  const animatedValue = new Animated.Value(0);

  Animated.loop(
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  ).start();

  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return {
    style: {
      transform: [{ rotate }],
    },
  };
};

/**
 * Configuración estándar para transiciones de pantalla
 */
export const screenTransitionConfig = {
  animation: 'timing',
  config: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },
};

/**
 * Configuración para transiciones modales
 */
export const modalTransitionConfig = {
  animation: 'timing',
  config: {
    duration: 250,
    easing: Easing.out(Easing.cubic),
  },
};


