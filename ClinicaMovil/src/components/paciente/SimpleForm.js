/**
 * Componente: Formulario Simple Paso a Paso
 * 
 * Formulario ultra-simplificado que muestra UN campo a la vez.
 * Ideal para pacientes rurales sin experiencia tecnológica.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';

/**
 * Formulario simple paso a paso
 * @param {Object} props
 * @param {Array} props.fields - Array de campos [{label, key, type, placeholder, validate, speakInstruction}]
 * @param {Function} props.onSubmit - Función al completar (recibe todos los valores)
 * @param {Function} props.onCancel - Función al cancelar
 */
const SimpleForm = ({
  fields = [],
  onSubmit,
  onCancel,
  title,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const { speak, speakInstruction, speakError } = useTTS();
  
  // Ref para almacenar timeouts activos y poder cancelarlos
  const instructionTimeoutRef = useRef(null);

  const currentField = fields[currentStep];
  const totalSteps = fields.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const getIsRequiredField = useCallback(
    (field) => field?.required !== false && !/\(opcional\)/i.test(field?.label || ''),
    []
  );

  const currentValue = currentField ? values[currentField.key] : '';
  const isCurrentFieldRequired = getIsRequiredField(currentField);
  const isCurrentFieldEmpty =
    currentValue === undefined || currentValue === null || String(currentValue).trim() === '';
  const isNextDisabled = isCurrentFieldRequired && isCurrentFieldEmpty;

  // Validar campo actual
  const validateCurrentField = useCallback(() => {
    if (!currentField) return true;

    const value = values[currentField.key];
    const isRequiredField = getIsRequiredField(currentField);
    const isEmpty = value === undefined || value === null || String(value).trim() === '';

    if (isRequiredField && isEmpty) {
      const requiredError = 'Este campo es obligatorio';
      setErrors({ ...errors, [currentField.key]: requiredError });
      speakError(requiredError);
      hapticService.error();
      return false;
    }

    const error = currentField.validate
      ? currentField.validate(value, values)
      : null;

    if (error) {
      setErrors({ ...errors, [currentField.key]: error });
      speakError(error);
      hapticService.error();
      return false;
    }

    setErrors({ ...errors, [currentField.key]: null });
    return true;
  }, [currentField, values, errors, speakError, getIsRequiredField]);

  // Avanzar al siguiente paso
  const handleNext = useCallback(async () => {
    if (!validateCurrentField()) return;

    // Cancelar cualquier timeout pendiente de instrucción anterior
    if (instructionTimeoutRef.current) {
      clearTimeout(instructionTimeoutRef.current);
      instructionTimeoutRef.current = null;
    }

    hapticService.medium();
    audioFeedbackService.playSuccess();

    if (isLastStep) {
      // Último paso: enviar formulario
      await speak('Formulario completo');
      if (onSubmit) {
        onSubmit(values);
      }
    } else {
      // Obtener el siguiente campo antes de cambiar el step
      const nextStepIndex = currentStep + 1;
      const nextField = fields[nextStepIndex];
      
      // Avanzar al siguiente paso (sin TTS)
      setCurrentStep(nextStepIndex);
      
      // Esperar 2 segundos y luego reproducir la siguiente instrucción automáticamente
      instructionTimeoutRef.current = setTimeout(async () => {
        if (nextField?.speakInstruction) {
          await speakInstruction(nextField.speakInstruction);
        }
        instructionTimeoutRef.current = null;
      }, 2000);
    }
  }, [currentStep, isLastStep, validateCurrentField, values, fields, speak, speakInstruction, onSubmit]);

  // Retroceder al paso anterior
  const handleBack = useCallback(async () => {
    if (isFirstStep) {
      if (onCancel) {
        onCancel();
      }
      return;
    }

    hapticService.light();
    setCurrentStep(currentStep - 1);
    
    const prevField = fields[currentStep - 1];
    if (prevField?.speakInstruction) {
      await speakInstruction(prevField.speakInstruction);
    }
  }, [currentStep, isFirstStep, fields, speakInstruction, onCancel]);

  // Actualizar valor
  const handleValueChange = useCallback((key, value) => {
    setValues({ ...values, [key]: value });
    // Limpiar error al escribir
    if (errors[key]) {
      setErrors({ ...errors, [key]: null });
    }
  }, [values, errors]);

  // Hablar instrucción al cambiar de paso (solo en el primer paso)
  // NOTA: Para los demás pasos, handleNext lo hace después de 2 segundos
  useEffect(() => {
    // Solo reproducir automáticamente en el primer paso (cuando se carga el formulario)
    if (currentStep === 0 && currentField?.speakInstruction) {
      // Pequeño delay para que la UI se actualice primero
      const timer = setTimeout(() => {
        speakInstruction(currentField.speakInstruction);
      }, 300); // Delay reducido de 500ms a 300ms para respuesta más rápida
      
      return () => clearTimeout(timer);
    }
  }, [currentStep, currentField, speakInstruction]);

  // Cleanup: Cancelar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (instructionTimeoutRef.current) {
        clearTimeout(instructionTimeoutRef.current);
        instructionTimeoutRef.current = null;
      }
    };
  }, []);

  if (!currentField) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>No hay campos definidos</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Título */}
      {title && <Text style={styles.title}>{title}</Text>}

      {/* Indicador de progreso */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Paso {currentStep + 1} de {totalSteps}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentStep + 1) / totalSteps) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Campo actual */}
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{currentField.label}</Text>
        
        {currentField.speakInstruction && (
          <TouchableOpacity
            style={styles.listenButton}
            onPress={async () => {
              try {
                await speakInstruction(currentField.speakInstruction);
              } catch (error) {
                Logger.error('Error en TTS:', error);
              }
            }}
          >
            <Text style={styles.listenButtonText}>🔊 Escuchar instrucción</Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={[
            styles.input,
            errors[currentField.key] && styles.inputError,
            !errors[currentField.key] && values[currentField.key] && styles.inputSuccess,
          ]}
          value={values[currentField.key] || ''}
          onChangeText={(text) => handleValueChange(currentField.key, text)}
          placeholder={currentField.placeholder || `Ingresa ${currentField.label.toLowerCase()}`}
          keyboardType={currentField.type === 'number' ? 'numeric' : 'default'}
          autoFocus={true}
          accessibilityLabel={currentField.label}
          accessibilityHint={currentField.speakInstruction || `Ingresa ${currentField.label.toLowerCase()}`}
        />

        {errors[currentField.key] && (
          <Text style={styles.errorText}>{errors[currentField.key]}</Text>
        )}

        {!errors[currentField.key] && values[currentField.key] && (
          <Text style={styles.successText}>✓ Correcto</Text>
        )}
      </View>

      {/* Botones de navegación */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonBack]}
          onPress={handleBack}
        >
          <Text style={styles.buttonText}>
            {isFirstStep ? 'Cancelar' : '← Atrás'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonNext, isNextDisabled && styles.buttonNextDisabled]}
          onPress={handleNext}
          disabled={isNextDisabled}
        >
          <Text style={styles.buttonText}>
            {isLastStep ? '✅ Enviar' : 'Siguiente →'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORES.BORDE_CLARO,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORES.PRIMARIO,
    borderRadius: 4,
  },
  fieldContainer: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: COLORES.NEGRO,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fieldLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 12,
    textAlign: 'center',
  },
  listenButton: {
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORES.PRIMARIO,
  },
  listenButtonText: {
    fontSize: 16,
    color: COLORES.PRIMARIO,
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    backgroundColor: COLORES.FONDO_SECUNDARIO,
    minHeight: 60,
  },
  inputError: {
    borderColor: COLORES.ERROR,
    backgroundColor: COLORES.FONDO_ERROR_CLARO,
  },
  inputSuccess: {
    borderColor: COLORES.PRIMARIO,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  errorText: {
    color: COLORES.ERROR,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  successText: {
    color: COLORES.PRIMARIO,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    minHeight: 60,
  },
  buttonBack: {
    backgroundColor: COLORES.BORDE_CLARO,
  },
  buttonNext: {
    backgroundColor: COLORES.PRIMARIO,
  },
  buttonNextDisabled: {
    backgroundColor: COLORES.TEXTO_SECUNDARIO,
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.BLANCO,
  },
  error: {
    fontSize: 16,
    color: COLORES.ERROR,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SimpleForm;


