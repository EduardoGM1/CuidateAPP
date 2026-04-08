import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Vibration,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BotonAudio from '../../components/common/BotonAudio';
import { pacienteAuthService, biometricService } from '../../api/authService';
import { storageService } from '../../services/storageService';
import Logger from '../../services/logger';
import { useAuth } from '../../context/AuthContext';
import { sanitizePatientId } from '../../utils/patientIdValidator';
import { COLORES, NOMBRE_APP } from '../../utils/constantes';

const { width, height } = Dimensions.get('window');

const LoginPaciente = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  // Obtener pacienteId de los parámetros de navegación (opcional)
  // Si no se proporciona, se usa búsqueda global por PIN (el paciente solo ingresa su PIN)
  // SOLUCIÓN DEFENSIVA: Sanitizar pacienteId para evitar IDs inválidos o hardcodeados
  const rawPacienteIdFromRoute = route?.params?.pacienteId;
  const sanitizedPacienteId = sanitizePatientId(rawPacienteIdFromRoute);
  const [pacienteId, setPacienteId] = useState(sanitizedPacienteId); // null para búsqueda global por PIN
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);
  const [biometricConfigured, setBiometricConfigured] = useState(false);
  const { login } = useAuth();

  const textoInstrucciones = `Bienvenido a ${NOMBRE_APP}. Selecciona cómo quieres iniciar sesión: PIN de 4 números, huella dactilar o reconocimiento facial.`;

  // Verificar disponibilidad de biometría al cargar
  useEffect(() => {
    Logger.info('Pantalla LoginPaciente cargada');
    
    // Generar device ID único
    storageService.getOrCreateDeviceId().then(deviceId => {
      Logger.debug('Device ID obtenido/creado', { deviceId });
    });

    // Verificar biometría disponible
    checkBiometricAvailability();
    
    // Verificar si ya tiene biometría configurada
    checkBiometricConfigured();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const { available, biometryType } = await biometricService.isAvailable();
      setBiometricAvailable(available);
      setBiometricType(biometryType);
      
      Logger.info('Biometría disponible', { available, biometryType });
    } catch (error) {
      Logger.error('Error verificando biometría', error);
      setBiometricAvailable(false);
    }
  };

  const checkBiometricConfigured = async () => {
    try {
      const biometricData = await biometricService.getPublicKey();
      setBiometricConfigured(!!biometricData);
      
      if (biometricData) {
        Logger.info('Biometría ya configurada en este dispositivo');
      }
    } catch (error) {
      Logger.error('Error verificando configuración biométrica', error);
      setBiometricConfigured(false);
    }
  };

  const handlePINLogin = () => {
    Logger.navigation('LoginPaciente', 'LoginPIN', { 
      pacienteId: pacienteId || 'búsqueda global' 
    });
    // Solo pasar pacienteId si existe, de lo contrario usar búsqueda global por PIN
    navigation.navigate('LoginPIN', pacienteId ? { pacienteId } : {});
  };

  const handleBiometricLogin = async () => {
    Logger.info('Iniciando autenticación biométrica', { pacienteId });
    setLoading(true);
    
    try {
      // Verificar que biometría esté disponible
      if (!biometricAvailable) {
        throw new Error('Biometría no disponible en este dispositivo');
      }

      // Verificar que esté configurada
      if (!biometricConfigured) {
        Alert.alert(
          'Biometría no configurada',
          'Primero debes configurar tu biometría. Ve a configuración o usa PIN.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const deviceId = await storageService.getOrCreateDeviceId();
      const biometricData = await biometricService.getPublicKey();
      
      if (!biometricData) {
        throw new Error('No se encontró configuración biométrica');
      }

      // 1. Generar challenge (en producción debería venir del servidor)
      const challenge = `${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // 2. Autenticar con biometría y firmar challenge
      const { signature, credentialId } = await biometricService.signChallenge(challenge);

      Logger.debug('Challenge firmado exitosamente', { hasSignature: !!signature });

      // 3. Enviar firma al servidor para validar
      const response = await pacienteAuthService.loginWithBiometric(
        parseInt(pacienteId),
        deviceId,
        signature,
        challenge,
        credentialId
      );

      // Manejar respuesta del servicio
      // El servicio ya normaliza la respuesta: { ...data, paciente: data.user }
      const responseData = response.data || response;
      
      // Compatibilidad: El backend unificado retorna { success, token, user }
      // pero el servicio lo mapea a { token, paciente: user }
      const pacienteInfo = responseData.paciente || responseData.user;
      const token = responseData.token;
      
      if (token && pacienteInfo) {
        Logger.success('Autenticación biométrica exitosa', {
          pacienteId,
          hasToken: !!token,
          pacienteNombre: pacienteInfo.nombre
        });
        
        // Preparar datos del paciente
        const pacienteData = {
          ...pacienteInfo,
          id: pacienteInfo.id || pacienteInfo.id_paciente,
          id_paciente: pacienteInfo.id_paciente || pacienteInfo.id
        };
        
        // Usar el contexto de autenticación
        await login(
          pacienteData,
          'paciente',
          token,
          responseData.refresh_token || responseData.refreshToken
        );

        // Feedback táctil
        Vibration.vibrate(100);

        // La navegación se maneja automáticamente por el contexto
        Logger.info('Login exitoso, navegación automática activada');
      }
    } catch (error) {
      Logger.error('Error en login biométrico', { pacienteId, error: error.message });
      
      let errorMessage = 'No se pudo autenticar con biometría. Intenta con PIN.';
      
      if (error.message?.includes('Usuario canceló') || error.message?.includes('User canceled') || error.message?.includes('canceled')) {
        errorMessage = 'Autenticación cancelada. Puedes intentar nuevamente.';
      } else if (error.message?.includes('no disponible')) {
        errorMessage = 'Biometría no disponible en este dispositivo. Usa PIN.';
      }
      
      Alert.alert(
        'Error de Autenticación',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Manejar biometría (unificado - detecta automáticamente el tipo)
  const handleBiometric = () => {
    Logger.info('Botón biometría presionado', { biometricType });
    Vibration.vibrate(50);
    handleBiometricLogin();
  };

  return (
    <SafeAreaView style={styles.container}>
      <BotonAudio texto={textoInstrucciones} />
      
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.title}>👤 Soy Paciente</Text>
        <Text style={styles.subtitle}>¿Cómo quieres iniciar sesión?</Text>
        
        <View style={styles.buttonContainer}>
          {/* Botón PIN - Siempre visible */}
          <TouchableOpacity
            style={[styles.button, styles.pinButton]}
            onPress={handlePINLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.buttonIcon}>🔢</Text>
            <Text style={styles.buttonText}>PIN de 4 números</Text>
            <Text style={styles.buttonSubtext}>Fácil de recordar</Text>
          </TouchableOpacity>

          {/* Botón Biometría - Solo si está disponible y configurada */}
          {biometricAvailable && biometricConfigured && (
            <TouchableOpacity
              style={[styles.button, styles.biometricButton]}
              onPress={handleBiometric}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.buttonIcon}>
                {biometricType === 'FaceID' ? '👤' : '👆'}
              </Text>
              <Text style={styles.buttonText}>
                {biometricType === 'FaceID' ? 'Reconocimiento facial' : 'Huella dactilar'}
              </Text>
              <Text style={styles.buttonSubtext}>
                {biometricType === 'FaceID' ? 'Face ID' : 'Touch ID / Fingerprint'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🔐 Autenticando...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: COLORES.EXITO_LIGHT,
    marginBottom: 40,
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  button: {
    backgroundColor: COLORES.BLANCO,
    borderRadius: 20,
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORES.NEGRO,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: COLORES.TEXTO_DISABLED,
  },
  pinButton: {
    borderColor: COLORES.EXITO_LIGHT,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  biometricButton: {
    borderColor: COLORES.INFO_LIGHT,
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
  },
  buttonIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 5,
    textAlign: 'center',
  },
  buttonSubtext: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: 30,
    padding: 15,
    backgroundColor: COLORES.FONDO_SECUNDARIO,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORES.ADVERTENCIA_LIGHT,
  },
  loadingText: {
    fontSize: 18,
    color: COLORES.ADVERTENCIA,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default LoginPaciente;
