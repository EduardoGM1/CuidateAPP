import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

/**
 * Componente selector de rango de meses
 * Permite seleccionar mes inicial, mes final y año
 */
const RangoMesesSelector = ({
  label = 'Rango de Meses',
  mesInicio,
  mesFin,
  año,
  onMesInicioChange,
  onMesFinChange,
  onAñoChange,
  error = null,
  style = {},
  labelStyle = {},
  errorStyle = {},
}) => {
  const [showMesInicioModal, setShowMesInicioModal] = useState(false);
  const [showMesFinModal, setShowMesFinModal] = useState(false);
  const [showAñoModal, setShowAñoModal] = useState(false);

  // Generar años (año actual y 2 años anteriores)
  const añosDisponibles = React.useMemo(() => {
    const añoActual = new Date().getFullYear();
    return [añoActual, añoActual - 1, añoActual - 2];
  }, []);

  const mesInicioLabel = mesInicio ? MESES.find(m => m.value === mesInicio)?.label : 'Seleccionar';
  const mesFinLabel = mesFin ? MESES.find(m => m.value === mesFin)?.label : 'Seleccionar';
  const añoLabel = año ? año.toString() : 'Seleccionar';

  // Validar que mes final >= mes inicial
  const isValid = !mesInicio || !mesFin || mesFin >= mesInicio;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
        </Text>
      )}

      <View style={styles.selectorsRow}>
        {/* Selector Mes Inicial */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorSubLabel}>Mes Inicial</Text>
          <TouchableOpacity
            style={[
              styles.selector,
              error && styles.selectorError,
              !isValid && styles.selectorError,
            ]}
            onPress={() => setShowMesInicioModal(true)}
          >
            <Text style={[
              styles.selectorText,
              !mesInicio && styles.selectorPlaceholder,
            ]}>
              {mesInicioLabel}
            </Text>
            <Text style={styles.selectorIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Selector Mes Final */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorSubLabel}>Mes Final</Text>
          <TouchableOpacity
            style={[
              styles.selector,
              error && styles.selectorError,
              !isValid && styles.selectorError,
            ]}
            onPress={() => setShowMesFinModal(true)}
          >
            <Text style={[
              styles.selectorText,
              !mesFin && styles.selectorPlaceholder,
            ]}>
              {mesFinLabel}
            </Text>
            <Text style={styles.selectorIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Selector Año */}
        <View style={styles.selectorContainer}>
          <Text style={styles.selectorSubLabel}>Año</Text>
          <TouchableOpacity
            style={[
              styles.selector,
              error && styles.selectorError,
            ]}
            onPress={() => setShowAñoModal(true)}
          >
            <Text style={[
              styles.selectorText,
              !año && styles.selectorPlaceholder,
            ]}>
              {añoLabel}
            </Text>
            <Text style={styles.selectorIcon}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(!isValid || error) && (
        <Text style={[styles.errorText, errorStyle]}>
          {error || 'El mes final debe ser mayor o igual al mes inicial'}
        </Text>
      )}

      {/* Modal Mes Inicial */}
      <Modal
        visible={showMesInicioModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMesInicioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Mes Inicial</Text>
              <TouchableOpacity
                onPress={() => setShowMesInicioModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {MESES.map((mes) => (
                <TouchableOpacity
                  key={mes.value}
                  style={[
                    styles.modalOption,
                    mesInicio === mes.value && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    onMesInicioChange(mes.value);
                    setShowMesInicioModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    mesInicio === mes.value && styles.modalOptionTextSelected,
                  ]}>
                    {mes.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Mes Final */}
      <Modal
        visible={showMesFinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMesFinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Mes Final</Text>
              <TouchableOpacity
                onPress={() => setShowMesFinModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {MESES.map((mes) => {
                // Filtrar meses que sean menores al mes inicial si está seleccionado
                const isDisabled = mesInicio && mes.value < mesInicio;
                return (
                  <TouchableOpacity
                    key={mes.value}
                    style={[
                      styles.modalOption,
                      mesFin === mes.value && styles.modalOptionSelected,
                      isDisabled && styles.modalOptionDisabled,
                    ]}
                    onPress={() => {
                      if (!isDisabled) {
                        onMesFinChange(mes.value);
                        setShowMesFinModal(false);
                      }
                    }}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      mesFin === mes.value && styles.modalOptionTextSelected,
                      isDisabled && styles.modalOptionTextDisabled,
                    ]}>
                      {mes.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Año */}
      <Modal
        visible={showAñoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAñoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Año</Text>
              <TouchableOpacity
                onPress={() => setShowAñoModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {añosDisponibles.map((añoOption) => (
                <TouchableOpacity
                  key={añoOption}
                  style={[
                    styles.modalOption,
                    año === añoOption && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    onAñoChange(añoOption);
                    setShowAñoModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    año === añoOption && styles.modalOptionTextSelected,
                  ]}>
                    {añoOption}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selectorsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorContainer: {
    flex: 1,
  },
  selectorSubLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  selectorError: {
    borderColor: '#f44336',
  },
  selectorText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  selectorPlaceholder: {
    color: '#999',
  },
  selectorIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  modalOptionDisabled: {
    opacity: 0.4,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  modalOptionTextDisabled: {
    color: '#999',
  },
});

export default RangoMesesSelector;

