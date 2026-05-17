import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useCurrentDoctorId } from './useCurrentDoctorId';
import { getContadorNotificaciones } from '../api/notificaciones';
import { getConversacionesDoctor } from '../api/mensajesChat';
import { useSocketEvents } from '../contexts/SocketContext';

const POLL_MS = 45000;

function sumMensajesNoLeidos(conversaciones) {
  if (!Array.isArray(conversaciones) || conversaciones.length === 0) return 0;
  return conversaciones.reduce((acc, item) => acc + Number(item?.mensajes_no_leidos || 0), 0);
}

export function useDoctorNavBadges() {
  const [notifCount, setNotifCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const isAdmin = useAuthStore((s) => s.isAdmin);
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

  useSocketEvents(['notificacion_doctor', 'nuevo_mensaje'], refresh, enabled);

  useEffect(() => {
    if (!enabled) return undefined;
    const pollId = setInterval(() => {
      refresh();
    }, POLL_MS);
    return () => clearInterval(pollId);
  }, [enabled, refresh]);

  return { notifCount, chatCount, refresh };
}
