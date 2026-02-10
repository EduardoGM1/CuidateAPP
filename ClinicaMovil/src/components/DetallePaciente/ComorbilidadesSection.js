import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Title, Chip } from 'react-native-paper';
import { COLORES } from '../../utils/constantes';

/**
 * ComorbilidadesSection - Muestra las enfermedades crónicas del paciente
 * 
 * Componente simple que muestra chips con las comorbilidades del paciente.
 * OPTIMIZADO: Memoizado con React.memo para evitar re-renders innecesarios
 * 
 * @param {Object} props
 * @param {Array} props.comorbilidades - Lista de comorbilidades
 * 
 * @example
 * <ComorbilidadesSection 
 *   comorbilidades={[
 *     { id_comorbilidad: 1, nombre: 'Diabetes' },
 *     { id_comorbilidad: 2, nombre: 'Hipertensión' }
 *   ]}
 * />
 */
const ComorbilidadesSection = ({ comorbilidades }) => {
  if (!comorbilidades || comorbilidades.length === 0) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>📋 Enfermedades Crónicas</Title>
          <Text style={styles.noDataText}>No hay comorbilidades registradas</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>📋 Enfermedades Crónicas ({comorbilidades.length})</Title>
        <View style={styles.comorbilidadesContainer}>
          {comorbilidades.map((comorbilidad) => (
            <Chip
              key={comorbilidad.id_comorbilidad}
              style={styles.comorbilidadChip}
              textStyle={styles.comorbilidadText}
            >
              {comorbilidad.nombre || comorbilidad.nombre_enfermedad}
            </Chip>
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
    backgroundColor: COLORES.FONDO_CARD,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 12,
  },
  comorbilidadesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  comorbilidadChip: {
    marginVertical: 4,
    marginRight: 8,
  },
  comorbilidadText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

// Función de comparación personalizada para React.memo
const areEqual = (prevProps, nextProps) => {
  // Comparar longitud y IDs de comorbilidades
  if (prevProps.comorbilidades?.length !== nextProps.comorbilidades?.length) {
    return false;
  }
  
  if (!prevProps.comorbilidades && !nextProps.comorbilidades) {
    return true;
  }
  
  if (!prevProps.comorbilidades || !nextProps.comorbilidades) {
    return false;
  }
  
  // Comparar IDs de comorbilidades para detectar cambios
  const prevIds = prevProps.comorbilidades.map(c => c.id_comorbilidad).sort().join(',');
  const nextIds = nextProps.comorbilidades.map(c => c.id_comorbilidad).sort().join(',');
  
  return prevIds === nextIds;
};

export default memo(ComorbilidadesSection, areEqual);




