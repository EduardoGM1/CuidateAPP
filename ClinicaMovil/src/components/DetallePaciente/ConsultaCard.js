/**
 * @file ConsultaCard.js
 * @description Componente para mostrar una consulta con sus signos vitales y diagnósticos asociados
 * @author Senior Developer
 * @date 2025-11-17
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card, Chip } from 'react-native-paper';
import {
  imcFueraDeRango,
  presionFueraDeRango,
  glucosaFueraDeRango,
  colesterolFueraDeRango,
  trigliceridosFueraDeRango
} from '../../utils/vitalSignsRanges';

/**
 * Componente para mostrar una consulta individual con sus datos asociados
 * 
 * @param {Object} props
 * @param {Object} props.consulta - Objeto con cita, signosVitales, diagnosticos, estado
 * @param {Function} props.onPress - Función a ejecutar al presionar la card
 * @param {Function} props.onEdit - Función para editar la consulta
 * @param {Function} props.formatearFecha - Función para formatear fechas
 * @param {Function} props.calcularIMC - Función para calcular IMC
 * @param {Function} props.getEstadoCitaColor - Función para obtener color del estado
 * @param {Function} props.getEstadoCitaTexto - Función para obtener texto del estado
 * @param {boolean} props.showActions - Si se muestran los botones de acción (default: true)
 * @param {boolean} props.compactMode - Si solo se muestran signos vitales, ocultando diagnósticos (default: false)
 */
