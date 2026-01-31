import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph, Button, IconButton, Chip } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import { useDoctorDetails, useDoctorPatientData } from '../../hooks/useGestion';
import useDoctorForm from '../../hooks/useDoctorForm';
import { formatDate, formatDateTime, formatAppointmentDate, formatTodayAppointment } from '../../utils/dateUtils';
import { useFocusEffect } from '@react-navigation/native';
import { ESTADOS_CITA, COLORES } from '../../utils/constantes';
import OptionsModal from '../../components/DetallePaciente/shared/OptionsModal';
import DetalleCitaModal from '../../components/DetalleCitaModal/DetalleCitaModal';
import CompletarCitaWizard from '../../components/CompletarCitaWizard';
import DateTimePickerButton from '../../components/DateTimePickerButton';
import gestionService from '../../api/gestionService';

const DetalleDoctor = ({ route, navigation }) => {
  const { doctor: initialDoctor } = route.params || {};
  const { userRole } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Estados para asignación de pacientes
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [unassignLoading, setUnassignLoading] = useState({});
  
  // Estados para búsqueda de pacientes asignados
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  // Cita de hoy seleccionada (para modal de opciones al tocar ítem)
  const [citaHoySeleccionada, setCitaHoySeleccionada] = useState(null);
  // Cita reciente seleccionada (para modal de opciones en card Citas Recientes)
  const [citaRecienteSeleccionada, setCitaRecienteSeleccionada] = useState(null);
  // Modal Detalle de Cita (igual que en Detalle Paciente / Ver Todas Citas)
  const [showDetalleCitaModal, setShowDetalleCitaModal] = useState(false);
  const [citaDetalle, setCitaDetalle] = useState(null);
  const [loadingCitaDetalle, setLoadingCitaDetalle] = useState(false);
  // Modales para acciones de citas recientes (reutilizando lógica de VerTodasCitas)
  const [showWizard, setShowWizard] = useState(false);
  const [citaSeleccionadaWizard, setCitaSeleccionadaWizard] = useState(null);
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [citaSeleccionadaEstado, setCitaSeleccionadaEstado] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [showReprogramarModal, setShowReprogramarModal] = useState(false);
  const [citaSeleccionadaReprogramar, setCitaSeleccionadaReprogramar] = useState(null);
  const [fechaReprogramada, setFechaReprogramada] = useState('');
  const [motivoReprogramacion, setMotivoReprogramacion] = useState('');
  const [actualizando, setActualizando] = useState(false);
  
  // Hook para operaciones de doctor (incluyendo soft delete, reactivar, hard delete)
  const { 
    deleteDoctor, 
    reactivateDoctor, 
    hardDeleteDoctor, 
    loading: deleteLoading, 
    error: deleteError 
  } = useDoctorForm();

  // Validación robusta de parámetros de entrada
  useEffect(() => {
    if (!initialDoctor) {
      Logger.error('DetalleDoctor: No se recibieron datos del doctor');
      setDataError('No se recibieron datos del doctor');
      return;
    }

    // Validar que tenga al menos un ID válido
    const doctorId = initialDoctor.id_doctor || initialDoctor.id;
    if (!doctorId) {
      Logger.error('DetalleDoctor: Doctor sin ID válido', { initialDoctor });
      setDataError('Información del doctor incompleta');
      return;
    }

    Logger.info('DetalleDoctor: Datos del doctor recibidos correctamente', {
      doctorId: doctorId,
      doctorName: `${initialDoctor.nombre} ${initialDoctor.apellido}`
    });
  }, [initialDoctor]);

  // Hook para datos dinámicos del dashboard del doctor
  const { 
    doctor, 
    pacientesAsignados, 
    citasHoy, 
    citasRecientes, 
    loading, 
    error, 
    refetch 
  } = useDoctorPatientData(
    initialDoctor?.id_doctor || initialDoctor?.id
  );

  // Validar que solo administradores puedan acceder
  useEffect(() => {
    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
      Logger.warn('Acceso no autorizado a detalle de doctor', { userRole });
      navigation.goBack();
    }
  }, [userRole, navigation]);

  // Refrescar datos al volver a la pantalla
  useFocusEffect(
    React.useCallback(() => {
      Logger.info('DetalleDoctor: Pantalla enfocada, refrescando datos');
      if (refetch) {
        refetch();
      }
    }, [refetch])
  );

  // Priorizar initialDoctor que viene de GestionAdmin (tiene id_doctor garantizado)
  // Solo usar datos del hook para campos adicionales, no para el ID
  const currentDoctor = {
    ...initialDoctor, // Base: datos de GestionAdmin con id_doctor garantizado
    // Solo sobrescribir con datos del hook si existen y no afectan el ID
    ...(doctor && {
      // Campos adicionales del hook (sin tocar id_doctor)
      pacientesAsignados: doctor.pacientesAsignados,
      citasHoy: doctor.citasHoy,
      citasRecientes: doctor.citasRecientes,
      // Solo actualizar campos si el hook los tiene
      ...(doctor.nombre && { nombre: doctor.nombre }),
      ...(doctor.apellido && { apellido: doctor.apellido }),
      ...(doctor.email && { email: doctor.email }),
      ...(doctor.telefono && { telefono: doctor.telefono }),
      ...(doctor.activo !== undefined && { activo: doctor.activo })
    })
  };

  // Log para debug del ID
  Logger.info('DetalleDoctor: currentDoctor ID debug', {
    currentDoctorId: currentDoctor?.id_doctor,
    doctorFromHook: doctor?.id_doctor || doctor?.id,
    initialDoctorId: initialDoctor?.id_doctor || initialDoctor?.id,
    hasDoctor: !!doctor,
    hasInitialDoctor: !!initialDoctor,
    currentDoctor: currentDoctor
  });

  // Funciones helper para estados de citas
  const getEstadoCitaColor = (estado) => {
    switch (estado) {
      case ESTADOS_CITA.ATENDIDA:
        return '#4CAF50';
      case ESTADOS_CITA.PENDIENTE:
        return '#FF9800';
      case ESTADOS_CITA.NO_ASISTIDA:
        return '#F44336';
      case ESTADOS_CITA.REPROGRAMADA:
        return '#2196F3';
      case ESTADOS_CITA.CANCELADA:
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getEstadoCitaTexto = (estado) => {
    switch (estado) {
      case ESTADOS_CITA.ATENDIDA:
        return 'Atendida';
      case ESTADOS_CITA.PENDIENTE:
        return 'Pendiente';
      case ESTADOS_CITA.NO_ASISTIDA:
        return 'No Asistida';
      case ESTADOS_CITA.REPROGRAMADA:
        return 'Reprogramada';
      case ESTADOS_CITA.CANCELADA:
        return 'Cancelada';
      default:
        return estado || 'Pendiente';
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      Logger.info('Datos del doctor actualizados exitosamente');
    } catch (error) {
      Logger.error('Error refrescando datos del doctor', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditDoctor = () => {
    try {
      const currentDoctor = doctor ? {
        ...doctor,
        // El doctor del hook ya viene con id_doctor correcto
        apellido: doctor.apellido || initialDoctor?.apellido || 'Sin apellido',
        // Asegurar que todos los campos necesarios estén presentes
        apellido_paterno: doctor.apellido_paterno || doctor.apellido,
        apellido_materno: doctor.apellido_materno || '',
        telefono: doctor.telefono || '',
        institucion_hospitalaria: doctor.institucion_hospitalaria || '',
        grado_estudio: doctor.grado_estudio || '',
        anos_servicio: doctor.anos_servicio || 0,
        id_modulo: doctor.id_modulo || 1,
        activo: doctor.activo ?? true
      } : initialDoctor;
      
      // Log esencial: Datos del doctor que se envían a EditarDoctor
      Logger.info('DetalleDoctor: Datos enviados a EditarDoctor', {
        id: currentDoctor.id_doctor,
        nombre: currentDoctor.nombre,
        email: currentDoctor.email,
        apellido_paterno: currentDoctor.apellido_paterno,
        apellido_materno: currentDoctor.apellido_materno,
        telefono: currentDoctor.telefono,
        institucion_hospitalaria: currentDoctor.institucion_hospitalaria,
        grado_estudio: currentDoctor.grado_estudio,
        anos_servicio: currentDoctor.anos_servicio,
        id_modulo: currentDoctor.id_modulo,
        activo: currentDoctor.activo
      });
      navigation.navigate('EditarDoctor', { doctor: currentDoctor });
    } catch (error) {
      Logger.error('Error navegando a EditarDoctor', error);
      Alert.alert('Error', 'No se pudo abrir el formulario de editar doctor');
    }
  };

  const handleDeleteDoctor = async () => {
    // Usar initialDoctor que tiene id_doctor garantizado
    const currentDoctor = {
      ...initialDoctor,
      // Agregar datos adicionales del hook si existen
      ...(doctor && {
        pacientesAsignados: doctor.pacientesAsignados,
        citasHoy: doctor.citasHoy,
        citasRecientes: doctor.citasRecientes
      })
    };
    
    Alert.alert(
      'Desactivar Doctor',
      `¿Estás seguro de que quieres desactivar a ${currentDoctor.nombre} ${currentDoctor.apellido}?\n\nEl doctor será desactivado pero podrá ser reactivado posteriormente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desactivar', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Validar que tenemos un ID válido
              if (!currentDoctor.id_doctor) {
                Logger.error('DetalleDoctor: ID del doctor no encontrado', {
                  currentDoctor: currentDoctor,
                  doctor: doctor,
                  initialDoctor: initialDoctor
                });
                throw new Error('ID del doctor no encontrado. No se puede desactivar.');
              }
              
              Logger.info('DetalleDoctor: Iniciando desactivación de doctor', { 
                doctorId: currentDoctor.id_doctor, 
                name: `${currentDoctor.nombre} ${currentDoctor.apellido}`
              });
              
              const result = await deleteDoctor(currentDoctor.id_doctor);
              
              if (result.success) {
                Logger.success('DetalleDoctor: Doctor desactivado exitosamente', { 
                  doctorId: currentDoctor.id_doctor 
                });
                
                Alert.alert(
                  'Doctor Desactivado', 
                  'El doctor ha sido desactivado exitosamente',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                throw new Error(result.error || 'Error al desactivar doctor');
              }
            } catch (error) {
              Logger.error('DetalleDoctor: Error desactivando doctor', { 
                doctorId: currentDoctor.id_doctor, 
                error: error.message 
              });
              
              Alert.alert(
                'Error al Desactivar', 
                `No se pudo desactivar el doctor: ${error.message}`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleReactivateDoctor = async () => {
    const currentDoctor = {
      ...initialDoctor,
      ...(doctor && {
        pacientesAsignados: doctor.pacientesAsignados,
        citasHoy: doctor.citasHoy,
        citasRecientes: doctor.citasRecientes
      })
    };
    
    Alert.alert(
      'Reactivar Doctor',
      `¿Estás seguro de que quieres reactivar a ${currentDoctor.nombre} ${currentDoctor.apellido}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Reactivar', 
          style: 'default',
          onPress: async () => {
            try {
              if (!currentDoctor.id_doctor) {
                throw new Error('ID del doctor no encontrado. No se puede reactivar.');
              }
              
              Logger.info('DetalleDoctor: Iniciando reactivación de doctor', { 
                doctorId: currentDoctor.id_doctor, 
                name: `${currentDoctor.nombre} ${currentDoctor.apellido}`
              });
              
              const result = await reactivateDoctor(currentDoctor.id_doctor);
              
              if (result.success) {
                Logger.success('DetalleDoctor: Doctor reactivado exitosamente', { 
                  doctorId: currentDoctor.id_doctor 
                });
                
                Alert.alert(
                  'Doctor Reactivado', 
                  'El doctor ha sido reactivado exitosamente',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                throw new Error(result.error || 'Error al reactivar doctor');
              }
            } catch (error) {
              Logger.error('DetalleDoctor: Error reactivando doctor', { 
                doctorId: currentDoctor.id_doctor, 
                error: error.message 
              });
              
              Alert.alert(
                'Error al Reactivar', 
                `No se pudo reactivar el doctor: ${error.message}`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleHardDeleteDoctor = async () => {
    const currentDoctor = {
      ...initialDoctor,
      ...(doctor && {
        pacientesAsignados: doctor.pacientesAsignados,
        citasHoy: doctor.citasHoy,
        citasRecientes: doctor.citasRecientes
      })
    };
    
    Alert.alert(
      'Eliminar Permanentemente',
      `⚠️ ADVERTENCIA ⚠️\n\n¿Estás seguro de que quieres eliminar PERMANENTEMENTE a ${currentDoctor.nombre} ${currentDoctor.apellido}?\n\nEsta acción NO se puede deshacer y eliminará todos los datos del doctor.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'ELIMINAR PERMANENTEMENTE', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentDoctor.id_doctor) {
                throw new Error('ID del doctor no encontrado. No se puede eliminar.');
              }
              
              Logger.info('DetalleDoctor: Iniciando eliminación permanente de doctor', { 
                doctorId: currentDoctor.id_doctor, 
                name: `${currentDoctor.nombre} ${currentDoctor.apellido}`
              });
              
              const result = await hardDeleteDoctor(currentDoctor.id_doctor);
              
              if (result.success) {
                Logger.success('DetalleDoctor: Doctor eliminado permanentemente', { 
                  doctorId: currentDoctor.id_doctor 
                });
                
                Alert.alert(
                  'Doctor Eliminado Permanentemente', 
                  'El doctor ha sido eliminado permanentemente del sistema',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack()
                    }
                  ]
                );
              } else {
                throw new Error(result.error || 'Error al eliminar doctor permanentemente');
              }
            } catch (error) {
              Logger.error('DetalleDoctor: Error eliminando doctor permanentemente', { 
                doctorId: currentDoctor.id_doctor, 
                error: error.message 
              });
              
              Alert.alert(
                'Error al Eliminar', 
                `No se pudo eliminar el doctor: ${error.message}`,
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    const currentDoctor = {
      ...initialDoctor,
      ...(doctor && {
        pacientesAsignados: doctor.pacientesAsignados,
        citasHoy: doctor.citasHoy,
        citasRecientes: doctor.citasRecientes
      })
    };

    // Validar que tenga email
    if (!currentDoctor.email) {
      Alert.alert('Error', 'No se puede cambiar la contraseña: el doctor no tiene email registrado');
      return;
    }

    // Validar contraseñas
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa ambos campos de contraseña');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    Alert.alert(
      'Cambiar Contraseña',
      `¿Estás seguro de que quieres cambiar la contraseña de ${currentDoctor.nombre} ${currentDoctor.apellido}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cambiar Contraseña', 
          style: 'default',
          onPress: async () => {
            try {
              setPasswordLoading(true);
              
              Logger.info('DetalleDoctor: Cambiando contraseña del doctor', { 
                doctorId: currentDoctor.id_doctor, 
                email: currentDoctor.email,
                name: `${currentDoctor.nombre} ${currentDoctor.apellido}`
              });

              // Importar gestionService dinámicamente para evitar problemas de importación
              const gestionService = (await import('../../api/gestionService.js')).default;
              
              const result = await gestionService.changeDoctorPassword(currentDoctor.email, newPassword);
              
              if (result.message) {
                Logger.success('DetalleDoctor: Contraseña cambiada exitosamente', { 
                  doctorId: currentDoctor.id_doctor,
                  email: currentDoctor.email
                });
                
                Alert.alert(
                  'Contraseña Cambiada', 
                  'La contraseña del doctor ha sido cambiada exitosamente',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        setShowPasswordModal(false);
                        setNewPassword('');
                        setConfirmPassword('');
                      }
                    }
                  ]
                );
              } else {
                throw new Error(result.error || 'Error al cambiar contraseña');
              }
            } catch (error) {
              Logger.error('DetalleDoctor: Error cambiando contraseña del doctor', { 
                doctorId: currentDoctor.id_doctor, 
                email: currentDoctor.email,
                error: error.message 
              });
              
              Alert.alert(
                'Error al Cambiar Contraseña', 
                `No se pudo cambiar la contraseña: ${error.message}`,
                [{ text: 'OK' }]
              );
            } finally {
              setPasswordLoading(false);
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FUNCIONES DE BÚSQUEDA DE PACIENTES ASIGNADOS
  // =====================================================

  const handleOpenSearchModal = () => {
    setSearchQuery('');
    setFilteredPacientes(pacientesAsignados);
    setShowSearchModal(true);
  };

  const handleSearchPatients = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredPacientes(pacientesAsignados);
    } else {
      const filtered = pacientesAsignados.filter(paciente => {
        const nombreCompleto = `${paciente.nombre} ${paciente.apellido}`.toLowerCase();
        return nombreCompleto.includes(query.toLowerCase());
      });
      setFilteredPacientes(filtered);
    }
  };

  // FUNCIONES DE ASIGNACIÓN DE PACIENTES
  // =====================================================

  const handleOpenAssignModal = async () => {
    try {
      setAssignLoading(true);
      
      const currentDoctor = {
        ...initialDoctor,
        ...(doctor && {
          pacientesAsignados: doctor.pacientesAsignados,
          citasHoy: doctor.citasHoy,
          citasRecientes: doctor.citasRecientes
        })
      };

      Logger.info('DetalleDoctor: Obteniendo pacientes disponibles', { 
        doctorId: currentDoctor.id_doctor 
      });

      const gestionService = (await import('../../api/gestionService.js')).default;
      const result = await gestionService.getAvailablePatients(currentDoctor.id_doctor);
      
      if (result.success) {
        setAvailablePatients(result.data || []);
        setShowAssignModal(true);
        
        Logger.success('DetalleDoctor: Pacientes disponibles obtenidos', { 
          doctorId: currentDoctor.id_doctor,
          total: result.data?.length || 0
        });
      } else {
        throw new Error(result.error || 'Error al obtener pacientes disponibles');
      }
    } catch (error) {
      Logger.error('DetalleDoctor: Error obteniendo pacientes disponibles', { 
        doctorId: currentDoctor?.id_doctor,
        error: error.message 
      });
      
      Alert.alert(
        'Error', 
        `No se pudieron obtener los pacientes disponibles: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAssignPatient = async (patient) => {
    try {
      setAssignLoading(true);
      
      const currentDoctor = {
        ...initialDoctor,
        ...(doctor && {
          pacientesAsignados: doctor.pacientesAsignados,
          citasHoy: doctor.citasHoy,
          citasRecientes: doctor.citasRecientes
        })
      };

      Logger.info('DetalleDoctor: Asignando paciente a doctor', { 
        doctorId: currentDoctor.id_doctor,
        patientId: patient.id_paciente,
        patientName: `${patient.nombre} ${patient.apellido_paterno}`
      });

      const gestionService = (await import('../../api/gestionService.js')).default;
      const result = await gestionService.assignPatientToDoctor(
        currentDoctor.id_doctor, 
        patient.id_paciente
      );
      
      if (result.success) {
        // Actualizar la lista de pacientes disponibles
        setAvailablePatients(prev => 
          prev.filter(p => p.id_paciente !== patient.id_paciente)
        );
        
        // Refrescar los datos del doctor para mostrar el nuevo paciente asignado
        if (refetch) {
          await refetch();
        }
        
        Alert.alert(
          'Paciente Asignado', 
          `${patient.nombre} ${patient.apellido_paterno} ha sido asignado exitosamente al doctor.`,
          [{ text: 'OK' }]
        );
        
        Logger.success('DetalleDoctor: Paciente asignado exitosamente', { 
          doctorId: currentDoctor.id_doctor,
          patientId: patient.id_paciente
        });
      } else {
        throw new Error(result.error || 'Error al asignar paciente');
      }
    } catch (error) {
      Logger.error('DetalleDoctor: Error asignando paciente', { 
        doctorId: currentDoctor?.id_doctor,
        patientId: patient?.id_paciente,
        error: error.message 
      });
      
      Alert.alert(
        'Error al Asignar Paciente', 
        `No se pudo asignar el paciente: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignPatient = async (patient) => {
    Alert.alert(
      'Desasignar Paciente',
      `¿Estás seguro de que quieres desasignar a ${patient.nombre} ${patient.apellido_paterno} de este doctor?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desasignar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setUnassignLoading(prev => ({ ...prev, [patient.id]: true }));
              
              const currentDoctor = {
                ...initialDoctor,
                ...(doctor && {
                  pacientesAsignados: doctor.pacientesAsignados,
                  citasHoy: doctor.citasHoy,
                  citasRecientes: doctor.citasRecientes
                })
              };

              Logger.info('DetalleDoctor: Desasignando paciente de doctor', { 
                doctorId: currentDoctor.id_doctor,
                patientId: patient.id,
                patientName: `${patient.nombre} ${patient.apellido}`
              });

              const gestionService = (await import('../../api/gestionService.js')).default;
              const result = await gestionService.unassignPatientFromDoctor(
                currentDoctor.id_doctor, 
                patient.id
              );
              
              if (result.success) {
                // Refrescar los datos del doctor para actualizar la lista
                if (refetch) {
                  await refetch();
                }
                
                Alert.alert(
                  'Paciente Desasignado', 
                  `${patient.nombre} ${patient.apellido} ha sido desasignado exitosamente del doctor.`,
                  [{ text: 'OK' }]
                );
                
                Logger.success('DetalleDoctor: Paciente desasignado exitosamente', { 
                  doctorId: currentDoctor.id_doctor,
                  patientId: patient.id
                });
              } else {
                throw new Error(result.error || 'Error al desasignar paciente');
              }
            } catch (error) {
              Logger.error('DetalleDoctor: Error desasignando paciente', { 
                doctorId: currentDoctor?.id_doctor,
                patientId: patient?.id,
                error: error.message 
              });
              
              Alert.alert(
                'Error al Desasignar Paciente', 
                `No se pudo desasignar el paciente: ${error.message}`,
                [{ text: 'OK' }]
              );
            } finally {
              setUnassignLoading(prev => ({ ...prev, [patient.id]: false }));
            }
          }
        }
      ]
    );
  };

  const handleViewPatient = (paciente) => {
    Logger.navigation('DetalleDoctor', 'ViewPatient', { pacienteId: paciente.id_paciente });
    navigation.navigate('DetallePaciente', { paciente });
  };

  // Helper: nombre del paciente desde cita (formato lista doctor)
  const getPacienteNombreFromCita = (cita) => {
    if (!cita) return 'Paciente';
    if (cita.paciente_nombre) return cita.paciente_nombre;
    const p = cita.paciente || cita.Paciente;
    if (p) return `${p.nombre || ''} ${p.apellido || p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim();
    return 'Paciente';
  };

  // Abrir wizard Completar cita (reutiliza lógica de VerTodasCitas)
  const handleOpenCompletarCita = async (cita) => {
    const citaId = cita?.id_cita || cita?.id;
    if (!citaId) {
      Alert.alert('Error', 'ID de cita no válido');
      return;
    }
    setCitaRecienteSeleccionada(null);
    try {
      const citaData = await gestionService.getCitaById(citaId);
      if (citaData && citaData.id_cita) {
        setCitaSeleccionadaWizard(citaData);
        setShowWizard(true);
      } else {
        Alert.alert('Error', 'No se pudieron cargar los datos de la cita');
      }
    } catch (error) {
      Logger.error('DetalleDoctor: Error abriendo wizard', error);
      Alert.alert('Error', 'No se pudo abrir el wizard: ' + (error.message || 'Error desconocido'));
    }
  };

  // Abrir modal Cambiar estado
  const handleOpenCambiarEstado = (cita) => {
    setCitaSeleccionadaEstado(cita);
    setNuevoEstado((cita.estado || ESTADOS_CITA.PENDIENTE).toLowerCase());
    setCitaRecienteSeleccionada(null);
    setShowEstadoModal(true);
  };

  // Actualizar estado de cita
  const handleActualizarEstado = async () => {
    const cita = citaSeleccionadaEstado;
    if (!cita || !nuevoEstado) {
      Alert.alert('Error', 'Por favor, selecciona un estado');
      return;
    }
    try {
      setActualizando(true);
      const citaId = cita.id_cita || cita.id;
      const response = await gestionService.updateEstadoCita(citaId, nuevoEstado);
      if (response.success) {
        Alert.alert('Éxito', 'Estado actualizado exitosamente');
        setShowEstadoModal(false);
        setCitaSeleccionadaEstado(null);
        if (refetch) await refetch();
      } else {
        Alert.alert('Error', response.error || 'No se pudo actualizar el estado');
      }
    } catch (error) {
      Logger.error('DetalleDoctor: Error actualizando estado', error);
      Alert.alert('Error', 'No se pudo actualizar el estado. Intenta de nuevo.');
    } finally {
      setActualizando(false);
    }
  };

  // Abrir modal Reprogramar
  const handleOpenReprogramar = (cita) => {
    setCitaSeleccionadaReprogramar(cita);
    setFechaReprogramada('');
    setMotivoReprogramacion('');
    setCitaRecienteSeleccionada(null);
    setShowReprogramarModal(true);
  };

  // Enviar reprogramación
  const handleEnviarReprogramacion = async () => {
    const cita = citaSeleccionadaReprogramar;
    if (!cita || !fechaReprogramada) {
      Alert.alert('Error', 'Por favor, selecciona una fecha para reprogramar');
      return;
    }
    try {
      setActualizando(true);
      const citaId = cita.id_cita || cita.id;
      const response = await gestionService.reprogramarCita(
        citaId,
        fechaReprogramada,
        motivoReprogramacion.trim() || ''
      );
      if (response.success) {
        Alert.alert('Éxito', 'Cita reprogramada exitosamente');
        setShowReprogramarModal(false);
        setCitaSeleccionadaReprogramar(null);
        setFechaReprogramada('');
        setMotivoReprogramacion('');
        if (refetch) await refetch();
      } else {
        Alert.alert('Error', response.error || 'No se pudo reprogramar la cita');
      }
    } catch (error) {
      Logger.error('DetalleDoctor: Error reprogramando cita', error);
      Alert.alert('Error', 'No se pudo reprogramar la cita. Intenta de nuevo.');
    } finally {
      setActualizando(false);
    }
  };

  // Éxito del wizard: refrescar y cerrar
  const handleWizardSuccess = () => {
    if (refetch) refetch();
    setShowWizard(false);
    setCitaSeleccionadaWizard(null);
  };

  const renderPatientCard = (paciente) => {
    return (
      <Card key={paciente.id} style={styles.patientCard}>
        <Card.Content>
          <View style={styles.patientHeader}>
            <View style={styles.patientInfo}>
              <Title style={styles.patientName}>
                {paciente.nombre} {paciente.apellido}
              </Title>
              <Text style={styles.patientDetails}>
                {paciente.edad} años • {paciente.telefono || 'Sin teléfono'}
              </Text>
            </View>
            <Chip 
              style={styles.stableChip}
              textStyle={styles.statusChipText}
            >
              Activo
            </Chip>
          </View>
          
          {paciente.comorbilidades && paciente.comorbilidades.length > 0 && (
            <View style={styles.comorbilidadesContainer}>
              <Text style={styles.comorbilidadesLabel}>Comorbilidades:</Text>
              <View style={styles.comorbilidadesChips}>
                {paciente.comorbilidades.map((comorbilidad, index) => (
                  <Chip key={index} style={styles.comorbilidadChip} textStyle={styles.comorbilidadChipText}>
                    {comorbilidad}
                  </Chip>
                ))}
              </View>
            </View>
          )}
          
          <View style={styles.patientActions}>
            <Button
              mode="outlined"
              onPress={() => handleViewPatient(paciente)}
              style={[styles.patientActionButton, styles.viewButton]}
            >
              Ver
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleUnassignPatient(paciente)}
              style={[styles.patientActionButton, styles.unassignButton]}
              buttonColor={COLORES.ERROR_LIGHT}
              textColor="#FFFFFF"
              loading={unassignLoading[paciente.id]}
              disabled={unassignLoading[paciente.id]}
            >
              {unassignLoading[paciente.id] ? 'Desasignando...' : 'Desasignar'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderAppointmentCard = (cita) => (
    <TouchableOpacity
      key={cita.id}
      onPress={() => setCitaRecienteSeleccionada(cita)}
      activeOpacity={0.7}
    >
      <Card style={styles.appointmentCard}>
        <Card.Content>
          <View style={styles.appointmentHeader}>
            <Title style={styles.appointmentTitle}>
              {cita.paciente.nombre} {cita.paciente.apellido}
            </Title>
            <Text style={styles.appointmentTime}>
              {formatAppointmentDate(cita.fecha_cita)}
            </Text>
          </View>
          
          <Paragraph style={styles.appointmentMotivo}>
            <Text style={styles.boldText}>Motivo:</Text> {cita.motivo}
          </Paragraph>
          
          <View style={styles.appointmentStatus}>
            <Chip 
              style={[
                styles.statusChip,
                { backgroundColor: getEstadoCitaColor(cita.estado || ESTADOS_CITA.PENDIENTE) }
              ]}
              textStyle={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}
            >
              {getEstadoCitaTexto(cita.estado || ESTADOS_CITA.PENDIENTE)}
            </Chip>
          </View>
          
          <Button
            mode="outlined"
            onPress={() => setCitaRecienteSeleccionada(cita)}
            style={styles.viewButton}
          >
            Ver Detalles
          </Button>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderTodayAppointmentCard = (cita) => (
    <TouchableOpacity
      key={cita.id}
      onPress={() => setCitaHoySeleccionada(cita)}
      activeOpacity={0.7}
    >
      <Card style={styles.todayAppointmentCard}>
        <Card.Content>
          <View style={styles.todayAppointmentHeader}>
            <Text style={styles.todayAppointmentTime} numberOfLines={1}>
              {formatTodayAppointment(cita.fecha_cita)}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getEstadoCitaColor(cita.estado || ESTADOS_CITA.PENDIENTE) }
            ]}>
              <Text style={styles.statusBadgeText}>
                {getEstadoCitaTexto(cita.estado || ESTADOS_CITA.PENDIENTE)}
              </Text>
            </View>
          </View>
          
          <Title style={styles.todayAppointmentTitle}>
            {cita.paciente.nombre} {cita.paciente.apellido}
          </Title>
          
          <Paragraph style={styles.todayAppointmentMotivo}>
            {cita.motivo}
          </Paragraph>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Abrir modal Detalle de Cita (reutilizado por Citas de Hoy y Citas Recientes)
  const handleOpenCitaDetalle = async (cita) => {
    const citaId = cita?.id_cita || cita?.id;
    if (!citaId) {
      Alert.alert('Error', 'ID de cita no válido');
      return;
    }
    setLoadingCitaDetalle(true);
    setCitaDetalle(null);
    setCitaHoySeleccionada(null);
    setCitaRecienteSeleccionada(null);
    setShowDetalleCitaModal(true);
    try {
      Logger.info('DetalleDoctor: Obteniendo detalle de cita', { citaId });
      const citaData = await gestionService.getCitaById(citaId);
      Logger.success('DetalleDoctor: Detalle de cita obtenido', {
        citaId,
        hasSignosVitales: Array.isArray(citaData?.SignosVitales) && citaData.SignosVitales.length > 0,
      });
      setCitaDetalle(citaData);
    } catch (error) {
      Logger.error('DetalleDoctor: Error obteniendo detalle de cita', error);
      Alert.alert('Error', 'No se pudo cargar el detalle de la cita');
      setShowDetalleCitaModal(false);
    } finally {
      setLoadingCitaDetalle(false);
    }
  };

  const opcionesCitaHoy = React.useMemo(() => {
    if (!citaHoySeleccionada) return [];
    return [
      {
        label: 'Ver detalle',
        onPress: () => handleOpenCitaDetalle(citaHoySeleccionada),
        color: '#2196F3',
      },
    ];
  }, [citaHoySeleccionada]);

  // Opciones del modal "Citas Recientes" según estado (abren modales directos, sin navegar)
  const opcionesCitaReciente = React.useMemo(() => {
    if (!citaRecienteSeleccionada) return [];
    const cita = citaRecienteSeleccionada;
    const estado = (cita.estado || ESTADOS_CITA.PENDIENTE).toLowerCase();
    const options = [
      {
        label: 'Ver detalle completo',
        onPress: () => handleOpenCitaDetalle(cita),
        color: '#2196F3',
      },
    ];
    if (estado === ESTADOS_CITA.PENDIENTE) {
      options.push(
        { label: 'Completar cita', onPress: () => handleOpenCompletarCita(cita), color: '#4CAF50' },
        { label: 'Reprogramar', onPress: () => handleOpenReprogramar(cita), color: '#2196F3' },
        { label: 'Cambiar estado', onPress: () => handleOpenCambiarEstado(cita), color: '#FF9800' }
      );
    } else if (estado === ESTADOS_CITA.REPROGRAMADA) {
      options.push({
        label: 'Reprogramar',
        onPress: () => handleOpenReprogramar(cita),
        color: '#2196F3',
      });
    }
    return options;
  }, [citaRecienteSeleccionada]);

  // Título del modal de opciones para una cita reciente (reutiliza formateo)
  const tituloModalCitaReciente = React.useMemo(() => {
    if (!citaRecienteSeleccionada) return 'Opciones';
    const c = citaRecienteSeleccionada;
    const nombre = c.paciente ? `${c.paciente.nombre || ''} ${c.paciente.apellido || ''}`.trim() || 'Paciente' : 'Paciente';
    const fecha = formatAppointmentDate(c.fecha_cita);
    const estadoTexto = getEstadoCitaTexto(c.estado || ESTADOS_CITA.PENDIENTE);
    return `Cita: ${nombre} - ${fecha} - ${estadoTexto}`;
  }, [citaRecienteSeleccionada]);

  // Si no es administrador, no renderizar nada
  // Usar datos dinámicos o fallback a datos iniciales con validación

  // Validar que solo administradores puedan acceder
  if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>🚫 Acceso Denegado</Text>
          <Text style={styles.accessDeniedMessage}>
            Solo los administradores pueden acceder a esta pantalla.
          </Text>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Mostrar error de datos si no hay información válida
  if (dataError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ Error de Datos</Text>
          <Text style={styles.errorMessage}>
            {dataError}. Por favor, regresa y selecciona un doctor válido.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Mostrar loading si está cargando
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Cargando detalles del doctor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Mostrar error si hay error en la API
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ Error de Conexión</Text>
          <Text style={styles.errorMessage}>
            No se pudieron cargar los detalles del doctor. Desliza hacia abajo para intentar nuevamente.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Validación final de datos antes de renderizar
  if (!currentDoctor || !currentDoctor.id_doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ Datos Incompletos</Text>
          <Text style={styles.errorMessage}>
            La información del doctor está incompleta. Por favor, regresa y selecciona un doctor válido.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
            tintColor="#1976D2"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>
                {currentDoctor.nombre} {currentDoctor.apellido_paterno} {currentDoctor.apellido_materno}
              </Text>
              <Text style={styles.headerSubtitle}>
                {currentDoctor.grado_estudio} • {currentDoctor.modulo ? ` ${currentDoctor.modulo}` : 'Sin módulo asignado'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {currentDoctor.activo ? (
            // Botones para doctor activo
            <>
              {/* Primera fila: Editar y Desactivar */}
              <View style={styles.topButtonsRow}>
                <Button
                  mode="contained"
                  onPress={handleEditDoctor}
                  style={[styles.topButton, styles.editButton]}
                  buttonColor={COLORES.ADVERTENCIA_LIGHT}
                  textColor="#FFFFFF"
                  labelStyle={styles.buttonLabel}
                >
                  Editar
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleDeleteDoctor}
                  style={[styles.topButton, styles.deleteButton]}
                  buttonColor={COLORES.ERROR_LIGHT}
                  textColor="#FFFFFF"
                  labelStyle={styles.buttonLabel}
                  disabled={deleteLoading}
                  loading={deleteLoading}
                >
                  {deleteLoading ? 'Desactivando...' : 'Desactivar'}
                </Button>
              </View>
              
              {/* Segunda fila: Cambiar Contraseña (100% ancho) */}
              <Button
                mode="outlined"
                onPress={() => setShowPasswordModal(true)}
                style={[styles.fullWidthButton, styles.passwordButton]}
                buttonColor={COLORES.SECUNDARIO_LIGHT}
                textColor="#FFFFFF"
                labelStyle={styles.buttonLabel}
                icon="key"
              >
                Cambiar Contraseña
              </Button>
            </>
          ) : (
            // Botones para doctor inactivo
            <>
              <Button
                mode="contained"
                onPress={handleReactivateDoctor}
                style={[styles.actionButton, styles.reactivateButton]}
                buttonColor={COLORES.EXITO_LIGHT}
                textColor="#FFFFFF"
                labelStyle={styles.buttonLabel}
                disabled={deleteLoading}
                loading={deleteLoading}
              >
                {deleteLoading ? 'Reactivando...' : 'Reactivar'}
              </Button>
              <Button
                mode="outlined"
                onPress={handleHardDeleteDoctor}
                style={[styles.actionButton, styles.hardDeleteButton]}
                buttonColor={COLORES.ERROR}
                textColor="#FFFFFF"
                labelStyle={styles.buttonLabel}
                disabled={deleteLoading}
                loading={deleteLoading}
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar Permanentemente'}
              </Button>
            </>
          )}
        </View>

        {/* Información General */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Información General</Title>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{currentDoctor.email || 'No disponible'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Teléfono:</Text>
                <Text style={styles.infoValue}>{currentDoctor.telefono || 'No disponible'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Institución:</Text>
                <Text style={styles.infoValue}>{currentDoctor.institucion_hospitalaria || 'No disponible'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Años de Servicio:</Text>
                <Text style={styles.infoValue}>{currentDoctor.anos_servicio || '0'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Pacientes Asignados:</Text>
                <Text style={styles.infoValue}>{pacientesAsignados.length}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Fecha de Registro:</Text>
                <Text style={styles.infoValue}>
                  {currentDoctor.fecha_registro ? formatDate(new Date(currentDoctor.fecha_registro)) : 'No disponible'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Citas de Hoy */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>📅 Citas de Hoy</Title>
            {citasHoy.length > 0 ? (
              citasHoy.map(renderTodayAppointmentCard)
            ) : (
              <Text style={styles.noDataText}>No hay citas programadas para hoy</Text>
            )}
          </Card.Content>
        </Card>

        {/* Pacientes Asignados */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Title style={styles.cardHeaderTitle}>👥 Pacientes Asignados</Title>
                <Text style={styles.patientCount}>({pacientesAsignados.length})</Text>
              </View>
              <View style={styles.cardHeaderButtons}>
                <Button
                  mode="contained"
                  onPress={handleOpenAssignModal}
                  style={styles.assignButton}
                  buttonColor={COLORES.EXITO_LIGHT}
                  textColor="#FFFFFF"
                  loading={assignLoading}
                  disabled={assignLoading}
                  compact={true}
                >
                  {assignLoading ? 'Cargando...' : 'Asignar'}
                </Button>
                <TouchableOpacity 
                  style={styles.searchButton}
                  onPress={handleOpenSearchModal}
                >
                  <Text style={styles.searchButtonText}>🔍</Text>
                </TouchableOpacity>
              </View>
            </View>
            {pacientesAsignados.length > 0 ? (
              <ScrollView 
                style={styles.pacientesAsignadosList}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {pacientesAsignados.map(renderPatientCard)}
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>No hay pacientes asignados</Text>
            )}
          </Card.Content>
        </Card>

        {/* Citas Recientes */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.cardTitle}>Citas Recientes</Title>
            {citasRecientes.length > 0 ? (
              <ScrollView 
                style={styles.citasRecientesList}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {citasRecientes.map(renderAppointmentCard)}
              </ScrollView>
            ) : (
              <Text style={styles.noDataText}>No hay citas recientes</Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Modal al tocar una cita de hoy (Citas de Hoy) */}
      <OptionsModal
        visible={!!citaHoySeleccionada}
        onClose={() => setCitaHoySeleccionada(null)}
        title={citaHoySeleccionada
          ? `Cita: ${citaHoySeleccionada.paciente?.nombre || ''} ${citaHoySeleccionada.paciente?.apellido || ''} - ${formatTodayAppointment(citaHoySeleccionada.fecha_cita)}`
          : 'Opciones'}
        options={opcionesCitaHoy}
      />

      {/* Modal al tocar una cita reciente (Citas Recientes): info + opciones por estado */}
      <OptionsModal
        visible={!!citaRecienteSeleccionada}
        onClose={() => setCitaRecienteSeleccionada(null)}
        title={tituloModalCitaReciente}
        options={opcionesCitaReciente}
      />

      {/* Modal Detalle de Cita (reutilizado por Citas de Hoy y Citas Recientes) */}
      <DetalleCitaModal
        visible={showDetalleCitaModal}
        onClose={() => {
          setShowDetalleCitaModal(false);
          setCitaDetalle(null);
        }}
        citaDetalle={citaDetalle}
        loading={loadingCitaDetalle}
        userRole={userRole}
        formatearFecha={formatDateTime}
      />

      {/* Wizard Completar cita (desde Citas Recientes) */}
      <CompletarCitaWizard
        visible={showWizard}
        onClose={() => {
          setShowWizard(false);
          setCitaSeleccionadaWizard(null);
        }}
        cita={citaSeleccionadaWizard}
        onSuccess={handleWizardSuccess}
      />

      {/* Modal Cambiar estado (desde Citas Recientes) */}
      <Modal
        visible={showEstadoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEstadoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>📋 Cambiar Estado</Title>
              <TouchableOpacity onPress={() => setShowEstadoModal(false)}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              {citaSeleccionadaEstado && (
                <View style={styles.modalCitaInfo}>
                  <Text style={styles.modalCitaInfoText}>
                    👤 {getPacienteNombreFromCita(citaSeleccionadaEstado)}
                  </Text>
                  <Text style={styles.modalCitaInfoText}>
                    📅 {formatDateTime(citaSeleccionadaEstado.fecha_cita)}
                  </Text>
                  <Text style={styles.modalCitaInfoText}>
                    Estado actual: {getEstadoCitaTexto(citaSeleccionadaEstado.estado)}
                  </Text>
                </View>
              )}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Nuevo Estado *</Text>
                <View style={styles.estadosContainer}>
                  {Object.values(ESTADOS_CITA).map((estado) => (
                    <TouchableOpacity
                      key={estado}
                      style={[
                        styles.estadoOption,
                        nuevoEstado === estado && styles.estadoOptionActive,
                        { backgroundColor: nuevoEstado === estado ? getEstadoCitaColor(estado) : '#E0E0E0' }
                      ]}
                      onPress={() => setNuevoEstado(estado)}
                    >
                      <Text
                        style={[
                          styles.estadoOptionText,
                          nuevoEstado === estado && styles.estadoOptionTextActive
                        ]}
                      >
                        {getEstadoCitaTexto(estado)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowEstadoModal(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
                disabled={actualizando}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleActualizarEstado}
                style={[styles.modalButton, styles.modalApplyButton]}
                buttonColor={COLORES.EXITO_LIGHT}
                loading={actualizando}
                disabled={actualizando || !nuevoEstado}
              >
                Actualizar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Reprogramar (desde Citas Recientes) */}
      <Modal
        visible={showReprogramarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReprogramarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>🔄 Reprogramar Cita</Title>
              <TouchableOpacity onPress={() => setShowReprogramarModal(false)}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              {citaSeleccionadaReprogramar && (
                <View style={styles.modalCitaInfo}>
                  <Text style={styles.modalCitaInfoText}>
                    👤 {getPacienteNombreFromCita(citaSeleccionadaReprogramar)}
                  </Text>
                  <Text style={styles.modalCitaInfoText}>
                    📅 Fecha actual: {formatDateTime(citaSeleccionadaReprogramar.fecha_cita)}
                  </Text>
                </View>
              )}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Nueva Fecha y Hora *</Text>
                <DateTimePickerButton
                  value={fechaReprogramada}
                  onDateChange={setFechaReprogramada}
                  label="Seleccionar fecha y hora"
                  minimumDate={new Date()}
                />
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Motivo (opcional)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Ej: Cambio de horario por disponibilidad..."
                  value={motivoReprogramacion}
                  onChangeText={setMotivoReprogramacion}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowReprogramarModal(false)}
                style={[styles.modalButton, styles.modalCancelButton]}
                disabled={actualizando}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleEnviarReprogramacion}
                style={[styles.modalButton, styles.modalApplyButton]}
                buttonColor={COLORES.NAV_PRIMARIO}
                loading={actualizando}
                disabled={actualizando || !fechaReprogramada}
              >
                Reprogramar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para cambiar contraseña */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔐 Cambiar Contraseña</Text>
              <TouchableOpacity
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                Cambiar contraseña para: {currentDoctor?.nombre} {currentDoctor?.apellido}
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nueva Contraseña:</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Ingresa nueva contraseña"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirmar Contraseña:</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirma la nueva contraseña"
                  secureTextEntry={true}
                  autoCapitalize="none"
                />
              </View>
              
              <Text style={styles.passwordHint}>
                La contraseña debe tener al menos 6 caracteres
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalButton}
                disabled={passwordLoading}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleChangePassword}
                style={styles.modalButton}
                buttonColor={COLORES.SECUNDARIO_LIGHT}
                disabled={passwordLoading}
                loading={passwordLoading}
              >
                {passwordLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para buscar pacientes asignados */}
      <Modal
        visible={showSearchModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Buscar Paciente</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchPatients}
                placeholder="Buscar por nombre..."
                autoCapitalize="none"
                autoFocus={true}
              />
              
              <ScrollView style={styles.searchResultsList}>
                {filteredPacientes.length > 0 ? (
                  filteredPacientes.map((paciente) => (
                    <TouchableOpacity
                      key={paciente.id}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setShowSearchModal(false);
                        handleViewPatient(paciente);
                      }}
                    >
                      <View style={styles.searchResultInfo}>
                        <Text style={styles.searchResultName}>
                          {paciente.nombre} {paciente.apellido}
                        </Text>
                        <Text style={styles.searchResultDetails}>
                          {paciente.edad} años • {paciente.telefono || 'Sin teléfono'}
                        </Text>
                      </View>
                      <Text style={styles.searchResultArrow}>→</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noResultsText}>
                    {searchQuery ? 'No se encontraron pacientes' : 'Ingresa un nombre para buscar'}
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para asignar pacientes */}
      <Modal
        visible={showAssignModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAssignModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👥 Asignar Paciente</Text>
              <TouchableOpacity
                onPress={() => setShowAssignModal(false)}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                Selecciona un paciente para asignar a {currentDoctor?.nombre} {currentDoctor?.apellido}
              </Text>
              
              {availablePatients.length > 0 ? (
                <ScrollView style={styles.patientsList} showsVerticalScrollIndicator={false}>
                  {availablePatients.map((patient) => (
                    <TouchableOpacity
                      key={patient.id_paciente}
                      style={styles.patientOption}
                      onPress={() => handleAssignPatient(patient)}
                      disabled={assignLoading}
                    >
                      <View style={styles.patientOptionInfo}>
                        <Text style={styles.patientOptionName}>
                          {patient.nombre} {patient.apellido_paterno} {patient.apellido_materno || ''}
                        </Text>
                        <Text style={styles.patientOptionDetails}>
                          {patient.edad} años • {patient.sexo} • {patient.numero_celular || 'Sin teléfono'}
                        </Text>
                      </View>
                      <Button
                        mode="contained"
                        onPress={() => handleAssignPatient(patient)}
                        style={styles.assignPatientButton}
                        buttonColor={COLORES.EXITO_LIGHT}
                        textColor="#FFFFFF"
                        icon="plus"
                        loading={assignLoading}
                        disabled={assignLoading}
                      >
                        Asignar
                      </Button>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.noPatientsContainer}>
                  <Text style={styles.noPatientsText}>
                    {assignLoading ? 'Cargando pacientes...' : 'No hay pacientes disponibles para asignar'}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowAssignModal(false)}
                style={styles.modalButton}
                disabled={assignLoading}
              >
                Cancelar
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
  },
  actionButtons: {
    padding: 20,
    gap: 15,
  },
  topButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  topButton: {
    flex: 1,
    borderRadius: 12,
  },
  fullWidthButton: {
    borderRadius: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
  },
  editButton: {
    backgroundColor: '#FFC107',
    borderWidth: 2,
    borderColor: '#000000',
  },
  toggleButton: {
    borderColor: '#000000',
    borderWidth: 2,
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    borderColor: '#000000',
    borderWidth: 2,
    backgroundColor: '#F44336',
  },
  passwordButton: {
    borderColor: '#9C27B0',
    borderWidth: 2,
    backgroundColor: '#9C27B0',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoCard: {
    margin: 20,
    marginTop: 0,
    elevation: 3,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    flexShrink: 1,
  },
  infoGrid: {
    gap: 15,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  patientCard: {
    marginBottom: 15,
    elevation: 2,
    borderRadius: 8,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  patientDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  appointmentCard: {
    marginBottom: 15,
    elevation: 2,
    borderRadius: 8,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
  },
  appointmentMotivo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  appointmentDiagnostico: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  appointmentStatus: {
    marginBottom: 10,
  },
  todayAppointmentCard: {
    marginBottom: 10,
    elevation: 2,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  todayAppointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'nowrap',
  },
  todayAppointmentTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    flexShrink: 1,
    marginRight: 8,
  },
  todayAppointmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  todayAppointmentMotivo: {
    fontSize: 14,
    color: '#555',
  },
  criticalChip: {
    backgroundColor: '#FFEBEE',
  },
  followUpChip: {
    backgroundColor: '#FFF3E0',
  },
  stableChip: {
    backgroundColor: '#E8F5E8',
  },
  attendedChip: {
    backgroundColor: '#E8F5E8',
  },
  pendingChip: {
    backgroundColor: '#FFF3E0',
  },
  statusChip: {
    height: 29,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 100,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  viewButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  boldText: {
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  goBackButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  goBackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para loading y error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para botones de estado
  reactivateButton: {
    backgroundColor: '#4CAF50',
  },
  hardDeleteButton: {
    backgroundColor: '#D32F2F',
  },
  // Estilos para modal de contraseña
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButtonX: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    textAlign: 'center',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  passwordHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
  },
  modalCancelButton: {
    borderColor: '#999',
  },
  modalApplyButton: {},
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  modalCitaInfo: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalCitaInfoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  estadosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  estadoOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  estadoOptionActive: {
    elevation: 2,
  },
  estadoOptionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  estadoOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    backgroundColor: '#FFFFFF',
  },
  // Estilos para asignación de pacientes
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
  },
  patientCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginLeft: 5,
  },
  cardHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  assignButton: {
    borderRadius: 8,
    paddingHorizontal: 5,
  },
  pacientesAsignadosList: {
    maxHeight: 400,
  },
  citasRecientesList: {
    maxHeight: 350,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  searchResultsList: {
    maxHeight: 350,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchResultDetails: {
    fontSize: 14,
    color: '#666',
  },
  searchResultArrow: {
    fontSize: 20,
    color: '#1976D2',
    marginLeft: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  patientActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  patientActionButton: {
    flex: 1,
    borderRadius: 8,
  },
  viewButton: {
    borderColor: '#1976D2',
  },
  unassignButton: {
    borderColor: '#F44336',
  },
  // Estilos para modal de asignación
  patientsList: {
    maxHeight: 300,
    marginVertical: 10,
  },
  patientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginVertical: 5,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  patientOptionInfo: {
    flex: 1,
    marginRight: 10,
  },
  patientOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  patientOptionDetails: {
    fontSize: 14,
    color: '#666',
  },
  assignPatientButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  noPatientsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noPatientsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default DetalleDoctor;
