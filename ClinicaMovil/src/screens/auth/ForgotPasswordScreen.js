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

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    setLoading(true);
    try {
      Logger.info('Solicitando recuperación de contraseña', { email: email.substring(0, 3) + '***' });
      
      const response = await doctorAuthService.forgotPassword(email.trim());
      
      if (response.success) {
        Alert.alert(
          'Solicitud Enviada',
          'Si el email existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña. Por favor, revisa tu bandeja de entrada.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      Logger.error('Error solicitando recuperación de contraseña', error);
      
      // Mostrar mensaje genérico para no revelar si el email existe
      Alert.alert(
        'Solicitud Enviada',
        'Si el email existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña.',
        [{ text: 'OK' }]
      );
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
                  <Text style={styles.title}>Recuperar Contraseña</Text>
                  <Text style={styles.subtitle}>
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
                  </Text>
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    autoFocus
                  />
                </View>

                {/* Submit Button */}
                <Button
                  mode="contained"
                  onPress={handleForgotPassword}
                  loading={loading}
                  disabled={loading || !email.trim()}
                  style={styles.submitButton}
                  contentStyle={styles.submitButtonContent}
                  labelStyle={styles.submitButtonLabel}
                >
                  {loading ? 'Enviando...' : 'Enviar Solicitud'}
                </Button>

                {/* Back to Login */}
                <TouchableOpacity
                  style={styles.backContainer}
                  onPress={() => navigation.goBack()}
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
    color: COLORES.TEXTO,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORES.BORDE,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: COLORES.TEXTO,
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

export default ForgotPasswordScreen;

