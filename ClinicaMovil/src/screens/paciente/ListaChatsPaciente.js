/**
 * Lista de conversaciones: todos los médicos asignados (doctor_paciente),
 * con o sin mensajes. Al elegir uno se abre el chat filtrado por id_doctor.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import chatService from '../../api/chatService';
import gestionService from '../../api/gestionService';
import BackHeader from '../../components/common/BackHeader';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import useTTS from '../../hooks/useTTS';
import usePacienteData from '../../hooks/usePacienteData';

/** Unifica id de médico para Map/merge (evita filas duplicadas número vs string). */
function normalizeDoctorId(raw) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Texto para lista y navegación: prioriza nombre_completo útil; si no, arma desde partes. */
function nombreDoctorParaUi(d) {
  if (!d || typeof d !== 'object') return 'Médico';
  const nc = String(d.nombre_completo || '').trim();
  if (nc && nc !== 'Médico') return nc;
  const parts = [d.nombre, d.apellido_paterno, d.apellido_materno]
    .map((x) => (x != null ? String(x).trim() : ''))
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  return 'Médico';
}

/** Si el backend aún no tiene GET .../conversaciones-asignadas (404), se usa GET /pacientes/:id/doctores */
function mapDoctoresFallbackToConversaciones(doctores) {
  if (!Array.isArray(doctores)) return [];
  return doctores.map((d) => {
    const idDoc = normalizeDoctorId(d.id_doctor);
    if (idDoc == null) return null;
    const doctorObj = {
      id_doctor: idDoc,
      nombre: d.nombre != null ? String(d.nombre) : '',
      apellido_paterno: d.apellido_paterno != null ? String(d.apellido_paterno) : '',
      apellido_materno: d.apellido_materno != null ? String(d.apellido_materno) : '',
      nombre_completo: d.nombre_completo != null ? String(d.nombre_completo) : '',
      activo: d.activo !== false,
    };
    doctorObj.nombre_completo = nombreDoctorParaUi(doctorObj);
    return {
      id_doctor: idDoc,
      doctor: doctorObj,
      ultimo_mensaje: null,
      mensajes_no_leidos: 0,
      ultima_fecha: d.fecha_asignacion || null,
    };
  }).filter(Boolean);
}

function extractDoctoresFromPacientePayload(payload) {
  if (!payload || typeof payload !== 'object') return [];

  const roots = [payload, payload.data].filter(Boolean);
  for (const root of roots) {
    // Lista normalizada desde API (pacienteMapper.doctores)
    if (Array.isArray(root.doctores) && root.doctores.length > 0) {
      return root.doctores;
    }
    const candidatos = [
      root.Doctores,
      root.Doctors,
      root.doctors,
      root.medicos,
      root.Medicos,
    ];
    const lista = candidatos.find((c) => Array.isArray(c) && c.length > 0);
    if (lista) return lista;
    // normalizePaciente solo exponía el primer médico
    if (root.id_doctor) {
      return [
        {
          id_doctor: root.id_doctor,
          nombre_completo: root.doctor_nombre || 'Médico',
          activo: true,
          fecha_asignacion: null,
        },
      ];
    }
  }
  return [];
}

function previewDesdeMensaje(m) {
  if (!m) return null;
  let preview = '';
  if (m.mensaje_texto) preview = String(m.mensaje_texto);
  else if (m.mensaje_audio_transcripcion) preview = String(m.mensaje_audio_transcripcion);
  else preview = 'Mensaje de voz';
  if (preview.length > 50) preview = `${preview.slice(0, 50)}...`;
  return {
    id_mensaje: m.id_mensaje,
    preview,
    remitente: m.remitente,
    fecha_envio: m.fecha_envio,
    leido: m.leido,
  };
}

/** Reconstruye filas de lista a partir de mensajes reales (misma API que ya usa el chat). */
function conversacionesDesdeMensajes(mensajes) {
  if (!Array.isArray(mensajes) || mensajes.length === 0) return [];
  const ultimoPorDoc = new Map();
  const noLeidosPorDoc = new Map();

  for (const m of mensajes) {
    const idDoc = normalizeDoctorId(m.id_doctor);
    if (idDoc == null) continue;
    if (!ultimoPorDoc.has(idDoc)) {
      ultimoPorDoc.set(idDoc, m);
    }
    if (m.remitente === 'Doctor' && !m.leido) {
      noLeidosPorDoc.set(idDoc, (noLeidosPorDoc.get(idDoc) || 0) + 1);
    }
  }

  const rows = [];
  for (const [idDoctor, ult] of ultimoPorDoc) {
    rows.push({
      id_doctor: idDoctor,
      doctor: {
        id_doctor: idDoctor,
        nombre_completo: 'Médico',
      },
      ultimo_mensaje: previewDesdeMensaje(ult),
      mensajes_no_leidos: noLeidosPorDoc.get(idDoctor) || 0,
      ultima_fecha: ult.fecha_envio,
    });
  }

  rows.sort((a, b) => {
    const ta = a.ultima_fecha ? new Date(a.ultima_fecha).getTime() : 0;
    const tb = b.ultima_fecha ? new Date(b.ultima_fecha).getTime() : 0;
    return tb - ta;
  });
  return rows;
}

