/**
 * Servicio para manejar mensajes de chat entre pacientes y doctores
 */

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import axios from 'axios';
import Logger from '../services/logger';
import { getApiConfig, getApiConfigWithFallback, testApiConnectivity, API_CONFIG } from '../config/apiConfig';
import { ensureApiClient } from './gestionService';
import { storageService } from '../services/storageService';

// Variable local para almacenar la configuración dinámica detectada
let currentApiConfig = null;

const initializeApiConfig = async (forceRefresh = false) => {
  if (forceRefresh || !currentApiConfig) {
    try {
      currentApiConfig = await getApiConfigWithFallback();
    } catch (error) {
      Logger.warn('ChatService: Fallback falló, usando configuración básica', { error: error.message });
      currentApiConfig = await getApiConfig();
    }
  }
  return currentApiConfig;
};

/**
 * Obtener conversación entre paciente y doctor
 */
export const getConversacion = async (idPaciente, idDoctor = null) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    // Siempre usar la ruta con doctor, el backend ajustará si es necesario
    // Si no se proporciona idDoctor, el backend lo obtendrá del usuario autenticado
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const url = `/mensajes-chat/paciente/${idPaciente}/doctor/${idDoctor || ''}`;
    
    Logger.debug('ChatService: Obteniendo conversación', { 
      idPaciente, 
      idDoctor, 
      url: url.replace(/\/doctor\/$/, '/doctor') // Limpiar URL si idDoctor es null
    });
    
    // Si idDoctor es null, usar ruta sin doctor (el backend lo manejará)
    const finalUrl = idDoctor 
      ? `/mensajes-chat/paciente/${idPaciente}/doctor/${idDoctor}`
      : `/mensajes-chat/paciente/${idPaciente}`;
    
    const response = await apiClient.get(finalUrl);
    
    Logger.debug('ChatService: Conversación obtenida', { 
      count: response.data?.data?.length || 0,
      success: response.data?.success
    });
    
    return response.data?.data || [];
  } catch (error) {
    // Log más detallado del error
    if (error.response) {
      Logger.error('Error obteniendo conversación:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: finalUrl
      });
    } else if (error.request) {
      Logger.error('Error obteniendo conversación: Sin respuesta del servidor', { url: finalUrl });
    } else {
      Logger.error('Error obteniendo conversación:', error.message);
    }
    throw error;
  }
};

/**
 * Obtener lista de conversaciones de un doctor
 * Retorna lista de pacientes con los que el doctor tiene conversaciones
 */
export const getConversacionesDoctor = async (idDoctor) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    Logger.info('ChatService: Obteniendo conversaciones del doctor', { idDoctor });
    
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const response = await apiClient.get(`/mensajes-chat/doctor/${idDoctor}/conversaciones`);
    
    Logger.debug('ChatService: Conversaciones obtenidas', { 
      count: response.data?.data?.conversaciones?.length || 0,
      success: response.data?.success
    });
    
    if (response.data?.success) {
      return {
        success: true,
        data: response.data.data.conversaciones || [],
        total: response.data.data.total || 0,
        error: null
      };
    } else {
      return {
        success: false,
        data: [],
        total: 0,
        error: response.data?.error || 'Error desconocido'
      };
    }
  } catch (error) {
    Logger.error('Error obteniendo conversaciones del doctor:', error);
    return {
      success: false,
      data: [],
      total: 0,
      error: error.response?.data?.error || error.message || 'Error al obtener conversaciones'
    };
  }
};

/**
 * Obtener mensajes no leídos de un paciente
 */
export const getMensajesNoLeidos = async (idPaciente) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const response = await apiClient.get(`/mensajes-chat/paciente/${idPaciente}/no-leidos`);
    return response.data?.data || [];
  } catch (error) {
    Logger.error('Error obteniendo mensajes no leídos:', error);
    throw error;
  }
};

/**
 * Enviar mensaje de texto
 */
export const enviarMensajeTexto = async (idPaciente, idDoctor, remitente, mensajeTexto) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    // Asegurar que mensajeTexto siempre sea un string
    const textoLimpio = typeof mensajeTexto === 'string' ? mensajeTexto : String(mensajeTexto || '');
    
    if (!textoLimpio.trim()) {
      throw new Error('El mensaje no puede estar vacío');
    }
    
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const response = await apiClient.post('/mensajes-chat', {
      id_paciente: idPaciente,
      id_doctor: idDoctor,
      remitente,
      mensaje_texto: textoLimpio,
    });
    
    return response.data?.data;
  } catch (error) {
    Logger.error('Error enviando mensaje de texto:', error);
    throw error;
  }
};

