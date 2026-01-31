/**
 * Pantalla: Mis Medicamentos
 * 
 * Lista simplificada de medicamentos del paciente con horarios y recordatorios.
 * Diseño ultra-simple con TTS y feedback visual.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import usePacienteData from '../../hooks/usePacienteData';
import { gestionService } from '../../api/gestionService';
import MedicationCard from '../../components/paciente/MedicationCard';
import ReminderBanner from '../../components/paciente/ReminderBanner';
import ProgressBar from '../../components/paciente/ProgressBar';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import { useMedicationReminders } from '../../hooks/useReminders';
import useOffline from '../../hooks/useOffline';

const MisMedicamentos = () => {
  const navigation = useNavigation();
  const { paciente, loading: loadingPaciente, refresh, medicamentos: medicamentosFromHook } = usePacienteData();
  const { speak, stopAndClear, createTimeout } = useTTS();
  const { addToQueue, isOnline } = useOffline();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(false);
  const [medicamentos, setMedicamentos] = useState([]);
  const [tomasHoy, setTomasHoy] = useState([]); // Tomas de medicamentos de hoy

  // Recordatorios de medicamentos
  const reminders = useMedicationReminders(medicamentos, !loadingMedicamentos);

  // Obtener pacienteId de paciente o userData
  const pacienteId = paciente?.id_paciente || paciente?.id;

  // Memoizar loadMedicamentos para evitar bucles infinitos
  const loadMedicamentos = useCallback(async () => {
    const currentPacienteId = paciente?.id_paciente || paciente?.id;
    
    if (!currentPacienteId) {
      Logger.warn('MisMedicamentos: No hay pacienteId disponible');
      setLoadingMedicamentos(false);
      setMedicamentos([]);
      return;
    }

    try {
      setLoadingMedicamentos(true);
      Logger.debug('MisMedicamentos: Cargando medicamentos', { pacienteId: currentPacienteId });
      
      const response = await gestionService.getPacienteMedicamentos(currentPacienteId, {
        limit: 50,
      });
      
      Logger.debug('MisMedicamentos: Respuesta del servicio', { 
        hasResponse: !!response,
        isArray: Array.isArray(response),
        hasData: !!response?.data
      });
      
      const medicamentosData = response?.data || response || [];
      
      Logger.debug('MisMedicamentos: Medicamentos extraídos', { 
        total: medicamentosData.length,
        firstMed: medicamentosData[0] || null
      });
      
      // Cargar tomas de hoy para verificar si ya fueron tomados
      let tomasHoyData = [];
      try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const finHoy = new Date(hoy);
        finHoy.setHours(23, 59, 59, 999);
        
        tomasHoyData = await gestionService.getTomasMedicamento(currentPacienteId, {
          fechaInicio: hoy.toISOString().split('T')[0],
          fechaFin: finHoy.toISOString().split('T')[0],
        });
        setTomasHoy(tomasHoyData);
        Logger.debug('MisMedicamentos: Tomas de hoy cargadas', { total: tomasHoyData.length });
      } catch (error) {
        Logger.warn('MisMedicamentos: Error cargando tomas de hoy (continuando)', error);
        // Continuar sin las tomas si hay error
      }

      // Procesar medicamentos para formato simplificado
      const medicamentosProcesados = medicamentosData.map((med, index) => {
        // Extraer información del plan de medicación
        const planDetalle = med.PlanDetalles?.[0] || med.planDetalle || {};
        const medicamento = med.Medicamento || med.medicamento || {};
        
        // Verificar si fue tomado hoy consultando las tomas
        const idPlanMedicacion = med.id_plan_medicacion || med.id_plan;
        const idPlanDetalle = planDetalle.id_detalle || planDetalle.id_plan_detalle;
        const fueTomadoHoy = tomasHoyData.some(toma => {
          // Verificar si hay una toma para este plan de medicación hoy
          if (toma.id_plan_medicacion === idPlanMedicacion) {
            // Si hay id_plan_detalle, verificar que coincida
            if (idPlanDetalle && toma.id_plan_detalle) {
              return toma.id_plan_detalle === idPlanDetalle;
            }
            // Si no hay id_plan_detalle, cualquier toma del plan cuenta
            return true;
          }
          return false;
        });
        
        // Obtener horarios: usar nuevo campo horarios o fallback a horario
        const horariosArray = (planDetalle.horarios && Array.isArray(planDetalle.horarios) && planDetalle.horarios.length > 0)
          ? planDetalle.horarios
          : (planDetalle.horario ? [planDetalle.horario] : (med.horarios && Array.isArray(med.horarios) ? med.horarios : (med.horario ? [med.horario] : ['08:00'])));
        
        const horario = horariosArray[0] || '08:00'; // Primer horario para compatibilidad
        const frecuencia = planDetalle.frecuencia || med.frecuencia || 'Diario';
        
        // Asegurar que siempre haya un id único (usar índice como fallback)
        const id = med.id_plan_medicacion || med.id || `med-${index}`;
        
        // Construir dosis: el backend no tiene campo 'unidad' separado, 
        // la dosis puede venir completa (ej: "1 tableta") o solo el número (ej: "1")
        const dosisRaw = planDetalle.dosis || med.dosis || '';
        let dosisFinal;
        
        // Si la dosis está vacía, usar valor por defecto
        if (!dosisRaw || dosisRaw.trim() === '') {
          dosisFinal = '1 tableta';
        } else {
          const dosisTrimmed = dosisRaw.trim();
          
          // Verificar si la dosis ya contiene una unidad (palabras comunes)
          const tieneUnidad = /\b(tableta|tabletas|pastilla|pastillas|mg|ml|g|kg|unidad|unidades|comprimido|comprimidos|cápsula|cápsulas|gotas|gota)\b/i.test(dosisTrimmed);
          
          // Si es solo un número, agregar "tableta" por defecto
          if (!tieneUnidad && /^\d+(\.\d+)?$/.test(dosisTrimmed)) {
            dosisFinal = `${dosisTrimmed} tableta`;
          } else {
            // Usar la dosis tal cual viene del backend
            dosisFinal = dosisTrimmed;
          }
        }
        
        return {
          id,
          id_plan_medicacion: idPlanMedicacion, // Guardar para confirmación
          id_plan_detalle: idPlanDetalle, // Guardar para confirmación
          nombre: medicamento.nombre || med.nombre_medicamento || 'Medicamento',
          dosis: dosisFinal,
          horario, // Primer horario para compatibilidad
          horarios: horariosArray, // Array completo de horarios
          frecuencia,
          tomado: fueTomadoHoy, // Usar verificación real
          duracion: med.duracion_dias || 'Continúa',
          observaciones: med.observaciones || '',
        };
      });
      
      // Ordenar por horario
      medicamentosProcesados.sort((a, b) => {
        const horaA = parseInt(a.horario.split(':')[0]) || 0;
        const horaB = parseInt(b.horario.split(':')[0]) || 0;
        return horaA - horaB;
      });
      
      setMedicamentos(medicamentosProcesados);
      Logger.success('MisMedicamentos: Medicamentos cargados exitosamente', { 
        total: medicamentosProcesados.length,
        totalRaw: medicamentosData.length
      });
    } catch (error) {
      Logger.error('MisMedicamentos: Error cargando medicamentos:', error);
      setMedicamentos([]);
    } finally {
      setLoadingMedicamentos(false);
    }
  }, [paciente?.id_paciente, paciente?.id]); // ✅ Solo los IDs

  // Cargar medicamentos al entrar (solo cuando se enfoca la pantalla y hay pacienteId)
  useFocusEffect(
    useCallback(() => {
      const currentPacienteId = paciente?.id_paciente || paciente?.id;
      
      if (currentPacienteId) {
        Logger.debug('MisMedicamentos: useFocusEffect - Cargando medicamentos', { pacienteId: currentPacienteId });
        loadMedicamentos();
      } else {
        Logger.warn('MisMedicamentos: useFocusEffect - No hay pacienteId disponible');
        setLoadingMedicamentos(false);
        setMedicamentos([]);
      }
      
      // Saludo inicial mejorado con información de medicamentos
      const timer = createTimeout(async () => {
        // Esperar a que carguen los medicamentos
        setTimeout(async () => {
          if (medicamentos.length > 0) {
            const proximoMedicamento = reminders.proximoMedicamento;
            if (proximoMedicamento) {
              const tiempoRestante = reminders.tiempoRestante;
              const minutos = Math.round(tiempoRestante);
              if (minutos <= 30 && minutos >= 0) {
                await speak(`Tienes ${medicamentos.length} medicamentos. Tu próximo medicamento ${proximoMedicamento.nombre} debe tomarse en ${minutos} minutos.`, {
                  variant: 'alert',
                  priority: 'high'
                });
              } else if (minutos > 30) {
                await speak(`Tienes ${medicamentos.length} medicamentos. Tu próximo medicamento ${proximoMedicamento.nombre} debe tomarse en ${minutos} minutos.`);
              } else {
                await speak(`Tienes ${medicamentos.length} medicamentos registrados.`);
              }
            } else {
              await speak(`Tienes ${medicamentos.length} medicamentos registrados.`);
            }
          } else {
            await speak('No tienes medicamentos registrados actualmente.');
          }
        }, 1000); // Delay para que carguen los datos
      }, 500);
      
      return () => {
        // Cleanup: Detener TTS y limpiar cola cuando se sale de la pantalla
        Logger.debug('MisMedicamentos: Cleanup - Deteniendo TTS y limpiando cola');
        stopAndClear();
        clearTimeout(timer);
      };
    }, [paciente?.id_paciente, paciente?.id, loadMedicamentos, speak, stopAndClear, createTimeout]) // ✅ Incluir stopAndClear y createTimeout
  );

  // También cargar cuando el pacienteId esté disponible
  useEffect(() => {
    const currentPacienteId = paciente?.id_paciente || paciente?.id;
    if (currentPacienteId && !loadingMedicamentos && medicamentos.length === 0) {
      Logger.debug('MisMedicamentos: PacienteId disponible, cargando medicamentos');
      loadMedicamentos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticService.medium();
    await refresh();
    await loadMedicamentos();
    setRefreshing(false);
    audioFeedbackService.playSuccess();
  }, [refresh, loadMedicamentos]);

  const handleMedicamentoTomado = useCallback(async (medicamento) => {
    try {
      hapticService.success();
      
      // Obtener id_plan_medicacion del medicamento
      const idPlanMedicacion = medicamento.id_plan_medicacion || medicamento.id_plan;
      const idPlanDetalle = medicamento.id_plan_detalle || medicamento.id_detalle;
      
      if (!idPlanMedicacion) {
        Logger.error('MisMedicamentos: No se encontró id_plan_medicacion', medicamento);
        await speak('Error: No se pudo registrar la toma del medicamento');
        audioFeedbackService.playError();
        return;
      }

      // Obtener pacienteId actual (puede cambiar)
      const currentPacienteId = paciente?.id_paciente || paciente?.id;
      if (!currentPacienteId) {
        Logger.error('MisMedicamentos: No hay pacienteId disponible');
        await speak('Error: No se pudo identificar al paciente');
        audioFeedbackService.playError();
        return;
      }

      const horaToma = new Date().toTimeString().slice(0, 5);
      let savedOffline = false;

      try {
        // Intentar registrar en backend
        await gestionService.registrarTomaMedicamento(
          idPlanMedicacion,
          idPlanDetalle,
          horaToma,
          null
        );
        
        await speak(`Registrado: ${medicamento.nombre} tomado`);
        audioFeedbackService.playSuccess();
        
        // Actualizar estado local y recargar tomas
        setMedicamentos(prev => prev.map(med => 
          med.id === medicamento.id 
            ? { ...med, tomado: true }
            : med
        ));
        
        // Recargar tomas de hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const finHoy = new Date(hoy);
        finHoy.setHours(23, 59, 59, 999);
        
        const nuevasTomas = await gestionService.getTomasMedicamento(currentPacienteId, {
          fechaInicio: hoy.toISOString().split('T')[0],
          fechaFin: finHoy.toISOString().split('T')[0],
        });
        setTomasHoy(nuevasTomas);
        
        Logger.info('Medicamento marcado como tomado', { 
          id: medicamento.id,
          id_plan_medicacion: idPlanMedicacion 
        });
      } catch (networkError) {
        // Si es error de red, guardar offline
        if (
          networkError.message?.includes('Network Error') ||
          networkError.code === 'ERR_NETWORK' ||
          !isOnline
        ) {
          Logger.info('Sin conexión, guardando toma en cola offline', { idPlanMedicacion });
          
          // Agregar a cola offline
          await addToQueue({
            type: 'create',
            resource: 'medicamentoToma',
            data: {
              id_plan_medicacion: idPlanMedicacion,
              id_plan_detalle: idPlanDetalle,
              hora_toma: horaToma,
              observaciones: null,
            },
          });

          savedOffline = true;
          
          // Actualizar estado local (optimista)
          setMedicamentos(prev => prev.map(med => 
            med.id === medicamento.id 
              ? { ...med, tomado: true }
              : med
          ));
          
          await speak(`Registrado: ${medicamento.nombre} tomado. Se guardará cuando haya conexión`);
          audioFeedbackService.playSuccess();
        } else {
          // Re-lanzar error si no es de red
          throw networkError;
        }
      }
    } catch (error) {
      Logger.error('Error registrando toma de medicamento:', error);
      await speak('Error al registrar la toma del medicamento. Intenta de nuevo.');
      audioFeedbackService.playError();
    }
  }, [paciente, speak, addToQueue, isOnline]);

  // Formatear horario para mostrar
  const formatHorario = (horario) => {
    try {
      const [hours, minutes] = horario.split(':');
      const hour = parseInt(hours);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes || '00'} ${period}`;
    } catch {
      return horario;
    }
  };

  // Verificar si es hora de tomar medicamento
  const esHoraDeTomar = (horario) => {
    try {
      const ahora = new Date();
      const [horaStr, minutoStr] = horario.split(':');
      const horaMed = parseInt(horaStr);
      const minutoMed = parseInt(minutoStr);
      
      const horaActual = ahora.getHours();
      const minutoActual = ahora.getMinutes();
      
      // Considerar que es hora si estamos dentro de una ventana de 30 minutos
      const diferenciaMinutos = (horaActual * 60 + minutoActual) - (horaMed * 60 + minutoMed);
      return diferenciaMinutos >= 0 && diferenciaMinutos <= 30;
    } catch {
      return false;
    }
  };

  // Solo mostrar loading si realmente está cargando Y no hay datos Y no hay pacienteId
  // Si hay datos pero aún está cargando (actualización en background), mostrar los datos
  const shouldShowLoading = (loadingPaciente || loadingMedicamentos) && medicamentos.length === 0 && !pacienteId;
  
  if (shouldShowLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PACIENTE} />
          <Text style={styles.loadingText}>Cargando tus medicamentos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Determinar si hay próximo medicamento para mostrar banner
  const proximoMedicamento = reminders.proximoMedicamento;
  const tiempoRestante = reminders.tiempoRestante;
  const mostrarBanner = proximoMedicamento && tiempoRestante !== null && tiempoRestante < 120; // Mostrar si es en menos de 2 horas

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORES.NAV_PACIENTE]}
            tintColor={COLORES.NAV_PACIENTE}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              hapticService.light();
              navigation.goBack();
            }}
          >
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>💊 Mis Medicamentos</Text>
          
          <TouchableOpacity
            style={styles.listenButton}
            onPress={async () => {
              try {
                hapticService.light();
                const mensaje = `Tienes ${medicamentos.length} ${medicamentos.length === 1 ? 'medicamento' : 'medicamentos'} registrados`;
                await speak(mensaje);
              } catch (error) {
                Logger.error('Error en TTS:', error);
                hapticService.error();
              }
            }}
          >
            <Text style={styles.listenButtonText}>🔊</Text>
          </TouchableOpacity>
        </View>

        {/* Banner de recordatorio de próximo medicamento */}
        {mostrarBanner && proximoMedicamento && (
          <ReminderBanner
            title="⏰ Próximo Medicamento"
            message={`${proximoMedicamento.nombre} - ${proximoMedicamento.dosis || ''}`}
            timeRemaining={tiempoRestante}
            variant={tiempoRestante < 30 ? 'urgent' : 'warning'}
            onPress={() => {
              const med = medicamentos.find(m => m.id === proximoMedicamento.id);
              if (med && !med.tomado) {
                handleMedicamentoTomado(med);
              }
            }}
            showCountdown={true}
          />
        )}

        {/* Barra de progreso del día */}
        {medicamentos.length > 0 && reminders.progreso.total > 0 && (
          <View style={styles.progressContainer}>
            <ProgressBar
              current={reminders.progreso.tomados}
              total={reminders.progreso.total}
              label={`Medicamentos tomados hoy`}
              variant={reminders.progreso.porcentaje === 100 ? 'success' : 'default'}
              showLabel={true}
            />
          </View>
        )}

        {/* Contador */}
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {medicamentos.length === 0
              ? 'No tienes medicamentos registrados'
              : `${medicamentos.length} ${medicamentos.length === 1 ? 'medicamento' : 'medicamentos'}`}
          </Text>
        </View>

        {/* Lista de medicamentos */}
        {medicamentos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyText}>No tienes medicamentos registrados</Text>
            <Text style={styles.emptySubtext}>
              Contacta a tu doctor para agregar medicamentos a tu plan de tratamiento
            </Text>
          </View>
        ) : (
          medicamentos.map((medicamento, index) => {
            const esHora = esHoraDeTomar(medicamento.horario);
            const necesitaTomar = !medicamento.tomado && esHora;
            
            // Asegurar key única usando id o índice como fallback
            const uniqueKey = medicamento.id || `medicamento-${index}`;
            
            return (
              <MedicationCard
                key={uniqueKey}
                nombre={medicamento.nombre}
                dosis={medicamento.dosis}
                horario={medicamento.horario}
                horarios={medicamento.horarios && Array.isArray(medicamento.horarios) ? medicamento.horarios : undefined}
                frecuencia={medicamento.frecuencia}
                tomado={medicamento.tomado}
                onPress={necesitaTomar ? () => handleMedicamentoTomado(medicamento) : undefined}
              />
            );
          })
        )}

        {/* Alerta de recordatorio (si hay medicamentos pendientes) */}
        {medicamentos.some(med => !med.tomado && esHoraDeTomar(med.horario)) && (
          <View style={styles.alertContainer}>
            <Text style={styles.alertIcon}>⏰</Text>
            <Text style={styles.alertText}>Es hora de tomar algunos medicamentos</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO_CARD,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    flex: 1,
    textAlign: 'center',
  },
  listenButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderWidth: 1,
    borderColor: COLORES.NAV_PRIMARIO,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listenButtonText: {
    fontSize: 20,
  },
  counter: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORES.NAV_PRIMARIO,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.NAV_PRIMARIO,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  alertContainer: {
    backgroundColor: COLORES.FONDO_ADVERTENCIA_CLARO,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORES.ADVERTENCIA_LIGHT,
  },
  alertIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  alertText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.ADVERTENCIA,
    flex: 1,
  },
});

export default MisMedicamentos;


