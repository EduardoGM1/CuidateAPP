/**
 * Pantalla: Gráficos de Evolución (Paciente)
 * 
 * Visualización simplificada de evolución mensual de signos vitales.
 * Gráfico de barras interactivo con soporte TTS para pacientes rurales.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { usePacienteSignosVitales } from '../../hooks/usePacienteMedicalData';
import { useAuth } from '../../context/AuthContext';
import useTTS from '../../hooks/useTTS';
import MonthlyVitalSignsBarChart from '../../components/charts/MonthlyVitalSignsBarChart';
import TimeRangeFilter, { FILTROS_DISPONIBLES } from '../../components/charts/TimeRangeFilter';
import ComparativaEvolucion from '../../components/charts/ComparativaEvolucion';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';

const GraficosEvolucion = () => {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const pacienteId = userData?.id_paciente || userData?.id;
  
  // Obtener TODOS los signos vitales (monitoreo continuo + consultas) para evolución completa
  const {
    signosVitales,
    loading,
    refresh,
    total: totalSignosVitales,
    error,
  } = usePacienteSignosVitales(pacienteId, {
    getAll: true, // Obtener todos los signos vitales (evolución completa)
    sort: 'ASC', // Orden cronológico ascendente para mostrar evolución
    autoFetch: !!pacienteId,
  });
  
  const { speak, stopAndClear, createTimeout } = useTTS();
  const [refreshing, setRefreshing] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [filtroTiempo, setFiltroTiempo] = useState(FILTROS_DISPONIBLES.COMPLETO);

  // Listener para cambios de tamaño de pantalla
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Cargar datos al entrar y anunciar con TTS
  useFocusEffect(
    useCallback(() => {
      const timer = createTimeout(async () => {
        if (totalSignosVitales > 0) {
          await speak(`Gráficos de evolución mensual. Tienes ${totalSignosVitales} registros de signos vitales. Presiona una barra para ver detalles del mes.`);
        } else {
          await speak('Gráficos de evolución mensual. Aún no tienes registros de signos vitales.');
        }
      }, 500);
      
      return () => {
        stopAndClear();
        clearTimeout(timer);
      };
    }, [speak, stopAndClear, createTimeout, totalSignosVitales])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    hapticService.medium();
    try {
      await refresh();
      await speak('Datos actualizados');
      audioFeedbackService.playSuccess();
    } catch (error) {
      Logger.error('Error refrescando datos:', error);
      await speak('Error al actualizar datos');
      audioFeedbackService.playError();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && (!signosVitales || signosVitales.length === 0)) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.title}>📈 Gráficos de Evolución</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Cargando gráficos...</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4CAF50']}
              tintColor="#4CAF50"
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>📈 Gráficos de Evolución</Text>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>
              Error al cargar los datos
            </Text>
            <Text style={styles.errorSubtext}>
              Desliza hacia abajo para intentar nuevamente
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📈 Gráficos de Evolución</Text>
        </View>

        {/* Información */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            📊 Visualización mensual de tus signos vitales. Las barras están ordenadas de peor a mejor resultado. Presiona una barra para ver detalles.
          </Text>
        </View>

        {/* Filtro de rango de tiempo */}
        <TimeRangeFilter
          filtroSeleccionado={filtroTiempo}
          onFiltroChange={(filtro) => {
            setFiltroTiempo(filtro);
            hapticService.light();
          }}
        />

        {/* Gráfico de barras mensual */}
        <MonthlyVitalSignsBarChart 
          signosVitales={signosVitales || []}
          loading={loading}
          filtroTiempo={filtroTiempo}
          signosVitalesCompletos={signosVitales || []}
        />

        {/* Comparativa de evolución - siempre desde el inicio completo */}
        <ComparativaEvolucion signosVitales={signosVitales || []} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default GraficosEvolucion;
