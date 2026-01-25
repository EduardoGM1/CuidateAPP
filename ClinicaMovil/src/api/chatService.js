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
 */
const performUploadWithXHR = (formData, uploadUrl, token, deviceId, options = {}) => {
  const { onProgress } = options;
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let timeoutId = setTimeout(() => {
      xhr.abort();
      reject(new Error('Timeout: La petición tardó demasiado'));
    }, 60000);

    // Progreso de upload
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress({ loaded: event.loaded, total: event.total, percent });
        }
      });
    }

    // Respuesta exitosa
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
            const baseURL = uploadUrl.split('/api/')[0];
            audioUrl = `${baseURL}${audioUrl}`;
          }

          Logger.info('ChatService: Archivo subido exitosamente', { audioUrl });
          resolve(audioUrl);
        } catch (parseError) {
          Logger.error('ChatService: Error parseando respuesta', parseError);
          reject(new Error('Error al procesar la respuesta del servidor'));
        }
      } else {
        let errorMessage = 'Error al subir el archivo de audio.';
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData?.error || errorData?.message || errorMessage;
        } catch (e) {}
        
        Logger.error('ChatService: Error del servidor', { status: xhr.status });
        reject(new Error(errorMessage));
      }
    });

    // Errores
    xhr.addEventListener('error', () => {
      clearTimeout(timeoutId);
      reject(new Error('Error de red. Verifica tu conexión.'));
    });

    xhr.addEventListener('timeout', () => {
      clearTimeout(timeoutId);
      reject(new Error('La petición tardó demasiado.'));
    });

    // Configurar y enviar
    xhr.open('POST', uploadUrl);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.setRequestHeader('X-Device-ID', deviceId);
    xhr.setRequestHeader('X-Platform', Platform.OS);
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

    // Normalizar ruta
    let normalizedPath = audioFilePath.replace(/^file:\/\/+/, '');
    let fileExists = await RNFS.exists(normalizedPath);
    
    if (!fileExists) {
      fileExists = await RNFS.exists(audioFilePath);
      if (fileExists) {
        normalizedPath = audioFilePath;
      } else {
        throw new Error(`El archivo de audio no existe: ${audioFilePath}`);
      }
    }

    // Obtener configuración del API
    const apiConfig = await initializeApiConfig();
    if (!apiConfig || !apiConfig.baseURL) {
      throw new Error('No se pudo obtener la configuración del API');
    }

    // Preparar URI para FormData
    let fileUri = normalizedPath;
    if (Platform.OS === 'android') {
      if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
        fileUri = fileUri.startsWith('/') ? `file://${fileUri}` : `file:///${fileUri}`;
      } else {
        fileUri = fileUri.replace(/^file:\/\/+/, 'file:///');
      }
    } else {
      fileUri = fileUri.replace(/^file:\/\/+/, '');
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('audio', {
      uri: fileUri,
      type: 'audio/m4a',
      name: `audio_${Date.now()}.m4a`,
    });

    // Obtener token y deviceId
    const token = await storageService.getAuthToken();
    const deviceId = await storageService.getOrCreateDeviceId();

    // Construir URL de upload
    const baseURL = apiConfig.baseURL.replace(/\/$/, '');
    const uploadUrl = `${baseURL}/api/mensajes-chat/upload-audio`;

    Logger.info('ChatService: Subiendo archivo de audio', { uploadUrl, fileUri });

    // Realizar upload
    return await performUploadWithXHR(formData, uploadUrl, token, deviceId, options);
  } catch (error) {
    Logger.error('ChatService: Error subiendo archivo de audio', error);
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


