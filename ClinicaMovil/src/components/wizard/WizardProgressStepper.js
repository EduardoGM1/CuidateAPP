import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { COLORES } from '../../utils/constantes';
import {
  getPacienteRegistroStepA11yLabel,
  PACIENTE_REGISTRO_TOTAL_PASOS,
} from '../../constants/pacienteRegistroWizard';

const HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORES.BORDE_CLARO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: COLORES.PRIMARIO,
  },
  progressStepLocked: {
    opacity: 0.42,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  progressStepTextActive: {
    color: COLORES.BLANCO,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORES.BORDE_CLARO,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: COLORES.PRIMARIO,
  },
});

/**
 * Indicador horizontal de pasos: permite ir a cualquier paso ya alcanzado (maxStepReached).
 *
 * @param {{
 *   currentStep: number,
 *   maxStepReached: number,
 *   onStepPress: (step: number) => void,
 *   totalSteps?: number,
 * }} props
 */
export default function WizardProgressStepper({
  currentStep,
  maxStepReached,
  onStepPress,
  totalSteps = PACIENTE_REGISTRO_TOTAL_PASOS,
}) {
  const steps = useMemo(
    () => Array.from({ length: totalSteps }, (_, i) => i + 1),
    [totalSteps]
  );

  return (
    <View style={styles.progressContainer} accessibilityRole="tablist">
      {steps.map((step, index) => {
        const locked = step > maxStepReached;

        return (
          <React.Fragment key={step}>
            {index > 0 ? (
              <View
                style={[
                  styles.progressLine,
                  currentStep >= step && styles.progressLineActive,
                ]}
                importantForAccessibility="no"
              />
            ) : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={getPacienteRegistroStepA11yLabel(step)}
              accessibilityHint={
                locked
                  ? 'Completa los pasos anteriores con el botón continuar'
                  : 'Toca para ver o editar este paso'
              }
              accessibilityState={{ disabled: locked, selected: step === currentStep }}
              disabled={locked}
              hitSlop={HIT_SLOP}
              activeOpacity={locked ? 1 : 0.65}
              onPress={() => onStepPress(step)}
              style={[
                styles.progressStep,
                currentStep >= step && styles.progressStepActive,
                locked && styles.progressStepLocked,
              ]}
            >
              <Text
                style={[
                  styles.progressStepText,
                  currentStep >= step && styles.progressStepTextActive,
                ]}
                maxFontSizeMultiplier={Platform.OS === 'ios' ? 1.4 : 1.35}
              >
                {String(step)}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
}
