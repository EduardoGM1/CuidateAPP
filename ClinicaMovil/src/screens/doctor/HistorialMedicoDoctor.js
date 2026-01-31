/**
 * Pantalla: Historial Médico Consolidado del Doctor
 * 
 * Muestra el historial médico consolidado de todos los pacientes asignados al doctor.
 * 
 * @author Senior Developer
 * @date 2025-12-05
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';

const HistorialMedicoDoctor = ({ navigation }) => {
  const { userData, userRole } = useAuth();

  // Validar que solo doctores puedan acceder
  useEffect(() => {
    if (userRole !== 'Doctor' && userRole !== 'doctor') {
      Logger.warn('Acceso no autorizado a HistorialMedicoDoctor', { userRole });
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);

  // Si no es doctor, no renderizar nada
  if (userRole !== 'Doctor' && userRole !== 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>🚫 Acceso Denegado</Text>
          <Text style={styles.accessDeniedMessage}>
            Solo los doctores pueden acceder a esta pantalla.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Historial Médico Consolidado</Text>
        <Text style={styles.headerSubtitle}>
          Historial médico de pacientes asignados
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholderText}>
          Contenido en construcción...
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
  },
  header: {
    padding: 20,
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.TEXTO_EN_PRIMARIO,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORES.NAV_PRIMARIO_INACTIVO,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.ERROR_LIGHT,
    marginBottom: 10,
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
});

export default HistorialMedicoDoctor;
