import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Title } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import gestionService from '../../api/gestionService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';

const ESTADOS = ['todos', 'abierto', 'en_curso', 'resuelto', 'cerrado'];

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

const TicketsSoporte = ({ navigation }) => {
  const { userRole } = useAuth();
  const isAdmin = ['Admin', 'admin', 'administrador'].includes(userRole);
  const [estado, setEstado] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState([]);

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      const response = isAdmin
        ? await gestionService.getAdminTickets(estado !== 'todos' ? { estado } : {})
        : await gestionService.getMyTickets();
      setTickets(Array.isArray(response?.tickets) ? response.tickets : []);
    } catch (error) {
      Logger.error('TicketsSoporte: error cargando tickets', error);
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [estado, isAdmin]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTickets();
  }, [loadTickets]);

  const emptyMessage = useMemo(() => {
    if (isAdmin) return 'No hay tickets para el filtro seleccionado.';
    return 'Aún no tienes tickets de soporte.';
  }, [isAdmin]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>{isAdmin ? 'Tickets de Soporte' : 'Mis Tickets'}</Title>
        {!isAdmin && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('TicketNuevo')}
          >
            <Text style={styles.primaryButtonText}>+ Nuevo</Text>
          </TouchableOpacity>
        )}
      </View>

      {isAdmin && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {ESTADOS.map((item) => {
            const active = estado === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setEstado(item)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color={COLORES.PRIMARIO} size="large" style={{ marginTop: 32 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {tickets.map((ticket) => (
            <Card key={String(ticket.id_ticket)} style={styles.card}>
              <Card.Content>
                <View style={styles.rowBetween}>
                  <Text style={styles.ticketId}>#{ticket.id_ticket}</Text>
                  <Text style={styles.status}>{ticket.estado}</Text>
                </View>
                <Text style={styles.subject}>{ticket.asunto}</Text>
                {isAdmin && (
                  <Text style={styles.meta}>
                    Doctor: {ticket.creador_nombre || ticket.creador_email || '—'}
                  </Text>
                )}
                <Text style={styles.meta}>
                  Prioridad: {ticket.prioridad || 'media'} · Actualizado: {formatDateTime(ticket.updated_at)}
                </Text>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate('TicketDetalle', { ticketId: ticket.id_ticket, adminView: isAdmin })}
                >
                  <Text style={styles.linkButtonText}>Abrir ticket</Text>
                </TouchableOpacity>
              </Card.Content>
            </Card>
          ))}
          {!tickets.length && <Text style={styles.emptyText}>{emptyMessage}</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.FONDO },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: COLORES.NAV_PRIMARIO, fontWeight: '700' },
  filtersRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    backgroundColor: COLORES.FONDO_CARD,
  },
  chipActive: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderColor: COLORES.NAV_PRIMARIO,
  },
  chipText: { color: COLORES.TEXTO_PRIMARIO, textTransform: 'capitalize', fontSize: 12 },
  chipTextActive: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '700' },
  card: { marginHorizontal: 16, marginVertical: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketId: { color: COLORES.TEXTO_SECUNDARIO, fontSize: 12 },
  status: { color: COLORES.NAV_PRIMARIO, fontWeight: '700', textTransform: 'capitalize' },
  subject: { color: COLORES.TEXTO_PRIMARIO, fontWeight: '700', marginTop: 4, marginBottom: 4 },
  meta: { color: COLORES.TEXTO_SECUNDARIO, fontSize: 12, marginBottom: 2 },
  linkButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: COLORES.SECUNDARIO_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkButtonText: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '600' },
  primaryButton: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonText: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '700' },
  emptyText: {
    textAlign: 'center',
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 32,
    marginHorizontal: 20,
  },
});

export default TicketsSoporte;
