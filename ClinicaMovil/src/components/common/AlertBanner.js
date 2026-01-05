/**
 * Componente: Banner de Alertas
 * 
 * Muestra alertas médicas críticas de forma prominente
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';

const AlertBanner = memo(({ alertas, onDismiss, onPress }) => {
  if (!alertas || alertas.length === 0) return null;

  const alertaCritica = alertas.find(a => a.severidad === 'critica') || alertas[0];

  return (
    <Card style={[styles.banner, alertaCritica.severidad === 'critica' && styles.bannerCritica]}>
      <Card.Content style={styles.content}>
        <View style={styles.alertInfo}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertText}>
            <Text style={styles.alertTitle}>
              {alertaCritica.severidad === 'critica' ? 'Alerta Crítica' : 'Alerta Médica'}
            </Text>
            <Text style={styles.alertMessage}>{alertaCritica.mensaje}</Text>
            {alertas.length > 1 && (
              <Text style={styles.alertCount}>+{alertas.length - 1} alerta(s) más</Text>
            )}
          </View>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
      </Card.Content>
    </Card>
  );
});

const styles = StyleSheet.create({
  banner: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    elevation: 4,
  },
  bannerCritica: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#F44336',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  alertText: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  alertCount: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  dismissButton: {
    padding: 8,
  },
  dismissText: {
    fontSize: 20,
    color: '#999',
  },
});

AlertBanner.displayName = 'AlertBanner';

export default AlertBanner;