/**
 * Realizar upload usando XMLHttpRequest (soporta onUploadProgress)
 * @private
 */
const performUploadWithXHR = (audioFilePath, formData, baseURL, uploadUrl, token, deviceId, options = {}) => {
  const { onProgress } = options;
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let timeoutId = null;

    // Configurar timeout
    timeoutId = setTimeout(() => {
      xhr.abort();
      reject(new Error('Timeout: La petición tardó demasiado'));
    }, 60000); // 60 segundos

    // Manejar progreso de upload
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
          });
        }
      });
    }

    // Manejar respuesta exitosa
    xhr.addEventListener('load', () => {
      clearTimeout(timeoutId);
      
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const responseData = JSON.parse(xhr.responseText);
          
          let audioUrl = responseData?.data?.url || responseData?.url;
          
          if (!audioUrl) {
            reject(new Error('No se recibió URL del archivo subido'));
            return;
          }

          // Si la URL es relativa, construir la URL completa
          if (audioUrl.startsWith('/')) {
            const cleanBaseUrl = baseURL.replace(/\/$/, '');
            audioUrl = `${cleanBaseUrl}${audioUrl}`;
          }

          Logger.info('ChatService: Archivo de audio subido exitosamente', { audioUrl });
          resolve(audioUrl);
        } catch (parseError) {
          Logger.error('ChatService: Error parseando respuesta del servidor', {
            status: xhr.status,
            responseText: xhr.responseText,
            error: parseError.message,
          });
          reject(new Error('Error al procesar la respuesta del servidor'));
        }
      } else {
        // Error del servidor
        let errorMessage = 'Error al subir el archivo de audio.';
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch (e) {
          // Ignorar error de parseo
        }
        
        Logger.error('ChatService: Error del servidor al subir audio', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
        });
        
        reject(new Error(errorMessage));
      }
    });

    // Manejar errores de red
    xhr.addEventListener('error', () => {
      clearTimeout(timeoutId);
      Logger.error('ChatService: Error de red al subir audio', {
        url: uploadUrl,
        baseURL,
      });
      reject(new Error('Error de red. Verifica tu conexión a internet.'));
    });

    // Manejar timeout
    xhr.addEventListener('timeout', () => {
      clearTimeout(timeoutId);
      Logger.error('ChatService: Timeout al subir audio', {
        url: uploadUrl,
        baseURL,
      });
      reject(new Error('La petición tardó demasiado. Intenta nuevamente.'));
    });

    // Abrir y configurar la petición
    xhr.open('POST', uploadUrl);
    
    // Configurar headers
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.setRequestHeader('X-Device-ID', deviceId);
    xhr.setRequestHeader('X-Platform', Platform.OS);
    xhr.setRequestHeader('X-App-Version', '1.0.0');
    xhr.setRequestHeader('X-Client-Type', 'mobile');
    // NO establecer Content-Type - el navegador lo hace automáticamente con el boundary correcto

    // Enviar FormData
    xhr.send(formData);
  });
};

/**
 * Subir archivo de audio al servidor
 */
