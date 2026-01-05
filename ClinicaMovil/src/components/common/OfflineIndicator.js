/**
 * Componente: Indicador de Estado Offline
 * 
 * Muestra un banner cuando no hay conexión a internet
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import useOffline from '../../hooks/useOffline';

const OfflineIndicator = () => {
  const { isOnline, queueStatus } = useOffline();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📱</Text>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Sin conexión</Text>
        {queueStatus.pending > 0 && (
          <Text style={styles.subtitle}>
            {queueStatus.pending} operación{queueStatus.pending > 1 ? 'es' : ''} pendiente{queueStatus.pending > 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F57C00',
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.9,
  },
});

export default OfflineIndicator;



