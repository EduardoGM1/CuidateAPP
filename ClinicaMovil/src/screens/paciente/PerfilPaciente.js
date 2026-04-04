/**
 * Perfil del paciente: datos básicos, acceso a configuración y reinicio selectivo del tutorial.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import BackHeader from '../../components/common/BackHeader';
import OnboardingResetPickerModal from '../../components/onboarding/OnboardingResetPickerModal';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';

const PerfilPaciente = () => {
  const navigation = useNavigation();
  const { logout, userData } = useAuth();
  const { speak } = useTTS();
  const [guiaPickerVisible, setGuiaPickerVisible] = useState(false);

  const nombreMostrar =
    userData?.nombre_completo ||
    [userData?.nombre, userData?.apellido_paterno, userData?.apellido_materno]
      .filter(Boolean)
      .join(' ') ||
    'Paciente';

  const handleLogout = useCallback(() => {
    hapticService.light();
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          Logger.info('Logout desde PerfilPaciente');
          await logout();
        },
      },
    ]);
  }, [logout]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BackHeader
          variant="patient"
          title="Mi perfil"
          onBack={() => navigation.navigate('InicioPaciente')}
        />

        <Text style={styles.title}>👤 Tu perfil</Text>
        <Text style={styles.subtitle}>Cuenta y ayuda de la app</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Nombre</Text>
          <Text style={styles.value}>{nombreMostrar}</Text>
          {userData?.email ? (
            <>
              <Text style={[styles.label, styles.labelSpaced]}>Correo</Text>
              <Text style={styles.value}>{userData.email}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Ajustes</Text>
          <TouchableOpacity
            style={styles.rowBtn}
            onPress={() => {
              hapticService.light();
              navigation.navigate('Configuracion');
              speak('Configuración');
            }}
          >
            <Text style={styles.rowIcon}>🔊</Text>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Configuración y accesibilidad</Text>
              <Text style={styles.rowSub}>Audio, letra grande, notificaciones</Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Guía del tutorial</Text>
          <TouchableOpacity style={styles.rowBtn} onPress={() => setGuiaPickerVisible(true)}>
            <Text style={styles.rowIcon}>🎯</Text>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowTitle}>Elegir qué reiniciar</Text>
              <Text style={styles.rowSub}>
                Introducción o ayuda al abrir cada pantalla (citas, medicamentos, etc.)
              </Text>
            </View>
            <Text style={styles.rowArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      <OnboardingResetPickerModal
        visible={guiaPickerVisible}
        onClose={() => setGuiaPickerVisible(false)}
        variant="patient"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  scroll: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  label: {
    fontSize: 13,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
  },
  labelSpaced: { marginTop: 12 },
  value: {
    fontSize: 17,
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: '600',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    marginBottom: 12,
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.FONDO,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  rowIcon: { fontSize: 22, marginRight: 12 },
  rowTextWrap: { flex: 1 },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
  },
  rowSub: {
    fontSize: 13,
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 4,
  },
  rowArrow: {
    fontSize: 18,
    color: COLORES.NAV_PACIENTE,
    fontWeight: 'bold',
  },
  logoutBtn: {
    marginTop: 12,
    backgroundColor: COLORES.ERROR_LIGHT,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 17,
    fontWeight: '600',
  },
});

export default PerfilPaciente;
