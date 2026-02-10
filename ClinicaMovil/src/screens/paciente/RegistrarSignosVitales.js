/**
 * Pantalla: Registrar Signos Vitales
 * 
 * Formulario ultra-simplificado paso a paso para registrar signos vitales.
 * Un campo a la vez con TTS y validación visual.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import SimpleForm from '../../components/paciente/SimpleForm';
import usePacienteData from '../../hooks/usePacienteData';
import { useAuth } from '../../context/AuthContext';
import { gestionService } from '../../api/gestionService';
import useTTS from '../../hooks/useTTS';
import { usePacienteComorbilidades } from '../../hooks/usePacienteMedicalData';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import alertService from '../../services/alertService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import useWebSocket from '../../hooks/useWebSocket';
import useOffline from '../../hooks/useOffline';

const RegistrarSignosVitales = () => {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const { paciente, loading } = usePacienteData();
  const { speak, speakConfirmation, speakError, stopAndClear } = useTTS();
  const [submitting, setSubmitting] = useState(false);
  const { subscribeToEvent, isConnected } = useWebSocket();
  const { addToQueue, isOnline } = useOffline();

  // ✅ Obtener ID del paciente
  const pacienteId = paciente?.id_paciente || paciente?.id || userData?.id_paciente || userData?.id;

  // ✅ Obtener comorbilidades del paciente para verificar Hipercolesterolemia
  const { comorbilidades: comorbilidadesPaciente } = usePacienteComorbilidades(pacienteId, {
    autoFetch: !!pacienteId
  });

  // ✅ Función para verificar si el paciente tiene diagnóstico de Hipercolesterolemia/Dislipidemia
  const tieneHipercolesterolemia = useCallback(() => {
    if (!comorbilidadesPaciente || comorbilidadesPaciente.length === 0) {
      return false;
    }
    
    const nombresRelevantes = ['Dislipidemia', 'Hipercolesterolemia', 'dislipidemia', 'hipercolesterolemia'];
    
    return comorbilidadesPaciente.some(comorbilidad => {
      const nombre = comorbilidad.nombre || comorbilidad.nombre_comorbilidad || '';
      return nombresRelevantes.some(relevante => 
        nombre.toLowerCase().includes(relevante.toLowerCase())
      );
    });
  }, [comorbilidadesPaciente]);

  // ✅ Función para verificar si el paciente tiene diagnóstico de Hipertrigliceridemia
  const tieneHipertrigliceridemia = useCallback(() => {
    if (!comorbilidadesPaciente || comorbilidadesPaciente.length === 0) {
      return false;
    }
    
    const nombresRelevantes = ['Hipertrigliceridemia', 'hipertrigliceridemia', 'trigliceridos', 'triglicéridos'];
    
    return comorbilidadesPaciente.some(comorbilidad => {
      const nombre = comorbilidad.nombre || comorbilidad.nombre_comorbilidad || '';
      return nombresRelevantes.some(relevante => 
        nombre.toLowerCase().includes(relevante.toLowerCase())
      );
    });
  }, [comorbilidadesPaciente]);

  // Suscribirse a eventos WebSocket para confirmación inmediata
  useEffect(() => {
    if (!subscribeToEvent) return;

    const pacienteId = paciente?.id_paciente || paciente?.id || userData?.id_paciente || userData?.id;
    if (!pacienteId) return;

    // Evento: Signos vitales registrados exitosamente
    const unsubscribeSignosVitales = subscribeToEvent('signos_vitales_registrados', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('RegistrarSignosVitales: Confirmación de registro recibida por WebSocket', data);
        // El backend confirma que se guardó correctamente
        // Ya se muestra feedback en handleSubmit, pero esto es una confirmación adicional
      }
    });

    // Evento: Alerta de signos vitales (si hay alertas)
    const unsubscribeAlertaCritica = subscribeToEvent('alerta_signos_vitales_critica', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('RegistrarSignosVitales: Alerta crítica recibida por WebSocket', data);
        // Las alertas ya se procesan en handleSubmit, esto es confirmación adicional
      }
    });

    const unsubscribeAlertaModerada = subscribeToEvent('alerta_signos_vitales_moderada', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('RegistrarSignosVitales: Alerta moderada recibida por WebSocket', data);
      }
    });

    return () => {
      if (unsubscribeSignosVitales) unsubscribeSignosVitales();
      if (unsubscribeAlertaCritica) unsubscribeAlertaCritica();
      if (unsubscribeAlertaModerada) unsubscribeAlertaModerada();
    };
  }, [subscribeToEvent, paciente?.id_paciente, paciente?.id, userData?.id_paciente, userData?.id]);

  // Validaciones personalizadas
  const validarPeso = (peso) => {
    const pesoNum = parseFloat(peso);
    if (!peso || isNaN(pesoNum)) {
      return 'Por favor ingresa un peso válido';
    }
    if (pesoNum < 10 || pesoNum > 300) {
      return 'El peso debe estar entre 10 y 300 kilogramos';
    }
    return null;
  };

  const validarTalla = (talla) => {
    const tallaNum = parseFloat(talla);
    if (!talla || isNaN(tallaNum)) {
      return 'Por favor ingresa una talla válida';
    }
    if (tallaNum < 0.5 || tallaNum > 2.5) {
      return 'La talla debe estar entre 0.5 y 2.5 metros';
    }
    return null;
  };

  const validarPresion = (presion, tipo) => {
    const presionNum = parseFloat(presion);
    if (!presion || isNaN(presionNum)) {
      return `Por favor ingresa una presión ${tipo} válida`;
    }
    if (presionNum < 40 || presionNum > 250) {
      return `La presión ${tipo} debe estar entre 40 y 250`;
    }
    return null;
  };

  const validarGlucosa = (glucosa) => {
    const glucosaNum = parseFloat(glucosa);
    if (!glucosa || isNaN(glucosaNum)) {
      return 'Por favor ingresa un nivel de glucosa válido';
    }
    if (glucosaNum < 50 || glucosaNum > 500) {
      return 'La glucosa debe estar entre 50 y 500 mg/dL';
    }
    return null;
  };

  const validarNumero = (valor, min, max, unidad) => {
    const num = parseFloat(valor);
    if (!valor || isNaN(num)) {
      return `Por favor ingresa un valor válido`;
    }
    if (num < min || num > max) {
      return `El valor debe estar entre ${min} y ${max} ${unidad}`;
    }
    return null;
  };

  // Campos del formulario paso a paso
  const formFieldsBase = [
    {
      key: 'peso_kg',
      label: 'Peso',
      type: 'number',
      placeholder: 'Ejemplo: 70',
      speakInstruction: 'Ingresa tu peso en kilogramos. Por ejemplo, setenta kilogramos,solo escribe el numero',
      validate: validarPeso,
    },
    {
      key: 'talla_m',
      label: 'Talla',
      type: 'number',
      placeholder: 'Ejemplo: 1.65',
      speakInstruction: 'Ingresa tu talla en metros. Por ejemplo, uno punto sesenta y cinco',
      validate: validarTalla,
    },
    {
      key: 'presion_sistolica',
      label: 'Presión Sistólica',
      type: 'number',
      placeholder: 'Ejemplo: 120',
      speakInstruction: 'Ingresa tu presión sistólica. El número alto de la presión',
      validate: (valor) => validarPresion(valor, 'sistólica'),
    },
    {
      key: 'presion_diastolica',
      label: 'Presión Diastólica',
      type: 'number',
      placeholder: 'Ejemplo: 80',
      speakInstruction: 'Ingresa tu presión diastólica. El número bajo de la presión',
      validate: (valor) => validarPresion(valor, 'diastólica'),
    },
    {
      key: 'glucosa_mg_dl',
      label: 'Glucosa',
      type: 'number',
      placeholder: 'Ejemplo: 95',
      speakInstruction: 'Ingresa tu nivel de glucosa en miligramos por decilitro',
      validate: validarGlucosa,
    },
    {
      key: 'colesterol_mg_dl',
      label: 'Colesterol (opcional)',
      type: 'number',
      placeholder: 'Ejemplo: 180',
      speakInstruction: 'Ingresa tu nivel de colesterol en miligramos por decilitro. Si no lo sabes, puedes dejarlo en blanco y presionar siguiente',
      validate: (valor) => {
        if (!valor || valor.trim() === '') return null; // Opcional
        return validarNumero(valor, 50, 500, 'mg/dL');
      },
    },
  ];

  // ✅ Campos condicionales para pacientes con Hipercolesterolemia
  const camposColesterol = tieneHipercolesterolemia() ? [
    {
      key: 'colesterol_ldl',
      label: 'Colesterol LDL (opcional)',
      type: 'number',
      placeholder: 'Ejemplo: 100',
      speakInstruction: 'Ingresa tu nivel de colesterol LDL en miligramos por decilitro. Si no lo sabes, puedes dejarlo en blanco y presionar siguiente',
      validate: (valor) => {
        if (!valor || valor.trim() === '') return null; // Opcional
        return validarNumero(valor, 0, 500, 'mg/dL');
      },
    },
    {
      key: 'colesterol_hdl',
      label: 'Colesterol HDL (opcional)',
      type: 'number',
      placeholder: 'Ejemplo: 40',
      speakInstruction: 'Ingresa tu nivel de colesterol HDL en miligramos por decilitro. Si no lo sabes, puedes dejarlo en blanco y presionar siguiente',
      validate: (valor) => {
        if (!valor || valor.trim() === '') return null; // Opcional
        return validarNumero(valor, 0, 200, 'mg/dL');
      },
    },
  ] : [];

  // ✅ Campos condicionales para pacientes con Hipertrigliceridemia
  const camposTrigliceridos = tieneHipertrigliceridemia() ? [
    {
      key: 'trigliceridos_mg_dl',
      label: 'Triglicéridos (opcional)',
      type: 'number',
      placeholder: 'Ejemplo: 120',
      speakInstruction: 'Ingresa tu nivel de triglicéridos en miligramos por decilitro. Si no lo sabes, puedes dejarlo en blanco y presionar siguiente',
      validate: (valor) => {
        if (!valor || valor.trim() === '') return null; // Opcional
        return validarNumero(valor, 0, 1000, 'mg/dL');
      },
    },
  ] : [];

  // Campos finales del formulario
  const formFieldsFinales = [
    {
      key: 'hba1c_porcentaje',
      label: 'HbA1c (%) - Opcional',
      type: 'number',
      placeholder: 'Ejemplo: 6.5',
      speakInstruction: 'Ingresa tu nivel de hemoglobina glicosilada en porcentaje. Si no lo sabes, puedes dejarlo en blanco y presionar siguiente',
      validate: (valor) => {
        if (!valor || valor.trim() === '') return null; // Opcional
        const num = parseFloat(valor);
        if (isNaN(num) || num < 4.0 || num > 15.0) {
          return 'HbA1c debe estar entre 4.0 y 15.0%';
        }
        return null;
      },
    },
    {
      key: 'edad_paciente_en_medicion',
      label: 'Edad en Medición (opcional)',
      type: 'number',
      placeholder: 'Ejemplo: 45',
      speakInstruction: 'Ingresa tu edad actual en años. Si no la sabes, puedes dejarlo en blanco y presionar siguiente',
      validate: (valor) => {
        if (!valor || valor.trim() === '') return null; // Opcional
        const num = parseInt(valor, 10);
        if (isNaN(num) || num < 0 || num > 120) {
          return 'La edad debe estar entre 0 y 120 años';
        }
        return null;
      },
    },
    {
      key: 'medida_cintura_cm',
      label: 'Medida de Cintura (opcional)',
      type: 'number',
      placeholder: 'Ejemplo: 85',
      speakInstruction: 'Ingresa la medida de tu cintura en centímetros. Si no lo sabes, puedes dejarlo en blanco y presionar siguiente',
      validate: (valor) => {
        if (!valor || valor.trim() === '') return null; // Opcional
        return validarNumero(valor, 40, 200, 'cm');
      },
    },
    {
      key: 'observaciones',
      label: 'Observaciones (opcional)',
      type: 'text',
      placeholder: 'Notas adicionales',
      speakInstruction: 'Si deseas agregar alguna observación, escríbela ahora. Si no, presiona siguiente',
      validate: () => null, // Siempre válido (opcional)
    },
  ];

  // ✅ Combinar todos los campos
  const formFields = [...formFieldsBase, ...camposColesterol, ...camposTrigliceridos, ...formFieldsFinales];

  // Calcular IMC cuando hay peso y talla
  const calcularIMC = (peso, talla) => {
    if (!peso || !talla) return null;
    const pesoNum = parseFloat(peso);
    const tallaNum = parseFloat(talla);
    if (isNaN(pesoNum) || isNaN(tallaNum) || tallaNum <= 0) return null;
    const imc = pesoNum / (tallaNum * tallaNum);
    return parseFloat(imc.toFixed(2));
  };

  // Manejar envío del formulario
  const handleSubmit = useCallback(async (formValues) => {
    Logger.debug('RegistrarSignosVitales: handleSubmit llamado', {
      hasPaciente: !!paciente,
      pacienteId: paciente?.id_paciente || paciente?.id,
      userDataId: userData?.id_paciente || userData?.id,
      formValuesKeys: Object.keys(formValues || {})
    });

    const pacienteId = paciente?.id_paciente || paciente?.id || userData?.id_paciente || userData?.id;
    
    if (!pacienteId) {
      Logger.error('RegistrarSignosVitales: No se encontró ID de paciente', {
        paciente: paciente ? Object.keys(paciente) : null,
        userData: userData ? Object.keys(userData) : null,
        loading
      });
      await speakError('Error: No se encontró información del paciente');
      Alert.alert(
        '❌ Error',
        'No se encontró información del paciente. Por favor, cierra sesión e inicia sesión nuevamente.',
        [{ text: 'Aceptar' }]
      );
      return;
    }

    setSubmitting(true);
    hapticService.medium();

    try {
      // Preparar datos para enviar
      // NOTA: No enviar fecha_medicion ni registrado_por - el backend los crea automáticamente
      const signosVitalesData = {
        peso_kg: parseFloat(formValues.peso_kg),
        talla_m: parseFloat(formValues.talla_m),
        presion_sistolica: parseInt(formValues.presion_sistolica),
        presion_diastolica: parseInt(formValues.presion_diastolica),
        glucosa_mg_dl: parseInt(formValues.glucosa_mg_dl),
      };

      // Calcular IMC (el backend también lo calcula, pero lo enviamos por si acaso)
      const imc = calcularIMC(formValues.peso_kg, formValues.talla_m);
      if (imc && !isNaN(imc) && isFinite(imc)) {
        signosVitalesData.imc = imc;
      }

      // Campos opcionales
      if (formValues.medida_cintura_cm && formValues.medida_cintura_cm.trim() !== '') {
        signosVitalesData.medida_cintura_cm = parseFloat(formValues.medida_cintura_cm);
      }
      // ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación
      if (formValues.hba1c_porcentaje && formValues.hba1c_porcentaje.trim() !== '') {
        const hba1c = parseFloat(formValues.hba1c_porcentaje);
        if (!isNaN(hba1c) && hba1c >= 4.0 && hba1c <= 15.0) {
          signosVitalesData.hba1c_porcentaje = hba1c;
        }
      }
      // ✅ Edad en medición - Para validar rangos de HbA1c
      if (formValues.edad_paciente_en_medicion && formValues.edad_paciente_en_medicion.trim() !== '') {
        const edad = parseInt(formValues.edad_paciente_en_medicion, 10);
        if (!isNaN(edad) && edad >= 0 && edad <= 120) {
          signosVitalesData.edad_paciente_en_medicion = edad;
        }
      } else if (paciente?.fecha_nacimiento) {
        // Calcular automáticamente si no se proporciona
        const fechaNac = new Date(paciente.fecha_nacimiento);
        const hoy = new Date();
        const edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
        const mes = hoy.getMonth() - fechaNac.getMonth();
        if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
          edadCalculada--;
        }
        if (edadCalculada >= 0 && edadCalculada <= 120) {
          signosVitalesData.edad_paciente_en_medicion = edadCalculada;
        }
      }
      if (formValues.colesterol_mg_dl && formValues.colesterol_mg_dl.trim() !== '') {
        signosVitalesData.colesterol_mg_dl = parseFloat(formValues.colesterol_mg_dl);
      }
      // ✅ Colesterol LDL/HDL - Solo para pacientes con Hipercolesterolemia
      if (tieneHipercolesterolemia()) {
        if (formValues.colesterol_ldl && formValues.colesterol_ldl.trim() !== '') {
          const ldl = parseFloat(formValues.colesterol_ldl);
          if (!isNaN(ldl) && ldl >= 0 && ldl <= 500) {
            signosVitalesData.colesterol_ldl = ldl;
          }
        }
        if (formValues.colesterol_hdl && formValues.colesterol_hdl.trim() !== '') {
          const hdl = parseFloat(formValues.colesterol_hdl);
          if (!isNaN(hdl) && hdl >= 0 && hdl <= 200) {
            signosVitalesData.colesterol_hdl = hdl;
          }
        }
      }
      // ✅ Triglicéridos - Solo para pacientes con Hipertrigliceridemia
      if (tieneHipertrigliceridemia()) {
        if (formValues.trigliceridos_mg_dl && formValues.trigliceridos_mg_dl.trim() !== '') {
          const trigliceridos = parseFloat(formValues.trigliceridos_mg_dl);
          if (!isNaN(trigliceridos) && trigliceridos >= 0 && trigliceridos <= 1000) {
            signosVitalesData.trigliceridos_mg_dl = trigliceridos;
          }
        }
      }
      if (formValues.observaciones && formValues.observaciones.trim() !== '') {
        signosVitalesData.observaciones = formValues.observaciones.trim();
      }

      Logger.info('Registrando signos vitales', { 
        pacienteId,
        datosEnviados: Object.keys(signosVitalesData),
        tienePeso: !!signosVitalesData.peso_kg,
        tieneTalla: !!signosVitalesData.talla_m,
        tienePresion: !!(signosVitalesData.presion_sistolica && signosVitalesData.presion_diastolica),
        tieneGlucosa: !!signosVitalesData.glucosa_mg_dl
      });

      // Intentar enviar al backend
      let response;
      let savedOffline = false;

      try {
        response = await gestionService.createPacienteSignosVitales(
          pacienteId,
          signosVitalesData
        );

        // Procesar alertas si las hay
        if (response?.alertas && response.alertas.length > 0) {
          Logger.info('Alertas recibidas del backend', { total: response.alertas.length });
          await alertService.procesarAlertas(response.alertas);
        }

        // Feedback exitoso
        hapticService.success();
        await speakConfirmation('Signos vitales registrados correctamente');
        audioFeedbackService.playSuccess();

        // Mostrar alerta y volver
        Alert.alert(
          '✅ Registrado',
          'Tus signos vitales se registraron correctamente',
          [
            {
              text: 'Aceptar',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } catch (networkError) {
        // Si es error de red, guardar offline
        if (
          networkError.message?.includes('Network Error') ||
          networkError.code === 'ERR_NETWORK' ||
          !isOnline
        ) {
          Logger.info('Sin conexión, guardando en cola offline', { pacienteId });
          
          // Agregar a cola offline
          await addToQueue({
            type: 'create',
            resource: 'pacienteSignoVital',
            data: {
              pacienteId,
              signosVitalesData,
            },
          });

          savedOffline = true;
          
          // Feedback de guardado offline
          hapticService.medium();
          await speakConfirmation('Signos vitales guardados. Se enviarán cuando haya conexión');
          audioFeedbackService.playSuccess();

          Alert.alert(
            '📱 Guardado Offline',
            'Tus signos vitales se guardaron localmente. Se enviarán automáticamente cuando haya conexión a internet.',
            [
              {
                text: 'Aceptar',
                onPress: () => {
                  navigation.goBack();
                },
              },
            ]
          );
        } else {
          // Re-lanzar error si no es de red
          throw networkError;
        }
      }
    } catch (error) {
      Logger.error('Error registrando signos vitales:', {
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        pacienteId
      });
      
      hapticService.error();
      
      // Mensaje de error más específico
      let errorMessage = 'Error al registrar signos vitales. Intenta nuevamente.';
      let errorTitle = '❌ Error';
      
      if (error.response?.status === 400) {
        errorTitle = '❌ Datos Inválidos';
        errorMessage = error.response?.data?.error || error.response?.data?.message || 'Los datos enviados no son válidos. Verifica que todos los campos estén correctos.';
      } else if (error.response?.status === 401) {
        errorTitle = '❌ Sesión Expirada';
        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      } else if (error.response?.status === 403) {
        errorTitle = '❌ Acceso Denegado';
        errorMessage = 'No tienes permisos para realizar esta acción.';
      } else if (error.response?.status === 404) {
        errorTitle = '❌ Paciente No Encontrado';
        errorMessage = 'No se encontró información del paciente. Por favor, cierra sesión e inicia sesión nuevamente.';
      } else if (error.response?.status === 500) {
        errorTitle = '❌ Error del Servidor';
        errorMessage = 'Hubo un problema en el servidor. Por favor, intenta más tarde.';
      } else if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
        // Este caso ya se maneja arriba con modo offline, pero por si acaso
        errorTitle = '❌ Error de Conexión';
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
      }
      
      await speakError(errorMessage);
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [{ text: 'Aceptar' }]
      );
    } finally {
      setSubmitting(false);
    }
  }, [paciente, userData, loading, speakError, speakConfirmation, navigation, addToQueue, isOnline]);

  // Manejar cancelación
  const handleCancel = useCallback(async () => {
    hapticService.light();
    await speak('Cancelando registro de signos vitales');
    navigation.goBack();
  }, [navigation, speak]);

  // Saludo inicial al entrar a la pantalla
  useEffect(() => {
    const timer = setTimeout(async () => {
      await speak('Registro de signos vitales. Sigue las instrucciones paso a paso. Presiona el botón de escuchar si necesitas que se repita la instrucción.', {
        variant: 'instruction',
        priority: 'medium'
      });
    }, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [speak]);

  // Cleanup: Detener TTS cuando el componente se desmonta
  useEffect(() => {
    return () => {
      Logger.debug('RegistrarSignosVitales: Cleanup - Deteniendo TTS y limpiando cola');
      stopAndClear();
    };
  }, [stopAndClear]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PACIENTE} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SimpleForm
        title="📊 Registrar Signos Vitales"
        fields={formFields}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORES.TEXTO_SECUNDARIO,
  },
});

export default RegistrarSignosVitales;

