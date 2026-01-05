import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { IconButton, Title } from 'react-native-paper';

/**
 * OptionsModal - Modal reutilizable para mostrar opciones de acciones
 * 
 * Elimina la duplicación de código en modales de opciones (3 puntos)
 * Usa tamaño original (centrado, más pequeño) diferente a los modales de formularios
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Controla la visibilidad
 * @param {Function} props.onClose - Función para cerrar
 * @param {string} props.title - Título del modal
 * @param {Array} props.options - Array de opciones { icon, label, onPress, color }
 * 
 * @example
 * <OptionsModal
 *   visible={showOptions}
 *   onClose={() => setShowOptions(false)}
 *   title="Opciones de Citas"
 *   options={[
 *     { icon: 'plus', label: 'Agregar Cita', onPress: handleAdd, color: '#2196F3' },
 *     { icon: 'magnify', label: 'Ver Todas', onPress: handleViewAll, color: '#666' }
 *   ]}
 * />
 */
const OptionsModal = ({
  visible,
  onClose,
  title = 'Opciones',
  options = []
}) => {
  // Animación para el contenido del modal y el overlay
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animar overlay y contenido al mismo tiempo
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    } else {
      // Resetear animaciones cuando se cierra
      slideAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, slideAnim, opacityAnim]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0], // Se mueve desde 400px abajo hasta su posición
  });

  const overlayOpacity = opacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.modalOverlay,
          { opacity: overlayOpacity }
        ]}
      >
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalTouchable} onStartShouldSetResponder={() => true}>
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ translateY }],
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>{title}</Title>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.optionsContainer}>
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionButton, option.style]}
                  onPress={() => {
                    if (option.onPress) {
                      option.onPress();
                    }
                    handleClose();
                  }}
                  activeOpacity={0.7}
                >
                  {option.icon && (
                    <IconButton
                      icon={option.icon}
                      size={18}
                      iconColor={option.color || '#2196F3'}
                      style={styles.optionIcon}
                    />
                  )}
                  <Text style={[styles.optionText, option.textStyle]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalTouchable: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    width: '100%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButtonX: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    paddingHorizontal: 8,
  },
  optionsContainer: {
    // Sin padding adicional, el padding ya está en modalContent
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
  },
  optionIcon: {
    margin: 0,
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});

export default OptionsModal;

