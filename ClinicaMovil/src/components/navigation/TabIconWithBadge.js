/**
 * Componente: TabIconWithBadge
 * 
 * Muestra un icono de tab con un badge opcional para notificaciones
 * Usado en el menú inferior de navegación
 * Design System: colores desde COLORES (utils/constantes)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORES } from '../../utils/constantes';

/**
 * TabIconWithBadge
 * @param {string} icon - Emoji o texto del icono
 * @param {number} badgeCount - Número de notificaciones (0 = no mostrar badge)
 * @param {boolean} focused - Si el tab está activo
 */
const TabIconWithBadge = ({ icon, badgeCount = 0, focused = false }) => {
  const tieneBadge = badgeCount > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      {tieneBadge && (
        <View style={styles.badgeContainer}>
          {badgeCount > 9 ? (
            <View style={styles.badgeNumber}>
              <Text style={styles.badgeText}>9+</Text>
            </View>
          ) : (
            <View style={styles.badgeNumber}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORES.ERROR_LIGHT,
    borderWidth: 1.5,
    borderColor: COLORES.NAV_PRIMARIO,
  },
  badgeNumber: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORES.ERROR_LIGHT,
    borderWidth: 1.5,
    borderColor: COLORES.NAV_PRIMARIO,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default TabIconWithBadge;

