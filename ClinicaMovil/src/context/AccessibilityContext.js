/**
 * Contexto global de accesibilidad: tamaño de letra y alto contraste.
 * Persiste en configuracion_paciente (merge con TTS y demás preferencias).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, PixelRatio, Text } from 'react-native';
import { storageService } from '../services/storageService';
import Logger from '../services/logger';
import {
  CONFIG_STORAGE_KEY,
  FONT_SCALE_MULTIPLIERS,
  FONT_SCALE_ORDER,
  FONT_SCALE_TO_LEGACY,
  LEGACY_TO_FONT_SCALE,
  SYSTEM_FONT_SCALE_WARN_THRESHOLD,
  MAX_OS_FONT_MULTIPLIER,
} from '../constants/accessibility';

const AccessibilityContext = createContext(null);

function resolveFontScale(config) {
  if (config?.fontScale && FONT_SCALE_MULTIPLIERS[config.fontScale]) {
    return config.fontScale;
  }
  if (config?.tamanoFuente && LEGACY_TO_FONT_SCALE[config.tamanoFuente]) {
    return LEGACY_TO_FONT_SCALE[config.tamanoFuente];
  }
  return 'normal';
}

export function AccessibilityProvider({ children }) {
  const [fontScale, setFontScaleState] = useState('normal');
  const [highContrast, setHighContrastState] = useState(false);
  const [ready, setReady] = useState(false);
  const [systemFontScale, setSystemFontScale] = useState(1);
  const [systemFontWarningShown, setSystemFontWarningShown] = useState(false);

  const multiplier = FONT_SCALE_MULTIPLIERS[fontScale] ?? 1;

  const persistAccessibility = useCallback(async (patch) => {
    try {
      const existing = (await storageService.getItem(CONFIG_STORAGE_KEY)) || {};
      const next = {
        ...existing,
        ...patch,
        fontScale: patch.fontScale ?? existing.fontScale,
        tamanoFuente:
          patch.tamanoFuente ??
          FONT_SCALE_TO_LEGACY[patch.fontScale] ??
          existing.tamanoFuente,
        altoContraste: patch.altoContraste ?? existing.altoContraste,
      };
      await storageService.setItem(CONFIG_STORAGE_KEY, next);
    } catch (error) {
      Logger.error('AccessibilityContext: error persistiendo', error);
    }
  }, []);

  useEffect(() => {
    if (Text.defaultProps == null) Text.defaultProps = {};
    Text.defaultProps.allowFontScaling = false;
    Text.defaultProps.maxFontSizeMultiplier = MAX_OS_FONT_MULTIPLIER;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const config = await storageService.getItem(CONFIG_STORAGE_KEY);
        if (!mounted) return;
        setFontScaleState(resolveFontScale(config));
        setHighContrastState(Boolean(config?.altoContraste));
      } catch (error) {
        Logger.error('AccessibilityContext: error cargando', error);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const fs = PixelRatio.getFontScale();
    setSystemFontScale(fs);
    if (fs > SYSTEM_FONT_SCALE_WARN_THRESHOLD && !systemFontWarningShown) {
      setSystemFontWarningShown(true);
      Alert.alert(
        'Tamaño de letra del teléfono',
        'Tu teléfono tiene el texto del sistema muy grande. Usa el botón de accesibilidad (♿) en la esquina para ajustar el tamaño dentro de la app.',
        [{ text: 'Entendido' }]
      );
    }
  }, [systemFontWarningShown]);

  const setFontScale = useCallback(
    async (nextKey) => {
      if (!FONT_SCALE_MULTIPLIERS[nextKey]) return;
      setFontScaleState(nextKey);
      await persistAccessibility({
        fontScale: nextKey,
        tamanoFuente: FONT_SCALE_TO_LEGACY[nextKey],
      });
    },
    [persistAccessibility]
  );

  const increaseFontScale = useCallback(async () => {
    const idx = FONT_SCALE_ORDER.indexOf(fontScale);
    if (idx < FONT_SCALE_ORDER.length - 1) {
      await setFontScale(FONT_SCALE_ORDER[idx + 1]);
    }
  }, [fontScale, setFontScale]);

  const decreaseFontScale = useCallback(async () => {
    const idx = FONT_SCALE_ORDER.indexOf(fontScale);
    if (idx > 0) {
      await setFontScale(FONT_SCALE_ORDER[idx - 1]);
    }
  }, [fontScale, setFontScale]);

  const setHighContrast = useCallback(
    async (value) => {
      setHighContrastState(value);
      await persistAccessibility({ altoContraste: value });
    },
    [persistAccessibility]
  );

  const scaleFont = useCallback((size) => Math.round(size * multiplier), [multiplier]);
  const scaleSize = useCallback((size) => Math.round(size * multiplier), [multiplier]);

  const value = useMemo(
    () => ({
      ready,
      fontScale,
      fontScaleMultiplier: multiplier,
      highContrast,
      systemFontScale,
      setFontScale,
      increaseFontScale,
      decreaseFontScale,
      setHighContrast,
      scaleFont,
      scaleSize,
      canIncreaseFont: fontScale !== FONT_SCALE_ORDER[FONT_SCALE_ORDER.length - 1],
      canDecreaseFont: fontScale !== FONT_SCALE_ORDER[0],
    }),
    [
      ready,
      fontScale,
      multiplier,
      highContrast,
      systemFontScale,
      setFontScale,
      increaseFontScale,
      decreaseFontScale,
      setHighContrast,
      scaleFont,
      scaleSize,
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error('useAccessibility debe usarse dentro de AccessibilityProvider');
  }
  return ctx;
}

/** Para componentes que pueden renderizarse fuera del provider (p. ej. tests). */
export function useAccessibilityOptional() {
  return useContext(AccessibilityContext);
}

export default AccessibilityContext;
