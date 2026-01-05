import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Title } from 'react-native-paper';

/**
 * MedicalSummary - Resumen médico con contadores
 * 
 * Muestra contadores visuales de citas, signos vitales, diagnósticos y medicamentos.
 * OPTIMIZADO: Memoizado con React.memo para evitar re-renders innecesarios
 * 
 * @param {Object} props
 * @param {Object} props.resumen - Objeto con resumen de datos médicos
 * 
 * @example
 * <MedicalSummary 
 *   resumen={{
 *     resumen: {
 *       total_citas: 5,
 *       total_signos_vitales: 12,
 *       total_diagnosticos: 3,
 *       total_medicamentos: 8
 *     }
 *   }}
 * />
 */
const MedicalSummary = ({ resumen }) => {
  // Memoizar datos del resumen para evitar recálculos
  const summaryData = useMemo(() => {
    if (!resumen?.resumen) return [];
    
    return [
      {
        number: resumen.resumen.total_citas || 0,
        label: 'Citas'
      },
      {
        number: resumen.resumen.total_signos_vitales || 0,
        label: 'Signos Vitales'
      },
      {
        number: resumen.resumen.total_diagnosticos || 0,
        label: 'Diagnósticos'
      },
      {
        number: resumen.resumen.total_medicamentos || 0,
        label: 'Medicamentos'
      }
    ];
  }, [resumen?.resumen?.total_citas, resumen?.resumen?.total_signos_vitales, resumen?.resumen?.total_diagnosticos, resumen?.resumen?.total_medicamentos]);

  if (!resumen?.resumen || summaryData.length === 0) return null;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>📊 Resumen Médico</Title>
        <View style={styles.summaryGrid}>
          {summaryData.map((item, index) => (
            <View key={`summary-${index}`} style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{item.number}</Text>
              <Text style={styles.summaryLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
});

// Función de comparación personalizada para React.memo
const areEqual = (prevProps, nextProps) => {
  const prevResumen = prevProps.resumen?.resumen;
  const nextResumen = nextProps.resumen?.resumen;
  
  if (!prevResumen && !nextResumen) return true;
  if (!prevResumen || !nextResumen) return false;
  
  return (
    prevResumen.total_citas === nextResumen.total_citas &&
    prevResumen.total_signos_vitales === nextResumen.total_signos_vitales &&
    prevResumen.total_diagnosticos === nextResumen.total_diagnosticos &&
    prevResumen.total_medicamentos === nextResumen.total_medicamentos
  );
};

export default memo(MedicalSummary, areEqual);




