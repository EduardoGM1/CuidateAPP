/**
 * @file ConsultasTimeline.js
 * @description Componente principal para mostrar timeline de consultas agrupadas
 * @author Senior Developer
 * @date 2025-11-17
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Title } from 'react-native-paper';
import ConsultaCard from './ConsultaCard';
import FiltrosConsultas from './FiltrosConsultas';
import useConsultasAgrupadas from '../../hooks/useConsultasAgrupadas';
import Logger from '../../services/logger';

/**
 * Componente principal para mostrar el timeline de consultas
 * 
 * @param {Object} props
 * @param {number|string} props.pacienteId - ID del paciente
 * @param {Function} props.onPressConsulta - Función al presionar una consulta
 * @param {Function} props.onEditConsulta - Función para editar una consulta
 * @param {Function} props.formatearFecha - Función para formatear fechas
 * @param {Function} props.calcularIMC - Función para calcular IMC
 * @param {Function} props.getEstadoCitaColor - Función para obtener color del estado
 * @param {Function} props.getEstadoCitaTexto - Función para obtener texto del estado
 * @param {Function} props.onOpenOptions - Función para abrir opciones de citas
 * @param {number} [props.refreshTrigger] - Cuando cambia, se recargan las citas (p. ej. al cerrar detalle o guardar consulta)
 */
const ConsultasTimeline = ({
  pacienteId,
  onPressConsulta,
  onEditConsulta,
  formatearFecha,
  calcularIMC,
  getEstadoCitaColor,
  getEstadoCitaTexto,
  onOpenOptions,
  refreshTrigger
}) => {
  // Estado de filtro por mes
  const [mesSeleccionado, setMesSeleccionado] = useState('todos');

  // Obtener consultas agrupadas
  const {
    consultasAgrupadas,
    loading,
    error,
    refresh,
    totalCitas
  } = useConsultasAgrupadas(pacienteId, {
    limit: 100, // Aumentar límite para obtener más consultas
    autoFetch: true,
    sort: 'DESC'
  });

  // Refrescar lista cuando se cierra el modal de detalle de cita o se guarda consulta/wizard
  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0 && typeof refresh === 'function') {
      refresh();
    }
  }, [refreshTrigger]);

  // Logging para debug
  useEffect(() => {
    if (pacienteId) {
      Logger.debug('ConsultasTimeline: Datos cargados', {
        pacienteId,
        totalCitas,
        consultasAgrupadas: consultasAgrupadas?.length || 0,
        loading,
        error: error?.message
      });
    }
  }, [pacienteId, totalCitas, consultasAgrupadas?.length, loading, error]);

  /**
   * Filtrar consultas por mes seleccionado
   */
  const consultasFiltradas = useMemo(() => {
    if (!consultasAgrupadas || consultasAgrupadas.length === 0) {
      return [];
    }

    // Si no hay filtro de mes o es "todos", retornar todas las consultas
    if (!mesSeleccionado || mesSeleccionado === 'todos') {
      return consultasAgrupadas;
    }

    // Filtrar por mes
    return consultasAgrupadas.filter(consulta => {
      if (!consulta.cita || !consulta.cita.fecha_cita) {
        return false;
      }

      const fecha = new Date(consulta.cita.fecha_cita);
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      return mesKey === mesSeleccionado;
    });
  }, [consultasAgrupadas, mesSeleccionado]);

  /**
   * Manejar refresh
   */
  const handleRefresh = useCallback(() => {
    Logger.info('Refrescando consultas agrupadas');
    refresh();
  }, [refresh]);


  /**
   * Renderizar header con filtro por mes
   */
  const renderHeader = useCallback(() => {
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Title style={styles.title}>
            Historial de Consultas ({consultasFiltradas.length})
          </Title>
          {onOpenOptions && (
            <Text style={styles.optionsText} onPress={onOpenOptions}>
              Opciones
            </Text>
          )}
        </View>
        <FiltrosConsultas
          mesSeleccionado={mesSeleccionado}
          onMesChange={setMesSeleccionado}
          consultas={consultasAgrupadas}
        />
      </View>
    );
  }, [consultasFiltradas.length, mesSeleccionado, consultasAgrupadas, onOpenOptions]);


  /**
   * Renderizar empty state
   */
  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.emptyText}>Cargando consultas...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>❌ Error al cargar consultas</Text>
          <Text style={styles.emptySubtext}>{error.message || 'Intente nuevamente'}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay consultas registradas</Text>
        <Text style={styles.emptySubtext}>
          {mesSeleccionado !== 'todos' && mesSeleccionado
            ? 'No hay consultas en el mes seleccionado'
            : 'Las consultas aparecerán aquí cuando se registren'}
        </Text>
      </View>
    );
  }, [loading, error, mesSeleccionado]);

  return (
    <View style={styles.container}>
      {renderHeader()}
      {consultasFiltradas.length > 0 ? (
        <View style={styles.listContainer}>
          {consultasFiltradas.map((consulta, index) => (
            <ConsultaCard
              key={`consulta-${consulta.cita.id_cita}-${index}`}
              consulta={consulta}
              onPress={() => onPressConsulta && onPressConsulta(consulta.cita.id_cita)}
              onEdit={() => onEditConsulta && onEditConsulta(consulta.cita)}
              formatearFecha={formatearFecha}
              calcularIMC={calcularIMC}
              getEstadoCitaColor={getEstadoCitaColor}
              getEstadoCitaTexto={getEstadoCitaTexto}
            />
          ))}
        </View>
      ) : (
        renderEmpty()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flex: 1,
    backgroundColor: 'transparent',
    margin: 0,
    padding: 0
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    width: '100%',
    margin: 0
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
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
  listContainer: {
    paddingTop: 8,
    width: '100%',
    paddingHorizontal: 16
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9E9E9E',
    textAlign: 'center'
  }
});

export default React.memo(ConsultasTimeline);

