/**
 * Componente: Botón de Debug para Modo Offline
 * 
 * Solo visible en modo desarrollo (__DEV__)
 * Permite ver el estado de la cola offline
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import offlineService from '../../services/offlineService';
import useOffline from '../../hooks/useOffline';

const OfflineDebugButton = () => {
  const { isOnline, queueStatus } = useOffline();
  const [loading, setLoading] = useState(false);

  // Solo mostrar en desarrollo
  if (!__DEV__) {
    return null;
  }

  const handleDebug = async () => {
    setLoading(true);
    try {
      const queue = await offlineService.getQueue();
      const status = offlineService.getQueueStatus();
      
      const queueDetails = queue.length > 0 
        ? queue.map((item, index) => 
            `${index + 1}. ${item.resource} (${item.operation}) - ${item.status}\n   ID: ${item.id}\n   Timestamp: ${new Date(item.timestamp).toLocaleString('es-ES')}`
          ).join('\n\n')
        : 'No hay operaciones en la cola';

      Alert.alert(
        '🔍 Debug: Cola Offline',
        `Estado de Conexión: ${isOnline ? '✅ Online' : '❌ Offline'}\n\n` +
        `Estado de la Cola:\n` +
        `• Total: ${status.total}\n` +
        `• Pendientes: ${status.pending}\n` +
        `• Completadas: ${status.completed}\n` +
        `• Fallidas: ${status.failed}\n` +
        `• Sincronizando: ${status.syncing ? 'Sí' : 'No'}\n\n` +
        `Operaciones en Cola:\n${queueDetails}`,
        [
          { text: 'Ver JSON', onPress: () => {
            Alert.alert(
              'JSON de la Cola',
              JSON.stringify(queue, null, 2).substring(0, 2000),
              [{ text: 'OK' }]
            );
          }},
          { text: 'Limpiar Cola', style: 'destructive', onPress: async () => {
            Alert.alert(
              '¿Limpiar cola?',
              'Esto eliminará todas las operaciones pendientes. ¿Continuar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Limpiar', style: 'destructive', onPress: async () => {
                  await offlineService.clearQueue();
                  Alert.alert('✅', 'Cola limpiada');
                }}
              ]
            );
          }},
          { text: 'Cerrar', style: 'cancel' }
        ],
        { cancelable: true }
      );
    } catch (error) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, !isOnline && styles.buttonOffline]}
      onPress={handleDebug}
      disabled={loading}
    >
      <Text style={styles.buttonText}>
        {loading ? '⏳' : '🔍'} Debug Offline
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
  },
  buttonOffline: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default OfflineDebugButton;



