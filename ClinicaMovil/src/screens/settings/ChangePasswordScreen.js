import React, { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';

const ChangePasswordScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    return null;
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu contraseña actual');
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

    if (newPassword === currentPassword) {
      Alert.alert('Error', 'La nueva contraseña debe ser diferente a la actual');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      Logger.info('Cambiando contraseña');
      
      const response = await doctorAuthService.changePassword(currentPassword, newPassword);
      
      if (response.success) {
        Alert.alert(
          'Contraseña Cambiada',
          'Tu contraseña ha sido cambiada exitosamente. Se cerrará tu sesión para que inicies con tu nueva contraseña.',
          [
            {
              text: 'OK',
              onPress: async () => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                await logout();
              },
            },
          ]
        );
      }
    } catch (error) {
      Logger.error('Error cambiando contraseña', error);
      
      let errorMessage = 'Error al cambiar la contraseña. Por favor, intenta nuevamente.';
      
      if (error.response?.status === 401) {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || errorMessage;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
                  <Text style={styles.title}>Cambiar Contraseña</Text>
                  <Text style={styles.subtitle}>
                    Ingresa tu contraseña actual y la nueva contraseña
                  </Text>
                </View>

                {/* Current Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Contraseña Actual</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Ingresa tu contraseña actual"
                      secureTextEntry={!showCurrentPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      disabled={loading}
                    >
                      <Text style={styles.eyeIcon}>
                        {showCurrentPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
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
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      disabled={loading}
                    >
                      <Text style={styles.eyeIcon}>
                        {showNewPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    La contraseña debe tener al menos 8 caracteres
                  </Text>
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirma tu nueva contraseña"
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
                  onPress={handleChangePassword}
                  loading={loading}
                  disabled={loading || !currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()}
                  style={styles.submitButton}
                  contentStyle={styles.submitButtonContent}
                  labelStyle={styles.submitButtonLabel}
                >
                  {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
                </Button>
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
    color: COLORES.TEXTO,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORES.BORDE,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORES.TEXTO,
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
});

export default ChangePasswordScreen;

