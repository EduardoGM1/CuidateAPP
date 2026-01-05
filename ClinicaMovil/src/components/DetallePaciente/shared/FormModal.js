import React from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Title } from 'react-native-paper';
import ModalBase from './ModalBase';

/**
 * FormModal - Modal reutilizable para formularios
 * 
 * Elimina duplicación en modales de formularios (agregar/editar)
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Controla la visibilidad
 * @param {Function} props.onClose - Función para cerrar
 * @param {string} props.title - Título del modal
 * @param {React.ReactNode} props.children - Contenido del formulario
 * @param {Function} props.onSave - Función al guardar
 * @param {boolean} props.saving - Estado de guardado
 * @param {boolean} props.disabled - Deshabilitar botón de guardar
 * @param {string} props.saveLabel - Texto del botón guardar
 * @param {string} props.cancelLabel - Texto del botón cancelar
 * @param {string} props.saveButtonColor - Color del botón guardar
 * 
 * @example
 * <FormModal
 *   visible={showForm}
 *   onClose={() => setShowForm(false)}
 *   title="Agregar Cita"
 *   onSave={handleSave}
 *   saving={saving}
 * >
 *   <TextInput ... />
 * </FormModal>
 */
const FormModal = ({
  visible,
  onClose,
  title,
  children,
  onSave,
  saving = false,
  disabled = false,
  saveLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  saveButtonColor = '#2196F3',
  showSaveButton = true,
  showCancelButton = true
}) => {
  return (
    <ModalBase
      visible={visible}
      title={title}
      onClose={onClose}
      animationType="slide"
      allowOutsideClick={false}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {children}

        <View style={styles.buttonsContainer}>
          {showSaveButton && (
            <Button
              mode="contained"
              onPress={onSave}
              loading={saving}
              disabled={saving || disabled}
              buttonColor={saveButtonColor}
              style={styles.saveButton}
            >
              {saveLabel}
            </Button>
          )}
          {showCancelButton && (
            <Button
              mode="outlined"
              onPress={onClose}
              disabled={saving}
              style={styles.cancelButton}
            >
              {cancelLabel}
            </Button>
          )}
        </View>
      </ScrollView>
    </ModalBase>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  buttonsContainer: {
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  saveButton: {
    marginBottom: 8,
  },
  cancelButton: {
    // Estilos adicionales si es necesario
  },
});

export default FormModal;