export const uploadAudioFile = async (audioFilePath, options = {}) => {
  try {
    if (!audioFilePath) {
      throw new Error('No se proporcionó ruta del archivo de audio');
    }

    // Normalizar la ruta: remover prefijos file:// y barras múltiples
    // La ruta puede venir como: file:////storage/... o file:///storage/...
    let normalizedPath = audioFilePath.replace(/^file:\/\/+/, ''); // Remover file:// y barras múltiples
    
    // Validar que el archivo existe usando la ruta normalizada
    let fileExists = await RNFS.exists(normalizedPath);
    
    if (!fileExists) {
      // Intentar con la ruta original también
      fileExists = await RNFS.exists(audioFilePath);
      if (fileExists) {
        normalizedPath = audioFilePath;
      } else {
        throw new Error(`El archivo de audio no existe: ${audioFilePath}`);
      }
    }

    const apiConfig = await initializeApiConfig();
    
    // Validar que apiConfig tenga baseURL
    if (!apiConfig || !apiConfig.baseURL) {
      throw new Error('No se pudo obtener la configuración del API');
    }
    
    Logger.debug('ChatService: Configuración del API', { 
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout 
    });
    
    // Preparar URI para FormData
    // En Android, FormData necesita el prefijo file:// con una sola barra después
    // En iOS, puede necesitar o no dependiendo de la versión
    let fileUri = normalizedPath;
    if (Platform.OS === 'android') {
      // Asegurar que tenga el prefijo file:// correcto (file:/// para rutas absolutas)
      if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
        // Si la ruta empieza con /, usar file:/// (tres barras)
        // Si no, usar file:// (dos barras)
        fileUri = fileUri.startsWith('/') ? `file://${fileUri}` : `file:///${fileUri}`;
      } else {
        // Normalizar file://// a file:///
        fileUri = fileUri.replace(/^file:\/\/+/, 'file:///');
      }
    } else {
      // iOS: remover file:// si existe (algunas versiones no lo necesitan)
      fileUri = fileUri.replace(/^file:\/\/+/, '');
    }

    // Crear FormData para subir el archivo
    // En React Native, NO establecer Content-Type manualmente
    // El sistema lo establece automáticamente con el boundary correcto
    const formData = new FormData();
    
    // Estructura correcta para React Native FormData
    // El objeto debe tener: uri, type, name
    formData.append('audio', {
      uri: fileUri,
      type: 'audio/m4a',
      name: `audio_${Date.now()}.m4a`,
    });

    Logger.debug('ChatService: Subiendo archivo de audio', { 
      originalPath: audioFilePath,
      normalizedPath,
      fileUri,
      platform: Platform.OS,
      fileExists
    });

    // Obtener token de autenticación
    const token = await storageService.getAuthToken();
    const deviceId = await storageService.getOrCreateDeviceId();

    // Obtener configuración con fallback inteligente
    // Para uploads en Android, priorizar IP de red local sobre localhost/10.0.2.2
    // porque los uploads con FormData pueden fallar con localhost incluso si GET funciona
    let apiConfigForUpload = await initializeApiConfig(true); // forceRefresh = true
    
    // Para uploads en Android, SIEMPRE priorizar IP de red local sobre localhost/10.0.2.2
    // porque los uploads con FormData pueden fallar con localhost incluso si GET funciona
    if (Platform.OS === 'android' && API_CONFIG && API_CONFIG.localNetwork) {
      // Si la configuración actual es localhost o 10.0.2.2, probar IP de red local primero
      if (apiConfigForUpload.baseURL.includes('localhost') || apiConfigForUpload.baseURL.includes('10.0.2.2')) {
        Logger.info('ChatService: Android detectado con localhost/10.0.2.2, probando IP de red local para upload', {
          current: apiConfigForUpload.baseURL,
          fallback: API_CONFIG.localNetwork.baseURL,
        });
        
        const localNetworkTest = await testApiConnectivity(API_CONFIG.localNetwork.baseURL);
        if (localNetworkTest.success) {
          apiConfigForUpload = API_CONFIG.localNetwork;
          Logger.info('ChatService: Usando IP de red local para upload (más confiable que localhost/10.0.2.2)', {
            baseURL: apiConfigForUpload.baseURL,
          });
        } else {
          Logger.warn('ChatService: IP de red local no responde, intentando con configuración detectada', {
            current: apiConfigForUpload.baseURL,
            fallback: API_CONFIG.localNetwork.baseURL,
            error: localNetworkTest.error,
          });
        }
      }
    }
    
    const finalBaseURL = apiConfigForUpload.baseURL;
    const uploadUrl = `${finalBaseURL.replace(/\/$/, '')}/api/mensajes-chat/upload-audio`;
    
    Logger.info('ChatService: Preparando petición de upload', {
      url: uploadUrl,
      baseURL: finalBaseURL,
      fileUri,
      fileSize: fileExists ? 'existe' : 'no existe',
      hasToken: !!token,
      deviceId,
      platform: Platform.OS,
    });

    // Verificar conectividad antes de intentar subir
    let connectivityTest = await testApiConnectivity(finalBaseURL);
    
    // Si falla, intentar con IP de red local como fallback
    if (!connectivityTest.success && Platform.OS === 'android' && API_CONFIG && API_CONFIG.localNetwork) {
      Logger.warn('ChatService: Test de conectividad falló, intentando con IP de red local', {
        original: finalBaseURL,
        fallback: API_CONFIG.localNetwork.baseURL,
      });
      
      const localNetworkTest = await testApiConnectivity(API_CONFIG.localNetwork.baseURL);
      if (localNetworkTest.success) {
        const newBaseURL = API_CONFIG.localNetwork.baseURL;
        const newUploadUrl = `${newBaseURL.replace(/\/$/, '')}/api/mensajes-chat/upload-audio`;
        Logger.info('ChatService: Cambiando a IP de red local', { baseURL: newBaseURL });
        return performUploadWithXHR(audioFilePath, formData, newBaseURL, newUploadUrl, token, deviceId, options);
      }
    }
    
    if (!connectivityTest.success) {
      Logger.error('ChatService: Servidor no accesible antes de upload', {
        baseURL: finalBaseURL,
        error: connectivityTest.error,
      });
      throw new Error(`No se puede conectar al servidor (${finalBaseURL}). Verifica que:\n1. El servidor esté corriendo\n2. Estés en la misma red WiFi\n3. El firewall permita conexiones en el puerto 3000`);
    }

    Logger.info('ChatService: Servidor accesible, iniciando upload...', {
      url: uploadUrl,
      baseURL: finalBaseURL,
    });

    return performUploadWithXHR(audioFilePath, formData, finalBaseURL, uploadUrl, token, deviceId, options);
  } catch (error) {
    // Log detallado del error para debugging
    const errorDetails = {
      error: error.message,
      code: error.code,
      path: audioFilePath,
      platform: Platform.OS,
    };

    // Obtener información de la configuración del API
    try {
      const apiConfig = await initializeApiConfig();
      errorDetails.apiBaseURL = apiConfig?.baseURL;
      errorDetails.apiTimeout = apiConfig?.timeout;
    } catch (configError) {
      errorDetails.configError = configError.message;
    }

    // Los errores de XMLHttpRequest ya vienen formateados desde performUploadWithXHR
    // Solo loguear y re-lanzar
    Logger.error('Error subiendo archivo de audio:', errorDetails);
    throw error;
  }
};

