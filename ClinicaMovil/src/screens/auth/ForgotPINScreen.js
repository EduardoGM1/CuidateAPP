import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button } from 'react-native-paper';
import { COLORES } from '../../utils/constantes';

const ForgotPINScreen = ({ navigation }) => {
  const handleContactDoctor = () => {
    Alert.alert(
      'Contactar a tu Médico',
      'Para recuperar tu PIN, necesitas contactar a tu médico asignado. Él podrá ayudarte a restablecer tu PIN de forma segura.',
      [
        {
          text: 'Entendido',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const handleCallDoctor = () => {
    // Aquí podrías obtener el número del médico desde el contexto o parámetros
    // Por ahora, mostramos un mensaje informativo
    Alert.alert(
      'Llamar al Médico',
      'Para obtener el número de teléfono de tu médico, contacta a la clínica o revisa tu información de contacto en la aplicación.',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.header}>
                <Text style={styles.icon}>🔒</Text>
                <Text style={styles.title}>Olvidé mi PIN</Text>
                <Text style={styles.subtitle}>
                  Para recuperar tu PIN, necesitas contactar a tu médico asignado.
                </Text>
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.infoTitle}>¿Por qué contactar al médico?</Text>
                <Text style={styles.infoText}>
                  Por seguridad, solo tu médico asignado puede ayudarte a restablecer tu PIN. 
                  Esto asegura que solo tú puedas acceder a tu información médica.
                </Text>
              </View>

              <View style={styles.stepsContainer}>
                <Text style={styles.stepsTitle}>Pasos para recuperar tu PIN:</Text>
                
                <View style={styles.step}>
                  <Text style={styles.stepNumber}>1</Text>
                  <Text style={styles.stepText}>Contacta a tu médico asignado</Text>
                </View>
                
                <View style={styles.step}>
                  <Text style={styles.stepNumber}>2</Text>
                  <Text style={styles.stepText}>Verifica tu identidad con el médico</Text>
                </View>
                
                <View style={styles.step}>
                  <Text style={styles.stepNumber}>3</Text>
                  <Text style={styles.stepText}>El médico te ayudará a restablecer tu PIN</Text>
                </View>
              </View>

              <Button
                mode="contained"
                onPress={handleContactDoctor}
                style={styles.contactButton}
                contentStyle={styles.contactButtonContent}
                labelStyle={styles.contactButtonLabel}
              >
                Entendido
              </Button>

              <TouchableOpacity
                style={styles.backContainer}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backText}>Volver a Iniciar Sesión</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
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
  icon: {
    fontSize: 64,
    marginBottom: 16,
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
  infoContainer: {
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 20,
  },
  stepsContainer: {
    marginBottom: 24,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORES.PRIMARIO,
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
    lineHeight: 20,
  },
  contactButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  contactButtonContent: {
    paddingVertical: 8,
  },
  contactButtonLabel: {
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

export default ForgotPINScreen;

