import React, { useEffect, useRef } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { COLORES } from '../../../utils/constantes';

/**
 * ModalBase - Componente base reutilizable para todos los modales
 * 
 * Este componente elimina la duplicación masiva de código que existía 
 * con 17 modales inline que compartían estructura similar.
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {string} props.title - Título del modal
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {boolean} props.showCloseButton - Mostrar botón de cerrar (default: true)
 * @param {boolean} props.allowOutsideClick - Permitir cerrar clickeando fuera (default: false para formularios)
 * @param {React.ReactNode} props.children - Contenido del modal
 * @param {string} props.animationType - Tipo de animación (default: 'slide')
 * @param {boolean} props.transparent - Fondo transparente (default: true)
 * @param {string} props.testID - ID para testing
 * 
 * @example
 * <ModalBase 
 *   visible={showModal} 
 *   title="Mi Modal"
 *   onClose={() => setShowModal(false)}
 * >
 *   <Text>Contenido aquí</Text>
 * </ModalBase>
 */
const ModalBase = ({
  visible,
  title,
  onClose,
  showCloseButton = true,
  allowOutsideClick = false,
  children,
  animationType = 'slide',
  transparent = true,
  testID = 'modal-base'
}) => {
  // Validación de props críticas
  if (typeof visible !== 'boolean') {
    console.warn('ModalBase: visible debe ser un boolean');
  }

  if (!onClose || typeof onClose !== 'function') {
    console.warn('ModalBase: onClose debe ser una función');
  }

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

  // Handler seguro para cerrar modal
  const handleRequestClose = () => {
    if (allowOutsideClick && onClose) {
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
    }
  };

  // Handler para overlay click
  const handleOverlayPress = () => {
    if (allowOutsideClick && onClose) {
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
    }
  };

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
    outputRange: [600, 0], // Se mueve desde 600px abajo hasta su posición
  });

  const overlayOpacity = opacityAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={transparent}
      onRequestClose={handleRequestClose}
      testID={testID}
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
          onPress={allowOutsideClick ? handleOverlayPress : undefined}
        />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={styles.modalTouchable}
          >
            <Animated.View 
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              {/* Header del Modal */}
              <View style={styles.modalHeader}>
                {title && <Text style={styles.modalTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>}
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={handleClose}
                    style={[styles.closeButton, styles.closeButtonShrink]}
                    testID={`${testID}-close-button`}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar modal"
                  >
                    <View style={styles.closeButtonInner}>
                      <Text style={styles.closeButtonText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* Contenido del Modal */}
              <View style={styles.modalBody}>
                {children}
              </View>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
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
  keyboardView: {
    width: '100%',
    flex: 1,
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
    width: '100%',
    maxHeight: '90%',
    flex: 1,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
    minHeight: 56,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: COLORES.NAV_PRIMARIO,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  closeButtonShrink: {
    flexShrink: 0,
  },
  closeButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORES.FONDO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  modalBody: {
    width: '100%',
    flex: 1,
  },
});

export default ModalBase;

