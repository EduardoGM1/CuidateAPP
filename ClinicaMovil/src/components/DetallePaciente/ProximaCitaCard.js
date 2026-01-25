/**
 * @file ProximaCitaCard.js
 * @description Componente para mostrar la próxima o última cita con toda su información asociada
 * @author Senior Developer
 * @date 2025-11-17
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Title, Chip } from 'react-native-paper';
import ConsultaCard from './ConsultaCard';
import useConsultasAgrupadas from '../../hooks/useConsultasAgrupadas';
import { obtenerProximaOUltimaCita, obtenerTextoDescriptivoCita } from '../../utils/citaHelpers';
import Logger from '../../services/logger';

/**
 * Componente para mostrar la próxima o última cita con toda su información
 * 
 * @param {Object} props
 * @param {number|string} props.pacienteId - ID del paciente
 * @param {Function} props.onPressConsulta - Función al presionar la consulta
 * @param {Function} props.onEditConsulta - Función para editar la consulta
 * @param {Function} props.formatearFecha - Función para formatear fechas
 * @param {Function} props.calcularIMC - Función para calcular IMC
 * @param {Function} props.getEstadoCitaColor - Función para obtener color del estado
 * @param {Function} props.getEstadoCitaTexto - Función para obtener texto del estado
 * @param {Function} props.onOpenOptions - Función para abrir opciones de citas
 */
const ProximaCitaCard = ({
  pacienteId,
  onPressConsulta,
  onEditConsulta,
  formatearFecha,
  calcularIMC,
  getEstadoCitaColor,
  getEstadoCitaTexto,
  onOpenOptions
}) => {
  // Obtener consultas agrupadas
  const {
    consultasAgrupadas,
    loading,
    error,
    totalCitas,
    refresh
  } = useConsultasAgrupadas(pacienteId);

  // Obtener próxima o última cita
  const { cita: citaSeleccionada, tipo: tipoCita } = useMemo(() => {
    if (!consultasAgrupadas || consultasAgrupadas.length === 0) {
      return { cita: null, tipo: null };
    }

    // Extraer solo las citas para el helper
    const citas = consultasAgrupadas.map(c => c.cita);
    return obtenerProximaOUltimaCita(citas);
  }, [consultasAgrupadas]);

  // Encontrar la consulta agrupada correspondiente
  const consultaAgrupada = useMemo(() => {
    if (!citaSeleccionada || !consultasAgrupadas) {
      return null;
    }

    return consultasAgrupadas.find(
      c => c.cita.id_cita === citaSeleccionada.id_cita
    ) || null;
  }, [citaSeleccionada, consultasAgrupadas]);

  // Texto descriptivo
  const textoDescriptivo = useMemo(() => {
    return obtenerTextoDescriptivoCita(tipoCita);
  }, [tipoCita]);

  if (loading) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Cargando citas...</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>📅 Citas</Title>
            <TouchableOpacity onPress={onOpenOptions}>
              <Text style={styles.optionsText}>Opciones</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              ⚠️ Error al cargar citas
            </Text>
            <Text style={styles.errorSubtext}>
              {error.message || 'Intenta refrescar la pantalla'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                Logger.info('ProximaCitaCard: Reintentando cargar citas');
                if (refresh && typeof refresh === 'function') {
                  refresh();
                }
              }}
            >
              <Text style={styles.retryButtonText}>🔄 Reintentar</Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    );
  }

  if (!consultaAgrupada) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.cardTitle}>📅 Citas ({totalCitas})</Title>
            <TouchableOpacity onPress={onOpenOptions}>
              <Text style={styles.optionsText}>Opciones</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.noDataText}>No hay citas registradas</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.cardTitle}>
            📅 {textoDescriptivo} ({totalCitas})
          </Title>
          <TouchableOpacity onPress={onOpenOptions}>
            <Text style={styles.optionsText}>Opciones</Text>
          </TouchableOpacity>
        </View>

        {/* Reutilizar ConsultaCard para mostrar solo signos vitales en modo compacto */}
        <ConsultaCard
          consulta={consultaAgrupada}
          onPress={() => onPressConsulta && onPressConsulta(consultaAgrupada.cita.id_cita)}
          onEdit={() => onEditConsulta && onEditConsulta(consultaAgrupada.cita)}
          formatearFecha={formatearFecha}
          calcularIMC={calcularIMC}
          getEstadoCitaColor={getEstadoCitaColor}
          getEstadoCitaTexto={getEstadoCitaTexto}
          showActions={false}
          compactMode={true}
        />
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    flex: 1
  },
  optionsText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 14,
    color: '#757575'
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center'
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
    marginBottom: 4
  },
  errorSubtext: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 12
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center'
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center'
  },
  noDataText: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center'
  }
});

export default React.memo(ProximaCitaCard);

