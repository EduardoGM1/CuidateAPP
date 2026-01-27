/**
 * @file HistorialConsultasModal.js
 * @description Modal para mostrar el historial completo de consultas con timeline
 * @author Senior Developer
 * @date 2025-11-17
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import ModalBase from './shared/ModalBase';
import ConsultasTimeline from './ConsultasTimeline';

/**
 * Modal para mostrar el historial completo de consultas
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {number|string} props.pacienteId - ID del paciente
 * @param {Function} props.onPressConsulta - Función al presionar una consulta
 * @param {Function} props.onEditConsulta - Función para editar una consulta
 * @param {Function} props.formatearFecha - Función para formatear fechas
 * @param {Function} props.calcularIMC - Función para calcular IMC
 * @param {Function} props.getEstadoCitaColor - Función para obtener color del estado
 * @param {Function} props.getEstadoCitaTexto - Función para obtener texto del estado
 */
const HistorialConsultasModal = ({
  visible,
  onClose,
  pacienteId,
  onPressConsulta,
  onEditConsulta,
  formatearFecha,
  calcularIMC,
  getEstadoCitaColor,
  getEstadoCitaTexto
}) => {
  return (
    <ModalBase
      visible={visible}
      title="📋 Historial Completo de Consultas"
      onClose={onClose}
      animationType="slide"
      allowOutsideClick={true}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.timelineContainer}>
          <ConsultasTimeline
            pacienteId={pacienteId}
            onPressConsulta={onPressConsulta}
            onEditConsulta={onEditConsulta}
            formatearFecha={formatearFecha}
            calcularIMC={calcularIMC}
            getEstadoCitaColor={getEstadoCitaColor}
            getEstadoCitaTexto={getEstadoCitaTexto}
            onOpenOptions={null} // No mostrar opciones dentro del modal
          />
        </View>
      </ScrollView>
    </ModalBase>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%'
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    width: '100%'
  },
  timelineContainer: {
    width: '100%',
    flex: 1
  }
});

export default React.memo(HistorialConsultasModal);

