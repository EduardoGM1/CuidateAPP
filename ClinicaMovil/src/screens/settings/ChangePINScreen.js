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
import { pacienteAuthService } from '../../api/authService';
import { storageService } from '../../services/storageService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';

const ChangePINScreen = ({ navigation }) => {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePIN = (pin) => {
    if (!/^\d{4}$/.test(pin)) {
      return 'El PIN debe tener exactamente 4 dígitos';
    }

    // Validar PINs débiles
    const weakPINs = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    if (weakPINs.includes(pin)) {
      return 'El PIN es demasiado débil. Elige un PIN más seguro';
    }

    return null;
  };

  const handleChangePIN = async () => {
    if (!currentPin.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu PIN actual');
      return;
    }

    if (!newPin.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nuevo PIN');
      return;
    }

    const pinError = validatePIN(newPin);
    if (pinError) {
      Alert.alert('Error', pinError);
      return;
    }

    if (newPin === currentPin) {
      Alert.alert('Error', 'El nuevo PIN debe ser diferente al actual');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'Los PINs no coinciden');
      return;
    }

    setLoading(true);
    try {
      Logger.info('Cambiando PIN');
      
      const deviceId = await storageService.getOrCreateDeviceId();
      const response = await pacienteAuthService.changePIN(currentPin, newPin, deviceId);
      
      if (response.success) {
        Alert.alert(
          'PIN Cambiado',
          'Tu PIN ha sido cambiado exitosamente.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Limpiar campos
                setCurrentPin('');
                setNewPin('');
                setConfirmPin('');
                // Navegar de vuelta
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      Logger.error('Error cambiando PIN', error);
      
      let errorMessage = 'Error al cambiar el PIN. Por favor, intenta nuevamente.';
      
      if (error.response?.status === 401) {
        errorMessage = 'El PIN actual es incorrecto';
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
                  <Text style={styles.title}>Cambiar PIN</Text>
                  <Text style={styles.subtitle}>
                    Ingresa tu PIN actual y el nuevo PIN de 4 dígitos
                  </Text>
                </View>

                {/* Current PIN Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>PIN Actual</Text>
                  <TextInput
                    style={styles.pinInput}
                    value={currentPin}
                    onChangeText={(text) => setCurrentPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="0000"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    editable={!loading}
                    autoFocus
                  />
                </View>

                {/* New PIN Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Nuevo PIN</Text>
                  <TextInput
                    style={styles.pinInput}
                    value={newPin}
                    onChangeText={(text) => setNewPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="0000"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    editable={!loading}
                  />
                  <Text style={styles.helperText}>
                    El PIN debe tener 4 dígitos y no puede ser 0000, 1111, 1234, etc.
                  </Text>
                </View>

                {/* Confirm PIN Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirmar Nuevo PIN</Text>
                  <TextInput
                    style={styles.pinInput}
                    value={confirmPin}
                    onChangeText={(text) => setConfirmPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="0000"
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>

                {/* Submit Button */}
                <Button
                  mode="contained"
                  onPress={handleChangePIN}
                  loading={loading}
                  disabled={loading || !currentPin.trim() || !newPin.trim() || !confirmPin.trim() || currentPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
                  style={styles.submitButton}
                  contentStyle={styles.submitButtonContent}
                  labelStyle={styles.submitButtonLabel}
                >
                  {loading ? 'Cambiando...' : 'Cambiar PIN'}
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
  pinInput: {
    borderWidth: 1,
    borderColor: COLORES.BORDE,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    backgroundColor: '#fff',
    color: COLORES.TEXTO,
    fontWeight: '600',
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

export default ChangePINScreen;

