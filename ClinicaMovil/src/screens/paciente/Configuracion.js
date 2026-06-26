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
import useTTS from '../../hooks/useTTS';
import { storageService } from '../../services/storageService';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import ttsService from '../../services/ttsService';
import BackHeader from '../../components/common/BackHeader';
import { useAccessibility } from '../../context/AccessibilityContext';
import { FONT_SCALE_LABELS, FONT_SCALE_ORDER, FONT_SCALE_TO_LEGACY } from '../../constants/accessibility';

/** Etiqueta fija en chips: no escala con la preferencia global de fuente. */
const ChipLabel = ({ children, active }) => (
  <Text
    allowFontScaling={false}
    numberOfLines={1}
    adjustsFontSizeToFit
    minimumFontScale={0.75}
    style={[styles.chipLabel, active && styles.chipLabelActive]}
  >
    {children}
  </Text>
);

const Configuracion = () => {
  const navigation = useNavigation();
  const { speak, stopAndClear, createTimeout } = useTTS();
  
  const { fontScale, highContrast, setFontScale, setHighContrast } = useAccessibility();
  
  // Estados de configuración
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsRate, setTtsRate] = useState(0.9);
  const [ttsVolume, setTtsVolume] = useState(1.0); // Volumen TTS (0.0-1.0)
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
        setNotificaciones(config.notificaciones !== false);
        
        // Aplicar volumen y velocidad al servicio TTS después de cargar
        if (ttsService) {
          if (ttsService.setDefaultVolume) ttsService.setDefaultVolume(volumeToSet);
          if (ttsService.setDefaultRate) {
            // Aplicar velocidad del usuario (await porque ahora es async)
            const userRate = config.ttsRate ?? 0.9;
            await ttsService.setDefaultRate(userRate);
            Logger.debug('Configuracion: Velocidad TTS aplicada al cargar', { rate: userRate });
          }
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
        altoContraste: highContrast,
        tamanoFuente: FONT_SCALE_TO_LEGACY[fontScale] || 'normal',
        fontScale,
        notificaciones,
      };
      await storageService.setItem('configuracion_paciente', config);
      
      // Aplicar volumen y velocidad al servicio TTS
      if (ttsService) {
        if (ttsService.setDefaultVolume) ttsService.setDefaultVolume(ttsVolume);
        if (ttsService.setDefaultRate) {
          // Aplicar velocidad del usuario inmediatamente (await porque ahora es async)
          await ttsService.setDefaultRate(ttsRate);
          Logger.debug('Configuracion: Velocidad TTS aplicada al guardar', { rate: ttsRate });
        }
      }
      
      Logger.info('Configuración guardada:', config);
      hapticService.success();
      audioFeedbackService.playSuccess();
      await speak('Configuración guardada');
    } catch (error) {
      Logger.error('Error guardando configuración:', error);
      audioFeedbackService.playError();
    }
  }, [ttsEnabled, ttsRate, ttsVolume, highContrast, fontScale, notificaciones, speak]);

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
  }, [ttsEnabled, ttsRate, ttsVolume, highContrast, fontScale, notificaciones, loading, guardarConfiguracion]);

  const handleTtsRateChange = async (nuevoRate) => {
    hapticService.selection();
    setTtsRate(nuevoRate);
    
    // Aplicar velocidad inmediatamente al servicio TTS
    if (ttsService && ttsService.setDefaultRate) {
      await ttsService.setDefaultRate(nuevoRate);
      Logger.debug('Configuracion: Velocidad TTS cambiada y aplicada', { rate: nuevoRate });
    }
    
    await speak(`Velocidad de voz: ${nuevoRate === 0.7 ? 'lenta' : nuevoRate === 0.9 ? 'normal' : 'rápida'}`);
  };

  const handleTtsVolumeChange = async (nuevoVolume) => {
    hapticService.selection();
    setTtsVolume(nuevoVolume);
    const porcentaje = Math.round(nuevoVolume * 100);
    await speak(`Volumen de voz: ${porcentaje} por ciento`);
  };

  const handleFontScaleChange = async (key) => {
    hapticService.selection();
    await setFontScale(key);
    await speak(`Tamaño de fuente: ${FONT_SCALE_LABELS[key]}`);
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

  return (
    <SafeAreaView style={[styles.container, highContrast && styles.containerAltoContraste]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <BackHeader
          navigation={navigation}
          title="⚙️ Configuración"
          variant="patient"
          rightElement={
            <TouchableOpacity
              style={styles.listenButton}
              onPress={async () => {
                hapticService.light();
                await speak('Configuración. Ajusta las preferencias de la aplicación.');
              }}
            >
              <Text style={styles.listenButtonText}>🔊</Text>
            </TouchableOpacity>
          }
        />

        {/* Sección: Texto a Voz */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle]}>🔊 Texto a Voz</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel]}>Activar TTS</Text>
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
                <Text style={[styles.settingLabel]}>Velocidad de Voz</Text>
                <View style={styles.rateButtons}>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsRate === 0.7 && styles.rateButtonActive]}
                    onPress={() => handleTtsRateChange(0.7)}
                  >
                    <ChipLabel active={ttsRate === 0.7}>Lenta</ChipLabel>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsRate === 0.9 && styles.rateButtonActive]}
                    onPress={() => handleTtsRateChange(0.9)}
                  >
                    <ChipLabel active={ttsRate === 0.9}>Normal</ChipLabel>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsRate === 1.1 && styles.rateButtonActive]}
                    onPress={() => handleTtsRateChange(1.1)}
                  >
                    <ChipLabel active={ttsRate === 1.1}>Rápida</ChipLabel>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingItem}>
                <Text style={[styles.settingLabel]}>Volumen de Voz</Text>
                <View style={styles.rateButtons}>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsVolume === 0.5 && styles.rateButtonActive]}
                    onPress={() => handleTtsVolumeChange(0.5)}
                  >
                    <ChipLabel active={ttsVolume === 0.5}>Bajo</ChipLabel>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsVolume === 0.75 && styles.rateButtonActive]}
                    onPress={() => handleTtsVolumeChange(0.75)}
                  >
                    <ChipLabel active={ttsVolume === 0.75}>Medio</ChipLabel>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rateButton, ttsVolume === 1.0 && styles.rateButtonActive]}
                    onPress={() => handleTtsVolumeChange(1.0)}
                  >
                    <ChipLabel active={ttsVolume === 1.0}>Alto</ChipLabel>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Sección: Accesibilidad */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle]}>♿ Accesibilidad</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel]}>Modo Alto Contraste</Text>
              <Text style={styles.settingDescription}>Mejorar visibilidad</Text>
            </View>
            <Switch
              value={highContrast}
              onValueChange={(value) => {
                hapticService.selection();
                setHighContrast(value);
                speak(value ? 'Modo alto contraste activado' : 'Modo alto contraste desactivado');
              }}
              trackColor={{ false: COLORES.SWITCH_TRACK_OFF, true: COLORES.NAV_PACIENTE }}
              thumbColor={COLORES.TEXTO_EN_PRIMARIO}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel]}>Velocidad de voz (TTS)</Text>
            <Text style={styles.settingDescription}>Más lenta para escuchar mejor, más rápida para avanzar</Text>
            <View style={styles.rateButtons}>
              <TouchableOpacity
                style={[styles.rateButton, ttsRate === 0.7 && styles.rateButtonActive]}
                onPress={() => handleTtsRateChange(0.7)}
              >
                <ChipLabel active={ttsRate === 0.7}>Lenta</ChipLabel>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rateButton, ttsRate === 0.9 && styles.rateButtonActive]}
                onPress={() => handleTtsRateChange(0.9)}
              >
                <ChipLabel active={ttsRate === 0.9}>Normal</ChipLabel>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rateButton, ttsRate === 1.1 && styles.rateButtonActive]}
                onPress={() => handleTtsRateChange(1.1)}
              >
                <ChipLabel active={ttsRate === 1.1}>Rápida</ChipLabel>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel]}>Tamaño de Fuente</Text>
            <View style={styles.fontSizeButtons}>
              {FONT_SCALE_ORDER.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.fontSizeButton, fontScale === key && styles.fontSizeButtonActive]}
                  onPress={() => handleFontScaleChange(key)}
                >
                  <ChipLabel active={fontScale === key}>{FONT_SCALE_LABELS[key]}</ChipLabel>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Sección: Notificaciones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle]}>🔔 Notificaciones</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel]}>Activar Notificaciones</Text>
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
          <Text style={[styles.sectionTitle]}>🔒 Seguridad</Text>
          
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
                <Text style={[styles.securityButtonLabel]}>Cambiar PIN</Text>
                <Text style={styles.securityButtonDescription}>Actualiza tu PIN de acceso</Text>
              </View>
              <Text style={styles.securityButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacidad */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle]}>🔒 Privacidad</Text>
          <TouchableOpacity
            style={styles.securityButton}
            onPress={() => {
              hapticService.light();
              navigation.navigate('AvisoPrivacidad');
              speak('Aviso de privacidad');
            }}
          >
            <View style={styles.securityButtonContent}>
              <Text style={styles.securityButtonIcon}>📄</Text>
              <View style={styles.securityButtonInfo}>
                <Text style={[styles.securityButtonLabel]}>
                  Aviso de Privacidad
                </Text>
                <Text style={styles.securityButtonDescription}>
                  Tratamiento de datos personales y de salud
                </Text>
              </View>
              <Text style={styles.securityButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Información */}
        <View style={styles.infoSection}>
          <Text style={[styles.infoText]}>
            💡 Los cambios se guardan automáticamente
          </Text>
        </View>
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
    gap: 8,
    marginTop: 12,
  },
  rateButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: COLORES.FONDO,
    borderWidth: 2,
    borderColor: COLORES.BORDE_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  rateButtonActive: {
    borderColor: COLORES.NAV_PACIENTE,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  chipLabelActive: {
    color: COLORES.EXITO,
    fontWeight: 'bold',
  },
  fontSizeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  fontSizeButton: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: COLORES.FONDO,
    borderWidth: 2,
    borderColor: COLORES.BORDE_CLARO,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  fontSizeButtonActive: {
    borderColor: COLORES.NAV_PACIENTE,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
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


