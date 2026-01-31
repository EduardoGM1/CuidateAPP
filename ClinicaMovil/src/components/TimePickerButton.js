import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Selector solo de hora (HH:mm).
 * Valor en formato "HH:mm" (ej. "08:00"). Compatible con backend y validación existente.
 */
const TimePickerButton = ({
  value = '',
  onChangeText,
  placeholder = 'Seleccionar hora',
  editable = true,
  style,
  ...props
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(null);

  useEffect(() => {
    if (value && typeof value === 'string') {
      const match = value.trim().match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
      if (match) {
        const d = new Date();
        d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
        setSelectedTime(d);
      } else {
        setSelectedTime(null);
      }
    } else {
      setSelectedTime(null);
    }
  }, [value]);

  const formatTimeToHHmm = (date) => {
    if (!date) return '';
    const h = date.getHours();
    const m = date.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleTimeChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (date) {
      setSelectedTime(date);
      onChangeText(formatTimeToHHmm(date));
    }
  };

  const displayValue = selectedTime ? formatTimeToHHmm(selectedTime) : placeholder;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.button, !editable && styles.buttonDisabled]}
        onPress={() => editable && setShowPicker(true)}
        disabled={!editable}
      >
        <Text style={[styles.text, !selectedTime && styles.placeholder]}>{displayValue}</Text>
      </TouchableOpacity>
      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal visible={showPicker} transparent animationType="slide">
            <TouchableOpacity style={styles.overlay} onPress={() => setShowPicker(false)} />
            <View style={styles.iosFooter}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <DateTimePicker
                value={selectedTime || new Date()}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                locale="es-ES"
              />
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.okText}>OK</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedTime || new Date()}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  button: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  iosFooter: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  cancelText: { fontSize: 16, color: '#666', paddingVertical: 12 },
  okText: { fontSize: 16, color: '#2196F3', fontWeight: '600', paddingVertical: 12 },
});

export default TimePickerButton;
