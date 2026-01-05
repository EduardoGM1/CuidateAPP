import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generarDatosCompletosPaciente } from '../services/testDataService';

const TEST_MODE_KEY = 'test_mode_enabled';

/**
 * Hook para manejar el modo de prueba
 * Permite activar/desactivar datos aleatorios para testing
 */
export const useTestMode = () => {
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar estado del modo de prueba al inicializar
  useEffect(() => {
    loadTestModeState();
  }, []);

  const loadTestModeState = async () => {
    try {
      const savedState = await AsyncStorage.getItem(TEST_MODE_KEY);
      setIsTestModeEnabled(savedState === 'true');
    } catch (error) {
      console.log('Error cargando estado del modo de prueba:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTestMode = async () => {
    try {
      const newState = !isTestModeEnabled;
      await AsyncStorage.setItem(TEST_MODE_KEY, newState.toString());
      setIsTestModeEnabled(newState);
      console.log(`🧪 Modo de prueba ${newState ? 'activado' : 'desactivado'}`);
    } catch (error) {
      console.log('Error guardando estado del modo de prueba:', error);
    }
  };

  const generateTestData = (idDoctor, idModulo) => {
    if (!isTestModeEnabled) {
      console.log('⚠️ Modo de prueba no activado');
      return null;
    }
    
    console.log('🎲 Generando datos de prueba...');
    return generarDatosCompletosPaciente(idDoctor, idModulo);
  };

  const fillFormWithTestData = (setFormData, idDoctor, idModulo) => {
    if (!isTestModeEnabled) {
      console.log('⚠️ Modo de prueba no activado');
      return;
    }

    const testData = generateTestData(idDoctor, idModulo);
    if (testData) {
      console.log('📝 Llenando formulario con datos de prueba:', testData);
      
      // Hacer merge seguro para preservar campos existentes
      // Especial atención a estructuras anidadas como signos_vitales y diagnostico_basal
      setFormData(prevFormData => ({
        ...prevFormData,
        ...testData,
        // Preservar redApoyo existente y hacer merge
        redApoyo: testData.redApoyo || prevFormData.redApoyo,
        primeraConsulta: {
          ...prevFormData.primeraConsulta,
          ...testData.primeraConsulta,
          // Preservar y hacer merge de años de padecimiento
          anos_padecimiento: {
            ...prevFormData.primeraConsulta.anos_padecimiento,
            ...testData.primeraConsulta.anos_padecimiento
          },
          // Preservar y hacer merge de diagnóstico basal
          diagnostico_basal: {
            ...prevFormData.primeraConsulta.diagnostico_basal,
            ...testData.primeraConsulta.diagnostico_basal
          },
          // Preservar y hacer merge de signos vitales
          signos_vitales: {
            ...prevFormData.primeraConsulta.signos_vitales,
            ...testData.primeraConsulta.signos_vitales
          },
          // Preservar medicamentos y vacunas
          medicamentos: testData.primeraConsulta.medicamentos || prevFormData.primeraConsulta.medicamentos,
          vacunas: testData.primeraConsulta.vacunas || prevFormData.primeraConsulta.vacunas
        }
      }));
    }
  };

  return {
    isTestModeEnabled,
    isLoading,
    toggleTestMode,
    generateTestData,
    fillFormWithTestData
  };
};

export default useTestMode;
