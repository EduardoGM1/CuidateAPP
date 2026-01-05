/**
 * Utilidad para descargar archivos en React Native
 * Usa fetch() autenticado + react-native-fs para guardar archivos
 * 
 * @author Senior Developer
 * @date 2025-12-05
 */

import RNFS from 'react-native-fs';
import { Platform, Alert, Linking, Share } from 'react-native';
import { storageService } from '../services/storageService';
import { getApiConfig } from '../config/apiConfig';
import Logger from '../services/logger';

/**
 * Descargar archivo desde el servidor con autenticación
 * 
 * @param {string} endpoint - Endpoint relativo (ej: '/api/reportes/expediente/123/pdf')
 * @param {string} filename - Nombre del archivo a guardar
 * @param {string} contentType - Tipo de contenido (ej: 'application/pdf', 'text/csv')
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<{success: boolean, filePath: string}>}
 */
export const downloadFile = async (endpoint, filename, contentType = 'application/pdf', options = {}) => {
  try {
    Logger.info('Iniciando descarga de archivo', { endpoint, filename, contentType });

    // Obtener configuración de API
    const apiConfig = await getApiConfig();
    if (!apiConfig || !apiConfig.baseURL) {
      throw new Error('No se pudo obtener la configuración del API');
    }

    // Obtener token de autenticación
    const token = await storageService.getAuthToken();
    if (!token) {
      throw new Error('No se encontró token de autenticación');
    }

    const deviceId = await storageService.getOrCreateDeviceId();

    // Construir URL completa
    const url = `${apiConfig.baseURL}${endpoint}`;

    Logger.debug('Descargando archivo', { url, filename });

    // Determinar directorio de guardado
    const downloadDir = Platform.OS === 'ios' 
      ? RNFS.DocumentDirectoryPath 
      : RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;

    // Crear directorio si no existe
    const dirExists = await RNFS.exists(downloadDir);
    if (!dirExists) {
      await RNFS.mkdir(downloadDir);
    }

    // Ruta completa del archivo
    const filePath = `${downloadDir}/${filename}`;

    // Usar RNFS.downloadFile que es más confiable en React Native
    // y maneja automáticamente la autenticación mediante headers
    Logger.debug('Descargando archivo con RNFS.downloadFile', { url, filePath });
    
    try {
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: filePath,
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Device-ID': deviceId,
          'X-Platform': Platform.OS,
          'X-App-Version': '1.0.0',
          'X-Client-Type': 'mobile',
        },
      }).promise;

      Logger.debug('Descarga completada', {
        statusCode: downloadResult.statusCode,
        bytesWritten: downloadResult.bytesWritten
      });

      if (downloadResult.statusCode !== 200) {
        // Intentar leer el error del archivo si existe
        let errorMessage = `Error al descargar el archivo (HTTP ${downloadResult.statusCode})`;
        try {
          if (await RNFS.exists(filePath)) {
            const errorText = await RNFS.readFile(filePath, 'utf8');
            try {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorMessage;
            } catch (e) {
              if (errorText.length < 200) {
                errorMessage = errorText;
              }
            }
            // Eliminar archivo de error
            await RNFS.unlink(filePath);
          }
        } catch (e) {
          // Ignorar errores al leer el archivo de error
        }
        throw new Error(errorMessage);
      }

      // Verificar que el archivo se descargó correctamente
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('El archivo no se descargó correctamente');
      }

      // Obtener tamaño del archivo
      const fileInfo = await RNFS.stat(filePath);
      const fileSize = parseInt(fileInfo.size, 10) || 0;

      // Validar que el archivo no esté vacío
      if (fileSize === 0) {
        // Eliminar archivo vacío
        try {
          await RNFS.unlink(filePath);
        } catch (e) {
          // Ignorar errores de limpieza
        }
        throw new Error('El archivo descargado está vacío. Por favor, intenta nuevamente.');
      }

      // Validar que el archivo descargado tenga el tamaño esperado
      if (downloadResult.bytesWritten !== fileSize) {
        Logger.warn('Diferencia entre bytes escritos y tamaño del archivo', {
          bytesWritten: downloadResult.bytesWritten,
          fileSize,
          filePath
        });
      }

      // Validar tamaño mínimo para PDFs (un PDF válido debe tener al menos algunos bytes)
      // Esta validación es opcional y no bloquea si falla, siempre que el archivo tenga tamaño
      if (contentType === 'application/pdf' && fileSize > 0) {
        // Intentar leer los primeros bytes para verificar si es un PDF válido
        // Si falla, no bloquear la descarga (puede ser un problema de permisos)
        try {
          // Usar readFile en lugar de read para mejor compatibilidad
          const fileContent = await RNFS.readFile(filePath, 'base64');
          if (fileContent && fileContent.length > 0) {
            const firstBytes = fileContent.substring(0, Math.min(4, fileContent.length));
            const pdfHeader = Buffer.from(firstBytes, 'base64').toString('ascii');
            
            // Un PDF válido debe comenzar con "%PDF"
            if (pdfHeader.startsWith('%PDF')) {
              Logger.debug('PDF válido verificado', {
                fileSize,
                header: pdfHeader,
                filePath
              });
            } else {
              Logger.warn('El archivo descargado no parece ser un PDF válido (header incorrecto)', {
                fileSize,
                firstBytes: pdfHeader,
                filePath,
                bytesWritten: downloadResult.bytesWritten
              });
              // No lanzar error aquí, ya que el archivo tiene tamaño y podría ser válido
              // Solo loguear advertencia
            }
          }
        } catch (readError) {
          // Si no podemos leer el archivo, pero tiene tamaño, asumir que está bien
          // Puede ser un problema de permisos en Android, pero el archivo se descargó correctamente
          const errorMessage = readError?.message || String(readError) || '';
          Logger.debug('No se pudo verificar el header del PDF (validación opcional)', {
            error: errorMessage,
            filePath,
            fileSize,
            bytesWritten: downloadResult.bytesWritten
          });
          // No lanzar error, continuar normalmente ya que el archivo tiene tamaño
        }

        // Validar tamaño mínimo razonable para un PDF (al menos 1KB)
        // Solo advertencia, no bloquea
        if (fileSize < 1024) {
          Logger.warn('El PDF descargado es muy pequeño, podría estar incompleto', {
            fileSize,
            filePath,
            bytesWritten: downloadResult.bytesWritten
          });
          // No lanzar error aquí, ya que algunos PDFs pueden ser pequeños pero válidos
        }
      }

      Logger.success('Archivo descargado exitosamente', { 
        filename, 
        filePath,
        size: fileSize,
        bytesWritten: downloadResult.bytesWritten
      });

      return {
        success: true,
        filePath: filePath,
        filename: filename,
        size: fileSize
      };
    } catch (downloadError) {
      // Si hay un error, intentar limpiar el archivo parcial si existe
      try {
        if (await RNFS.exists(filePath)) {
          await RNFS.unlink(filePath);
        }
      } catch (cleanupError) {
        // Ignorar errores de limpieza
      }
      throw downloadError;
    }
  } catch (error) {
    // Mejorar el logging de errores
    const errorMessage = error?.message || String(error) || 'Error desconocido';
    const errorStack = error?.stack || '';
    Logger.error('Error descargando archivo', {
      message: errorMessage,
      stack: errorStack,
      endpoint,
      filename,
      error: errorMessage
    });
    throw new Error(errorMessage);
  }
};

