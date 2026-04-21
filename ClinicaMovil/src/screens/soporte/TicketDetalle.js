import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Title } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import gestionService from '../../api/gestionService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';

const ESTADOS = ['abierto', 'en_curso', 'resuelto', 'cerrado'];
const PRIORIDADES = ['baja', 'media', 'alta'];

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const TicketDetalle = ({ route, navigation }) => {
  const { userRole } = useAuth();
  const isAdmin = ['Admin', 'admin', 'administrador'].includes(userRole);
  const ticketId = route?.params?.ticketId;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [messageText, setMessageText] = useState('');

  const canAdminPatch = useMemo(() => isAdmin, [isAdmin]);

  const loadTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const res = await gestionService.getTicket(ticketId);
      setTicket(res?.ticket || null);
    } catch (error) {
      Logger.error('TicketDetalle: error cargando ticket', error);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handlePatchField = useCallback(async (field, value) => {
    if (!canAdminPatch || !ticket?.id_ticket) return;
    try {
      setSaving(true);
      await gestionService.patchTicket(ticket.id_ticket, { [field]: value });
      await loadTicket();
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'No se pudo actualizar.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [canAdminPatch, loadTicket, ticket?.id_ticket]);

  const sendMessage = useCallback(async () => {
    if (!ticket?.id_ticket || !messageText.trim()) return;
    try {
      setSaving(true);
      await gestionService.postTicketMessage(ticket.id_ticket, messageText.trim());
      setMessageText('');
      await loadTicket();
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'No se pudo enviar el mensaje.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [loadTicket, messageText, ticket?.id_ticket]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={COLORES.PRIMARIO} size="large" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No se encontró el ticket o no tienes permiso.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const closed = ticket.estado === 'cerrado';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Ticket #{ticket.id_ticket}</Title>
            <Text style={styles.subject}>{ticket.asunto}</Text>
            <Text style={styles.meta}>
              Estado: {ticket.estado} · Prioridad: {ticket.prioridad} · Categoría: {ticket.categoria}
            </Text>
            <Text style={styles.meta}>Doctor: {ticket.creador_nombre || ticket.creador_email || '—'}</Text>
          </Card.Content>
        </Card>

        {canAdminPatch && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.adminTitle}>Administración</Text>
              <Text style={styles.adminLabel}>Estado</Text>
              <View style={styles.rowWrap}>
                {ESTADOS.map((estado) => {
                  const selected = ticket.estado === estado;
                  return (
                    <TouchableOpacity
                      key={estado}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => handlePatchField('estado', estado)}
                      disabled={saving}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{estado}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.adminLabel}>Prioridad</Text>
              <View style={styles.rowWrap}>
                {PRIORIDADES.map((prioridad) => {
                  const selected = ticket.prioridad === prioridad;
                  return (
                    <TouchableOpacity
                      key={prioridad}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => handlePatchField('prioridad', prioridad)}
                      disabled={saving}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{prioridad}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card.Content>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Mensajes</Text>
        {(ticket.mensajes || []).map((m) => (
          <Card key={String(m.id_mensaje)} style={styles.card}>
            <Card.Content>
              <Text style={styles.meta}>
                {m.autor_email || '—'} · {formatDateTime(m.created_at)}
              </Text>
              <Text style={styles.body}>{m.cuerpo}</Text>
            </Card.Content>
          </Card>
        ))}

        {!closed && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.adminLabel}>Nuevo mensaje</Text>
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Escribe tu mensaje..."
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={4}
                editable={!saving}
              />
              <TouchableOpacity
                style={[styles.primaryButton, { alignSelf: 'flex-end', marginTop: 10 }]}
                onPress={sendMessage}
                disabled={saving || !messageText.trim()}
              >
                <Text style={styles.primaryButtonText}>{saving ? 'Enviando...' : 'Enviar'}</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.FONDO },
  card: { marginHorizontal: 16, marginTop: 10 },
  title: { color: COLORES.NAV_PRIMARIO, fontWeight: '700' },
  subject: { color: COLORES.TEXTO_PRIMARIO, fontWeight: '700', marginBottom: 6 },
  meta: { color: COLORES.TEXTO_SECUNDARIO, fontSize: 12, marginBottom: 4 },
  sectionTitle: { color: COLORES.NAV_PRIMARIO, fontWeight: '700', fontSize: 16, marginHorizontal: 16, marginTop: 12 },
  body: { color: COLORES.TEXTO_PRIMARIO, lineHeight: 20 },
  adminTitle: { color: COLORES.TEXTO_PRIMARIO, fontWeight: '700', marginBottom: 8 },
  adminLabel: { color: COLORES.TEXTO_SECUNDARIO, fontWeight: '600', marginBottom: 6 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    backgroundColor: COLORES.FONDO_CARD,
  },
  chipActive: { backgroundColor: COLORES.NAV_PRIMARIO, borderColor: COLORES.NAV_PRIMARIO },
  chipText: { color: COLORES.TEXTO_PRIMARIO, textTransform: 'capitalize' },
  chipTextActive: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 10,
    backgroundColor: COLORES.FONDO_CARD,
    color: COLORES.TEXTO_PRIMARIO,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: { minHeight: 110, textAlignVertical: 'top' },
  primaryButton: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonText: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { color: COLORES.TEXTO_SECUNDARIO, textAlign: 'center', marginBottom: 14 },
});

export default TicketDetalle;
