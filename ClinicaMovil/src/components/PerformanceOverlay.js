import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import usePerformanceMonitor from '../hooks/usePerformanceMonitor';

/**
 * Componente overlay para mostrar métricas de rendimiento en tiempo real
 * 
 * Presiona 3 veces rápidamente en cualquier parte para activar/desactivar
 */
const PerformanceOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(__DEV__); // Solo en desarrollo por defecto
  const { metrics, resetMetrics } = usePerformanceMonitor({ enabled });

  const tapCountRef = React.useRef(0);
  const tapTimeoutRef = React.useRef(null);

  const handleTap = () => {
    tapCountRef.current++;
    
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    tapTimeoutRef.current = setTimeout(() => {
      if (tapCountRef.current >= 3) {
        setVisible(true);
        setEnabled(true);
      }
      tapCountRef.current = 0;
    }, 500);
  };

  const getFPSColor = (fps) => {
    if (fps >= 55) return '#4CAF50'; // Verde: Excelente
    if (fps >= 45) return '#FF9800'; // Naranja: Bueno
    if (fps >= 30) return '#FF5722'; // Rojo claro: Aceptable
    return '#F44336'; // Rojo: Malo
  };

  const getFrameTimeColor = (frameTime) => {
    if (frameTime <= 16.67) return '#4CAF50'; // 60 FPS = 16.67ms por frame
    if (frameTime <= 33.33) return '#FF9800'; // 30 FPS = 33.33ms por frame
    return '#F44336';
  };

  return (
    <>
      {/* Trigger oculto - área pequeña en esquina superior derecha para detectar 3 taps */}
      {!visible && (
        <TouchableOpacity
          style={styles.hiddenTrigger}
          onPress={handleTap}
          activeOpacity={1}
        />
      )}
      
      {/* Modal del Performance Monitor */}
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={() => {
          setVisible(false);
          // Resetear el contador de taps cuando se cierra
          tapCountRef.current = 0;
          if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
          }
        }}
      >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>📊 Performance Monitor</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metricsContainer}>
            {/* FPS */}
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>FPS:</Text>
              <Text style={[styles.metricValue, { color: getFPSColor(metrics.fps) }]}>
                {metrics.fps}
              </Text>
              <Text style={styles.metricUnit}>/ 60</Text>
            </View>

            {/* Frame Time */}
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Frame Time:</Text>
              <Text style={[styles.metricValue, { color: getFrameTimeColor(metrics.frameTime) }]}>
                {metrics.frameTime.toFixed(2)}ms
              </Text>
            </View>

            {/* Último Render Time */}
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Last Render:</Text>
              <Text style={styles.metricValue}>
                {metrics.lastRenderTime.toFixed(2)}ms
              </Text>
            </View>

            {/* Memory Usage */}
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Memory:</Text>
              <Text style={styles.metricValue}>
                {metrics.memoryUsage > 0 ? `${metrics.memoryUsage} MB` : 'N/A'}
              </Text>
            </View>

            {/* Render Count */}
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Renders:</Text>
              <Text style={styles.metricValue}>{metrics.renderCount}</Text>
            </View>

            {/* Performance Status */}
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor:
                      metrics.fps >= 55
                        ? '#4CAF50'
                        : metrics.fps >= 45
                        ? '#FF9800'
                        : '#F44336',
                  },
                ]}
              />
              <Text style={styles.statusText}>
                {metrics.fps >= 55
                  ? '⚡ Excelente'
                  : metrics.fps >= 45
                  ? '✅ Bueno'
                  : '⚠️ Mejorable'}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={resetMetrics}
            >
              <Text style={styles.actionButtonText}>🔄 Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, !enabled && styles.actionButtonDisabled]}
              onPress={() => setEnabled(!enabled)}
            >
              <Text style={styles.actionButtonText}>
                {enabled ? '⏸️ Pausar' : '▶️ Reanudar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hiddenTrigger: {
    // Área pequeña en esquina superior derecha - no bloquea la app completa
    position: 'absolute',
    top: 0,
    right: 0,
    width: 80, // Área pequeña para detectar taps
    height: 80,
    zIndex: 9999,
    // Solo esta pequeña área captura toques, el resto de la app funciona normalmente
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666666',
  },
  metricsContainer: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginRight: 4,
  },
  metricUnit: {
    fontSize: 12,
    color: '#999999',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2196F3',
    borderRadius: 6,
  },
  actionButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PerformanceOverlay;

