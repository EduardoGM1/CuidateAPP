/**
 * @file DetalleCitaModal.js
 * @description Componente reutilizable para mostrar el detalle completo de una cita
 * @author Senior Developer
 * @date 2026-01-23
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { Title, Chip } from 'react-native-paper';
import { formatDateTime } from '../../utils/dateUtils';
import { ESTADOS_CITA } from '../../utils/constantes';

/**
 * Calcula el IMC a partir de peso y talla
 */
const calcularIMC = (pesoKg, tallaM) => {
  if (!pesoKg || !tallaM || tallaM === 0) return null;
  const imc = pesoKg / (tallaM * tallaM);
  return parseFloat(imc.toFixed(1));
};

/**
 * Obtiene el color del estado de la cita
 */
const getEstadoCitaColor = (estado) => {
  switch (estado) {
    case ESTADOS_CITA.ATENDIDA:
      return '#4CAF50';
    case ESTADOS_CITA.PENDIENTE:
      return '#FF9800';
    case ESTADOS_CITA.NO_ASISTIDA:
      return '#F44336';
    case ESTADOS_CITA.REPROGRAMADA:
      return '#2196F3';
    case ESTADOS_CITA.CANCELADA:
      return '#9E9E9E';
    default:
      return '#9E9E9E';
  }
};

/**
 * Obtiene el texto del estado de la cita
 */
const getEstadoCitaTexto = (estado) => {
  switch (estado) {
    case ESTADOS_CITA.ATENDIDA:
      return 'Atendida';
    case ESTADOS_CITA.PENDIENTE:
      return 'Pendiente';
    case ESTADOS_CITA.NO_ASISTIDA:
      return 'No Asistida';
    case ESTADOS_CITA.REPROGRAMADA:
      return 'Reprogramada';
    case ESTADOS_CITA.CANCELADA:
      return 'Cancelada';
    default:
      return estado || 'Sin estado';
  }
};

/**
 * Componente modal para mostrar el detalle completo de una cita
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Object} props.citaDetalle - Objeto con los datos completos de la cita
 * @param {boolean} props.loading - Indica si se está cargando el detalle
 * @param {string} props.userRole - Rol del usuario actual (para mostrar/ocultar acciones)
 * @param {Function} props.onEditCita - Función para editar la cita (opcional)
 * @param {Function} props.onCancelCita - Función para cancelar la cita (opcional)
 * @param {Function} props.onDeleteCita - Función para eliminar la cita (opcional)
 * @param {Function} props.formatearFecha - Función personalizada para formatear fechas (opcional, usa formatDateTime por defecto)
 */
