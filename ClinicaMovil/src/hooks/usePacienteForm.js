import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { gestionService } from '../api/gestionService';
import pacienteAuthService from '../api/pacienteAuthService';
import Logger from '../services/logger';

/**
 * Hook personalizado para manejar formularios de pacientes
 * Maneja la lógica de creación y edición de pacientes
 */
const usePacienteForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Crear nuevo paciente
   * Flujo: 1. Crear usuario base -> 2. Crear perfil de paciente
   */
  const createPaciente = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Iniciando creación de paciente', { 
        email: formData.email,
        nombre: formData.nombre 
      });

      // Paso 1: Crear usuario base
      Logger.info('usePacienteForm: Creando usuario base');
      const userResponse = await pacienteAuthService.register(
        formData.email,
        formData.password,
        'Paciente'
      );

      if (!userResponse.usuario) {
        throw new Error('Error al crear usuario base');
      }

      Logger.success('usePacienteForm: Usuario base creado', { 
        userId: userResponse.usuario.id_usuario 
      });

      // Paso 2: Crear perfil de paciente
      Logger.info('usePacienteForm: Creando perfil de paciente');
      const pacienteData = {
        id_usuario: userResponse.usuario.id_usuario,
        nombre: formData.nombre,
        apellido_paterno: formData.apellidoPaterno,
        apellido_materno: formData.apellidoMaterno,
        fecha_nacimiento: formData.fechaNacimiento,
        sexo: formData.sexo,
        telefono: formData.telefono,
        direccion: formData.direccion,
        codigo_postal: formData.codigoPostal,
        estado: formData.estado,
        municipio: formData.municipio,
        localidad: formData.localidad,
        id_modulo: formData.idModulo,
        activo: formData.activo,
        // Campos adicionales específicos de pacientes
        contacto_emergencia: formData.contactoEmergencia,
        telefono_emergencia: formData.telefonoEmergencia,
        parentesco_emergencia: formData.parentescoEmergencia,
        alergias: formData.alergias,
        medicamentos_actuales: formData.medicamentosActuales,
        enfermedades_cronicas: formData.enfermedadesCronicas,
        tipo_sangre: formData.tipoSangre,
        peso: formData.peso,
        estatura: formData.estatura,
        seguro_medico: formData.seguroMedico,
        numero_seguro: formData.numeroSeguro,
      };

      const pacienteResponse = await gestionService.createPaciente(pacienteData);

      if (!pacienteResponse.success) {
        throw new Error(pacienteResponse.message || 'Error al crear perfil de paciente');
      }

      Logger.success('usePacienteForm: Paciente creado exitosamente', { 
        pacienteId: pacienteResponse.data?.id_paciente,
        userId: userResponse.usuario.id_usuario 
      });

      // Mostrar mensaje de éxito
      Alert.alert(
        'Paciente Creado',
        `El paciente ${formData.nombre} ${formData.apellidoPaterno} ha sido creado exitosamente.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        data: {
          usuario: userResponse.usuario,
          paciente: pacienteResponse.data,
        },
        message: 'Paciente creado exitosamente'
      };

    } catch (error) {
      Logger.error('usePacienteForm: Error creando paciente', { 
        error: error.message,
        email: formData.email 
      });

      setError(error.message);

      // Mostrar error específico
      Alert.alert(
        'Error al Crear Paciente',
        error.message || 'Ocurrió un error al crear el paciente. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: error.message,
        message: 'Error al crear paciente'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear cita médica
   */
  const createCita = useCallback(async (citaData) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Creando cita médica', { 
        pacienteId: citaData.id_paciente,
        doctorId: citaData.id_doctor 
      });

      const response = await gestionService.createCita(citaData);

      if (response.success) {
        Logger.success('usePacienteForm: Cita creada exitosamente', { 
          citaId: response.data?.id_cita 
        });

        return {
          success: true,
          data: response.data,
          message: 'Cita creada exitosamente'
        };
      } else {
        throw new Error(response.error || 'Error al crear cita');
      }

    } catch (error) {
      Logger.error('usePacienteForm: Error creando cita', { 
        error: error.message,
        citaData 
      });

      setError(error.message);
      return {
        success: false,
        error: error.message,
        message: 'Error al crear cita'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  const createPrimeraConsulta = useCallback(async (primeraConsultaData) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Creando primera consulta completa', { 
        pacienteId: primeraConsultaData.id_paciente,
        doctorId: primeraConsultaData.id_doctor 
      });

      const response = await gestionService.createPrimeraConsulta(primeraConsultaData);

      if (response.success) {
        Logger.success('usePacienteForm: Primera consulta creada exitosamente', { 
          citaId: response.data?.id_cita 
        });

        return {
          success: true,
          data: response.data,
          message: response.message || 'Primera consulta creada exitosamente'
        };
      } else {
        throw new Error(response.error || 'Error al crear primera consulta');
      }

    } catch (error) {
      Logger.error('usePacienteForm: Error creando primera consulta', { 
        error: error.message,
        primeraConsultaData 
      });

      setError(error.message);
      return {
        success: false,
        error: error.message,
        message: 'Error al crear primera consulta'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  const createPacienteCompleto = useCallback(async (pacienteData) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Creando paciente completo', { 
        nombre: pacienteData.nombre,
        pin: pacienteData.pin ? '***' : 'no PIN'
      });

      const response = await gestionService.createPacienteCompleto(pacienteData);

      if (response.success) {
        Logger.success('usePacienteForm: Paciente completo creado exitosamente', { 
          pacienteId: response.data?.id_paciente 
        });

        return {
          success: true,
          data: response.data,
          message: response.message || 'Paciente creado exitosamente'
        };
      } else {
        throw new Error(response.error || 'Error al crear paciente');
      }

    } catch (error) {
      Logger.error('usePacienteForm: Error creando paciente completo', { 
        error: error.message,
        pacienteData 
      });

      setError(error.message);
      return {
        success: false,
        error: error.message,
        message: 'Error al crear paciente'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Crear solo el perfil de paciente (asumiendo que el usuario ya existe)
   * Usado en el formulario de dos partes
   */
  const createPacienteProfile = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Creando perfil de paciente', { 
        userId: formData.id_usuario,
        nombre: formData.nombre 
      });

      const pacienteData = {
        id_usuario: formData.id_usuario,
        nombre: formData.nombre,
        apellido_paterno: formData.apellido_paterno,
        apellido_materno: formData.apellido_materno,
        fecha_nacimiento: formData.fecha_nacimiento,
        telefono: formData.telefono,
        direccion: formData.direccion,
        contacto_emergencia: formData.contacto_emergencia,
        telefono_emergencia: formData.telefono_emergencia,
        seguro_medico: formData.seguro_medico,
        alergias: formData.alergias,
        medicamentos_actuales: formData.medicamentos_actuales,
        id_modulo: formData.id_modulo,
        activo: formData.activo,
      };

      Logger.info('usePacienteForm: Enviando datos al servicio', { pacienteData });
      const pacienteResponse = await gestionService.createPaciente(pacienteData);
      Logger.info('usePacienteForm: Respuesta del servicio', { pacienteResponse });

      if (!pacienteResponse.success) {
        Logger.error('usePacienteForm: Error en respuesta del servicio', { 
          success: pacienteResponse.success,
          error: pacienteResponse.error,
          message: pacienteResponse.message 
        });
        throw new Error(pacienteResponse.message || pacienteResponse.error || 'Error al crear perfil de paciente');
      }

      Logger.success('usePacienteForm: Perfil de paciente creado exitosamente', { 
        pacienteId: pacienteResponse.data?.id_paciente,
        userId: formData.id_usuario 
      });

      return {
        success: true,
        data: pacienteResponse.data,
        message: 'Perfil de paciente creado exitosamente'
      };

    } catch (error) {
      Logger.error('usePacienteForm: Error creando perfil de paciente', error);
      setError(error.message || 'Error al crear perfil de paciente');
      return {
        success: false,
        error: error.message || 'Error al crear perfil de paciente'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Configurar PIN para un paciente
   */
  const setupPacientePIN = useCallback(async (pacienteId, pin, deviceId) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Configurando PIN para paciente', { 
        pacienteId,
        deviceId: deviceId?.substring(0, 10) + '...'
      });

      const result = await pacienteAuthService.setupPIN(pacienteId, pin, deviceId);
      
      if (!result.success) {
        Logger.error('usePacienteForm: Error configurando PIN', { 
          success: result.success,
          error: result.error
        });
        throw new Error(result.error || 'Error al configurar PIN');
      }

      Logger.success('usePacienteForm: PIN configurado exitosamente', { 
        pacienteId 
      });

      return {
        success: true,
        data: result.data,
        message: 'PIN configurado exitosamente'
      };

    } catch (error) {
      Logger.error('usePacienteForm: Error configurando PIN', error);
      setError(error.message || 'Error al configurar PIN');
      return {
        success: false,
        error: error.message || 'Error al configurar PIN'
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   */
  const updatePaciente = useCallback(async (pacienteId, formData) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Iniciando actualización de paciente', { 
        pacienteId,
        nombre: formData.nombre 
      });

      // Preparar datos para actualización (solo campos que existen en el modelo)
      const updateData = {
        nombre: formData.nombre,
        apellido_paterno: formData.apellidoPaterno,
        apellido_materno: formData.apellidoMaterno,
        fecha_nacimiento: formData.fechaNacimiento,
        sexo: formData.sexo,
        numero_celular: formData.telefono || formData.numeroCelular, // Mapear telefono a numero_celular
        direccion: formData.direccion,
        estado: formData.estado, // Campo obligatorio
        localidad: formData.localidad,
        // ✅ Campos de baja según formato GAM (Instrucción ⑭)
        fecha_baja: formData.fechaBaja || null,
        motivo_baja: formData.motivoBaja || null,
        numero_gam: formData.numeroGam ? parseInt(formData.numeroGam) : null,
        institucion_salud: formData.institucionSalud,
        ...(formData.idModulo && { id_modulo: parseInt(formData.idModulo, 10) }),
        ...(formData.activo !== undefined && { activo: formData.activo }),
        // Solo incluir curp si está presente
        ...(formData.curp && { curp: formData.curp }),
      };

      Logger.info('usePacienteForm: Actualizando perfil de paciente');
      const response = await gestionService.updatePaciente(pacienteId, updateData);

      if (!response.success) {
        throw new Error(response.message || 'Error al actualizar paciente');
      }

      Logger.success('usePacienteForm: Paciente actualizado exitosamente', { 
        pacienteId,
        nombre: formData.nombre 
      });

      // Mostrar mensaje de éxito
      Alert.alert(
        'Paciente Actualizado',
        `El paciente ${formData.nombre} ${formData.apellidoPaterno} ha sido actualizado exitosamente.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        data: response.data,
        message: 'Paciente actualizado exitosamente'
      };

    } catch (error) {
      Logger.error('usePacienteForm: Error actualizando paciente', { 
        error: error.message,
        pacienteId 
      });

      setError(error.message);

      // Mostrar error específico
      Alert.alert(
        'Error al Actualizar Paciente',
        error.message || 'Ocurrió un error al actualizar el paciente. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: error.message,
        message: 'Error al actualizar paciente'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Eliminar paciente (soft delete)
   */
  const deletePaciente = useCallback(async (pacienteId, pacienteName) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Iniciando eliminación de paciente', { 
        pacienteId,
        pacienteName 
      });

      const response = await gestionService.deletePaciente(pacienteId);

      if (!response.success) {
        throw new Error(response.message || 'Error al eliminar paciente');
      }

      Logger.success('usePacienteForm: Paciente eliminado exitosamente', { 
        pacienteId,
        pacienteName 
      });

      // Mostrar mensaje de éxito
      Alert.alert(
        'Paciente Eliminado',
        `El paciente ${pacienteName} ha sido eliminado exitosamente.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        message: 'Paciente eliminado exitosamente'
      };

    } catch (error) {
      Logger.error('usePacienteForm: Error eliminando paciente', { 
        error: error.message,
        pacienteId 
      });

      setError(error.message);

      // Mostrar error específico
      Alert.alert(
        'Error al Eliminar Paciente',
        error.message || 'Ocurrió un error al eliminar el paciente. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: error.message,
        message: 'Error al eliminar paciente'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cambiar estado activo/inactivo del paciente
   */
  const togglePacienteStatus = useCallback(async (pacienteId, currentStatus, pacienteName) => {
    try {
      setLoading(true);
      setError(null);

      const newStatus = !currentStatus;
      const action = newStatus ? 'activar' : 'desactivar';

      Logger.info('usePacienteForm: Cambiando estado de paciente', { 
        pacienteId,
        currentStatus,
        newStatus,
        action 
      });

      const updateData = {
        activo: newStatus
      };

      const response = await gestionService.updatePaciente(pacienteId, updateData);

      if (!response.success) {
        throw new Error(response.message || `Error al ${action} paciente`);
      }

      Logger.success('usePacienteForm: Estado de paciente cambiado exitosamente', { 
        pacienteId,
        newStatus,
        action 
      });

      // Mostrar mensaje de éxito
      Alert.alert(
        `Paciente ${newStatus ? 'Activado' : 'Desactivado'}`,
        `El paciente ${pacienteName} ha sido ${action}do exitosamente.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        data: response.data,
        message: `Paciente ${action}do exitosamente`
      };

    } catch (error) {
      Logger.error('usePacienteForm: Error cambiando estado de paciente', { 
        error: error.message,
        pacienteId 
      });

      setError(error.message);

      // Mostrar error específico
      Alert.alert(
        'Error al Cambiar Estado',
        error.message || 'Ocurrió un error al cambiar el estado del paciente. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: error.message,
        message: 'Error al cambiar estado del paciente'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Asignar paciente a doctor
   */
  const assignPacienteToDoctor = useCallback(async (pacienteId, doctorId, pacienteName, doctorName) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Asignando paciente a doctor', { 
        pacienteId,
        doctorId,
        pacienteName,
        doctorName 
      });

      const response = await gestionService.assignPacienteToDoctor(pacienteId, doctorId);

      if (!response.success) {
        throw new Error(response.message || 'Error al asignar paciente al doctor');
      }

      Logger.success('usePacienteForm: Paciente asignado exitosamente', { 
        pacienteId,
        doctorId 
      });

      // Mostrar mensaje de éxito
      Alert.alert(
        'Paciente Asignado',
        `El paciente ${pacienteName} ha sido asignado al doctor ${doctorName} exitosamente.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        data: response.data,
        message: 'Paciente asignado exitosamente'
      };

    } catch (error) {
      Logger.error('usePacienteForm: Error asignando paciente', { 
        error: error.message,
        pacienteId,
        doctorId 
      });

      setError(error.message);

      // Mostrar error específico
      Alert.alert(
        'Error al Asignar Paciente',
        error.message || 'Ocurrió un error al asignar el paciente al doctor. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: error.message,
        message: 'Error al asignar paciente'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Desasignar paciente de doctor
   */
  const unassignPacienteFromDoctor = useCallback(async (pacienteId, doctorId, pacienteName, doctorName) => {
    try {
      setLoading(true);
      setError(null);

      Logger.info('usePacienteForm: Desasignando paciente de doctor', { 
        pacienteId,
        doctorId,
        pacienteName,
        doctorName 
      });

      const response = await gestionService.unassignPacienteFromDoctor(pacienteId, doctorId);

      if (!response.success) {
        throw new Error(response.message || 'Error al desasignar paciente del doctor');
      }

      Logger.success('usePacienteForm: Paciente desasignado exitosamente', { 
        pacienteId,
        doctorId 
      });

      // Mostrar mensaje de éxito
      Alert.alert(
        'Paciente Desasignado',
        `El paciente ${pacienteName} ha sido desasignado del doctor ${doctorName} exitosamente.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        data: response.data,
        message: 'Paciente desasignado exitosamente'
      };

    } catch (error) {
      Logger.error('usePacienteForm: Error desasignando paciente', { 
        error: error.message,
        pacienteId,
        doctorId 
      });

      setError(error.message);

      // Mostrar error específico
      Alert.alert(
        'Error al Desasignar Paciente',
        error.message || 'Ocurrió un error al desasignar el paciente del doctor. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: error.message,
        message: 'Error al desasignar paciente'
      };

    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Limpiar errores
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Resetear estado del hook
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    // Estados
    loading,
    error,
    
    // Acciones principales
    createPaciente,
    createPacienteProfile, // Added
    createPacienteCompleto, // Added - Nueva función
    setupPacientePIN, // Added
    createCita, // Added
    createPrimeraConsulta, // Added - Fase 4
    updatePaciente,
    deletePaciente,
    togglePacienteStatus,
    
    // Acciones de asignación
    assignPacienteToDoctor,
    unassignPacienteFromDoctor,
    
    // Utilidades
    clearError,
    reset,
  };
};

export default usePacienteForm;
