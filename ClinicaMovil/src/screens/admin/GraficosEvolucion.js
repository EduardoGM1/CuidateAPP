/**
 * Pantalla: Gráficos de Evolución (Admin/Doctor)
 * 
 * Visualización avanzada de evolución de signos vitales con múltiples gráficos.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryArea, VictoryBar } from 'victory-native';
import gestionService from '../../api/gestionService';
import Logger from '../../services/logger';

const GraficosEvolucion = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { paciente } = route.params || {};
  const pacienteId = paciente?.id_paciente || paciente?.id;

  const [signosVitales, setSignosVitales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChart, setSelectedChart] = useState('presion');
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

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
    if (!pacienteId) return;
    
    try {
      setLoading(true);
      const signos = await gestionService.getSignosVitalesByPaciente(pacienteId, { limit: 100 });
      setSignosVitales(Array.isArray(signos) ? signos : signos?.data || []);
    } catch (error) {
      Logger.error('Error cargando signos vitales:', error);
    } finally {
      setLoading(false);
    }
  };

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
            valor = signo.presion_sistolica;
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
      .reverse();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando gráficos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const datos = prepararDatos(selectedChart);
  const chartWidth = Math.min(screenWidth - 40, 400);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
          <Text style={styles.title}>📈 Gráficos de Evolución</Text>
        </View>

        <View style={styles.chartSelector}>
          {['presion', 'glucosa', 'peso', 'imc'].map((tipo) => (
            <TouchableOpacity
              key={tipo}
              style={[styles.chartButton, selectedChart === tipo && styles.chartButtonActive]}
              onPress={() => setSelectedChart(tipo)}
            >
              <Text style={[styles.chartButtonText, selectedChart === tipo && styles.chartButtonTextActive]}>
                {tipo === 'presion' ? '🩺 Presión' :
                 tipo === 'glucosa' ? '🧪 Glucosa' :
                 tipo === 'peso' ? '⚖️ Peso' : '📏 IMC'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {datos.length > 0 ? (
          <View style={styles.chartContainer}>
            <VictoryChart width={chartWidth} height={300} theme={VictoryTheme.material}>
              <VictoryAxis tickFormat={(t) => datos[t - 1]?.fecha || t} />
              <VictoryAxis dependentAxis />
              <VictoryArea data={datos} style={{ data: { fill: '#2196F3', fillOpacity: 0.3 } }} />
              <VictoryLine data={datos} style={{ data: { stroke: '#1976D2', strokeWidth: 3 } }} />
            </VictoryChart>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay datos suficientes</Text>
          </View>
        )}
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
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
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
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  chartButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  chartButtonTextActive: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
});

export default GraficosEvolucion;


