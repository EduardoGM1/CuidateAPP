/**
 * Pantalla: Configuración
 * 
 * Configuración de TTS, accesibilidad y preferencias del usuario.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import useTTS from '../../hooks/useTTS';
import { storageService } from '../../services/storageService';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import ttsService from '../../services/ttsService';
import OfflineDebugButton from '../../components/common/OfflineDebugButton';

const Configuracion = () => {
  const navigation = useNavigation();
  const { speak, stopAndClear, createTimeout } = useTTS();
  
  // Estados de configuración
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsRate, setTtsRate] = useState(0.9);
  const [ttsVolume, setTtsVolume] = useState(1.0); // Volumen TTS (0.0-1.0)
  const [altoContraste, setAltoContraste] = useState(false);
  const [tamanoFuente, setTamanoFuente] = useState('normal'); // pequeño, normal, grande
  const [notificaciones, setNotificaciones] = useState(true);
  const [loading, setLoading] = useState(true);

  // Cargar configuración guardada
  const cargarConfiguracion = useCallback(async () => {
    try {
      setLoading(true);
      const config = await storageService.getItem('configuracion_paciente');
      if (config) {
        const volumeToSet = config.ttsVolume !== undefined ? config.ttsVolume : 1.0;
        setTtsEnabled(config.ttsEnabled !== false);
        setTtsRate(config.ttsRate || 0.9);
        setTtsVolume(volumeToSet);
        setAltoContraste(config.altoContraste || false);
        setTamanoFuente(config.tamanoFuente || 'normal');
        setNotificaciones(config.notificaciones !== false);
        
        // Aplicar volumen al servicio TTS después de cargar
        if (ttsService && ttsService.setDefaultVolume) {
          ttsService.setDefaultVolume(volumeToSet);
        }
      }
    } catch (error) {
      Logger.error('Error cargando configuración:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Guardar configuración
  const guardarConfiguracion = useCallback(async () => {
    try {
      const config = {
        ttsEnabled,
        ttsRate,
        ttsVolume,
        altoContraste,
        tamanoFuente,
        notificaciones,
      };
      await storageService.setItem('configuracion_paciente', config);
      
      // Aplicar volumen al servicio TTS
      if (ttsService && ttsService.setDefaultVolume) {
        ttsService.setDefaultVolume(ttsVolume);
      }
      
      Logger.info('Configuración guardada:', config);
      hapticService.success();
      audioFeedbackService.playSuccess();
      await speak('Configuración guardada');
    } catch (error) {
      Logger.error('Error guardando configuración:', error);
      audioFeedbackService.playError();
    }
  }, [ttsEnabled, ttsRate, ttsVolume, altoContraste, tamanoFuente, notificaciones, speak]);

  // Cargar datos al entrar
  useFocusEffect(
    useCallback(() => {
      cargarConfiguracion();
      
      const timer = createTimeout(async () => {
        await speak('Configuración. Ajusta las preferencias de la aplicación.');
      }, 500);
      
      return () => {
        stopAndClear();
        clearTimeout(timer);
      };
    }, [cargarConfiguracion, speak, stopAndClear, createTimeout])
  );

  // Guardar automáticamente al cambiar
  useEffect(() => {
    if (!loading) {
      guardarConfiguracion();
    }
  }, [ttsEnabled, ttsRate, ttsVolume, altoContraste, tamanoFuente, notificaciones, loading, guardarConfiguracion]);

  const handleTtsRateChange = async (nuevoRate) => {
    hapticService.selection();
    setTtsRate(nuevoRate);
    await speak(`Velocidad de voz: ${nuevoRate === 0.7 ? 'lenta' : nuevoRate === 0.9 ? 'normal' : 'rápida'}`);
  };

  const handleTtsVolumeChange = async (nuevoVolume) => {
    hapticService.selection();
    setTtsVolume(nuevoVolume);
    const porcentaje = Math.round(nuevoVolume * 100);
    await speak(`Volumen de voz: ${porcentaje} por ciento`);
  };

  const handleTamanoFuenteChange = async (nuevoTamano) => {
    hapticService.selection();
    setTamanoFuente(nuevoTamano);
    await speak(`Tamaño de fuente: ${nuevoTamano}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PACIENTE} />
          <Text style={styles.loadingText}>Cargando configuración...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tamanoFuenteStyles = {
    pequeño: { fontSize: 14 },
    normal: { fontSize: 18 },
    grande: { fontSize: 24 },
  };

  return (
    <SafeAreaView style={[styles.container, altoContraste && styles.containerAltoContraste]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              hapticService.light();
              navigation.goBack();
            }}
          >
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
          
          <Text style={[styles.title, tamanoFuenteStyles[tamanoFuente]]}>⚙️ Configuración</Text>
          
          <TouchableOpacity
            style={styles.listenButton}
            onPress={async () => {
              hapticService.light();
              await speak('Configuración. Ajusta las preferencias de la aplicación.');
            }}
          >
            <Text style={styles.listenButtonText}>🔊</Text>
          </TouchableOpacity>
        </View>

        {/* Sección: Texto a Voz */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, tamanoFuenteStyles[tamanoFuente]]}>🔊 Texto a Voz</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, tamanoFuenteStyles[tamanoFuente]]}>Activar TTS</Text>
              <Text style={styles.settingDescription}>Leer mensajes en voz alta</Text>
            </View>
            <Switch
              value={ttsEnabled}
              onValueChange={(value) => {
                hapticService.selection();
                setTtsEnabled(value);
                speak(value ? 'Texto a voz activado' : 'Texto a voz desactivado');
              }}
              trackColor={{ false: COLORES.SWITCH_TRACK_OFF, true: COLORES.NAV_PACIENTE }}
              thumbColor={COLORES.TEXTO_EN_PRIMARIO}
            />
          </View>

          {ttsEnabled && (
            <>
              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, tamanoFuenteStyles[tamanoFuente]]}>Velocidad de Voz</Text>
                <View style={styles.rateButtons}>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsRate === 0.7 && styles.rateButtonActive]}
                    onPress={() => handleTtsRateChange(0.7)}
                  >
                    <Text style={[styles.rateButtonText, ttsRate === 0.7 && styles.rateButtonTextActive]}>
                      Lenta
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsRate === 0.9 && styles.rateButtonActive]}
                    onPress={() => handleTtsRateChange(0.9)}
                  >
                    <Text style={[styles.rateButtonText, ttsRate === 0.9 && styles.rateButtonTextActive]}>
                      Normal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsRate === 1.1 && styles.rateButtonActive]}
                    onPress={() => handleTtsRateChange(1.1)}
                  >
                    <Text style={[styles.rateButtonText, ttsRate === 1.1 && styles.rateButtonTextActive]}>
                      Rápida
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel, tamanoFuenteStyles[tamanoFuente]]}>Volumen de Voz</Text>
                <View style={styles.rateButtons}>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsVolume === 0.5 && styles.rateButtonActive]}
                    onPress={() => handleTtsVolumeChange(0.5)}
                  >
                    <Text style={[styles.rateButtonText, ttsVolume === 0.5 && styles.rateButtonTextActive]}>
                      Bajo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsVolume === 0.75 && styles.rateButtonActive]}
                    onPress={() => handleTtsVolumeChange(0.75)}
                  >
                    <Text style={[styles.rateButtonText, ttsVolume === 0.75 && styles.rateButtonTextActive]}>
                      Medio
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsVolume === 1.0 && styles.rateButtonActive]}
                    onPress={() => handleTtsVolumeChange(1.0)}
                  >
                    <Text style={[styles.rateButtonText, ttsVolume === 1.0 && styles.rateButtonTextActive]}>
                      Alto
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Sección: Accesibilidad */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, tamanoFuenteStyles[tamanoFuente]]}>♿ Accesibilidad</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, tamanoFuenteStyles[tamanoFuente]]}>Modo Alto Contraste</Text>
              <Text style={styles.settingDescription}>Mejorar visibilidad</Text>
            </View>
            <Switch
              value={altoContraste}
              onValueChange={(value) => {
                hapticService.selection();
                setAltoContraste(value);
                speak(value ? 'Modo alto contraste activado' : 'Modo alto contraste desactivado');
              }}
              trackColor={{ false: COLORES.SWITCH_TRACK_OFF, true: COLORES.NAV_PACIENTE }}
              thumbColor={COLORES.TEXTO_EN_PRIMARIO}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel, tamanoFuenteStyles[tamanoFuente]]}>Tamaño de Fuente</Text>
            <View style={styles.fontSizeButtons}>
              <TouchableOpacity
                style={[styles.fontSizeButton, tamanoFuente === 'pequeño' && styles.fontSizeButtonActive]}
                onPress={() => handleTamanoFuenteChange('pequeño')}
              >
                <Text style={[styles.fontSizeButtonText, tamanoFuente === 'pequeño' && styles.fontSizeButtonTextActive]}>
                  Pequeño
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fontSizeButton, tamanoFuente === 'normal' && styles.fontSizeButtonActive]}
                onPress={() => handleTamanoFuenteChange('normal')}
              >
                <Text style={[styles.fontSizeButtonText, tamanoFuente === 'normal' && styles.fontSizeButtonTextActive]}>
                  Normal
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fontSizeButton, tamanoFuente === 'grande' && styles.fontSizeButtonActive]}
                onPress={() => handleTamanoFuenteChange('grande')}
              >
                <Text style={[styles.fontSizeButtonText, tamanoFuente === 'grande' && styles.fontSizeButtonTextActive]}>
                  Grande
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sección: Notificaciones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, tamanoFuenteStyles[tamanoFuente]]}>🔔 Notificaciones</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, tamanoFuenteStyles[tamanoFuente]]}>Activar Notificaciones</Text>
              <Text style={styles.settingDescription}>Recordatorios y alertas</Text>
            </View>
            <Switch
              value={notificaciones}
              onValueChange={(value) => {
                hapticService.selection();
                setNotificaciones(value);
                speak(value ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
              }}
              trackColor={{ false: COLORES.SWITCH_TRACK_OFF, true: COLORES.NAV_PACIENTE }}
              thumbColor={COLORES.TEXTO_EN_PRIMARIO}
            />
          </View>
        </View>

        {/* Sección: Seguridad */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, tamanoFuenteStyles[tamanoFuente]]}>🔒 Seguridad</Text>
          
          <TouchableOpacity
            style={styles.securityButton}
            onPress={() => {
              hapticService.light();
              navigation.navigate('ChangePIN');
              speak('Cambiar PIN');
            }}
          >
            <View style={styles.securityButtonContent}>
              <Text style={styles.securityButtonIcon}>🔐</Text>
              <View style={styles.securityButtonInfo}>
                <Text style={[styles.securityButtonLabel, tamanoFuenteStyles[tamanoFuente]]}>Cambiar PIN</Text>
                <Text style={styles.securityButtonDescription}>Actualiza tu PIN de acceso</Text>
              </View>
              <Text style={styles.securityButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Información */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText, tamanoFuenteStyles[tamanoFuente]]}>
            💡 Los cambios se guardan automáticamente
          </Text>
        </View>

        {/* Debug: Solo en desarrollo */}
        <OfflineDebugButton />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  containerAltoContraste: {
    backgroundColor: COLORES.NEGRO,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: COLORES.NAV_PACIENTE,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    flex: 1,
    textAlign: 'center',
  },
  listenButton: {
    padding: 8,
  },
  listenButtonText: {
    fontSize: 20,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    marginBottom: 20,
  },
  settingItem: {
    marginBottom: 24,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  rateButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  rateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORES.FONDO,
    borderWidth: 2,
    borderColor: COLORES.BORDE_CLARO,
    alignItems: 'center',
  },
  rateButtonActive: {
    borderColor: COLORES.NAV_PACIENTE,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  rateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  rateButtonTextActive: {
    color: COLORES.EXITO,
    fontWeight: 'bold',
  },
  fontSizeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  fontSizeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORES.FONDO,
    borderWidth: 2,
    borderColor: COLORES.BORDE_CLARO,
    alignItems: 'center',
  },
  fontSizeButtonActive: {
    borderColor: COLORES.NAV_PACIENTE,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  fontSizeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  fontSizeButtonTextActive: {
    color: COLORES.EXITO,
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORES.FONDO_ADVERTENCIA_CLARO,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.ADVERTENCIA_LIGHT,
  },
  infoText: {
    fontSize: 16,
    color: COLORES.ADVERTENCIA_TEXTO,
    textAlign: 'center',
  },
  securityButton: {
    backgroundColor: COLORES.FONDO,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  securityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  securityButtonInfo: {
    flex: 1,
  },
  securityButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  securityButtonDescription: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  securityButtonArrow: {
    fontSize: 20,
    color: COLORES.NAV_PACIENTE,
    fontWeight: 'bold',
  },
});

export default Configuracion;


