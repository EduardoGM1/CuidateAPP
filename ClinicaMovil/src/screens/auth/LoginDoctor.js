import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, IconButton } from 'react-native-paper';
import { doctorAuthService } from '../../api/authService';
import { storageService } from '../../services/storageService';
import { validationService } from '../../services/validationService';
import Logger from '../../services/logger';
import { useAuth } from '../../context/AuthContext';
import { COLORES } from '../../utils/constantes';

const LoginDoctor = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    Logger.info('Iniciando login doctor/administrador', { email });
    
    // Validaciones robustas usando el servicio de validación
    const validation = validationService.validateDoctorLogin(email, password);
    
    if (!validation.isValid) {
      Logger.warn('Validación fallida en login doctor', { 
        errors: validation.errors,
        emailValid: validation.errors.find(e => e.field === 'email')?.isValid,
        passwordValid: validation.errors.find(e => e.field === 'password')?.isValid
      });
      
      // Mostrar el primer error encontrado
      const firstError = validation.errors[0];
      Alert.alert('Error de Validación', firstError.message, [{ text: 'OK' }]);
      return;
    }

    setLoading(true);
    try {
      Logger.info('Enviando solicitud de login a la API', { 
        email: validation.data.email,
        hasPassword: !!validation.data.password 
      });

      const response = await doctorAuthService.login(validation.data.email, validation.data.password);

      if (response.token) {
        Logger.success('Login doctor/administrador exitoso', { 
          userId: response.usuario?.id_usuario,
          rol: response.usuario?.rol 
        });
        
        // Usar el contexto de autenticación
        await login(
          response.usuario,
          response.usuario.rol || 'doctor',
          response.token,
          response.refresh_token || response.refreshToken
        );

        // Guardar email si "recordar" está activado
        if (rememberMe) {
          await storageService.saveRememberedEmail(validation.data.email);
          Logger.debug('Email recordado para próximos logins');
        }

        // La navegación se maneja automáticamente por el contexto
        Logger.info('Login exitoso, navegación automática activada');
      }
    } catch (error) {
      Logger.error('Error en login doctor/administrador', { 
        email: validation.data.email, 
        error: error.message, 
        status: error.status,
        type: error.type 
      });
      
      let errorMessage = 'Error al iniciar sesión';
      let errorTitle = 'Error de Autenticación';
      
      if (error.status === 401) {
        errorMessage = 'Email o contraseña incorrectos. Verifica tus credenciales.';
        errorTitle = 'Credenciales Incorrectas';
      } else if (error.status === 423) {
        errorMessage = 'Tu cuenta ha sido bloqueada temporalmente por demasiados intentos fallidos. Intenta más tarde.';
        errorTitle = 'Cuenta Bloqueada';
      } else if (error.status === 429) {
        errorMessage = 'Demasiados intentos de login. Espera unos minutos antes de intentar nuevamente.';
        errorTitle = 'Demasiados Intentos';
      } else if (error.type === 'connection_error') {
        errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
        errorTitle = 'Error de Conexión';
      } else if (error.status >= 500) {
        errorMessage = 'Error del servidor. Por favor intenta más tarde.';
        errorTitle = 'Error del Servidor';
      }

      Alert.alert(errorTitle, errorMessage, [
        { text: 'OK' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    Alert.alert(
      'Registro de Doctor',
      'Para registrarte como doctor, contacta al administrador del sistema.',
      [{ text: 'OK' }]
    );
  };

  // Cargar email recordado al montar el componente
  useEffect(() => {
    const loadRememberedEmail = async () => {
      try {
        const savedEmail = await storageService.getRememberedEmail();
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
          Logger.debug('Email recordado cargado', { savedEmail });
        }
      } catch (error) {
        Logger.error('Error cargando email recordado', error);
      }
    };

    loadRememberedEmail();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>🩺 Soy Doctor/Administrador</Text>
              <Text style={styles.subtitle}>Iniciar Sesión</Text>
            </View>

            {/* Formulario */}
            <Card style={styles.formCard}>
              <Card.Content style={styles.formContent}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                        placeholder="admin@clinica.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Contraseña</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Ingresa tu contraseña"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      <Text style={styles.eyeIcon}>
                        {showPassword ? '🔒' : '🔓'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Remember Me */}
                <TouchableOpacity
                  style={styles.rememberContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  disabled={loading}
                >
                  <View style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked
                  ]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>Recordar mi email</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                  labelStyle={styles.loginButtonLabel}
                >
                  {loading ? 'Iniciando Sesión...' : 'Iniciar Sesión'}
                </Button>

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPasswordContainer}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  <Text style={styles.forgotPasswordText}>
                    ¿Olvidaste tu contraseña?
                  </Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>¿No tienes cuenta? </Text>
              <TouchableOpacity onPress={handleRegister} disabled={loading}>
                <Text style={styles.registerLink}>Registrarse</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '500',
  },
  formCard: {
    elevation: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  formContent: {
    padding: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORES.SECUNDARIO_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORES.BLANCO,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORES.SECUNDARIO_LIGHT,
    borderRadius: 8,
    backgroundColor: COLORES.BLANCO,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 20,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORES.PRIMARIO,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORES.PRIMARIO,
  },
  checkmark: {
    color: COLORES.BLANCO,
    fontSize: 14,
    fontWeight: 'bold',
  },
  rememberText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  loginButton: {
    borderRadius: 8,
    marginBottom: 16,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  loginButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 16,
    color: COLORES.PRIMARIO,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  registerLink: {
    fontSize: 16,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '600',
  },
});

export default LoginDoctor;
