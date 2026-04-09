import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCurrentDoctorId } from './useCurrentDoctorId';
import { getContadorNotificaciones } from '../api/notificaciones';
import { getConversacionesDoctor } from '../api/mensajesChat';
import { connect, on, off } from '../api/socket';
import { STORAGE_KEYS } from '../utils/constants';

const POLL_MS = 45000;

function sumMensajesNoLeidos(conversaciones) {
  if (!Array.isArray(conversaciones) || conversaciones.length === 0) return 0;
  return conversaciones.reduce((acc, item) => acc + Number(item?.mensajes_no_leidos || 0), 0);
}

export function useDoctorNavBadges() {
  const [notifCount, setNotifCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const token = useAuthStore((s) =>
    s.token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null)
  );
  const { idDoctor } = useCurrentDoctorId();
  const enabled = useMemo(() => Boolean(idDoctor) && !isAdmin(), [idDoctor, isAdmin]);

  const refresh = useCallback(async () => {
    if (!enabled || !idDoctor) {
      setNotifCount(0);
      setChatCount(0);
      return;
    }

    const [notifsRes, conversacionesRes] = await Promise.allSettled([
      getContadorNotificaciones(idDoctor),
      getConversacionesDoctor(idDoctor),
    ]);

    if (notifsRes.status === 'fulfilled') {
      setNotifCount(Math.max(0, Number(notifsRes.value || 0)));
    }
    if (conversacionesRes.status === 'fulfilled') {
      setChatCount(sumMensajesNoLeidos(conversacionesRes.value?.conversaciones));
    }
  }, [enabled, idDoctor]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !token) return undefined;
    connect(token);
    const handleRealtime = () => {
      refresh();
    };
    on('notificacion_doctor', handleRealtime);
    on('nuevo_mensaje', handleRealtime);
    const pollId = setInterval(() => {
      refresh();
    }, POLL_MS);
    return () => {
      off('notificacion_doctor', handleRealtime);
      off('nuevo_mensaje', handleRealtime);
      clearInterval(pollId);
    };
  }, [enabled, token, refresh]);

  return { notifCount, chatCount, refresh };
}
