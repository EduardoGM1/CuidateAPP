import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { Title } from 'react-native-paper';
import { COLORES } from '../../../utils/constantes';

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

  // Dos opciones exactas (Editar + Eliminar) → botones horizontales; más de 2 → vertical
  const isEditarEliminar =
    options.length === 2 &&
    options[0]?.label === 'Editar' &&
    options[1]?.label === 'Eliminar';
  const showVertical = options.length > 2;

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
            
            <View style={[styles.optionsContainer, showVertical && styles.optionsContainerVertical]}>
              {isEditarEliminar ? (
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.actionButtonEditar}
                    onPress={() => {
                      if (options[0].onPress) options[0].onPress();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionButtonIcon}>✏️</Text>
                    <Text style={styles.actionButtonText}>{options[0].label}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButtonEliminar}
                    onPress={() => {
                      if (options[1].onPress) options[1].onPress();
                      handleClose();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionButtonIcon}>🗑️</Text>
                    <Text style={styles.actionButtonText}>{options[1].label}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                options.map((option, index) => {
                  const hasActionColor = !!option.color;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        hasActionColor && styles.optionButtonWithColor,
                        hasActionColor && { backgroundColor: option.color },
                        option.style
                      ]}
                      onPress={() => {
                        if (option.onPress) {
                          option.onPress();
                        }
                        handleClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionText,
                        hasActionColor && styles.optionTextOnColor,
                        !hasActionColor && option.color && { color: option.color },
                        option.textStyle
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
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
    backgroundColor: COLORES.FONDO_OVERLAY,
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
    backgroundColor: COLORES.FONDO_CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    width: '100%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: COLORES.NEGRO,
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
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  closeButtonX: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_SECUNDARIO,
    paddingHorizontal: 8,
  },
  optionsContainer: {
    // Sin padding adicional, el padding ya está en modalContent
  },
  optionsContainerVertical: {
    flexDirection: 'column',
    gap: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  actionButtonEditar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.NAV_PRIMARIO,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonEliminar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORES.ERROR_LIGHT,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: COLORES.FONDO,
    minHeight: 48,
  },
  optionButtonWithColor: {
    // Mismo tamaño que Editar/Eliminar; el color lo define la opción
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
    textAlign: 'center',
  },
  optionTextOnColor: {
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
});

export default OptionsModal;