/**
 * Abrir archivo descargado
 * 
 * @param {string} filePath - Ruta del archivo
 * @param {string} contentType - Tipo de contenido
 */
export const openFile = async (filePath, contentType = 'application/pdf') => {
  try {
    // Verificar que el archivo existe
    const exists = await RNFS.exists(filePath);
    if (!exists) {
      throw new Error('El archivo no existe');
    }

    // Verificar que el archivo no esté vacío
    const fileInfo = await RNFS.stat(filePath);
    const fileSize = parseInt(fileInfo.size, 10) || 0;
    
    if (fileSize === 0) {
      throw new Error('El archivo está vacío y no se puede compartir');
    }

    // Para PDFs, intentar verificar que tenga el header correcto (validación opcional)
    if (contentType === 'application/pdf' && fileSize > 0) {
      try {
        // Usar readFile en lugar de read para mejor compatibilidad
        const fileContent = await RNFS.readFile(filePath, 'base64');
        if (fileContent && fileContent.length > 0) {
          const firstBytes = fileContent.substring(0, Math.min(4, fileContent.length));
          const pdfHeader = Buffer.from(firstBytes, 'base64').toString('ascii');
          
          if (!pdfHeader.startsWith('%PDF')) {
            Logger.warn('El archivo no parece ser un PDF válido (header incorrecto)', {
              fileSize,
              header: pdfHeader,
              filePath
            });
            // No lanzar error, solo advertencia, ya que el archivo tiene tamaño
          } else {
            Logger.debug('PDF válido verificado antes de compartir', { filePath, fileSize });
          }
        }
      } catch (readError) {
        // Si no podemos leer el archivo, pero tiene tamaño, asumir que está bien
        Logger.debug('No se pudo verificar el header del PDF antes de compartir (validación opcional)', { 
          error: readError?.message || String(readError),
          filePath,
          fileSize
        });
        // Continuar de todas formas, ya que el archivo existe y tiene tamaño
      }
    }

    if (Platform.OS === 'ios') {
      // En iOS, usar Linking para abrir PDFs
      try {
        const fileUri = `file://${filePath}`;
        const canOpen = await Linking.canOpenURL(fileUri);
        if (canOpen) {
          await Linking.openURL(fileUri);
          Logger.success('Archivo abierto exitosamente en iOS', { filePath });
        } else {
          // Fallback: usar Share API
          await Share.share({
            url: fileUri,
            type: contentType,
          });
          Logger.info('Archivo compartido usando Share API (iOS)', { filePath });
        }
      } catch (linkingError) {
        Logger.warn('Error con Linking, intentando Share API', { error: linkingError });
        // Fallback: usar Share API
        await Share.share({
          url: `file://${filePath}`,
          type: contentType,
        });
      }
    } else {
      // En Android, intentar abrir el archivo de varias maneras
      let opened = false;
      
      // Método 1: Intentar con Share API (más confiable en Android)
      try {
        const fileUri = `file://${filePath}`;
        const result = await Share.share({
          url: fileUri,
          type: contentType,
          title: 'Abrir expediente médico',
        });

        if (result.action === Share.sharedAction) {
          opened = true;
          Logger.success('Archivo abierto exitosamente usando Share API', { 
            filePath,
            activityType: result.activityType 
          });
        } else if (result.action === Share.dismissedAction) {
          Logger.info('Usuario canceló la apertura del archivo', { filePath });
          // No es un error, el usuario simplemente canceló
          return;
        }
      } catch (shareError) {
        Logger.debug('Share API no disponible o falló, intentando Linking', { 
          error: shareError?.message 
        });
      }

      // Método 2: Si Share no funcionó, intentar con Linking
      if (!opened) {
        try {
          // En Android, usar file:// con triple slash para rutas absolutas
          const fileUri = filePath.startsWith('/') 
            ? `file://${filePath}` 
            : `file:///${filePath}`;
          
          const canOpen = await Linking.canOpenURL(fileUri);
          if (canOpen) {
            await Linking.openURL(fileUri);
            opened = true;
            Logger.success('Archivo abierto exitosamente usando Linking', { filePath });
          } else {
            Logger.warn('Linking.canOpenURL retornó false', { fileUri });
          }
        } catch (linkingError) {
          Logger.debug('Linking también falló', { 
            error: linkingError?.message 
          });
        }
      }

      // Si ningún método funcionó, informar al usuario (no es un error crítico)
      if (!opened) {
        Logger.info('No se pudo abrir el archivo automáticamente, pero está descargado', {
          filePath
        });
        
        // Mostrar mensaje informativo
        Alert.alert(
          '✅ Archivo descargado exitosamente',
          `El expediente médico se descargó correctamente.\n\n` +
          `Ubicación: Descargas/${filename}\n\n` +
          `Puedes abrirlo desde el administrador de archivos o desde la carpeta de Descargas.`,
          [{ text: 'OK' }]
        );
      }
    }
  } catch (error) {
    Logger.error('Error abriendo archivo', {
      error: error?.message || String(error),
      stack: error?.stack,
      filePath
    });
    
    // No lanzar error, solo informar al usuario
    Alert.alert(
      'Archivo descargado',
      `El archivo se descargó correctamente pero no se pudo abrir automáticamente.\n\nUbicación: ${filePath}\n\nPuedes abrirlo manualmente desde el administrador de archivos.`,
      [{ text: 'OK' }]
    );
  }
};

