/**
 * @file MonitoreoContinuoSection.js
 * @description Componente para mostrar signos vitales de monitoreo continuo (sin cita)
 * @author Senior Developer
 * @date 2025-11-17
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Card, Title } from 'react-native-paper';
import useMonitoreoContinuo from '../../hooks/useMonitoreoContinuo';
import Logger from '../../services/logger';
import {
  imcFueraDeRango,
  presionFueraDeRango,
  glucosaFueraDeRango,
  colesterolFueraDeRango,
  trigliceridosFueraDeRango
} from '../../utils/vitalSignsRanges';

/**
 * Componente para mostrar signos vitales de monitoreo continuo
 * 
 * @param {Object} props
 * @param {number|string} props.pacienteId - ID del paciente
 * @param {Function} props.formatearFecha - Función para formatear fechas
 * @param {Function} props.calcularIMC - Función para calcular IMC
 * @param {Function} props.onEditSigno - Función para editar un signo vital
 * @param {Function} props.onDeleteSigno - Función para eliminar un signo vital
 * @param {Function} props.onOpenOptions - Función para abrir opciones
 */
const MonitoreoContinuoSection = ({
  pacienteId,
  formatearFecha,
  calcularIMC,
  onEditSigno,
  onDeleteSigno,
  onOpenOptions,
  onShowDetalle // Callback para abrir modal con el último registro
}) => {
  const {
    monitoreoContinuo,
    loading,
    error,
    refresh,
    total
  } = useMonitoreoContinuo(pacienteId, {
    limit: 1, // Solo mostrar el último registro
    autoFetch: true,
    sort: 'DESC'
  });

  // Log para debugging
  useEffect(() => {
    Logger.debug('MonitoreoContinuoSection: Estado actualizado', {
      pacienteId,
      loading,
      error: error?.message,
      monitoreoContinuoCount: monitoreoContinuo?.length || 0,
      total,
      tieneDatos: monitoreoContinuo && monitoreoContinuo.length > 0,
      primerSigno: monitoreoContinuo?.[0] ? {
        id: monitoreoContinuo[0].id_signo || monitoreoContinuo[0].id,
        fecha: monitoreoContinuo[0].fecha_medicion || monitoreoContinuo[0].fecha_creacion,
        id_cita: monitoreoContinuo[0].id_cita
      } : null
    });
  }, [pacienteId, loading, error, monitoreoContinuo, total]);

  /**
   * Renderizar item de signo vital
   */
  const renderSignoVital = ({ item: signo, index }) => {
    if (!signo) {
      Logger.warn('MonitoreoContinuoSection: renderSignoVital recibió signo null/undefined');
      return null;
    }

    const imcCalculado = signo.imc || calcularIMC(signo.peso_kg, signo.talla_m);
    const fechaMedicion = signo.fecha_medicion || signo.fecha_creacion;
    
    Logger.debug('MonitoreoContinuoSection: Renderizando signo vital', {
      id_signo: signo.id_signo || signo.id,
      fecha_medicion: fechaMedicion,
      id_cita: signo.id_cita,
      tienePeso: !!signo.peso_kg,
      tienePresion: !!(signo.presion_sistolica || signo.presion_diastolica),
      tieneGlucosa: !!signo.glucosa_mg_dl
    });

    return (
      <View style={styles.signoItem}>
        <View style={styles.signoHeader}>
          <Text style={styles.signoFecha} numberOfLines={1} ellipsizeMode="tail">
            📅 {formatearFecha(fechaMedicion)}
          </Text>
          <Text style={styles.signoTipo} numberOfLines={1} ellipsizeMode="tail">
            {signo.registrado_por === 'paciente' ? '👤 Automedición' : '🏥 Registro médico'}
          </Text>
        </View>

        <View style={styles.signoData}>
          {/* Antropométricos */}
          {(signo.peso_kg || signo.talla_m || imcCalculado || signo.medida_cintura_cm) && (
            <View style={styles.signoGroup}>
              <Text style={styles.signoGroupTitle}>📏 Antropométricos:</Text>
              <View style={styles.signoValues}>
                {signo.peso_kg && (
                  <Text style={styles.signoValue}>Peso: {signo.peso_kg} kg</Text>
                )}
                {signo.talla_m && (
                  <Text style={styles.signoValue}>Talla: {signo.talla_m} m</Text>
                )}
                {imcCalculado && (
                  <Text style={[
                    styles.signoValue,
                    imcFueraDeRango(imcCalculado) && styles.signoValueOutOfRange
                  ]}>
                    IMC: {imcCalculado}
                  </Text>
                )}
                {signo.medida_cintura_cm && (
                  <Text style={styles.signoValue}>Cintura: {signo.medida_cintura_cm} cm</Text>
                )}
              </View>
            </View>
          )}

          {/* Presión Arterial */}
          {(signo.presion_sistolica || signo.presion_diastolica) && (
            <View style={styles.signoGroup}>
              <Text style={styles.signoGroupTitle}>🩺 Presión Arterial:</Text>
              <View style={styles.signoValues}>
                <Text style={[
                  styles.signoValue,
                  presionFueraDeRango(signo.presion_sistolica, signo.presion_diastolica) && styles.signoValueOutOfRange
                ]}>
                  {signo.presion_sistolica}/{signo.presion_diastolica} mmHg
                </Text>
              </View>
            </View>
          )}

          {/* Exámenes de Laboratorio */}
          {(signo.glucosa_mg_dl || signo.colesterol_mg_dl || signo.trigliceridos_mg_dl) && (
            <View style={styles.signoGroup}>
              <Text style={styles.signoGroupTitle}>🧪 Exámenes:</Text>
              <View style={styles.signoValues}>
                {signo.glucosa_mg_dl && (
                  <Text style={[
                    styles.signoValue,
                    glucosaFueraDeRango(signo.glucosa_mg_dl) && styles.signoValueOutOfRange
                  ]}>
                    Glucosa: {signo.glucosa_mg_dl} mg/dL
                  </Text>
                )}
                {signo.colesterol_mg_dl && (
                  <Text style={[
                    styles.signoValue,
                    colesterolFueraDeRango(signo.colesterol_mg_dl) && styles.signoValueOutOfRange
                  ]}>
                    Colesterol: {signo.colesterol_mg_dl} mg/dL
                  </Text>
                )}
                {signo.trigliceridos_mg_dl && (
                  <Text style={[
                    styles.signoValue,
                    trigliceridosFueraDeRango(signo.trigliceridos_mg_dl) && styles.signoValueOutOfRange
                  ]}>
                    Triglicéridos: {signo.trigliceridos_mg_dl} mg/dL
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Observaciones */}
          {signo.observaciones && (
            <Text style={styles.observaciones}>
              📝 {signo.observaciones}
            </Text>
          )}
        </View>

        {/* Acciones */}
        {(onEditSigno || onDeleteSigno) && (
          <View style={styles.actions}>
            {onEditSigno && (
              <Text
                style={styles.actionText}
                onPress={() => onEditSigno(signo)}
              >
                ✏️ Editar
              </Text>
            )}
            {onDeleteSigno && (
              <Text
                style={[styles.actionText, styles.actionTextDanger]}
                onPress={() => onDeleteSigno(signo)}
              >
                🗑️ Eliminar
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  /**
   * Renderizar empty state
   */
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.emptyText}>Cargando...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>❌ Error al cargar datos</Text>
          <Text style={styles.errorSubtext}>
            {error.message || 'Error desconocido'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              Logger.info('MonitoreoContinuoSection: Reintentando cargar datos');
              if (refresh) {
                refresh();
              }
            }}
          >
            <Text style={styles.retryButtonText}>🔄 Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          📊 No hay registros de monitoreo continuo
        </Text>
        <Text style={styles.emptySubtext}>
          Los signos vitales registrados fuera de consultas aparecerán aquí
        </Text>
      </View>
    );
  };

  const handleCardPress = () => {
    if (onShowDetalle && monitoreoContinuo && monitoreoContinuo.length > 0) {
      onShowDetalle(monitoreoContinuo[0]);
    }
  };

  return (
    <Card style={styles.card} onPress={handleCardPress} accessible>
      <Card.Content>
        <View style={styles.header}>
          <Title style={styles.title}>
            📊 Monitoreo Continuo
          </Title>
          {onOpenOptions && (
            <Text style={styles.optionsText} onPress={onOpenOptions}>
              Opciones
            </Text>
          )}
        </View>
        <Text style={styles.subtitle}>
          Último registro de signos vitales fuera de consultas
        </Text>

        {loading ? (
          renderEmpty()
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>❌ Error al cargar datos</Text>
            <Text style={styles.errorSubtext}>
              {error.message || 'Error desconocido'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                Logger.info('MonitoreoContinuoSection: Reintentando cargar datos');
                if (refresh) {
                  refresh();
                }
              }}
            >
              <Text style={styles.retryButtonText}>🔄 Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : monitoreoContinuo && monitoreoContinuo.length > 0 ? (
          <View style={styles.signoContainer}>
            {renderSignoVital({ item: monitoreoContinuo[0], index: 0 })}
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
    elevation: 2
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121'
  },
  optionsText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  subtitle: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 16
  },
  signoContainer: {
    marginTop: 8
  },
  signoItem: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  signoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  signoFecha: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    flex: 1, // Permitir que el texto use el espacio disponible
    marginRight: 8, // Espacio entre fecha y tipo
    minWidth: 0 // Permitir que se reduzca si es necesario
  },
  signoTipo: {
    fontSize: 12,
    color: '#757575',
    flexShrink: 1, // Permitir que se reduzca si es necesario
    textAlign: 'right' // Alinear a la derecha
  },
  signoData: {
    marginTop: 4
  },
  signoGroup: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  signoGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 4
  },
  signoValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  signoValue: {
    fontSize: 13,
    color: '#424242',
    marginRight: 16,
    marginBottom: 4,
    lineHeight: 20,
    flexShrink: 1, // Permitir que se ajuste si es necesario
    maxWidth: '100%' // No exceder el ancho del contenedor
  },
  signoValueOutOfRange: {
    color: '#F44336', // Rojo para valores fuera de rango
    fontWeight: '700' // Negrita para mayor visibilidad
  },
  observaciones: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 4,
    flexWrap: 'wrap', // Permitir que el texto se ajuste
    maxWidth: '100%' // No exceder el ancho del contenedor
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 20
  },
  actionText: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '600'
  },
  actionTextDanger: {
    color: '#F44336'
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 4
  },
  errorSubtext: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  }
});

export default React.memo(MonitoreoContinuoSection);

