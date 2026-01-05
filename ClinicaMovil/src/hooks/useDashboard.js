import { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardService } from '../api/dashboardService';
import Logger from '../services/logger';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTime, formatDate } from '../utils/dateUtils';

// Hook para datos del dashboard administrativo
export const useAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Evitar múltiples llamadas simultáneas
    if (loading && !forceRefresh) {
      Logger.debug('Ya hay una solicitud en curso, omitiendo');
      return;
    }

    // Verificar si los datos son recientes (menos de 5 minutos)
    const now = Date.now();
    if (!forceRefresh && lastFetch && (now - lastFetch) < 5 * 60 * 1000) {
      Logger.debug('Datos recientes disponibles, omitiendo fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info('Obteniendo datos del dashboard administrativo');
      
      const response = await dashboardService.getAdminSummary();
      
      setData(response.data);
      setLastFetch(now);
      
      Logger.success('Datos del dashboard administrativo obtenidos exitosamente');
    } catch (err) {
      Logger.error('Error obteniendo datos del dashboard administrativo', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [loading, lastFetch]);

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

  // Función para refrescar datos manualmente
  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  // Memoizar métricas para evitar recálculos innecesarios
  const metrics = useMemo(() => {
    if (!data?.metrics) return null;
    
    return {
      totalPacientes: data.metrics.totalPacientes,
      totalDoctores: data.metrics.totalDoctores,
      citasHoy: data.metrics.citasHoy,
      tasaAsistencia: data.metrics.tasaAsistencia,
      alertasPendientes: data.alertas?.valoresCriticos?.length || 0
    };
  }, [data]);

  // Memoizar datos del gráfico de citas
  const chartData = useMemo(() => {
    if (!data?.chartData?.citasUltimos7Dias) return [];
    
    return data.chartData.citasUltimos7Dias.map(item => ({
      dia: item.dia,
      citas: item.citas
    }));
  }, [data]);

  // Memoizar datos del gráfico de pacientes nuevos
  const pacientesNuevosData = useMemo(() => {
    if (!data?.chartData?.pacientesNuevos) return [];
    
    return data.chartData.pacientesNuevos.map(item => ({
      dia: item.dia,
      pacientes: item.pacientes
    }));
  }, [data]);

  // Memoizar datos de citas por estado
  const citasPorEstadoData = useMemo(() => {
    if (!data?.charts?.citasPorEstado) return null;
    
    return data.charts.citasPorEstado;
  }, [data]);

  // Memoizar datos de doctores activos
  const doctoresActivosData = useMemo(() => {
    if (!data?.charts?.doctoresActivos) return [];
    
    return data.charts.doctoresActivos;
  }, [data]);

  // Memoizar alertas (máximo 5, solo del día)
  const alerts = useMemo(() => {
    if (!data?.alertas) return [];
    
    const alertasFormateadas = [];
    
    // Alertas de valores críticos
    if (data.alertas.valoresCriticos) {
      data.alertas.valoresCriticos.forEach((alert, index) => {
        alertasFormateadas.push({
          id: `critico_${alert.nombre}_${alert.fecha_medicion}_${index}`,
          type: 'symptom',
          message: `${alert.nombre} ${alert.apellido_paterno} - ${alert.tipo_alerta}`,
          time: formatRelativeTime(alert.fecha_medicion),
          priority: 'high',
          fecha: alert.fecha_medicion,
          // Datos originales para el modal
          rawData: {
            tipo: 'valor_critico',
            id_paciente: alert.id_paciente,
            nombre: alert.nombre,
            apellido_paterno: alert.apellido_paterno,
            tipo_alerta: alert.tipo_alerta,
            glucosa_mg_dl: alert.glucosa_mg_dl,
            presion_sistolica: alert.presion_sistolica,
            presion_diastolica: alert.presion_diastolica,
            fecha_medicion: alert.fecha_medicion
          }
        });
      });
    }
    
    // Alertas de citas perdidas
    if (data.alertas.citasPerdidas) {
      data.alertas.citasPerdidas.forEach((alert, index) => {
        alertasFormateadas.push({
          id: `cita_perdida_${alert.paciente}_${alert.fecha}_${index}`,
          type: 'appointment',
          message: `Cita perdida: ${alert.paciente}`,
          time: formatRelativeTime(alert.fecha),
          priority: 'medium',
          fecha: alert.fecha,
          // Datos originales para el modal
          rawData: {
            tipo: 'cita_perdida',
            id_cita: alert.id_cita,
            id_paciente: alert.id_paciente,
            paciente: alert.paciente,
            fecha: alert.fecha,
            motivo: alert.motivo
          }
        });
      });
    }
    
    // Alertas de auditoría (excluyendo sistema_automatico y login_fallido)
    if (data.alertas.alertasAuditoria) {
      data.alertas.alertasAuditoria.forEach((alert, index) => {
        // Mapear severidad a priority
        const priorityMap = {
          'critical': 'urgent',
          'error': 'high',
          'warning': 'medium',
          'info': 'low'
        };
        
        // Mapear tipo de acción a icono y mensaje
        const tipoMap = {
          'cita_estado_actualizado': { icon: '📅', prefix: 'Cita actualizada' },
          'cita_reprogramada': { icon: '🔄', prefix: 'Cita reprogramada' },
          'paciente_creado': { icon: '👤', prefix: 'Nuevo paciente' },
          'paciente_modificado': { icon: '✏️', prefix: 'Paciente modificado' },
          'doctor_creado': { icon: '👨‍⚕️', prefix: 'Nuevo doctor' },
          'doctor_modificado': { icon: '✏️', prefix: 'Doctor modificado' },
          'asignacion_paciente': { icon: '🔗', prefix: 'Asignación' },
          'configuracion_cambiada': { icon: '⚙️', prefix: 'Configuración cambiada' },
          'acceso_sospechoso': { icon: '🚨', prefix: 'Acceso sospechoso' },
          'error_sistema': { icon: '⚠️', prefix: 'Error del sistema' },
          'error_critico': { icon: '🔴', prefix: 'Error crítico' }
        };
        
        const tipoInfo = tipoMap[alert.tipo_accion] || { icon: '🔔', prefix: 'Notificación' };
        
        alertasFormateadas.push({
          id: `auditoria_${alert.id_auditoria}_${index}`,
          type: 'audit',
          message: `${tipoInfo.prefix}: ${alert.descripcion}`,
          time: formatRelativeTime(alert.fecha_creacion),
          priority: priorityMap[alert.severidad] || 'medium',
          fecha: alert.fecha_creacion,
          icon: tipoInfo.icon,
          // Datos originales para el modal
          rawData: {
            tipo: 'auditoria',
            id_auditoria: alert.id_auditoria,
            tipo_accion: alert.tipo_accion,
            entidad_afectada: alert.entidad_afectada,
            id_entidad: alert.id_entidad,
            descripcion: alert.descripcion,
            fecha_creacion: alert.fecha_creacion,
            severidad: alert.severidad
          }
        });
      });
    }
    
    // Ordenar por fecha (más recientes primero)
    // El backend ya limita a 5, pero por seguridad también limitamos aquí
    alertasFormateadas.sort((a, b) => {
      const fechaA = new Date(a.fecha || 0);
      const fechaB = new Date(b.fecha || 0);
      return fechaB - fechaA;
    });
    
    // El backend ya devuelve máximo 5, pero por seguridad limitamos aquí también
    return alertasFormateadas.slice(0, 5);
  }, [data]);

  return {
    data,
    metrics,
    chartData,
    pacientesNuevosData,
    citasPorEstadoData,
    doctoresActivosData,
    alerts,
    loading,
    error,
    refresh,
    lastFetch
  };
};

// Hook para datos del dashboard del doctor
export const useDoctorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const { userData } = useAuth();

  const fetchData = useCallback(async (forceRefresh = false, estado = null, periodo = null, rangoMeses = null) => {
    // userData puede tener 'id' o 'id_usuario', verificar ambos
    const userId = userData?.id_usuario || userData?.id;
    if (!userId) {
      // No hay usuario autenticado aún, esperar a que esté disponible
      Logger.warn('[DASHBOARD] No hay userId disponible, esperando...', { userData });
      return;
    }

    // Evitar múltiples llamadas simultáneas
    if (loading && !forceRefresh) {
      Logger.debug('[DASHBOARD] Ya hay una solicitud en curso, omitiendo');
      return;
    }

    // Verificar si los datos son recientes (menos de 1 minuto para datos más frescos)
    // Si hay un filtro de estado o periodo, siempre refrescar
    const now = Date.now();
    if (!forceRefresh && !estado && !periodo && !rangoMeses && lastFetch && (now - lastFetch) < 1 * 60 * 1000) {
      Logger.debug('[DASHBOARD] Datos recientes disponibles, omitiendo fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info('[DASHBOARD] Llamando a getDoctorSummary', { userId, estado, periodo, rangoMeses });
      
      const response = await dashboardService.getDoctorSummary(estado, periodo, rangoMeses);
      
      Logger.info('[DASHBOARD] Respuesta recibida', { 
        hasData: !!response.data,
        citasHoyCount: response.data?.citasHoy?.length || 0,
        estado,
        periodo,
        rangoMeses
      });
      
      // Logger.debug('Dashboard response recibida', {
      //   hasData: !!response.data,
      //   citasHoyCount: response.data?.citasHoy?.length || 0,
      //   citasHoy: response.data?.citasHoy,
      //   metrics: response.data?.metrics
      // });
      
      setData(response.data);
      setLastFetch(now);
      
      // Logger.success('Datos del dashboard del doctor obtenidos exitosamente', {
      //   citasHoy: response.data?.citasHoy?.length || 0
      // });
    } catch (err) {
      Logger.error('Error obteniendo datos del dashboard del doctor', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userData?.id_usuario || userData?.id, loading, lastFetch]);

  // Cargar datos al montar el componente
  useEffect(() => {
    // userData puede tener 'id' o 'id_usuario', verificar ambos
    const userId = userData?.id_usuario || userData?.id;
    
    Logger.info('[DASHBOARD] useEffect ejecutado', { 
      hasUserData: !!userData,
      userId,
      hasData: !!data,
      lastFetch 
    });
    
    if (userId) {
      // Siempre intentar cargar la primera vez, o si los datos son antiguos (>5 minutos)
      const now = Date.now();
      const shouldFetch = !data || !lastFetch || (now - lastFetch) > 5 * 60 * 1000;
      
      Logger.info('[DASHBOARD] Decisión de fetch', { shouldFetch, hasData: !!data, lastFetch });
      
      if (shouldFetch) {
        Logger.info('[DASHBOARD] Ejecutando fetchData');
        fetchData(true); // Forzar refresh para obtener datos actualizados
      } else {
        // Si hay datos recientes, solo asegurar que loading sea false
        Logger.debug('[DASHBOARD] Datos recientes, no fetch necesario');
        setLoading(false);
      }
    } else {
      Logger.warn('[DASHBOARD] No hay userId disponible en useEffect', { userData });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.id_usuario || userData?.id]); // Solo dependencia de userData.id_usuario para evitar loops

  // Función para refrescar datos manualmente
  const refresh = useCallback(async (estado = null, periodo = null, rangoMeses = null) => {
    // userData puede tener 'id' o 'id_usuario', verificar ambos
    const userId = userData?.id_usuario || userData?.id;
    if (!userId) {
      Logger.warn('[DASHBOARD] No hay userId disponible para refresh', { userData });
      return;
    }

    // Limpiar datos y forzar refresh para obtener datos actualizados
    setData(null);
    setLastFetch(null);
    setLoading(true);
    setError(null);

    try {
      Logger.info('[DASHBOARD] Refresh manual - Llamando a getDoctorSummary', { userId, estado, periodo, rangoMeses });
      
      const response = await dashboardService.getDoctorSummary(estado, periodo, rangoMeses);
      
      Logger.info('[DASHBOARD] Refresh - Respuesta recibida', { 
        hasData: !!response.data,
        citasHoyCount: response.data?.citasHoy?.length || 0,
        estado,
        periodo,
        rangoMeses
      });
      
      setData(response.data);
      setLastFetch(Date.now());
    } catch (err) {
      Logger.error('Error refrescando datos del dashboard del doctor', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userData?.id_usuario || userData?.id]);

  // Memoizar métricas para evitar recálculos innecesarios
  const metrics = useMemo(() => {
    if (!data?.metrics) return null;
    
    return {
      citasHoy: data.metrics.citasHoy,
      pacientesAsignados: data.metrics.pacientesAsignados,
      mensajesPendientes: data.metrics.mensajesPendientes,
      proximasCitas: data.metrics.proximasCitas
    };
  }, [data]);

  // Memoizar citas de hoy
  const citasHoy = useMemo(() => {
    if (!data?.citasHoy) {
      // Logger.debug('useDoctorDashboard: No hay data.citasHoy', { data });
      return [];
    }
    
    // Logger.debug('useDoctorDashboard: Procesando citasHoy', { 
    //   cantidad: data.citasHoy.length,
    //   citas: data.citasHoy 
    // });
    
    // Procesar y eliminar duplicados por ID
    const citasProcesadas = data.citasHoy.map(cita => {
      try {
        // cita.hora viene como fecha_cita (string ISO) del backend
        const fechaCita = cita.hora ? new Date(cita.hora) : null;
        const horaFormateada = fechaCita && !isNaN(fechaCita.getTime())
          ? fechaCita.toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          : 'N/A';
        
        return {
          id: cita.id,
          paciente: cita.paciente,
          hora: horaFormateada,
          fecha: fechaCita, // Agregar fecha completa para renderCitaItem
          motivo: cita.motivo,
          asistencia: cita.asistencia,
          estado: cita.estado,
          telefono: cita.telefono
        };
      } catch (error) {
        Logger.error('Error procesando cita en citasHoy', { error, cita });
        return null;
      }
    }).filter(cita => cita !== null); // Filtrar citas con error
    
    // Eliminar duplicados por ID
    const citasUnicas = citasProcesadas.filter((cita, index, self) => 
      index === self.findIndex(c => c.id === cita.id)
    );
    
    return citasUnicas;
  }, [data]);

  // Memoizar pacientes
  const pacientes = useMemo(() => {
    if (!data?.pacientes) return [];
    
    return data.pacientes.map(paciente => ({
      id: paciente.id,
      nombre: paciente.nombre,
      ultimaConsulta: paciente.ultimaConsulta ? 
        new Date(paciente.ultimaConsulta).toLocaleDateString('es-ES') : 
        'Sin consultas',
      motivoUltimaConsulta: paciente.motivoUltimaConsulta || 'N/A'
    }));
  }, [data]);

  // Memoizar mensajes pendientes
  const mensajesPendientes = useMemo(() => {
    if (!data?.mensajesPendientes) return [];
    
    return data.mensajesPendientes.map(mensaje => ({
      id: mensaje.id,
      paciente: mensaje.paciente,
      mensaje: mensaje.mensaje,
      fecha: new Date(mensaje.fecha).toLocaleString('es-ES')
    }));
  }, [data]);

  // Memoizar próximas citas
  const proximasCitas = useMemo(() => {
    if (!data?.proximasCitas) return [];
    
    return data.proximasCitas.map(cita => ({
      id: cita.id,
      paciente: cita.paciente,
      fecha: cita.fecha, // Mantener fecha original para comparaciones
      fechaFormateada: new Date(cita.fecha).toLocaleDateString('es-ES'),
      hora: new Date(cita.fecha).toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      motivo: cita.motivo,
      estado: cita.estado,
      telefono: cita.telefono
    }));
  }, [data]);

  // Memoizar datos del gráfico
  const chartData = useMemo(() => {
    if (!data?.chartData?.citasUltimos7Dias) return [];
    
    return data.chartData.citasUltimos7Dias.map(item => ({
      dia: item.dia,
      citas: item.citas
    }));
  }, [data]);

  // Memoizar comorbilidades más frecuentes
  const comorbilidadesMasFrecuentes = useMemo(() => {
    if (!data?.chartData?.comorbilidadesMasFrecuentes) return [];
    
    return data.chartData.comorbilidadesMasFrecuentes.map(item => ({
      nombre: item.nombre,
      frecuencia: parseInt(item.frecuencia) || 0
    }));
  }, [data]);

  // Memoizar comorbilidades por periodo
  const comorbilidadesPorPeriodo = useMemo(() => {
    if (!data?.chartData?.comorbilidadesPorPeriodo) return null;
    
    return {
      periodo: data.chartData.periodo,
      datos: data.chartData.comorbilidadesPorPeriodo
    };
  }, [data]);

  // Memoizar alertas de signos vitales críticos
  const alertasSignosVitales = useMemo(() => {
    if (!data?.alertas?.signosVitalesCriticos) return [];
    
    return data.alertas.signosVitalesCriticos.map(alerta => ({
      id: `sv_${alerta.id_paciente}_${alerta.fecha_medicion}`,
      paciente: alerta.paciente,
      id_paciente: alerta.id_paciente,
      tipo_alerta: alerta.tipo_alerta,
      glucosa: alerta.glucosa,
      presion_sistolica: alerta.presion_sistolica,
      presion_diastolica: alerta.presion_diastolica,
      fecha_medicion: new Date(alerta.fecha_medicion),
      fecha_medicion_formateada: formatRelativeTime(alerta.fecha_medicion)
    }));
  }, [data]);

  return {
    data,
    metrics,
    citasHoy,
    pacientes,
    mensajesPendientes,
    proximasCitas,
    chartData,
    comorbilidadesMasFrecuentes,
    comorbilidadesPorPeriodo,
    alertasSignosVitales,
    loading,
    error,
    refresh,
    lastFetch
  };
};

// Hook para datos específicos del doctor
export const useDoctorData = () => {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});
  const { userData } = useAuth();

  // Función para obtener pacientes
  const fetchPatients = useCallback(async () => {
    if (!userData?.id_usuario) return;

    setLoading(prev => ({ ...prev, patients: true }));
    setError(prev => ({ ...prev, patients: null }));

    try {
      const response = await dashboardService.getDoctorPatients();
      setPatients(response.data.pacientes);
    } catch (err) {
      setError(prev => ({ ...prev, patients: err }));
    } finally {
      setLoading(prev => ({ ...prev, patients: false }));
    }
  }, [userData]);

  // Función para obtener citas
  const fetchAppointments = useCallback(async (fecha = null) => {
    if (!userData?.id_usuario) return;

    setLoading(prev => ({ ...prev, appointments: true }));
    setError(prev => ({ ...prev, appointments: null }));

    try {
      const response = await dashboardService.getDoctorAppointments(fecha);
      setAppointments(response.data.citas);
    } catch (err) {
      setError(prev => ({ ...prev, appointments: err }));
    } finally {
      setLoading(prev => ({ ...prev, appointments: false }));
    }
  }, [userData]);

  // Función para obtener mensajes
  const fetchMessages = useCallback(async () => {
    if (!userData?.id_usuario) return;

    setLoading(prev => ({ ...prev, messages: true }));
    setError(prev => ({ ...prev, messages: null }));

    try {
      const response = await dashboardService.getDoctorMessages();
      setMessages(response.data.mensajes);
    } catch (err) {
      setError(prev => ({ ...prev, messages: err }));
    } finally {
      setLoading(prev => ({ ...prev, messages: false }));
    }
  }, [userData]);

  // Función para obtener signos vitales de un paciente
  const fetchPatientVitalSigns = useCallback(async (pacienteId) => {
    if (!userData?.id_usuario || !pacienteId) return;

    setLoading(prev => ({ ...prev, [`vitals_${pacienteId}`]: true }));
    setError(prev => ({ ...prev, [`vitals_${pacienteId}`]: null }));

    try {
      const response = await dashboardService.getPatientVitalSigns(pacienteId);
      return response.data.signosVitales;
    } catch (err) {
      setError(prev => ({ ...prev, [`vitals_${pacienteId}`]: err }));
      throw err;
    } finally {
      setLoading(prev => ({ ...prev, [`vitals_${pacienteId}`]: false }));
    }
  }, [userData]);

  return {
    patients,
    appointments,
    messages,
    loading,
    error,
    fetchPatients,
    fetchAppointments,
    fetchMessages,
    fetchPatientVitalSigns
  };
};

// Hook para verificar salud del sistema
export const useDashboardHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await dashboardService.checkHealth();
      setHealth(response);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    health,
    loading,
    error,
    checkHealth
  };
};

export default {
  useAdminDashboard,
  useDoctorDashboard,
  useDoctorData,
  useDashboardHealth
};
