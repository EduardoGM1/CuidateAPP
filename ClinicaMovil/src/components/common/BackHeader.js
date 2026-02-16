/**
 * Cabecera reutilizable con botón "← Atrás" para volver a la pantalla anterior.
 * Uso en todas las pantallas que no son raíz (doctores, administradores y pacientes).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORES } from '../../utils/constantes';
import hapticService from '../../services/hapticService';

/**
 * @param {Object} props
 * @param {import('@react-navigation/native').NavigationProp} props.navigation - Instancia de navegación (opcional si se usa useNavigation internamente)
 * @param {string} [props.title] - Título opcional a la derecha del botón
 * @param {'professional'|'patient'} [props.variant='professional'] - professional: verde NAV_PRIMARIO; patient: verde NAV_PACIENTE
 * @param {Function} [props.onBack] - Callback al pulsar atrás (por defecto navigation.goBack())
 * @param {React.ReactNode} [props.rightElement] - Nodo opcional a la derecha (ej. botón de audio)
 * @param {boolean} [props.showLabel=true] - Si true muestra "← Atrás", si false solo "←"
 */
const BackHeader = ({
  navigation: navigationProp,
  title = '',
  variant = 'professional',
  onBack,
  rightElement = null,
  showLabel = true,
}) => {
  const nav = useNavigation();
  const navigation = navigationProp || nav;

  const tintColor = variant === 'patient' ? COLORES.NAV_PACIENTE : COLORES.NAV_PRIMARIO;

  const handleBack = () => {
    hapticService?.light?.();
    if (onBack) {
      onBack();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.container, { borderBottomColor: COLORES.BORDE_CLARO }]}>
      <TouchableOpacity
        style={styles.backTouchable}
        onPress={handleBack}
        activeOpacity={0.7}
        accessibilityLabel={showLabel ? 'Atrás' : 'Volver'}
        accessibilityRole="button"
      >
        <Text style={[styles.backText, { color: tintColor }]}>
          {showLabel ? '← Atrás' : '←'}
        </Text>
      </TouchableOpacity>
      {title ? (
        <Text style={[styles.title, { color: COLORES.TEXTO_PRIMARIO }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titlePlaceholder} />
      )}
      {rightElement ? (
        <View style={styles.right}>{rightElement}</View>
      ) : (
        <View style={styles.rightPlaceholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  backTouchable: {
    paddingVertical: 8,
    paddingRight: 12,
    minWidth: 80,
  },
  backText: {
    fontSize: 18,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  titlePlaceholder: {
    flex: 1,
    minWidth: 80,
  },
  right: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  rightPlaceholder: {
    minWidth: 80,
  },
});

export default BackHeader;