const DetalleCitaModal = ({
  visible,
  onClose,
  citaDetalle,
  loading = false,
  userRole = 'Admin',
  onEditCita,
  onCancelCita,
  onDeleteCita,
  formatearFecha = formatDateTime,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Title style={styles.modalTitle}>Detalle de Cita</Title>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButtonX}>X</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6200ee" />
              <Text style={styles.loadingText}>Cargando detalle...</Text>
            </View>
          ) : citaDetalle ? (
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* Información General de la Cita */}
              <View style={styles.modalListItem}>
                <View style={styles.modalListItemHeader}>
                  <Text style={styles.modalListItemTitle}>
                    {formatearFecha(citaDetalle.fecha_cita)}
                  </Text>
                  <Chip 
                    mode="outlined" 
                    style={[
                      styles.statusChip,
                      { backgroundColor: getEstadoCitaColor(citaDetalle.estado) }
                    ]}
                    textStyle={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}
                  >
                    {getEstadoCitaTexto(citaDetalle.estado)}
                  </Chip>
                </View>
                
                {citaDetalle.Doctor && (
                  <Text style={styles.modalListItemSubtitle}>
                    Dr. {citaDetalle.Doctor.nombre} {citaDetalle.Doctor.apellido_paterno || ''}
                  </Text>
                )}
                
                {citaDetalle.motivo && (
                  <Text style={styles.modalListItemDescription}>
                    <Text style={{ fontWeight: '600' }}>Motivo:</Text> {citaDetalle.motivo}
                  </Text>
                )}
                
                {citaDetalle.observaciones && (
                  <Text style={styles.modalListItemDescription}>
                    <Text style={{ fontWeight: '600' }}>Observaciones:</Text> {citaDetalle.observaciones}
                  </Text>
                )}
                
                {citaDetalle.es_primera_consulta && (
                  <Chip 
                    mode="flat" 
                    style={styles.firstConsultChip}
                    textStyle={styles.firstConsultChipText}
                  >
                    Primera Consulta
                  </Chip>
                )}
              </View>

              {/* Signos Vitales en esta cita */}
              <View style={{ paddingHorizontal: 8, paddingTop: 16 }}>
                <Title style={styles.sectionTitle}>Signos Vitales en esta cita</Title>
                {Array.isArray(citaDetalle.SignosVitales) && citaDetalle.SignosVitales.length > 0 ? (
                  citaDetalle.SignosVitales.map((signo, idx) => {
                    const fechaMedicion = signo.fecha_medicion || signo.fecha_creacion;
                    const imcCalculado = signo.imc || calcularIMC(signo.peso_kg, signo.talla_m);

                    return (
                      <View key={`signo-detalle-${signo.id_signo || idx}`} style={styles.modalListItem}>
                        <Text style={styles.modalListItemSubtitle}>
                          📅 {formatearFecha(fechaMedicion)}
                        </Text>
                        
                        {(signo.peso_kg || signo.talla_m || imcCalculado || signo.medida_cintura_cm) && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={[styles.modalListItemDescription, { fontWeight: '600', marginBottom: 4 }]}>📏 Antropométricos</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {signo.peso_kg && (
                                <Text style={styles.modalListItemDescription}>Peso: {signo.peso_kg} kg</Text>
                              )}
                              {signo.talla_m && (
                                <Text style={styles.modalListItemDescription}>Talla: {signo.talla_m} m</Text>
                              )}
                              {imcCalculado && (
                                <Text style={styles.modalListItemDescription}>IMC: {imcCalculado}</Text>
                              )}
                              {signo.medida_cintura_cm && (
                                <Text style={styles.modalListItemDescription}>Cintura: {signo.medida_cintura_cm} cm</Text>
                              )}
                            </View>
                          </View>
                        )}
                        
                        {(signo.presion_sistolica || signo.presion_diastolica) && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={[styles.modalListItemDescription, { fontWeight: '600' }]}>
                              Presión: {signo.presion_sistolica}/{signo.presion_diastolica} mmHg
                            </Text>
                          </View>
                        )}
                        
                        {(signo.glucosa_mg_dl || signo.colesterol_mg_dl || signo.trigliceridos_mg_dl) && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={[styles.modalListItemDescription, { fontWeight: '600', marginBottom: 4 }]}>🧪 Exámenes de Laboratorio</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {signo.glucosa_mg_dl && (
                                <Text style={styles.modalListItemDescription}>
                                  🩸 Glucosa: {signo.glucosa_mg_dl} mg/dL
                                </Text>
                              )}
                              {signo.colesterol_mg_dl && (
                                <Text style={styles.modalListItemDescription}>
                                  🧪 Colesterol Total: {signo.colesterol_mg_dl} mg/dL
                                  {signo.colesterol_ldl && `\n🧪 Colesterol LDL: ${signo.colesterol_ldl} mg/dL`}
                                  {signo.colesterol_hdl && `\n🧪 Colesterol HDL: ${signo.colesterol_hdl} mg/dL`}
                                </Text>
                              )}
                              {signo.trigliceridos_mg_dl && (
                                <Text style={styles.modalListItemDescription}>
                                  🧪 Triglicéridos: {signo.trigliceridos_mg_dl} mg/dL
                                </Text>
                              )}
                            </View>
                          </View>
                        )}
                        
                        {signo.observaciones && (
                          <Text style={styles.modalListItemDescription}>
                            {signo.observaciones}
                          </Text>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noDataText}>No hay signos vitales registrados en esta cita</Text>
                )}
              </View>

              {/* Diagnósticos de la cita */}
              <View style={{ paddingHorizontal: 8, paddingTop: 16 }}>
                <Title style={styles.sectionTitle}>Diagnóstico(s) de la cita</Title>
                {Array.isArray(citaDetalle.Diagnosticos) && citaDetalle.Diagnosticos.length > 0 ? (
                  citaDetalle.Diagnosticos.map((dx, idx) => (
                    <View key={`diag-detalle-${dx.id_diagnostico || idx}`} style={styles.modalListItem}>
                      <Text style={styles.modalListItemSubtitle}>
                        📅 {dx.fecha_registro ? formatearFecha(dx.fecha_registro) : 'Fecha no disponible'}
                      </Text>
                      <Text style={styles.modalListItemDescription}>
                        {dx.descripcion || 'Sin descripción'}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay diagnóstico registrado en esta cita</Text>
                )}
              </View>

              {/* Botones de acción para la cita */}
              {(onEditCita || onCancelCita || onDeleteCita) && (
                <View style={{ paddingHorizontal: 8, paddingTop: 24, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0', marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {onEditCita && (
                      <TouchableOpacity
                        style={{ flex: 1, minWidth: '45%', backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => {
                          onClose();
                          onEditCita(citaDetalle);
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>✏️ Editar Cita</Text>
                      </TouchableOpacity>
                    )}
                    {onCancelCita && citaDetalle.estado !== 'cancelada' && citaDetalle.estado !== 'atendida' && (
                      <TouchableOpacity
                        style={{ flex: 1, minWidth: '45%', backgroundColor: '#FF9800', padding: 12, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => {
                          onClose();
                          onCancelCita(citaDetalle);
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>❌ Cancelar</Text>
                      </TouchableOpacity>
                    )}
                    {onDeleteCita && (userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                      userRole === 'Doctor' || userRole === 'doctor') && (
                      <TouchableOpacity
                        style={{ flex: 1, minWidth: '45%', backgroundColor: '#f44336', padding: 12, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => {
                          onClose();
                          onDeleteCita(citaDetalle);
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>🗑️ Eliminar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={styles.noDataText}>No se encontró el detalle de la cita</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
    height: SCREEN_HEIGHT * 0.85,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexShrink: 0,
    minHeight: 60,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButtonX: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  modalListItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  modalListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalListItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  modalListItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalListItemDescription: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
    lineHeight: 20,
  },
  statusChip: {
    height: 28,
    justifyContent: 'center',
  },
  firstConsultChip: {
    marginTop: 8,
    backgroundColor: '#e3f2fd',
  },
  firstConsultChipText: {
    color: '#1976d2',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
  },
});

export default DetalleCitaModal;