function mergeConversacionesListadas(asignadas, fallbackDoctores, desdeMensajes) {
  const map = new Map();

  const enrich = (prev, row) => {
    if (row?.doctor && typeof row.doctor === 'object') {
      prev.doctor = {
        ...prev.doctor,
        ...row.doctor,
        id_doctor: prev.id_doctor,
      };
      const resolved = nombreDoctorParaUi(prev.doctor);
      if (resolved !== 'Médico') {
        prev.doctor.nombre_completo = resolved;
      }
    }
    if (!prev.ultimo_mensaje && row.ultimo_mensaje) {
      prev.ultimo_mensaje = row.ultimo_mensaje;
      prev.ultima_fecha = row.ultima_fecha;
    }
    prev.mensajes_no_leidos = Math.max(prev.mensajes_no_leidos || 0, row.mensajes_no_leidos || 0);
  };

  const ingest = (row) => {
    const id = normalizeDoctorId(row?.id_doctor ?? row?.doctor?.id_doctor);
    if (id == null) return;
    const clone = {
      ...row,
      id_doctor: id,
      doctor: row.doctor
        ? { ...row.doctor, id_doctor: id }
        : { id_doctor: id, nombre_completo: 'Médico' },
    };
    if (clone.doctor) {
      const ui = nombreDoctorParaUi(clone.doctor);
      if (ui !== 'Médico') clone.doctor.nombre_completo = ui;
    }
    if (!map.has(id)) {
      map.set(id, clone);
    } else {
      enrich(map.get(id), clone);
    }
  };

  for (const row of asignadas || []) ingest(row);
  for (const row of fallbackDoctores || []) ingest(row);
  for (const row of desdeMensajes || []) ingest(row);

  return [...map.values()].sort((a, b) => {
    const ta = a.ultima_fecha ? new Date(a.ultima_fecha).getTime() : 0;
    const tb = b.ultima_fecha ? new Date(b.ultima_fecha).getTime() : 0;
    return tb - ta;
  });
}

/** Carga médicos asignados si el endpoint de chat devolvió vacío o falló */
async function cargarDoctoresFallback(pacienteId, pacientePrecargado) {
  if (Array.isArray(pacientePrecargado?.doctores) && pacientePrecargado.doctores.length > 0) {
    return mapDoctoresFallbackToConversaciones(pacientePrecargado.doctores);
  }
  try {
    const docRes = await gestionService.getPacienteDoctores(pacienteId);
    const arr = Array.isArray(docRes?.data) ? docRes.data : [];
    if (arr.length > 0) {
      return mapDoctoresFallbackToConversaciones(arr);
    }
  } catch (e) {
    Logger.warn('ListaChatsPaciente: GET /pacientes/:id/doctores no disponible o falló', e);
  }
  try {
    const pacienteRes = await gestionService.getPacienteById(pacienteId);
    const doctoresPaciente = extractDoctoresFromPacientePayload(pacienteRes);
    if (doctoresPaciente.length > 0) {
      return mapDoctoresFallbackToConversaciones(doctoresPaciente);
    }
  } catch (e2) {
    Logger.warn('ListaChatsPaciente: GET /pacientes/:id falló en fallback', e2);
  }
  return [];
}

