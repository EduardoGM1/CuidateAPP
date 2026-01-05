/**
 * Pantalla: Gráficos de Evolución
 * 
 * Visualización simplificada de evolución de signos vitales.
 * Gráficos visuales simples con TTS para pacientes rurales.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryArea } from 'victory-native';
import usePacienteData from '../../hooks/usePacienteData';
import useTTS from '../../hooks/useTTS';
import useChartCache from '../../hooks/useChartCache';
import { exportAndSaveChart, shareChart } from '../../utils/chartExporter';
import SkeletonLoader, { SkeletonChart } from '../../components/common/SkeletonLoader';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';

const GraficosEvolucion = () => {
  const navigation = useNavigation();
  const {
    signosVitales,
    loading,
    refresh,
    totalSignosVitales,
  } = usePacienteData();
  
  const { speak, stopAndClear, createTimeout } = useTTS();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChart, setSelectedChart] = useState('presion'); // presion, glucosa, peso, imc
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef(null);
  
  // Caché para datos de gráficos
  const fetchChartData = useCallback(async (params) => {
    return prepararDatos(selectedChart);
  }, [selectedChart, signosVitales]);
  
  const { data: cachedData, loading: cacheLoading, refresh: refreshCache } = useChartCache(
    selectedChart,
    fetchChartData,
    { enabled: true, cacheDuration: 5 * 60 * 1000 }
  );

  // Listener para cambios de tamaño de pantalla
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  // Cargar datos al entrar
  useFocusEffect(
    useCallback(() => {
      const timer = createTimeout(async () => {
        if (totalSignosVitales > 0) {
          await speak(`Gráficos de evolución. Tienes ${totalSignosVitales} registros de signos vitales.`);
        } else {
          await speak('Gráficos de evolución. Aún no tienes registros de signos vitales.');
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
    await refresh();
    await refreshCache();
    setRefreshing(false);
    audioFeedbackService.playSuccess();
  };

  const handleExportChart = async () => {
    try {
      setExporting(true);
      hapticService.medium();
      
      const chartNames = {
        presion: 'presion_arterial',
        glucosa: 'glucosa',
        peso: 'peso',
        imc: 'imc',
      };
      
      const filename = `grafico_${chartNames[selectedChart]}_${new Date().toISOString().split('T')[0]}`;
      const savedPath = await exportAndSaveChart(chartRef, filename);
      
      Alert.alert(
        'Gráfico Exportado',
        'El gráfico se ha guardado exitosamente. ¿Deseas compartirlo?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Compartir',
            onPress: async () => {
              await shareChart(savedPath, `Gráfico de ${chartNames[selectedChart]}`);
            },
          },
        ]
      );
      
      await speak('Gráfico exportado exitosamente');
      audioFeedbackService.playSuccess();
    } catch (error) {
      Logger.error('Error exportando gráfico:', error);
      Alert.alert('Error', 'No se pudo exportar el gráfico');
      audioFeedbackService.playError();
    } finally {
      setExporting(false);
    }
  };

  const handleChartChange = async (chartType) => {
    hapticService.selection();
    setSelectedChart(chartType);
    
    const chartNames = {
      presion: 'Presión Arterial',
      glucosa: 'Glucosa',
      peso: 'Peso',
      imc: 'Índice de Masa Corporal',
    };
    
    await speak(`Mostrando gráfico de ${chartNames[chartType]}`);
  };

  // Preparar datos para gráficos
  const prepararDatos = (tipo) => {
    if (!signosVitales || signosVitales.length === 0) return [];
    
    return signosVitales
      .filter(signo => {
        switch (tipo) {
          case 'presion':
            return signo.presion_sistolica && signo.presion_diastolica;
          case 'glucosa':
            return signo.glucosa_mg_dl;
          case 'peso':
            return signo.peso_kg;
          case 'imc':
            return signo.imc;
          default:
            return false;
        }
      })
      .map((signo, index) => {
        const fecha = new Date(signo.fecha_medicion || signo.fecha_registro);
        let valor;
        
        switch (tipo) {
          case 'presion':
            valor = signo.presion_sistolica; // Mostrar sistólica
            break;
          case 'glucosa':
            valor = signo.glucosa_mg_dl;
            break;
          case 'peso':
            valor = signo.peso_kg;
            break;
          case 'imc':
            valor = signo.imc;
            break;
          default:
            valor = 0;
        }
        
        return {
          x: index + 1,
          y: valor,
          fecha: fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' }),
          valor,
        };
      })
      .reverse(); // Más reciente primero
  };

  // Obtener rango normal
  const getRangoNormal = (tipo) => {
    switch (tipo) {
      case 'presion':
        return { min: 90, max: 140, unidad: 'mmHg' };
      case 'glucosa':
        return { min: 70, max: 100, unidad: 'mg/dL' };
      case 'peso':
        return { min: null, max: null, unidad: 'kg' };
      case 'imc':
        return { min: 18.5, max: 24.9, unidad: '' };
      default:
        return { min: null, max: null, unidad: '' };
    }
  };

  // Leer valor con TTS
  const handleReadValue = async (punto) => {
    hapticService.light();
    const rango = getRangoNormal(selectedChart);
    let mensaje = `Fecha: ${punto.fecha}. Valor: ${punto.valor} ${rango.unidad}.`;
    
    if (rango.min !== null && rango.max !== null) {
      if (punto.valor < rango.min) {
        mensaje += ' Valor bajo.';
      } else if (punto.valor > rango.max) {
        mensaje += ' Valor alto.';
      } else {
        mensaje += ' Valor normal.';
      }
    }
    
    await speak(mensaje);
  };

  const datos = cachedData && cachedData.length > 0 ? cachedData : prepararDatos(selectedChart);
  const rango = getRangoNormal(selectedChart);
  const chartWidth = Math.min(screenWidth - 40, 400);
  const isLoading = loading || cacheLoading;

  if (isLoading && datos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                hapticService.light();
                navigation.goBack();
              }}
            >
              <Text style={styles.backButtonText}>← Atrás</Text>
            </TouchableOpacity>
            <Text style={styles.title}>📈 Gráficos de Evolución</Text>
          </View>
          <SkeletonChart width={chartWidth} height={300} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (datos.length === 0) {
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                hapticService.light();
                navigation.goBack();
              }}
            >
              <Text style={styles.backButtonText}>← Atrás</Text>
            </TouchableOpacity>
            <Text style={styles.title}>📈 Gráficos de Evolución</Text>
          </View>
          
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>
              No hay datos suficientes para mostrar gráficos
            </Text>
            <Text style={styles.emptySubtext}>
              Registra signos vitales para ver tu evolución
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              hapticService.light();
              navigation.goBack();
            }}
          >
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>📈 Gráficos de Evolución</Text>
          
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.listenButton}
              onPress={async () => {
                hapticService.light();
                const chartNames = {
                  presion: 'Presión Arterial',
                  glucosa: 'Glucosa',
                  peso: 'Peso',
                  imc: 'Índice de Masa Corporal',
                };
                await speak(`Gráfico de ${chartNames[selectedChart]}. ${datos.length} registros.`);
              }}
            >
              <Text style={styles.listenButtonText}>🔊</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
              onPress={handleExportChart}
              disabled={exporting || datos.length === 0}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.exportButtonText}>📥</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Selector de gráficos */}
        <View style={styles.chartSelector}>
          <TouchableOpacity
            style={[styles.chartButton, selectedChart === 'presion' && styles.chartButtonActive]}
            onPress={() => handleChartChange('presion')}
          >
            <Text style={[styles.chartButtonText, selectedChart === 'presion' && styles.chartButtonTextActive]}>
              🩺 Presión
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.chartButton, selectedChart === 'glucosa' && styles.chartButtonActive]}
            onPress={() => handleChartChange('glucosa')}
          >
            <Text style={[styles.chartButtonText, selectedChart === 'glucosa' && styles.chartButtonTextActive]}>
              🧪 Glucosa
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.chartButton, selectedChart === 'peso' && styles.chartButtonActive]}
            onPress={() => handleChartChange('peso')}
          >
            <Text style={[styles.chartButtonText, selectedChart === 'peso' && styles.chartButtonTextActive]}>
              ⚖️ Peso
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.chartButton, selectedChart === 'imc' && styles.chartButtonActive]}
            onPress={() => handleChartChange('imc')}
          >
            <Text style={[styles.chartButtonText, selectedChart === 'imc' && styles.chartButtonTextActive]}>
              📏 IMC
            </Text>
          </TouchableOpacity>
        </View>

        {/* Gráfico */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>
            {selectedChart === 'presion' && 'Presión Arterial Sistólica'}
            {selectedChart === 'glucosa' && 'Nivel de Glucosa'}
            {selectedChart === 'peso' && 'Peso Corporal'}
            {selectedChart === 'imc' && 'Índice de Masa Corporal'}
          </Text>
          
          {rango.min !== null && rango.max !== null && (
            <Text style={styles.rangeText}>
              Rango normal: {rango.min} - {rango.max} {rango.unidad}
            </Text>
          )}
          
          <View style={styles.chartWrapper} ref={chartRef} collapsable={false}>
            <VictoryChart
              width={chartWidth}
              height={300}
              theme={VictoryTheme.material}
              padding={{ left: 50, top: 20, right: 20, bottom: 50 }}
              animate={{
                duration: 800,
                easing: 'cubicInOut',
                onLoad: { duration: 1000 },
              }}
            >
              <VictoryAxis
                tickFormat={(t) => datos[t - 1]?.fecha || t}
                style={{
                  tickLabels: { fontSize: 10, angle: -45 },
                }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t) => `${t}${rango.unidad}`}
                style={{
                  tickLabels: { fontSize: 12 },
                }}
              />
              <VictoryArea
                data={datos}
                style={{
                  data: {
                    fill: selectedChart === 'presion' ? '#F44336' :
                          selectedChart === 'glucosa' ? '#2196F3' :
                          selectedChart === 'peso' ? '#4CAF50' :
                          '#FF9800',
                    fillOpacity: 0.3,
                    stroke: selectedChart === 'presion' ? '#D32F2F' :
                            selectedChart === 'glucosa' ? '#1976D2' :
                            selectedChart === 'peso' ? '#388E3C' :
                            '#F57C00',
                    strokeWidth: 3,
                  },
                }}
                animate={{
                  duration: 1000,
                  onLoad: { duration: 1000 },
                }}
              />
              <VictoryLine
                data={datos}
                style={{
                  data: {
                    stroke: selectedChart === 'presion' ? '#D32F2F' :
                            selectedChart === 'glucosa' ? '#1976D2' :
                            selectedChart === 'peso' ? '#388E3C' :
                            '#F57C00',
                    strokeWidth: 3,
                  },
                }}
              />
            </VictoryChart>
          </View>
          
          {/* Valores recientes */}
          <View style={styles.valuesContainer}>
            <Text style={styles.valuesTitle}>Últimos valores:</Text>
            {datos.slice(0, 5).map((punto, index) => (
              <TouchableOpacity
                key={index}
                style={styles.valueItem}
                onPress={() => handleReadValue(punto)}
              >
                <Text style={styles.valueDate}>{punto.fecha}</Text>
                <Text style={styles.valueNumber}>
                  {punto.valor} {rango.unidad}
                </Text>
                {rango.min !== null && rango.max !== null && (
                  <Text style={[
                    styles.valueStatus,
                    punto.valor < rango.min && styles.valueStatusLow,
                    punto.valor > rango.max && styles.valueStatusHigh,
                    punto.valor >= rango.min && punto.valor <= rango.max && styles.valueStatusNormal,
                  ]}>
                    {punto.valor < rango.min ? 'Bajo' :
                     punto.valor > rango.max ? 'Alto' : 'Normal'}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  listenButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listenButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  exportButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  chartSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  chartButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  chartButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  chartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  chartButtonTextActive: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  rangeText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  valuesContainer: {
    marginTop: 20,
  },
  valuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  valueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
  },
  valueDate: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  valueNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  valueStatus: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  valueStatusNormal: {
    color: '#4CAF50',
  },
  valueStatusLow: {
    color: '#2196F3',
  },
  valueStatusHigh: {
    color: '#F44336',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default GraficosEvolucion;

