import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  Vibration,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BotonAudio from '../../components/common/BotonAudio';
import { pacienteAuthService } from '../../api/authService';
import { storageService } from '../../services/storageService';
import Logger from '../../services/logger';
import { validationService } from '../../services/validationService';
import { useAuth } from '../../context/AuthContext';
import { sanitizePatientId } from '../../utils/patientIdValidator';

const { width, height } = Dimensions.get('window');

const LoginPIN = ({ navigation, route }) => {
  // Obtener pacienteId de los parámetros (opcional - si no se proporciona, se usa búsqueda global por PIN)
  // La búsqueda global permite que el paciente ingrese solo su PIN sin necesidad de conocer su ID
  // SOLUCIÓN DEFENSIVA: Sanitizar pacienteId para evitar IDs inválidos o hardcodeados
  const rawPacienteId = route?.params?.pacienteId;
  const pacienteId = sanitizePatientId(rawPacienteId); // null si es inválido o problemático
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { login } = useAuth();

  const textoInstrucciones = "Ingresa tu PIN de 4 números. Si no tienes PIN configurado, presiona el botón de ayuda.";

  const handleNumberPress = (number) => {
    if (pin.length < 4) {
      const newPin = pin + number;
      setPin(newPin);
      
      // Vibración con manejo de errores
      try {
        Vibration.vibrate(50);
      } catch (error) {
        Logger.debug('Vibración no disponible', error);
      }
      
      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      
      // Vibración con manejo de errores
      try {
        Vibration.vibrate(50);
      } catch (error) {
        Logger.debug('Vibración no disponible', error);
      }
    }
  };

  const handleLogin = async (pinToUse) => {
    // SOLUCIÓN MEJORADA: Normalizar pacienteId antes de validar
    // sanitizePatientId ya retorna null si es inválido, pero asegurémonos
    const pacienteIdForValidation = (pacienteId === null || 
                                     pacienteId === undefined || 
                                     pacienteId === '' ||
                                     (typeof pacienteId === 'string' && pacienteId.toLowerCase().includes('búsqueda')))
      ? null 
      : pacienteId;
    
    Logger.info('Intentando login con PIN', { 
      pacienteId: pacienteIdForValidation || 'búsqueda global', 
      pinLength: pinToUse.length,
      pacienteIdType: typeof pacienteIdForValidation
    });
    
    // Validaciones robustas usando el servicio de validación
    // pacienteId es opcional - si no se proporciona, se usa búsqueda global por PIN
    // El validador ahora maneja null correctamente sin intentar validar el ID
    const validation = validationService.validatePatientPINLogin(pacienteIdForValidation, pinToUse);
    
    if (!validation.isValid) {
      Logger.warn('Validación fallida en login PIN', { 
        errors: validation.errors,
        pacienteIdValid: validation.errors.find(e => e.field === 'pacienteId')?.isValid,
        pinValid: validation.errors.find(e => e.field === 'pin')?.isValid
      });
      
      // Mostrar el primer error encontrado
      const firstError = validation.errors[0];
      Alert.alert('Error de Validación', firstError.message, [{ text: 'OK', onPress: () => setPin('') }]);
      return;
    }

    setLoading(true);
    try {
      const deviceId = await storageService.getOrCreateDeviceId();
      Logger.debug('Device ID para login PIN', { deviceId });

      Logger.info('Enviando solicitud de login PIN a la API', { 
        pacienteId: validation.data.pacienteId || 'búsqueda global',
        hasPin: !!validation.data.pin,
        deviceId 
      });

      // Si no hay pacienteId, pasar null para búsqueda global por PIN
      const response = await pacienteAuthService.loginWithPIN(
        validation.data.pacienteId || null, // null para búsqueda global
        validation.data.pin,
        deviceId
      );

      // Manejar respuesta del servicio (response.data contiene la respuesta del API)
      const responseData = response.data || response;
      
      // El servicio mapea 'user' a 'paciente' para compatibilidad, pero también puede venir como 'user'
      const pacienteInfo = responseData.paciente || responseData.user;
      
      if (responseData.token && pacienteInfo) {
        Logger.success('Login PIN exitoso', { 
          pacienteId: validation.data.pacienteId,
          hasToken: !!responseData.token,
          pacienteNombre: pacienteInfo.nombre || pacienteInfo.nombre_completo
        });
        
        // Preparar datos del paciente para el contexto
        const pacienteData = {
          ...pacienteInfo,
          // Asegurar compatibilidad con diferentes formatos
          id: pacienteInfo.id || pacienteInfo.id_paciente,
          id_paciente: pacienteInfo.id_paciente || pacienteInfo.id,
          // Asegurar que nombre_completo esté disponible
          nombre_completo: pacienteInfo.nombre_completo || 
                          `${pacienteInfo.nombre || ''} ${pacienteInfo.apellido_paterno || ''} ${pacienteInfo.apellido_materno || ''}`.trim()
        };
        
        Logger.debug('Datos del paciente preparados para contexto', {
          id: pacienteData.id,
          id_paciente: pacienteData.id_paciente,
          nombre: pacienteData.nombre,
          nombre_completo: pacienteData.nombre_completo,
          allKeys: Object.keys(pacienteData)
        });
        
        // Usar el contexto de autenticación
        await login(
          pacienteData,
          'paciente',
          responseData.token,
          responseData.refresh_token || responseData.refreshToken
        );
        
        // Verificar que se guardó correctamente
        const savedUserData = await storageService.getUserData();
        Logger.debug('Verificando datos guardados en storage', {
          hasSavedData: !!savedUserData,
          savedKeys: savedUserData ? Object.keys(savedUserData) : [],
          savedId: savedUserData?.id,
          savedIdPaciente: savedUserData?.id_paciente,
          savedNombre: savedUserData?.nombre,
          savedNombreCompleto: savedUserData?.nombre_completo
        });

        // Feedback de éxito
        Vibration.vibrate([100, 50, 100]);

        // La navegación se maneja automáticamente por el contexto
        Logger.info('Login exitoso, navegación automática activada');
      }
    } catch (error) {
      Logger.error('Error en login PIN', { 
        pacienteId: validation.data.pacienteId, 
        error: error.message, 
        status: error.status || error.response?.status,
        type: error.type,
        responseData: error.response?.data
      });
      
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin(''); // Limpiar PIN

      // Extraer información del error
      const errorStatus = error.status || error.response?.status;
      const errorResponse = error.response?.data || error.details || {};
      const errorType = error.type;

      let errorMessage = errorResponse.error || 'PIN incorrecto. Intenta de nuevo.';
      let errorTitle = 'Error de Login';
      
      if (errorStatus === 400) {
        errorMessage = errorResponse.error || 'Datos inválidos. Verifica tu información.';
        errorTitle = 'Datos Inválidos';
      } else if (errorStatus === 401) {
        const attemptsRemaining = errorResponse.attempts_remaining;
        errorMessage = `PIN incorrecto. ${attemptsRemaining !== undefined ? `Intentos restantes: ${attemptsRemaining}` : 'Verifica que hayas ingresado el PIN correcto.'}`;
        errorTitle = 'PIN Incorrecto';
      } else if (errorStatus === 403) {
        errorMessage = errorResponse.error || 'Cuenta desactivada. Contacta al personal de la clínica.';
        errorTitle = 'Acceso Denegado';
      } else if (errorStatus === 423) {
        const minutesRemaining = errorResponse.minutes_remaining || 15;
        errorMessage = `Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente. Espera ${minutesRemaining} minutos antes de intentar nuevamente.`;
        errorTitle = 'Cuenta Bloqueada';
      } else if (errorStatus === 429) {
        errorMessage = 'Demasiados intentos de login. Espera unos minutos antes de intentar nuevamente.';
        errorTitle = 'Demasiados Intentos';
      } else if (errorType === 'connection_error' || !errorStatus) {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        errorTitle = 'Error de Conexión';
      } else if (errorStatus >= 500) {
        errorMessage = 'Error del servidor. Por favor intenta más tarde.';
        errorTitle = 'Error del Servidor';
      }

      Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);

      if (newAttempts >= 3) {
        Alert.alert(
          'Cuenta Bloqueada', 
          'Has excedido el número de intentos. Tu cuenta ha sido bloqueada temporalmente por seguridad.', 
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPIN = () => {
    Alert.alert(
      'Configurar PIN',
      'Para configurar tu PIN, contacta al personal de la clínica.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'OK' }
      ]
    );
  };

  const handleForgotPIN = () => {
    navigation.navigate('ForgotPIN');
  };

  const renderPINDisplay = () => {
    return (
      <View style={styles.pinDisplay}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < pin.length && styles.pinDotFilled
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', '⌫']
    ];

    return (
      <View style={styles.numberPad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.numberRow}>
            {row.map((number, colIndex) => (
              <TouchableOpacity
                key={`${rowIndex}-${colIndex}`}
                style={[
                  styles.numberButton,
                  number === '⌫' && styles.deleteButton,
                  number === '' && styles.emptyButton
                ]}
                onPress={() => {
                  if (number === '⌫') {
                    handleDelete();
                  } else if (number !== '') {
                    handleNumberPress(number);
                  }
                }}
                disabled={number === '' || loading}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.numberText,
                  number === '⌫' && styles.deleteText
                ]}>
                  {number}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <BotonAudio texto={textoInstrucciones} />
      
      <View style={styles.content}>
        <Text style={styles.title}>🔢 Ingresa tu PIN</Text>
        <Text style={styles.subtitle}>4 números</Text>
        
        {renderPINDisplay()}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🔐 Verificando...</Text>
          </View>
        ) : (
          renderNumberPad()
        )}

        <TouchableOpacity
          style={styles.helpButton}
          onPress={handleSetupPIN}
        >
          <Text style={styles.helpText}>❓ ¿No tienes PIN?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotPIN}
        >
          <Text style={styles.forgotText}>🔒 ¿Olvidaste tu PIN?</Text>
        </TouchableOpacity>

        {attempts > 0 && (
          <Text style={styles.attemptsText}>
            Intentos: {attempts}/3
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E8',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#4CAF50',
    marginBottom: 40,
    textAlign: 'center',
  },
  pinDisplay: {
    flexDirection: 'row',
    marginBottom: 50,
    gap: 15,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#4CAF50',
  },
  numberPad: {
    width: '100%',
    maxWidth: 300,
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyButton: {
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: 0,
  },
  deleteButton: {
    backgroundColor: '#FFCDD2',
    borderColor: '#F44336',
  },
  numberText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  deleteText: {
    fontSize: 24,
    color: '#F44336',
  },
  loadingContainer: {
    marginVertical: 30,
    padding: 20,
    backgroundColor: '#FFF3E0',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  loadingText: {
    fontSize: 18,
    color: '#F57C00',
    textAlign: 'center',
    fontWeight: '600',
  },
  helpButton: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  helpText: {
    fontSize: 16,
    color: '#1976D2',
    textAlign: 'center',
    fontWeight: '600',
  },
  forgotButton: {
    marginTop: 12,
    padding: 15,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  forgotText: {
    fontSize: 16,
    color: '#F57C00',
    textAlign: 'center',
    fontWeight: '600',
  },
  attemptsText: {
    marginTop: 20,
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default LoginPIN;
