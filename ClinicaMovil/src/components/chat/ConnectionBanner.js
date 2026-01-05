/**
 * Componente: Banner de Estado de Conexión
 * 
 * Muestra el estado de conexión y mensajes pendientes
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Logger from '../../services/logger';

const ConnectionBanner = ({ pendingMessages = 0, onRetry }) => {
  const [isConnected, setIsConnected] = React.useState(true);
  const [connectionType, setConnectionType] = React.useState('unknown');

  React.useEffect(() => {
    // Verificar estado inicial
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected && state.isInternetReachable);
      setConnectionType(state.type);
    });

    // Suscribirse a cambios
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      setConnectionType(state.type);
      Logger.debug('ConnectionBanner: Estado de conexión', { 
        isConnected: connected, 
        type: state.type 
      });
    });

    return () => unsubscribe();
  }, []);

  if (isConnected && pendingMessages === 0) {
    return null; // No mostrar si está conectado y no hay pendientes
  }

  return (
    <View style={[
      styles.banner,
      !isConnected ? styles.bannerOffline : styles.bannerPending
    ]}>
      <Text style={styles.bannerText}>
        {!isConnected 
          ? '⚠️ Sin conexión - Los mensajes se enviarán cuando haya internet'
          : `📤 ${pendingMessages} mensaje${pendingMessages !== 1 ? 's' : ''} pendiente${pendingMessages !== 1 ? 's' : ''} de enviar`
        }
      </Text>
      {!isConnected && onRetry && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={onRetry}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF9800',
  },
  bannerOffline: {
    backgroundColor: '#F44336',
  },
  bannerPending: {
    backgroundColor: '#FF9800',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ConnectionBanner;



