import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Title } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import gestionService from '../../api/gestionService';
import { COLORES } from '../../utils/constantes';

const CATEGORIAS = ['tecnico', 'cita_paciente', 'acceso', 'otro'];
const PRIORIDADES = ['baja', 'media', 'alta'];

const TicketNuevo = ({ navigation }) => {
  const { userRole } = useAuth();
  const isDoctor = ['Doctor', 'doctor'].includes(userRole);
  const [saving, setSaving] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [categoria, setCategoria] = useState('otro');
  const [prioridad, setPrioridad] = useState('media');

  const canCreate = useMemo(() => isDoctor, [isDoctor]);

  const handleSubmit = async () => {
    if (!canCreate) {
      Alert.alert('Permiso denegado', 'Solo doctores pueden crear tickets.');
      return;
    }
    if (!asunto.trim() || !cuerpo.trim()) {
      Alert.alert('Validación', 'Completa asunto y descripción.');
      return;
    }

    try {
      setSaving(true);
      const res = await gestionService.createTicket({
        asunto: asunto.trim(),
        cuerpo: cuerpo.trim(),
        categoria,
        prioridad,
      });
      const ticketId = res?.ticket?.id_ticket;
      Alert.alert('Éxito', 'Ticket creado correctamente.');
      if (ticketId) {
        navigation.replace('TicketDetalle', { ticketId, adminView: false });
      } else {
        navigation.replace('TicketsSoporte');
      }
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'No se pudo crear el ticket.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!canCreate) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Solo doctores pueden crear tickets de soporte.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Title style={styles.title}>Nuevo Ticket</Title>
        <Text style={styles.label}>Asunto *</Text>
        <TextInput
          value={asunto}
          onChangeText={setAsunto}
          placeholder="Resumen breve del problema"
          style={styles.input}
          maxLength={200}
        />

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.rowWrap}>
          {CATEGORIAS.map((item) => {
            const selected = categoria === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setCategoria(item)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Prioridad</Text>
        <View style={styles.rowWrap}>
          {PRIORIDADES.map((item) => {
            const selected = prioridad === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setPrioridad(item)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Descripción *</Text>
        <TextInput
          value={cuerpo}
          onChangeText={setCuerpo}
          placeholder="Describe el problema o la solicitud"
          style={[styles.input, styles.textArea]}
          multiline
          numberOfLines={6}
          maxLength={8000}
        />

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
            <Text style={styles.btnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Enviando...' : 'Enviar ticket'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.FONDO },
  content: { padding: 16, paddingBottom: 30 },
  title: { color: COLORES.NAV_PRIMARIO, marginBottom: 10 },
  label: { color: COLORES.TEXTO_SECUNDARIO, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 10,
    backgroundColor: COLORES.FONDO_CARD,
    color: COLORES.TEXTO_PRIMARIO,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: { minHeight: 130, textAlignVertical: 'top' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    backgroundColor: COLORES.FONDO_CARD,
  },
  chipActive: { borderColor: COLORES.NAV_PRIMARIO, backgroundColor: COLORES.NAV_PRIMARIO },
  chipText: { color: COLORES.TEXTO_PRIMARIO, textTransform: 'capitalize' },
  chipTextActive: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelBtn: { backgroundColor: COLORES.SECUNDARIO_LIGHT, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  saveBtn: { backgroundColor: COLORES.NAV_PRIMARIO, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  btnText: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  errorText: { color: COLORES.TEXTO_SECUNDARIO, textAlign: 'center' },
});

export default TicketNuevo;
