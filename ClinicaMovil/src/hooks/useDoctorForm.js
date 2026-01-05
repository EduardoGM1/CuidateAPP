import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { gestionService } from '../api/gestionService';
import { doctorAuthService } from '../api/authService';
import Logger from '../services/logger';

/**
 * Hook personalizado para manejar formularios de doctores
 * Maneja la lógica de creación y edición de doctores con buenas prácticas
 * 
 * @returns {Object} Objeto con funciones y estado para manejo de formularios
 */
const useDoctorForm = () => {
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Referencias para evitar re-renders innecesarios
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  /**
   * Limpiar estado de error y success
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  /**
   * Limpiar todos los estados
   */
  const clearAll = useCallback(() => {
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, []);

  /**
   * Cancelar operaciones en curso
   */
  const cancelOperations = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Capitalizar primera letra de cada palabra
   * @param {string} text - Texto a capitalizar
   * @returns {string} Texto capitalizado
   */
  const capitalizeText = useCallback((text) => {
    if (!text || typeof text !== 'string') return '';
    
    return text
      .toLowerCase()           // Convertir todo a minúsculas
      .trim()                  // Eliminar espacios al inicio y final
      .split(' ')              // Dividir por espacios (para nombres compuestos)
      .map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )                        // Capitalizar cada palabra
      .join(' ');              // Unir con espacios
  }, []);

  /**
   * Validar datos del formulario antes de enviar
   * @param {Object} formData - Datos del formulario
   * @param {boolean} isEdit - Si es edición o creación
   * @returns {Object} Resultado de validación
   */
  const validateFormData = useCallback((formData, isEdit = false) => {
    const errors = [];
    
    // Log de entrada para debugging
    Logger.info('validateFormData: Iniciando validación', { 
      formData, 
      isEdit,
      apellidoPaterno: formData.apellidoPaterno,
      apellidoPaternoType: typeof formData.apellidoPaterno,
      apellidoPaternoTrimmed: formData.apellidoPaterno?.toString().trim()
    });
    
    // Validar nombre
    if (!formData.nombre || !formData.nombre.toString().trim()) {
      errors.push({ field: 'nombre', message: 'El nombre es requerido' });
    } else {
      const nombre = formData.nombre.toString().trim();
      if (nombre.length < 2 || nombre.length > 100) {
        errors.push({ field: 'nombre', message: 'El nombre debe tener entre 2-100 caracteres' });
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) {
        errors.push({ field: 'nombre', message: 'El nombre solo puede contener letras y espacios' });
      }
    }
    
    // Validar apellido paterno
    if (!formData.apellidoPaterno || !formData.apellidoPaterno.toString().trim()) {
      errors.push({ field: 'apellidoPaterno', message: 'El apellido paterno es requerido' });
    } else {
      const apellido = formData.apellidoPaterno.toString().trim();
      if (apellido.length < 2 || apellido.length > 100) {
        errors.push({ field: 'apellidoPaterno', message: 'El apellido paterno debe tener entre 2-100 caracteres' });
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
        errors.push({ field: 'apellidoPaterno', message: 'El apellido paterno solo puede contener letras y espacios' });
      }
    }
    
    // Validar apellido materno
    if (!formData.apellidoMaterno || !formData.apellidoMaterno.toString().trim()) {
      errors.push({ field: 'apellidoMaterno', message: 'El apellido materno es requerido' });
    } else {
      const apellido = formData.apellidoMaterno.toString().trim();
      if (apellido.length < 2 || apellido.length > 100) {
        errors.push({ field: 'apellidoMaterno', message: 'El apellido materno debe tener entre 2-100 caracteres' });
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(apellido)) {
        errors.push({ field: 'apellidoMaterno', message: 'El apellido materno solo puede contener letras y espacios' });
      }
    }
    
    // Validar teléfono
    if (!formData.telefono || !formData.telefono.toString().trim()) {
      errors.push({ field: 'telefono', message: 'El teléfono es requerido' });
    } else {
      const telefono = formData.telefono.toString().trim();
      if (telefono.length < 7 || telefono.length > 20) {
        errors.push({ field: 'telefono', message: 'El teléfono debe tener entre 7-20 caracteres' });
      } else if (!/^[\d\s\-\+\(\)]{7,20}$/.test(telefono)) {
        errors.push({ field: 'telefono', message: 'El teléfono solo puede contener números, espacios, guiones, paréntesis y signo +' });
      }
    }
    
    // Validar institución hospitalaria
    if (!formData.institucionHospitalaria || !formData.institucionHospitalaria.toString().trim()) {
      errors.push({ field: 'institucionHospitalaria', message: 'La institución hospitalaria es requerida' });
    } else {
      const institucion = formData.institucionHospitalaria.toString().trim();
      if (institucion.length < 2 || institucion.length > 200) {
        errors.push({ field: 'institucionHospitalaria', message: 'La institución hospitalaria debe tener entre 2-200 caracteres' });
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.\,]+$/.test(institucion)) {
        errors.push({ field: 'institucionHospitalaria', message: 'La institución hospitalaria contiene caracteres no permitidos' });
      }
    }
    
    // Validar grado de estudio
    if (!formData.gradoEstudio || !formData.gradoEstudio.toString().trim()) {
      errors.push({ field: 'gradoEstudio', message: 'El grado de estudio es requerido' });
    } else {
      const grado = formData.gradoEstudio.toString().trim();
      if (grado.length < 2 || grado.length > 100) {
        errors.push({ field: 'gradoEstudio', message: 'El grado de estudio debe tener entre 2-100 caracteres' });
      } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-\.\,]+$/.test(grado)) {
        errors.push({ field: 'gradoEstudio', message: 'El grado de estudio contiene caracteres no permitidos' });
      }
    }
    
    // Validar email
    if (!formData.email || !formData.email.toString().trim()) {
      errors.push({ field: 'email', message: 'El email es requerido' });
    } else {
      const email = formData.email.toString().trim();
      if (email.length < 5 || email.length > 150) {
        errors.push({ field: 'email', message: 'El email debe tener entre 5-150 caracteres' });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ field: 'email', message: 'El email no tiene un formato válido (ejemplo: usuario@dominio.com)' });
      }
    }
    
    // Validaciones específicas para creación
    if (!isEdit) {
      if (!formData.password?.trim()) {
        errors.push({ field: 'password', message: 'La contraseña es requerida' });
      } else if (formData.password.length < 6) {
        errors.push({ field: 'password', message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.push({ field: 'confirmPassword', message: 'Las contraseñas no coinciden' });
      }
    }
    
    // Validar años de servicio
    if (!formData.anosServicio || isNaN(formData.anosServicio)) {
      errors.push({ field: 'anosServicio', message: 'Los años de servicio son requeridos' });
    } else {
      const anos = parseInt(formData.anosServicio);
      if (anos < 0 || anos > 50) {
        errors.push({ field: 'anosServicio', message: 'Los años de servicio deben ser un número entre 0-50' });
      }
    }
    
    // Validar ID de módulo
    if (!formData.idModulo || isNaN(formData.idModulo)) {
      errors.push({ field: 'idModulo', message: 'Debe seleccionar un módulo válido' });
    } else {
      const modulo = parseInt(formData.idModulo);
      if (modulo < 1) {
        errors.push({ field: 'idModulo', message: 'El ID del módulo debe ser un número positivo' });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  /**
   * Crear nuevo doctor
   * Flujo: 1. Crear usuario base -> 2. Crear perfil de doctor
   * @param {Object} formData - Datos del formulario
   * @returns {Promise<Object>} Resultado de la operación
   */
  const createDoctorProfile = useCallback(async (doctorData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Cancelar operaciones previas
      cancelOperations();
      
      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();
      
      Logger.info('useDoctorForm: Creando perfil de doctor', { 
        id_usuario: doctorData.id_usuario,
        nombre: doctorData.nombre
      });

      // Crear perfil de doctor directamente
      const doctorResponse = await gestionService.createDoctor(doctorData);
      
      if (doctorResponse.success) {
        Logger.success('useDoctorForm: Doctor creado exitosamente', { 
          doctorId: doctorResponse.data.id_doctor 
        });
        
        setSuccess(true);
        return { success: true, data: doctorResponse.data };
      } else {
        const errorMessage = doctorResponse.error || 'Error al crear doctor';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
    } catch (error) {
      Logger.error('useDoctorForm: Error creando doctor', { error: error.message });
      const errorMessage = error.message || 'Error al crear doctor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      cancelOperations();
    }
  }, [cancelOperations]);

  const createDoctor = useCallback(async (formData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Cancelar operaciones previas
      cancelOperations();
      
      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();
      
      // Mapear datos de snake_case a camelCase para validación
      const validationData = {
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        nombre: formData.nombre,
        apellidoPaterno: formData.apellido_paterno || formData.apellidoPaterno,
        apellidoMaterno: formData.apellido_materno || formData.apellidoMaterno,
        telefono: formData.telefono,
        institucionHospitalaria: formData.institucion_hospitalaria || formData.institucionHospitalaria,
        gradoEstudio: formData.grado_estudio || formData.gradoEstudio,
        anosServicio: formData.anos_servicio || formData.anosServicio,
        idModulo: formData.id_modulo || formData.idModulo,
        activo: formData.activo
      };

      Logger.info('useDoctorForm: Iniciando creación de doctor', { 
        email: formData.email,
        nombre: formData.nombre,
        formDataOriginal: formData,
        validationData: validationData
      });

      // Validar datos
      const validation = validateFormData(validationData, false);
      if (!validation.isValid) {
        const errorMessage = validation.errors[0].message;
        setError(errorMessage);
        Alert.alert('Error de Validación', errorMessage);
        return { success: false, error: errorMessage };
      }

      // Paso 1: Crear usuario base
      Logger.info('useDoctorForm: Creando usuario base');
      const userResponse = await doctorAuthService.register(
        formData.email,
        formData.password,
        'Doctor'
      );

      if (!userResponse.usuario) {
        throw new Error('Error al crear usuario base');
      }

      Logger.success('useDoctorForm: Usuario base creado', { 
        userId: userResponse.usuario.id_usuario 
      });

      // Paso 2: Crear perfil de doctor
      Logger.info('useDoctorForm: Creando perfil de doctor');
      
      // Mapear datos de snake_case a camelCase si es necesario
      const apellidoPaterno = formData.apellidoPaterno || formData.apellido_paterno;
      const apellidoMaterno = formData.apellidoMaterno || formData.apellido_materno;
      const institucionHospitalaria = formData.institucionHospitalaria || formData.institucion_hospitalaria;
      const gradoEstudio = formData.gradoEstudio || formData.grado_estudio;
      const anosServicio = formData.anosServicio || formData.anos_servicio;
      const idModulo = formData.idModulo || formData.id_modulo;
      
      const doctorData = {
        id_usuario: userResponse.usuario.id_usuario,
        nombre: formData.nombre?.trim() || '',
        apellido_paterno: apellidoPaterno?.trim() || '',
        apellido_materno: apellidoMaterno?.trim() || '',
        telefono: formData.telefono?.trim() || '',
        institucion_hospitalaria: institucionHospitalaria?.trim() || '',
        grado_estudio: gradoEstudio?.trim() || '',
        anos_servicio: parseInt(anosServicio) || 0,
        id_modulo: parseInt(idModulo) || 1,
        activo: true
      };

      const doctorResponse = await gestionService.createDoctor(doctorData);
      
      if (doctorResponse.success) {
        Logger.success('useDoctorForm: Doctor creado exitosamente', { 
          doctorId: doctorResponse.data.id_doctor 
        });
        
        setSuccess(true);
        return { 
          success: true, 
          data: doctorResponse.data,
          message: 'Doctor creado exitosamente'
        };
      } else {
        throw new Error(doctorResponse.error || 'Error al crear perfil de doctor');
      }

    } catch (error) {
      Logger.error('useDoctorForm: Error creando doctor', error);
      const errorMessage = error.message || 'Error al crear doctor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      cancelOperations();
    }
  }, [validateFormData, cancelOperations]);

  /**
   * Actualizar doctor existente
   * @param {number} doctorId - ID del doctor a actualizar
   * @param {Object} formData - Datos del formulario
   * @param {Object} doctorData - Datos actuales del doctor (fallback)
   * @returns {Promise<Object>} Resultado de la operación
   */
  const updateDoctor = useCallback(async (doctorId, formData, doctorData = null) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Cancelar operaciones previas
      cancelOperations();
      
      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();
      
      Logger.info('useDoctorForm: Iniciando actualización de doctor', { 
        doctorId,
        nombre: formData.nombre 
      });

      // Preparar datos para actualización usando formData como base y doctorData como fallback
      const updateData = {
        email: formData.email?.trim() || doctorData?.email || '',
        nombre: formData.nombre?.trim() || doctorData?.nombre || '',
        apellido_paterno: formData.apellidoPaterno?.trim() || doctorData?.apellido_paterno || doctorData?.apellido || '',
        apellido_materno: formData.apellidoMaterno?.trim() || doctorData?.apellido_materno || '',
        telefono: formData.telefono?.trim() || doctorData?.telefono || doctorData?.numero_celular || '',
        institucion_hospitalaria: formData.institucionHospitalaria?.trim() || doctorData?.institucion_hospitalaria || doctorData?.especialidad || '',
        grado_estudio: formData.gradoEstudio?.trim() || doctorData?.grado_estudio || doctorData?.especialidad || '',
        anos_servicio: formData.anosServicio ? parseInt(formData.anosServicio) : (doctorData?.anos_servicio || 0),
        id_modulo: formData.idModulo ? parseInt(formData.idModulo) : (doctorData?.id_modulo || 1),
        activo: formData.activo !== undefined ? formData.activo : (doctorData?.activo ?? true)
      };

      // Validar datos usando los datos que se van a enviar (snake_case)
      const validationData = {
        email: updateData.email,
        nombre: updateData.nombre,
        apellidoPaterno: updateData.apellido_paterno,
        apellidoMaterno: updateData.apellido_materno,
        telefono: updateData.telefono,
        institucionHospitalaria: updateData.institucion_hospitalaria,
        gradoEstudio: updateData.grado_estudio,
        anosServicio: updateData.anos_servicio,
        idModulo: updateData.id_modulo,
        activo: updateData.activo
      };

      // Log de datos para validación
      Logger.info('useDoctorForm: Datos para validación', { 
        validationData,
        updateData,
        formData,
        doctorData 
      });

      const validation = validateFormData(validationData, true);
      if (!validation.isValid) {
        Logger.error('useDoctorForm: Error de validación', { 
          errors: validation.errors,
          validationData 
        });
        const errorMessage = validation.errors[0].message;
        setError(errorMessage);
        Alert.alert('Error de Validación', errorMessage);
        return { success: false, error: errorMessage };
      }

      // Validar que no hay campos undefined
      const camposUndefined = Object.entries(updateData).filter(([key, value]) => value === undefined);
      if (camposUndefined.length > 0) {
        Logger.error('useDoctorForm: Campos undefined detectados', { camposUndefined });
        const errorMessage = 'Hay campos sin datos. Por favor, verifica la información del doctor.';
        setError(errorMessage);
        Alert.alert('Error', errorMessage);
        return { success: false, error: errorMessage };
      }

      Logger.info('useDoctorForm: Datos a enviar', { 
        doctorId, 
        datos: updateData
      });

      const response = await gestionService.updateDoctor(doctorId, updateData);
      
      if (response.success) {
        Logger.success('useDoctorForm: Doctor actualizado exitosamente', { 
          doctorId,
          data: response.data
        });
        
        setSuccess(true);
        return { 
          success: true, 
          data: response.data,
          message: 'Doctor actualizado exitosamente'
        };
      } else {
        throw new Error(response.error || 'Error al actualizar doctor');
      }

    } catch (error) {
      Logger.error('useDoctorForm: Error actualizando doctor', error);
      
      let errorMessage = 'Error al actualizar doctor';
      let alertTitle = 'Error';
      
      // Manejar diferentes tipos de errores
      if (error.response?.status) {
        switch (error.response.status) {
          case 400:
            if (error.response.data?.error === 'El email ya está en uso por otro usuario') {
              errorMessage = 'El email ya está registrado por otro usuario. Por favor, usa un email diferente.';
              alertTitle = 'Email Duplicado';
            } else if (error.response.data?.error === 'Datos de validación incorrectos') {
              errorMessage = 'Los datos ingresados no son válidos. Por favor, revisa la información y vuelve a intentar.';
              alertTitle = 'Datos Inválidos';
            } else {
              errorMessage = error.response.data?.error || 'Los datos enviados no son válidos. Por favor, revisa la información.';
              alertTitle = 'Error de Validación';
            }
            break;
          case 404:
            errorMessage = 'El doctor no fue encontrado. Por favor, recarga la página e intenta nuevamente.';
            alertTitle = 'Doctor No Encontrado';
            break;
          case 401:
            errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
            alertTitle = 'Sesión Expirada';
            break;
          case 403:
            errorMessage = 'No tienes permisos para realizar esta acción.';
            alertTitle = 'Sin Permisos';
            break;
          case 500:
            errorMessage = 'Error del servidor. Por favor, intenta nuevamente en unos minutos.';
            alertTitle = 'Error del Servidor';
            break;
          default:
            errorMessage = error.response.data?.error || 'Error inesperado. Por favor, intenta nuevamente.';
            alertTitle = 'Error';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      Alert.alert(alertTitle, errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      cancelOperations();
    }
  }, [validateFormData, cancelOperations]);

  /**
   * Eliminar doctor (soft delete)
   * @param {number} doctorId - ID del doctor a eliminar
   * @returns {Promise<Object>} Resultado de la operación
   */
  const deleteDoctor = useCallback(async (doctorId) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Cancelar operaciones previas
      cancelOperations();
      
      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();
      
      Logger.info('useDoctorForm: Iniciando eliminación de doctor', { doctorId });

      const response = await gestionService.deleteDoctor(doctorId);
      
      if (response.success) {
        Logger.success('useDoctorForm: Doctor eliminado exitosamente', { doctorId });
        setSuccess(true);
        return { 
          success: true, 
          message: 'Doctor eliminado exitosamente'
        };
      } else {
        throw new Error(response.error || 'Error al eliminar doctor');
      }

    } catch (error) {
      Logger.error('useDoctorForm: Error eliminando doctor', error);
      const errorMessage = error.message || 'Error al eliminar doctor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
      cancelOperations();
    }
  }, [cancelOperations]);

  /**
   * Obtener datos de un doctor por ID
   * @param {number} doctorId - ID del doctor
   * @returns {Promise<Object>} Datos del doctor
   */
  const getDoctorById = useCallback(async (doctorId) => {
    try {
      setLoading(true);
      setError(null);
      
      Logger.info('useDoctorForm: Obteniendo datos del doctor', { doctorId });

      const response = await gestionService.getDoctorById(doctorId);
      
      if (response.success) {
        Logger.success('useDoctorForm: Datos del doctor obtenidos', { doctorId });
        return { 
          success: true, 
          data: response.data
        };
      } else {
        throw new Error(response.error || 'Error al obtener datos del doctor');
      }

    } catch (error) {
      Logger.error('useDoctorForm: Error obteniendo doctor', error);
      const errorMessage = error.message || 'Error al obtener datos del doctor';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Reactivar doctor (soft delete reverso)
  const reactivateDoctor = useCallback(async (doctorId) => {
    if (!doctorId) {
      const errorMessage = 'ID del doctor requerido para reactivación';
      Logger.error('useDoctorForm: Error reactivando doctor', { error: errorMessage });
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      Logger.info('useDoctorForm: Iniciando reactivación de doctor', { doctorId });
      
      const response = await gestionService.reactivateDoctor(doctorId);
      
      if (response.success) {
        Logger.success('useDoctorForm: Doctor reactivado exitosamente', { doctorId });
        setSuccess('Doctor reactivado exitosamente');
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || 'Error al reactivar doctor');
      }

    } catch (error) {
      Logger.error('useDoctorForm: Error reactivando doctor', { 
        doctorId, 
        error: error.message 
      });
      
      let errorMessage = 'Error al reactivar doctor';
      
      if (error.response?.status === 404) {
        errorMessage = 'Doctor no encontrado';
      } else if (error.response?.status === 401) {
        errorMessage = 'No autorizado para reactivar doctores';
      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para reactivar doctores';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error del servidor al reactivar doctor';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Eliminación permanente (hard delete)
  const hardDeleteDoctor = useCallback(async (doctorId) => {
    if (!doctorId) {
      const errorMessage = 'ID del doctor requerido para eliminación permanente';
      Logger.error('useDoctorForm: Error eliminando doctor permanentemente', { error: errorMessage });
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      Logger.info('useDoctorForm: Iniciando eliminación permanente de doctor', { doctorId });
      
      const response = await gestionService.hardDeleteDoctor(doctorId);
      
      if (response.success) {
        Logger.success('useDoctorForm: Doctor eliminado permanentemente', { doctorId });
        setSuccess('Doctor eliminado permanentemente');
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || 'Error al eliminar doctor permanentemente');
      }

    } catch (error) {
      Logger.error('useDoctorForm: Error eliminando doctor permanentemente', { 
        doctorId, 
        error: error.message 
      });
      
      let errorMessage = 'Error al eliminar doctor permanentemente';
      
      if (error.response?.status === 404) {
        errorMessage = 'Doctor no encontrado';
      } else if (error.response?.status === 401) {
        errorMessage = 'No autorizado para eliminar doctores';
      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para eliminar doctores permanentemente';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error del servidor al eliminar doctor';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup al desmontar el componente
  const cleanup = useCallback(() => {
    cancelOperations();
  }, [cancelOperations]);

  return {
    // Estados
    loading,
    error,
    success,
    
    // Funciones principales
    createDoctor,
    createDoctorProfile,
    updateDoctor,
    deleteDoctor, // Ahora es soft delete
    reactivateDoctor, // Nueva función
    hardDeleteDoctor, // Nueva función
    getDoctorById,
    
    // Funciones de utilidad
    clearError,
    clearSuccess,
    clearAll,
    cleanup,
    
    // Validaciones
    validateFormData,
    
    // Utilidades
    capitalizeText
  };
};

export default useDoctorForm;