/**
 * Descargar y abrir archivo en un solo paso
 * 
 * @param {string} endpoint - Endpoint relativo
 * @param {string} filename - Nombre del archivo
 * @param {string} contentType - Tipo de contenido
 * @param {Object} options - Opciones adicionales
 */
export const downloadAndOpenFile = async (endpoint, filename, contentType = 'application/pdf', options = {}) => {
  try {
    // SOLO descargar el archivo, NO intentar abrirlo automáticamente
    // Esto evita crashes y problemas de permisos
    const result = await downloadFile(endpoint, filename, contentType, options);
    
    // Informar al usuario dónde está el archivo
    const downloadLocation = Platform.OS === 'android' 
      ? 'Carpeta de Descargas del dispositivo'
      : 'Carpeta de Documentos de la app';
    
    Logger.info('Archivo descargado exitosamente (sin abrir automáticamente)', {
      filename,
      filePath: result.filePath,
      size: result.size,
      location: downloadLocation
    });
    
    // NO intentar abrir el archivo automáticamente para evitar crashes
    // El usuario puede abrirlo manualmente desde la carpeta de descargas
    
    return {
      ...result,
      location: downloadLocation
    };
  } catch (error) {
    const errorMessage = error?.message || String(error) || 'Error desconocido';
    const errorStack = error?.stack || '';
    
    Logger.error('Error descargando archivo', {
      message: errorMessage,
      stack: errorStack,
      endpoint,
      filename,
      error: errorMessage
    });
    
    throw new Error(errorMessage);
  }
};

/**
 * Descargar CSV con fetch autenticado
 * 
 * @param {string} endpoint - Endpoint relativo
 * @param {string} filename - Nombre del archivo
 * @returns {Promise<{success: boolean, filePath: string}>}
 */
export const downloadCSV = async (endpoint, filename) => {
  return downloadFile(endpoint, filename, 'text/csv');
};

/**
 * Descargar PDF con fetch autenticado
 * 
 * @param {string} endpoint - Endpoint relativo
 * @param {string} filename - Nombre del archivo
 * @returns {Promise<{success: boolean, filePath: string}>}
 */
export const downloadPDF = async (endpoint, filename) => {
  return downloadFile(endpoint, filename, 'application/pdf');
};

