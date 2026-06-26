/**
 * Botón flotante global de accesibilidad (solo tamaño de letra).
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppText from './AppText';
import { useAccessibility } from '../../context/AccessibilityContext';
import { FONT_SCALE_LABELS, FONT_SCALE_ORDER } from '../../constants/accessibility';
import { COLORES } from '../../utils/constantes';
import hapticService from '../../services/hapticService';
import useTTS from '../../hooks/useTTS';

const AccessibilityFAB = () => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const { speak } = useTTS();
  const {
    fontScale,
    setFontScale,
    canIncreaseFont,
    canDecreaseFont,
    systemFontScale,
  } = useAccessibility();

  const openPanel = useCallback(() => {
    hapticService.light();
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  const handleDecrease = useCallback(async () => {
    const idx = FONT_SCALE_ORDER.indexOf(fontScale);
    if (idx <= 0) return;
    const next = FONT_SCALE_ORDER[idx - 1];
    hapticService.selection();
    await setFontScale(next);
    await speak(`Tamaño de letra: ${FONT_SCALE_LABELS[next]}`);
  }, [fontScale, setFontScale, speak]);

  const handleIncrease = useCallback(async () => {
    const idx = FONT_SCALE_ORDER.indexOf(fontScale);
    if (idx >= FONT_SCALE_ORDER.length - 1) return;
    const next = FONT_SCALE_ORDER[idx + 1];
    hapticService.selection();
    await setFontScale(next);
    await speak(`Tamaño de letra: ${FONT_SCALE_LABELS[next]}`);
  }, [fontScale, setFontScale, speak]);

  return (
    <>
      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: Math.max(insets.bottom, 12) + 12,
            right: Math.max(insets.right, 12) + 12,
          },
        ]}
        onPress={openPanel}
        accessibilityRole="button"
        accessibilityLabel="Accesibilidad"
        accessibilityHint="Abre opciones de tamaño de letra"
        activeOpacity={0.85}
      >
        <Icon name="accessibility" size={28} color={COLORES.TEXTO_EN_PRIMARIO} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={closePanel}>
        <Pressable style={styles.backdrop} onPress={closePanel}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.handle} />
            <AppText style={styles.sheetTitle}>Accesibilidad</AppText>

            {systemFontScale > 1.2 && (
              <AppText style={styles.hint}>
                Tu teléfono tiene letra grande ({systemFontScale.toFixed(1)}×). Ajusta aquí el
                tamaño dentro de la app.
              </AppText>
            )}

            <AppText style={styles.sectionLabel}>Tamaño de letra</AppText>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.scaleBtn, !canDecreaseFont && styles.scaleBtnDisabled]}
                onPress={handleDecrease}
                disabled={!canDecreaseFont}
                accessibilityLabel="Reducir tamaño de letra"
              >
                <AppText style={styles.scaleBtnText}>A−</AppText>
              </TouchableOpacity>
              <View style={styles.scaleLabelWrap}>
                <AppText style={styles.scaleLabel}>{FONT_SCALE_LABELS[fontScale]}</AppText>
              </View>
              <TouchableOpacity
                style={[styles.scaleBtn, !canIncreaseFont && styles.scaleBtnDisabled]}
                onPress={handleIncrease}
                disabled={!canIncreaseFont}
                accessibilityLabel="Aumentar tamaño de letra"
              >
                <AppText style={styles.scaleBtnText}>A+</AppText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={closePanel}>
              <AppText style={styles.closeBtnText}>Cerrar</AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORES.NAV_PACIENTE,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 9999,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORES.FONDO_CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 12,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: COLORES.ADVERTENCIA,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  scaleBtn: {
    minWidth: 56,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.INFO_LIGHT,
  },
  scaleBtnDisabled: {
    opacity: 0.4,
  },
  scaleBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.NAV_PRIMARIO,
  },
  scaleLabelWrap: {
    flex: 1,
    alignItems: 'center',
  },
  scaleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
});

export default AccessibilityFAB;
