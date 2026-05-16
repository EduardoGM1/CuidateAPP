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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from 'react-native-paper';
import { doctorAuthService } from '../../api/authService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import PrivacyFooterLink from '../../components/legal/PrivacyFooterLink';

const ResetPasswordScreen = ({ route, navigation }) => {
  const token = route.params?.token;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      Alert.alert(
        'Token Inválido',
        'El enlace de recuperación no es válido o ha expirado.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('LoginDoctor'),
          },
        ]
      );
    }
  }, [token, navigation]);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    return null;
  };

  const handleResetPassword = async () => {
    if (!token) {
      Alert.alert('Error', 'Token de recuperación no válido');
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert('Error', 'Por favor ingresa una nueva contraseña');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      Logger.info('Reseteando contraseña', { token: token.substring(0, 10) + '...' });
      
      const response = await doctorAuthService.resetPassword(token, newPassword);
      
      if (response.success) {
        Alert.alert(
          'Contraseña Restablecida',
          'Tu contraseña ha sido restablecida exitosamente. Por favor, inicia sesión con tu nueva contraseña.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('LoginDoctor'),
            },
          ]
        );
      }
    } catch (error) {
      Logger.error('Error reseteando contraseña', error);
      
      let errorMessage = 'Error al restablecer la contraseña. Por favor, intenta nuevamente.';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.response?.status === 401) {
        errorMessage = 'El token ha expirado o es inválido. Por favor, solicita un nuevo enlace de recuperación.';
      }
      
      Alert.alert('Error', errorMessage, [
        {
          text: 'Solicitar Nuevo Enlace',
          onPress: () => navigation.navigate('ForgotPassword'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return null; // El useEffect manejará la navegación
  }

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
            <Card style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.header}>
                  <Text style={styles.title}>Restablecer Contraseña</Text>
                  <Text style={styles.subtitle}>
                    Ingresa tu nueva contraseña
                  </Text>
                </View>

                {/* New Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Nueva Contraseña</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Mínimo 8 caracteres"
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
                        {showPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    La contraseña debe tener al menos 8 caracteres
                  </Text>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirmar Contraseña</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirma tu contraseña"
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      <Text style={styles.eyeIcon}>
                        {showConfirmPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <Button
                  mode="contained"
                  onPress={handleResetPassword}
                  loading={loading}
                  disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
                  style={styles.submitButton}
                  contentStyle={styles.submitButtonContent}
                  labelStyle={styles.submitButtonLabel}
                >
                  {loading ? 'Restableciendo...' : 'Restablecer Contraseña'}
                </Button>

                <PrivacyFooterLink navigation={navigation} />

                {/* Back to Login */}
                <TouchableOpacity
                  style={styles.backContainer}
                  onPress={() => navigation.navigate('LoginDoctor')}
                  disabled={loading}
                >
                  <Text style={styles.backText}>Volver a Iniciar Sesión</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
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
  card: {
    borderRadius: 12,
    elevation: 4,
  },
  cardContent: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    borderRadius: 8,
    backgroundColor: COLORES.BLANCO,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
  },
  eyeButton: {
    padding: 12,
  },
  eyeIcon: {
    fontSize: 20,
  },
  helperText: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  backContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  backText: {
    fontSize: 14,
    color: COLORES.PRIMARIO,
    fontWeight: '500',
  },
});

export default ResetPasswordScreen;

