/**
 * Pantalla: Gráficos de Evolución (Admin/Doctor)
 * 
 * Visualización de evolución mensual de signos vitales con gráfico de barras interactivo.
 * Cada barra representa un mes, ordenado de peor a mejor resultado.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import gestionService from '../../api/gestionService';
import Logger from '../../services/logger';
import MonthlyVitalSignsBarChart from '../../components/charts/MonthlyVitalSignsBarChart';
import TimeRangeFilter, { FILTROS_DISPONIBLES } from '../../components/charts/TimeRangeFilter';
import ComparativaEvolucion from '../../components/charts/ComparativaEvolucion';
import { COLORES } from '../../utils/constantes';

const GraficosEvolucion = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { paciente } = route.params || {};
  const pacienteId = paciente?.id_paciente || paciente?.id;

  const [signosVitales, setSignosVitales] = useState([]);
  const [signosVitalesCompletos, setSignosVitalesCompletos] = useState([]); // Para comparativa (siempre completo)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [filtroTiempo, setFiltroTiempo] = useState(FILTROS_DISPONIBLES.COMPLETO);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    cargarSignosVitales();
  }, [pacienteId]);

  const cargarSignosVitales = async () => {
    if (!pacienteId) {
      Logger.warn('No se proporcionó pacienteId para cargar signos vitales');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Ventana de últimos 12 meses para reducir consumo de datos (una sola petición en lugar de getAll)
      const ahora = new Date();
      const fechaFin = ahora.toISOString().split('T')[0];
      const fechaInicio = new Date(ahora.getFullYear() - 1, ahora.getMonth(), ahora.getDate()).toISOString().split('T')[0];
      const LIMIT_GRAFICOS = 500;
      
      const response = await gestionService.getPacienteSignosVitales(pacienteId, {
        limit: LIMIT_GRAFICOS,
        offset: 0,
        sort: 'ASC',
        fechaInicio,
        fechaFin,
      });
      
      const signosData = response?.data?.data ?? response?.data ?? [];
      const signos = Array.isArray(signosData) ? signosData : [];
      setSignosVitales(signos);
      setSignosVitalesCompletos(signos);
      Logger.info(`Signos vitales cargados (ventana 12 meses, limit ${LIMIT_GRAFICOS}): ${signos.length} registros`);
    } catch (error) {
      // Capturar toda la información del error de manera segura
      const errorInfo = {
        message: error?.message || String(error),
        pacienteId,
        name: error?.name,
        code: error?.code,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        stack: error?.stack,
        type: error?.type,
        isAxiosError: error?.isAxiosError,
        config: error?.config ? {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL
        } : undefined
      };
      
      Logger.error('Error cargando signos vitales:', errorInfo);
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PRIMARIO} />
          <Text style={styles.loadingText}>Cargando gráficos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Gráficos de Evolución</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Error al cargar los datos: {error.message || 'Error desconocido'}
            </Text>
            <Text style={styles.errorSubtext}>
              Por favor, intenta nuevamente más tarde
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Gráficos de Evolución</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Visualización mensual consolidada de signos vitales. Las barras están ordenadas de peor a mejor resultado según el score de salud.
          </Text>
        </View>

        {/* Filtro de rango de tiempo */}
        <TimeRangeFilter
          filtroSeleccionado={filtroTiempo}
          onFiltroChange={setFiltroTiempo}
        />

        <MonthlyVitalSignsBarChart 
          signosVitales={signosVitales}
          loading={loading}
          filtroTiempo={filtroTiempo}
          signosVitalesCompletos={signosVitalesCompletos}
        />

        {/* Comparativa de evolución - siempre desde el inicio completo */}
        <ComparativaEvolucion signosVitales={signosVitalesCompletos} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: COLORES.NAV_PRIMARIO,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORES.ERROR_LIGHT,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
});

export default GraficosEvolucion;
