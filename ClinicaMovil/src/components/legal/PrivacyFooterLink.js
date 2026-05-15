import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORES } from '../../utils/constantes';

/**
 * Enlace al aviso de privacidad (pantallas de auth).
 */
export default function PrivacyFooterLink({ navigation, label = 'Aviso de Privacidad' }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('AvisoPrivacidad')}
      style={styles.wrap}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Text style={styles.text}>🔒 {label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 12, alignItems: 'center' },
  text: {
    color: COLORES.PRIMARIO,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