const ListaChatsPaciente = () => {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const { paciente } = usePacienteData();
  const { speak, stopAndClear, createTimeout } = useTTS();

  const pacienteId = useMemo(() => {
    const id =
      paciente?.id_paciente ||
      paciente?.id ||
      userData?.id_paciente ||
      userData?.id;
    return id ? String(id) : null;
  }, [paciente?.id_paciente, paciente?.id, userData?.id_paciente, userData?.id]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Cuando llegan médicos desde GET /pacientes/:id (doctores[]), fusionar nombres aunque la lista ya exista
  useEffect(() => {
    if (!pacienteId || !Array.isArray(paciente?.doctores) || paciente.doctores.length === 0) {
      return;
    }
    const desdePaciente = mapDoctoresFallbackToConversaciones(paciente.doctores);
    setItems((prev) => {
      if (!prev.length) return desdePaciente;
      return mergeConversacionesListadas(prev, desdePaciente, []);
    });
    setError(null);
  }, [pacienteId, paciente?.doctores]);

  const cargar = useCallback(
    async (isRefresh = false) => {
      if (!pacienteId) {
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const [resAsig, fallbackDocs, mensajesRaw] = await Promise.all([
          chatService.getConversacionesPacienteAsignadas(pacienteId),
          cargarDoctoresFallback(pacienteId, paciente),
          chatService.getMensajesPaciente(pacienteId, 500),
        ]);

        const desdeChat = resAsig.success ? resAsig.data || [] : [];
        const desdeMensajes = conversacionesDesdeMensajes(mensajesRaw);
        let merged = mergeConversacionesListadas(desdeChat, fallbackDocs, desdeMensajes);
        if (Array.isArray(paciente?.doctores) && paciente.doctores.length > 0) {
          merged = mergeConversacionesListadas(
            merged,
            mapDoctoresFallbackToConversaciones(paciente.doctores),
            []
          );
        }

        if (!resAsig.success && resAsig.statusCode !== 404) {
          Logger.warn('ListaChatsPaciente: conversaciones-asignadas falló; usando merge mensajes + pacientes', {
            status: resAsig.statusCode,
            error: resAsig.error,
            mensajesCount: mensajesRaw?.length ?? 0,
            mergedCount: merged.length,
          });
        } else if (desdeChat.length === 0 && merged.length > 0) {
          Logger.info('ListaChatsPaciente: lista reconstruida desde mensajes y/o datos de paciente', {
            desdeMensajes: desdeMensajes.length,
            fallbackDocs: fallbackDocs.length,
          });
        }

        setItems(merged);

        if (merged.length === 0) {
          if (!resAsig.success && resAsig.statusCode && resAsig.statusCode !== 404) {
            setError(resAsig.error || 'No se pudieron cargar las conversaciones');
          } else {
            setError(null);
          }
        } else {
          setError(null);
        }
      } catch (e) {
        Logger.error('ListaChatsPaciente: error al cargar', e);
        setError('Error de conexión');
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pacienteId, paciente]
  );

  useFocusEffect(
    useCallback(() => {
      cargar(false);
      const t = createTimeout(() => {
        speak('Lista de chats con tus médicos. Elige un nombre para abrir la conversación.');
      }, 400);
      return () => {
        clearTimeout(t);
        stopAndClear();
      };
    }, [cargar, speak, stopAndClear, createTimeout])
  );

  const onRefresh = useCallback(() => {
    hapticService.light();
    cargar(true);
  }, [cargar]);

  const abrirChat = useCallback(
    (row) => {
      hapticService.medium();
      audioFeedbackService.playSuccess();
      const nombre = nombreDoctorParaUi(row?.doctor);
      navigation.navigate('ChatDoctor', {
        id_doctor: row.id_doctor,
        nombreDoctor: nombre,
      });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const preview = item.ultimo_mensaje?.preview;
      const noLeidos = item.mensajes_no_leidos || 0;
      const nombre = nombreDoctorParaUi(item.doctor);

      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => abrirChat(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Chat con ${nombre}${noLeidos ? `. ${noLeidos} mensajes sin leer` : ''}`}
        >
          <View style={styles.rowMain}>
            <Text style={styles.nombre} numberOfLines={2}>
              {nombre}
            </Text>
            {preview ? (
              <Text style={styles.preview} numberOfLines={2}>
                {item.ultimo_mensaje?.remitente === 'Doctor'
                  ? `${nombre !== 'Médico' ? nombre : 'Médico'}: `
                  : 'Tú: '}
                {preview}
              </Text>
            ) : (
              <Text style={styles.sinMensajes}>Sin mensajes aún — toca para escribir</Text>
            )}
          </View>
          {noLeidos > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{noLeidos > 99 ? '99+' : String(noLeidos)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      );
    },
    [abrirChat]
  );

  const keyExtractor = useCallback((item) => `doc-${item.id_doctor}`, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <BackHeader title="Chat con médicos" variant="patient" />
      <View style={styles.container}>
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORES.NAV_PACIENTE} />
            <Text style={styles.hint}>Cargando…</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No hay médicos asignados</Text>
            <Text style={styles.emptyBody}>
              Cuando tu módulo te asigne un médico, aparecerá aquí y podrás enviarle mensajes.
            </Text>
          </View>
        ) : null}

        {!loading && items.length > 0 ? (
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORES.NAV_PACIENTE]} />
            }
            contentContainerStyle={styles.listContent}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hint: {
    marginTop: 12,
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  rowMain: {
    flex: 1,
    marginRight: 8,
  },
  nombre: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
  },
  preview: {
    marginTop: 6,
    fontSize: 15,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  sinMensajes: {
    marginTop: 6,
    fontSize: 15,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORES.NAV_PACIENTE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: '700',
    fontSize: 14,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#c62828',
    textAlign: 'center',
  },
});

export default ListaChatsPaciente;