/**
 * Enviar mensaje de audio
 */
export const enviarMensajeAudio = async (idPaciente, idDoctor, remitente, audioUrl, duracion, transcripcion = null) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const response = await apiClient.post('/mensajes-chat', {
      id_paciente: idPaciente,
      id_doctor: idDoctor,
      remitente,
      mensaje_audio_url: audioUrl,
      mensaje_audio_duracion: duracion,
      mensaje_audio_transcripcion: transcripcion,
    });
    
    return response.data?.data;
  } catch (error) {
    Logger.error('Error enviando mensaje de audio:', error);
    throw error;
  }
};

/**
 * Marcar mensaje como leído
 */
export const marcarComoLeido = async (idMensaje) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const response = await apiClient.put(`/mensajes-chat/${idMensaje}/leido`);
    return response.data;
  } catch (error) {
    Logger.error('Error marcando mensaje como leído:', error);
    throw error;
  }
};

/**
 * Marcar todos los mensajes de una conversación como leídos
 */
export const marcarTodosComoLeidos = async (idPaciente, idDoctor) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const url = `/mensajes-chat/paciente/${idPaciente}/doctor/${idDoctor}/leer-todos`;
    const response = await apiClient.put(url);
    return response.data;
  } catch (error) {
    Logger.error('Error marcando todos los mensajes como leídos:', error);
    throw error;
  }
};

/**
 * Actualizar mensaje
 */
export const actualizarMensaje = async (idMensaje, mensajeTexto) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    const textoLimpio = typeof mensajeTexto === 'string' ? mensajeTexto : String(mensajeTexto || '');
    
    if (!textoLimpio.trim()) {
      throw new Error('El mensaje no puede estar vacío');
    }
    
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const response = await apiClient.put(`/mensajes-chat/${idMensaje}`, {
      mensaje_texto: textoLimpio,
    });
    
    return response.data?.data;
  } catch (error) {
    Logger.error('Error actualizando mensaje:', error);
    throw error;
  }
};

/**
 * Eliminar mensaje
 */
export const eliminarMensaje = async (idMensaje) => {
  try {
    await initializeApiConfig();
    const apiClient = await ensureApiClient();
    
    // NOTA: No incluir /api porque apiClient ya lo tiene en baseURL
    const response = await apiClient.delete(`/mensajes-chat/${idMensaje}`);
    return response.data;
  } catch (error) {
    Logger.error('Error eliminando mensaje:', error);
    throw error;
  }
};

export default {
  getConversacion,
  getMensajesNoLeidos,
  enviarMensajeTexto,
  uploadAudioFile,
  enviarMensajeAudio,
  marcarComoLeido,
  marcarTodosComoLeidos,
  actualizarMensaje,
  eliminarMensaje,
};


