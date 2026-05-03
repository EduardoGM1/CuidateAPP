import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  Pressable,
  DeviceEventEmitter,
  Alert,
} from 'react-native';
import {
  MOBILE_ONBOARDING_RESET_EVENT,
  clearProfessionalShellStorage,
  clearPatientShellStorage,
  clearProfessionalSectionTipsStorage,
  clearStackTourKeysForScreens,
  resetAllMobileOnboarding,
} from '../../onboarding/mobileOnboardingStorage';
import { PROFESSIONAL_STACK_TOURS } from '../../onboarding/professionalStackScreensContent';
import { PATIENT_STACK_TOURS } from '../../onboarding/patientOnboardingContent';
import { COLORES } from '../../utils/constantes';

const PRO_STACK_SCREENS = Object.keys(PROFESSIONAL_STACK_TOURS);
const PAT_STACK_SCREENS = Object.keys(PATIENT_STACK_TOURS);

const PRO_STACK_LABELS = {
  DetalleDoctor: 'Detalle del doctor',
  DetallePaciente: 'Detalle del paciente',
  AgregarDoctor: 'Agregar doctor',
  EditarDoctor: 'Editar doctor',
  AgregarPaciente: 'Agregar paciente',
  EditarPaciente: 'Editar paciente',
  GestionMedicamentos: 'Medicamentos',
  GestionModulos: 'Módulos',
  GestionInstituciones: 'Instituciones',
  GestionComorbilidades: 'Comorbilidades',
  GestionVacunas: 'Vacunas',
  VerTodasCitas: 'Todas las citas',
  HistorialAuditoria: 'Historial de auditoría',
  HistorialNotificaciones: 'Notificaciones',
  GraficosEvolucion: 'Gráficos de evolución',
  ListaPacientesDoctor: 'Mis pacientes',
  ReportesAdmin: 'Reportes',
  GestionSolicitudesReprogramacion: 'Solicitudes de reprogramación',
  ChatPaciente: 'Chat con paciente',
  ChangePassword: 'Cambiar contraseña',
};

const PAT_STACK_LABELS = Object.fromEntries(
  PAT_STACK_SCREENS.map((name) => {
    const steps = PATIENT_STACK_TOURS[name]?.steps;
    const label = steps?.[0]?.title || name;
    return [name, label];
  }),
);

function initialSet(keys) {
  const o = {};
  keys.forEach((k) => {
    o[k] = false;
  });
  return o;
}

/**
 * Modal para elegir qué partes del onboarding reiniciar (profesional o paciente).
 */
