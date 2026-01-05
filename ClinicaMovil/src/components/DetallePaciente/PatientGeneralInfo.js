import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Title } from 'react-native-paper';

/**
 * PatientGeneralInfo - Información general del paciente
 * 
 * Muestra 8 campos de información básica en un grid de 2 columnas.
 * 
 * @param {Object} props
 * @param {Object} props.paciente - Objeto con datos del paciente
 * @param {Function} props.formatearFecha - Función para formatear fecha
 * 
 * @example
 * <PatientGeneralInfo 
 *   paciente={paciente}
 *   formatearFecha={formatearFecha}
 * />
 */
const PatientGeneralInfo = ({ paciente, formatearFecha }) => {
  if (!paciente) return null;

  // Función helper para verificar si un valor está disponible
  const getValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return 'No disponible';
    }
    return value;
  };

  const infoItems = [
    { label: 'Email', value: getValue(paciente.email) },
    { label: 'Teléfono', value: getValue(paciente.numero_celular || paciente.telefono) },
    { label: 'CURP', value: getValue(paciente.curp) },
    { label: 'Institución de Salud', value: getValue(paciente.institucion_salud) },
    { label: 'Fecha de Nacimiento', value: formatearFecha(paciente.fecha_nacimiento) },
    { label: 'Fecha de Registro', value: formatearFecha(paciente.fecha_registro) },
    { label: 'Dirección', value: getValue(paciente.direccion) },
    { label: 'Estado', value: getValue(paciente.estado) },
    { label: 'Localidad', value: getValue(paciente.localidad) },
  ];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>📋 Información General</Title>
        <View style={styles.infoGrid}>
          {infoItems.map((item, index) => (
            <View key={`info-${index}`} style={styles.infoItem}>
              <Text style={styles.infoLabel}>{item.label}:</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
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
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
  },
});

export default PatientGeneralInfo;



