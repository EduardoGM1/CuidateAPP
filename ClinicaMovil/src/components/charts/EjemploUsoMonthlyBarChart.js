/**
 * Ejemplo de uso del componente MonthlyVitalSignsBarChart
 * 
 * Este archivo muestra cómo usar el componente de gráfico de barras mensual
 * con datos simulados y datos reales desde la API.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import MonthlyVitalSignsBarChart from './MonthlyVitalSignsBarChart';
import { usePacienteSignosVitales } from '../../hooks/usePacienteMedicalData';
import { useAuth } from '../../context/AuthContext';

/**
 * Ejemplo 1: Uso con datos simulados (para pruebas)
 */
export const EjemploConDatosSimulados = () => {
  // Datos simulados para varios meses
  const datosSimulados = [
    // Enero 2024 - Mes con muchos problemas
    {
      id: 1,
      fecha_medicion: '2024-01-15T10:00:00',
      presion_sistolica: 150,
      presion_diastolica: 95,
      glucosa_mg_dl: 140,
      peso_kg: 85,
      imc: 28.5,
    },
    {
      id: 2,
      fecha_medicion: '2024-01-20T14:30:00',
      presion_sistolica: 145,
      presion_diastolica: 90,
      glucosa_mg_dl: 135,
      peso_kg: 86,
      imc: 28.8,
    },
    {
      id: 3,
      fecha_medicion: '2024-01-25T09:15:00',
      presion_sistolica: 148,
      presion_diastolica: 92,
      glucosa_mg_dl: 142,
      peso_kg: 85.5,
      imc: 28.6,
    },
    // Febrero 2024 - Mejora moderada
    {
      id: 4,
      fecha_medicion: '2024-02-10T11:00:00',
      presion_sistolica: 140,
      presion_diastolica: 88,
      glucosa_mg_dl: 120,
      peso_kg: 83,
      imc: 27.8,
    },
    {
      id: 5,
      fecha_medicion: '2024-02-18T15:20:00',
      presion_sistolica: 138,
      presion_diastolica: 85,
      glucosa_mg_dl: 115,
      peso_kg: 82.5,
      imc: 27.6,
    },
    // Marzo 2024 - Mejora significativa
    {
      id: 6,
      fecha_medicion: '2024-03-05T10:30:00',
      presion_sistolica: 130,
      presion_diastolica: 80,
      glucosa_mg_dl: 105,
      peso_kg: 80,
      imc: 26.8,
    },
    {
      id: 7,
      fecha_medicion: '2024-03-12T13:45:00',
      presion_sistolica: 125,
      presion_diastolica: 78,
      glucosa_mg_dl: 98,
      peso_kg: 79.5,
      imc: 26.6,
    },
    {
      id: 8,
      fecha_medicion: '2024-03-20T09:00:00',
      presion_sistolica: 128,
      presion_diastolica: 79,
      glucosa_mg_dl: 102,
      peso_kg: 79,
      imc: 26.5,
    },
    {
      id: 9,
      fecha_medicion: '2024-03-28T16:00:00',
      presion_sistolica: 122,
      presion_diastolica: 75,
      glucosa_mg_dl: 95,
      peso_kg: 78.5,
      imc: 26.3,
    },
    // Abril 2024 - Estado óptimo
    {
      id: 10,
      fecha_medicion: '2024-04-08T11:15:00',
      presion_sistolica: 118,
      presion_diastolica: 72,
      glucosa_mg_dl: 92,
      peso_kg: 77,
      imc: 25.8,
    },
    {
      id: 11,
      fecha_medicion: '2024-04-15T14:00:00',
      presion_sistolica: 120,
      presion_diastolica: 74,
      glucosa_mg_dl: 90,
      peso_kg: 76.5,
      imc: 25.6,
    },
    {
      id: 12,
      fecha_medicion: '2024-04-22T10:30:00',
      presion_sistolica: 115,
      presion_diastolica: 70,
      glucosa_mg_dl: 88,
      peso_kg: 76,
      imc: 25.5,
    },
    {
      id: 13,
      fecha_medicion: '2024-04-30T15:45:00',
      presion_sistolica: 117,
      presion_diastolica: 71,
      glucosa_mg_dl: 89,
      peso_kg: 75.5,
      imc: 25.3,
    },
    // Mayo 2024 - Mantenimiento
    {
      id: 14,
      fecha_medicion: '2024-05-10T09:30:00',
      presion_sistolica: 119,
      presion_diastolica: 73,
      glucosa_mg_dl: 91,
      peso_kg: 75,
      imc: 25.1,
    },
    {
      id: 15,
      fecha_medicion: '2024-05-18T13:20:00',
      presion_sistolica: 121,
      presion_diastolica: 74,
      glucosa_mg_dl: 93,
      peso_kg: 75.2,
      imc: 25.2,
    },
    {
      id: 16,
      fecha_medicion: '2024-05-25T10:00:00',
      presion_sistolica: 118,
      presion_diastolica: 72,
      glucosa_mg_dl: 90,
      peso_kg: 74.8,
      imc: 25.0,
    },
  ];

  return (
    <View style={styles.container}>
      <MonthlyVitalSignsBarChart 
        signosVitales={datosSimulados}
        loading={false}
      />
    </View>
  );
};

/**
 * Ejemplo 2: Uso con datos reales desde la API
 */
export const EjemploConDatosReales = () => {
  const { userData } = useAuth();
  const pacienteId = userData?.id_paciente || userData?.id;

  // Obtener TODOS los signos vitales (monitoreo continuo + consultas)
  const {
    signosVitales,
    loading,
    error,
  } = usePacienteSignosVitales(pacienteId, {
    getAll: true, // Obtener todos los signos vitales
    sort: 'ASC', // Orden cronológico
    autoFetch: !!pacienteId,
  });

  return (
    <View style={styles.container}>
      <MonthlyVitalSignsBarChart 
        signosVitales={signosVitales || []}
        loading={loading}
      />
    </View>
  );
};

/**
 * Ejemplo 3: Uso en pantalla de detalle de paciente (para admin/doctor)
 */
export const EjemploEnDetallePaciente = ({ pacienteId }) => {
  const {
    signosVitales,
    loading,
    error,
  } = usePacienteSignosVitales(pacienteId, {
    getAll: true,
    sort: 'ASC',
    autoFetch: !!pacienteId,
  });

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Error al cargar signos vitales: {error.message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MonthlyVitalSignsBarChart 
        signosVitales={signosVitales || []}
        loading={loading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
  },
});

export default EjemploConDatosSimulados;
