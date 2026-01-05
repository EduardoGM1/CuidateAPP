/**
 * @file ConsultasTimeline.js
 * @description Componente principal para mostrar timeline de consultas agrupadas
 * @author Senior Developer
 * @date 2025-11-17
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Card, Title } from 'react-native-paper';
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
 */
const ConsultasTimeline = ({
  pacienteId,
  onPressConsulta,
  onEditConsulta,
  formatearFecha,
  calcularIMC,
  getEstadoCitaColor,
  getEstadoCitaTexto,
  onOpenOptions
}) => {
  // Estado de filtros
  const [filtroTipo, setFiltroTipo] = useState('todas');
  const [busquedaTexto, setBusquedaTexto] = useState('');

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
   * Filtrar consultas según los filtros aplicados
   */
  const consultasFiltradas = useMemo(() => {
    if (!consultasAgrupadas || consultasAgrupadas.length === 0) {
      return [];
    }

    let filtradas = [...consultasAgrupadas];

    // Filtro por tipo
    if (filtroTipo !== 'todas') {
      filtradas = filtradas.filter(consulta => {
        switch (filtroTipo) {
          case 'con_signos':
            return consulta.signosVitales && consulta.signosVitales.length > 0;
          case 'con_diagnosticos':
            return consulta.diagnosticos && consulta.diagnosticos.length > 0;
          case 'completas':
            return consulta.tieneDatosCompletos;
          case 'parciales':
            return consulta.tieneDatosParciales && !consulta.tieneDatosCompletos;
          case 'sin_completar':
            return consulta.soloCita;
          default:
            return true;
        }
      });
    }

    // Búsqueda por texto (motivo, doctor, observaciones)
    if (busquedaTexto.trim()) {
      const textoBusqueda = busquedaTexto.toLowerCase().trim();
      filtradas = filtradas.filter(consulta => {
        const { cita } = consulta;
        return (
          (cita.motivo && cita.motivo.toLowerCase().includes(textoBusqueda)) ||
          (cita.doctor_nombre && cita.doctor_nombre.toLowerCase().includes(textoBusqueda)) ||
          (cita.observaciones && cita.observaciones.toLowerCase().includes(textoBusqueda))
        );
      });
    }

    return filtradas;
  }, [consultasAgrupadas, filtroTipo, busquedaTexto]);

  /**
   * Manejar refresh
   */
  const handleRefresh = useCallback(() => {
    Logger.info('Refrescando consultas agrupadas');
    refresh();
  }, [refresh]);


  /**
   * Renderizar header con filtros
   */
  const renderHeader = useCallback(() => {
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Title style={styles.title}>
            Historial de Consultas ({totalCitas})
          </Title>
          {onOpenOptions && (
            <Text style={styles.optionsText} onPress={onOpenOptions}>
              Opciones
            </Text>
          )}
        </View>
        <FiltrosConsultas
          filtroTipo={filtroTipo}
          onFiltroChange={setFiltroTipo}
          busquedaTexto={busquedaTexto}
          onBusquedaChange={setBusquedaTexto}
        />
      </View>
    );
  }, [totalCitas, filtroTipo, busquedaTexto, onOpenOptions]);


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
          {filtroTipo !== 'todas' || busquedaTexto.trim()
            ? 'Intente cambiar los filtros de búsqueda'
            : 'Las consultas aparecerán aquí cuando se registren'}
        </Text>
      </View>
    );
  }, [loading, error, filtroTipo, busquedaTexto]);

  return (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
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
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 0, // Sin elevación dentro del modal
    backgroundColor: 'transparent' // Transparente dentro del modal
  },
  cardContent: {
    padding: 0
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
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
    paddingTop: 8
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