export default function OnboardingResetPickerModal({ visible, onClose, variant = 'professional' }) {
  const stackKeys = variant === 'professional' ? PRO_STACK_SCREENS : PAT_STACK_SCREENS;
  const stackLabels = variant === 'professional' ? PRO_STACK_LABELS : PAT_STACK_LABELS;

  const [intro, setIntro] = useState(false);
  const [sectionTips, setSectionTips] = useState(false);
  const [stackPicks, setStackPicks] = useState(() => initialSet(stackKeys));

  useEffect(() => {
    if (!visible) return;
    setIntro(false);
    setSectionTips(false);
    const keys = variant === 'professional' ? PRO_STACK_SCREENS : PAT_STACK_SCREENS;
    setStackPicks(initialSet(keys));
  }, [visible, variant]);

  const resetForm = useCallback(() => {
    setIntro(false);
    setSectionTips(false);
    setStackPicks(initialSet(stackKeys));
  }, [stackKeys]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const toggleStack = useCallback((name) => {
    setStackPicks((prev) => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const selectAllStacks = useCallback(() => {
    const next = {};
    stackKeys.forEach((k) => {
      next[k] = true;
    });
    setStackPicks(next);
  }, [stackKeys]);

  const clearAllStacks = useCallback(() => {
    setStackPicks(initialSet(stackKeys));
  }, [stackKeys]);

  const selectedStackNames = useMemo(
    () => stackKeys.filter((k) => stackPicks[k]),
    [stackKeys, stackPicks],
  );

  const applyReset = useCallback(async () => {
    const anyStack = selectedStackNames.length > 0;
    if (!intro && !sectionTips && !anyStack) {
      Alert.alert(
        'Nada seleccionado',
        'Marca al menos una casilla o, si prefieres, el botón de abajo para reiniciar toda la guía.',
      );
      return;
    }
    try {
      if (variant === 'professional') {
        if (intro) await clearProfessionalShellStorage();
        if (sectionTips) await clearProfessionalSectionTipsStorage();
        if (anyStack) await clearStackTourKeysForScreens(selectedStackNames);
      } else {
        if (intro) await clearPatientShellStorage();
        if (anyStack) await clearStackTourKeysForScreens(selectedStackNames);
      }
      DeviceEventEmitter.emit(MOBILE_ONBOARDING_RESET_EVENT);
      Alert.alert(
        'Hecho',
        'Cuando vuelvas a esas pantallas, te mostraremos otra vez la ayuda que elegiste.',
      );
      handleClose();
    } catch (e) {
      Alert.alert('No se pudo guardar', 'Vuelve a intentarlo en unos segundos.');
    }
  }, [intro, sectionTips, selectedStackNames, variant, handleClose]);

  const applyResetAll = useCallback(async () => {
    try {
      await resetAllMobileOnboarding();
      DeviceEventEmitter.emit(MOBILE_ONBOARDING_RESET_EVENT);
      Alert.alert('Hecho', 'Toda la guía volverá a mostrarse desde el principio.');
      handleClose();
    } catch (e) {
      Alert.alert('Algo salió mal', 'No pudimos reiniciar la guía. Inténtalo otra vez.');
    }
  }, [handleClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Volver a ver la guía</Text>
          <Text style={styles.hint}>
            Marca solo lo que quieras recordar. No borramos tus datos ni cerramos tu sesión.
          </Text>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {variant === 'professional' ? (
              <>
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Introducción (menú ☰)</Text>
                    <Text style={styles.rowSub}>Lo primero que ves al entrar con el menú lateral</Text>
                  </View>
                  <Switch value={intro} onValueChange={setIntro} />
                </View>
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Consejos al cambiar de sección</Text>
                    <Text style={styles.rowSub}>Dashboard, Gestión, Mensajes y Perfil</Text>
                  </View>
                  <Switch value={sectionTips} onValueChange={setSectionTips} />
                </View>
              </>
            ) : (
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Introducción para pacientes</Text>
                  <Text style={styles.rowSub}>Mensaje de bienvenida y primeros pasos</Text>
                </View>
                <Switch value={intro} onValueChange={setIntro} />
              </View>
            )}

            <Text style={styles.subheading}>Ayuda al entrar en cada pantalla</Text>
            <View style={styles.stackActions}>
              <TouchableOpacity onPress={selectAllStacks}>
                <Text style={styles.link}>Marcar todas</Text>
              </TouchableOpacity>
              <Text style={styles.dot}> · </Text>
              <TouchableOpacity onPress={clearAllStacks}>
                <Text style={styles.link}>Quitar todas</Text>
              </TouchableOpacity>
            </View>
            {stackKeys.map((name) => (
              <View key={name} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{stackLabels[name] || name}</Text>
                </View>
                <Switch value={!!stackPicks[name]} onValueChange={() => toggleStack(name)} />
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.primaryBtn} onPress={applyReset}>
            <Text style={styles.primaryBtnText}>Guardar lo que marqué</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={applyResetAll}>
            <Text style={styles.secondaryBtnText}>Reiniciar toda la guía desde cero</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 16,
  },
  scroll: {
    maxHeight: 360,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginTop: 8,
    marginBottom: 8,
  },
  stackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  link: {
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '600',
    fontSize: 14,
  },
  dot: {
    color: COLORES.TEXTO_SECUNDARIO,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  rowText: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
  },
  rowSub: {
    fontSize: 13,
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: {
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '600',
    fontSize: 15,
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORES.TEXTO_SECUNDARIO,
    fontSize: 15,
  },
});