const ConsultaCard = ({
  consulta,
  onPress,
  onEdit,
  formatearFecha,
  calcularIMC,
  getEstadoCitaColor,
  getEstadoCitaTexto,
  showActions = true,
  compactMode = false
}) => {
  const { cita, signosVitales, diagnosticos, estado } = consulta;

  // Determinar color de borde según estado
  const borderColor = useMemo(() => {
    switch (estado) {
      case 'completa':
        return '#4CAF50'; // Verde
      case 'parcial':
        return '#FF9800'; // Amarillo
      case 'solo_cita':
        return '#9E9E9E'; // Gris
      default:
        return '#E0E0E0';
    }
  }, [estado]);

  // Determinar color de fondo según estado
  const backgroundColor = useMemo(() => {
    switch (estado) {
      case 'completa':
        return '#E8F5E9'; // Verde claro
      case 'parcial':
        return '#FFF3E0'; // Amarillo claro
      case 'solo_cita':
        return '#F5F5F5'; // Gris claro
      default:
        return '#FFFFFF';
    }
  }, [estado]);

  // Determinar icono de estado
  const estadoIcon = useMemo(() => {
    switch (estado) {
      case 'completa':
        return '✅';
      case 'parcial':
        return '⚠️';
      case 'solo_cita':
        return '📋';
      default:
        return '📅';
    }
  }, [estado]);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.cardContainer, { borderColor, backgroundColor }]}
    >
      <Card style={[styles.card, { borderColor }]}>
        <Card.Content style={styles.cardContent}>
          {/* Header de la consulta */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.estadoIcon}>{estadoIcon}</Text>
              <View style={styles.headerText}>
                <Text style={styles.fecha}>
                  📅 {formatearFecha(cita.fecha_cita)}
                </Text>
                {cita.doctor_nombre && (
                  <Text style={styles.doctor}>
                    👨‍⚕️ {cita.doctor_nombre}
                  </Text>
                )}
              </View>
            </View>
            <Chip
              mode="outlined"
              style={[
                styles.statusChip,
                { backgroundColor: getEstadoCitaColor(cita.estado) }
              ]}
              textStyle={styles.statusChipText}
            >
              {getEstadoCitaTexto(cita.estado)}
            </Chip>
          </View>

          {/* Motivo de la consulta */}
          {cita.motivo && (
            <Text style={styles.motivo}>
              📝 {cita.motivo}
            </Text>
          )}

          {/* Indicador de asistencia */}
          {cita.asistencia !== null && cita.asistencia !== undefined && (
            <View style={styles.asistenciaContainer}>
              <Text style={[
                styles.asistencia,
                { color: cita.asistencia ? '#4CAF50' : '#F44336' }
              ]}>
                {cita.asistencia ? '✅ Asistió' : '❌ No asistió'}
              </Text>
            </View>
          )}

          {/* Signos Vitales - Solo se muestran si NO está en modo compacto */}
          {!compactMode && signosVitales && signosVitales.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Signos Vitales:</Text>
              {signosVitales.map((signo, index) => {
                const imcCalculado = signo.imc || calcularIMC(signo.peso_kg, signo.talla_m);
                const fechaMedicion = signo.fecha_medicion || signo.fecha_creacion;

                return (
                  <View key={`signo-${signo.id_signo || index}`} style={styles.signoItem}>
                    {fechaMedicion && (
                      <Text style={styles.signoFecha}>
                        📅 {formatearFecha(fechaMedicion)}
                      </Text>
                    )}
                    
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
                          <Text style={[
                            styles.signoValue,
                            presionFueraDeRango(signo.presion_sistolica, signo.presion_diastolica) && styles.signoValueOutOfRange
                          ]}>
                            {signo.presion_sistolica}/{signo.presion_diastolica} mmHg
                          </Text>
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
                  </View>
                );
              })}
            </View>
          )}

          {/* Diagnósticos - Solo se muestran si NO está en modo compacto */}
          {!compactMode && diagnosticos && diagnosticos.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🩺 Diagnóstico:</Text>
              {diagnosticos.map((diagnostico, index) => (
                <View key={`diagnostico-${diagnostico.id_diagnostico || index}`} style={styles.diagnosticoItem}>
                  <Text style={styles.diagnosticoTexto}>
                    • {diagnostico.descripcion}
                  </Text>
                  {diagnostico.fecha_registro && (
                    <Text style={styles.diagnosticoFecha}>
                      {formatearFecha(diagnostico.fecha_registro)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Mensaje cuando no hay datos médicos - Solo se muestra si NO está en modo compacto */}
          {!compactMode && (!signosVitales || signosVitales.length === 0) && 
           (!diagnosticos || diagnosticos.length === 0) && (
            <View style={styles.noDataSection}>
              <Text style={styles.noDataText}>
                Sin signos vitales registrados{'\n'}
                🩺 Sin diagnósticos registrados
              </Text>
            </View>
          )}

          {/* Observaciones de la cita - Solo se muestran si NO está en modo compacto */}
          {!compactMode && cita.observaciones && (
            <View style={styles.observacionesCita}>
              <Text style={styles.observacionesCitaText}>
                📝 {cita.observaciones}
              </Text>
            </View>
          )}

          {/* Mensaje en modo compacto para indicar que hay más información */}
          {compactMode && (
            <View style={styles.compactModeHint}>
              <Text style={styles.compactModeHintText}>
                👆 Presiona para ver información completa (signos vitales, diagnósticos, observaciones, etc.)
              </Text>
            </View>
          )}

          {/* Acciones */}
          {showActions && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onPress();
                }}
              >
                <Text style={styles.actionButtonText}>Ver Detalles</Text>
              </TouchableOpacity>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                    Editar
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden'
  },
  card: {
    margin: 0,
    elevation: 2,
    borderRadius: 12
  },
  cardContent: {
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8
  },
  estadoIcon: {
    fontSize: 24,
    marginRight: 8
  },
  headerText: {
    flex: 1
  },
  fecha: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4
  },
  doctor: {
    fontSize: 14,
    color: '#616161',
    marginTop: 2
  },
  statusChip: {
    height: 28,
    paddingHorizontal: 8
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600'
  },
  motivo: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 8,
    fontWeight: '500'
  },
  asistenciaContainer: {
    marginBottom: 12
  },
  asistencia: {
    fontSize: 14,
    fontWeight: '600'
  },
  section: {
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8
  },
  signoItem: {
    marginBottom: 12,
    paddingLeft: 8
  },
  signoFecha: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 6,
    fontStyle: 'italic'
  },
  signoData: {
    marginLeft: 8
  },
  signoGroup: {
    marginBottom: 8
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
    color: '#616161',
    marginRight: 12
  },
  signoValueOutOfRange: {
    color: '#F44336', // Rojo para valores fuera de rango
    fontWeight: '700' // Negrita para mayor visibilidad
  },
  signoItemResaltado: {
    backgroundColor: '#FFF3E0', // Fondo naranja claro para resaltar
    borderWidth: 2,
    borderColor: '#FF5722', // Borde naranja
    borderRadius: 8,
    padding: 8,
    marginVertical: 4
  },
  signoFechaResaltado: {
    color: '#FF5722', // Color naranja para fecha resaltada
    fontWeight: '700'
  },
  observaciones: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    marginTop: 4
  },
  diagnosticoItem: {
    marginBottom: 8,
    paddingLeft: 8
  },
  diagnosticoTexto: {
    fontSize: 14,
    color: '#212121',
    lineHeight: 20,
    marginBottom: 4
  },
  diagnosticoFecha: {
    fontSize: 11,
    color: '#757575',
    fontStyle: 'italic'
  },
  noDataSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  noDataText: {
    fontSize: 13,
    color: '#9E9E9E',
    fontStyle: 'italic',
    textAlign: 'center'
  },
  observacionesCita: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0'
  },
  observacionesCitaText: {
    fontSize: 13,
    color: '#616161',
    fontStyle: 'italic'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2196F3',
    borderRadius: 6
  },
  actionButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3'
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  actionButtonTextSecondary: {
    color: '#2196F3'
  },
  compactModeHint: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 6
  },
  compactModeHintText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center'
  }
});

export default React.memo(ConsultaCard);

