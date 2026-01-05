/**
 * Componente: TabIconWithBadge
 * 
 * Muestra un icono de tab con un badge opcional para notificaciones
 * Usado en el menú inferior de navegación
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    backgroundColor: '#F44336',
    borderWidth: 1.5,
    borderColor: '#1976D2', // Color del fondo del tab bar
  },
  badgeNumber: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F44336',
    borderWidth: 1.5,
    borderColor: '#1976D2', // Color del fondo del tab bar
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default TabIconWithBadge;

