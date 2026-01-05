/**
 * Utilidad: chartExporter
 * 
 * Funciones para exportar gráficos como imágenes.
 */

import { captureRef } from 'react-native-view-shot';
import { Platform, Alert, Share } from 'react-native';
import RNFS from 'react-native-fs';
import Logger from '../services/logger';

/**
 * Exportar gráfico como imagen
 * @param {React.Ref} chartRef - Referencia al componente del gráfico
 * @param {string} filename - Nombre del archivo (sin extensión)
 * @param {Object} options - Opciones de exportación
 * @returns {Promise<string>} Ruta del archivo guardado
 */
export const exportChartAsImage = async (chartRef, filename = 'grafico', options = {}) => {
  try {
    if (!chartRef || !chartRef.current) {
      throw new Error('Referencia del gráfico no válida');
    }

    const {
      format = 'png',
      quality = 0.9,
      result = 'tmpfile', // 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64'
      width = null,
      height = null,
    } = options;

    Logger.info('ChartExporter: Iniciando exportación', { filename, format });

    const uri = await captureRef(chartRef.current, {
      format,
      quality,
      result,
      width,
      height,
    });

    Logger.success('ChartExporter: Gráfico exportado', { uri });

    return uri;
  } catch (error) {
    Logger.error('ChartExporter: Error exportando gráfico', error);
    throw error;
  }
};

/**
 * Guardar gráfico en el dispositivo
 * @param {string} imageUri - URI de la imagen
 * @param {string} filename - Nombre del archivo
 * @returns {Promise<string>} Ruta del archivo guardado
 */
export const saveChartToDevice = async (imageUri, filename = 'grafico') => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFilename = `${filename}_${timestamp}.png`;
    
    const savePath = Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/${finalFilename}`,
      android: `${RNFS.PicturesDirectoryPath}/${finalFilename}`,
    });

    // Si la URI es base64, convertir a archivo
    if (imageUri.startsWith('data:') || imageUri.startsWith('base64:')) {
      const base64Data = imageUri.split(',')[1] || imageUri.replace('base64:', '');
      await RNFS.writeFile(savePath, base64Data, 'base64');
    } else {
      // Copiar archivo temporal a ubicación permanente
      await RNFS.copyFile(imageUri, savePath);
    }

    Logger.success('ChartExporter: Gráfico guardado en dispositivo', { savePath });
    return savePath;
  } catch (error) {
    Logger.error('ChartExporter: Error guardando gráfico', error);
    throw error;
  }
};

/**
 * Compartir gráfico
 * @param {string} imageUri - URI de la imagen
 * @param {string} title - Título para compartir
 */
export const shareChart = async (imageUri, title = 'Gráfico de evolución') => {
  try {
    // Si es base64, convertir a archivo temporal primero
    let shareUri = imageUri;
    
    if (imageUri.startsWith('data:') || imageUri.startsWith('base64:')) {
      const tempPath = `${RNFS.CacheDirectory}/share_${Date.now()}.png`;
      const base64Data = imageUri.split(',')[1] || imageUri.replace('base64:', '');
      await RNFS.writeFile(tempPath, base64Data, 'base64');
      shareUri = `file://${tempPath}`;
    }

    const result = await Share.share({
      message: title,
      url: shareUri,
      title: title,
    });

    Logger.info('ChartExporter: Gráfico compartido', { result });
    return result;
  } catch (error) {
    Logger.error('ChartExporter: Error compartiendo gráfico', error);
    throw error;
  }
};

/**
 * Exportar y guardar gráfico completo
 * @param {React.Ref} chartRef - Referencia al gráfico
 * @param {string} filename - Nombre del archivo
 * @param {Object} options - Opciones
 */
export const exportAndSaveChart = async (chartRef, filename, options = {}) => {
  try {
    // Exportar como imagen
    const imageUri = await exportChartAsImage(chartRef, filename, {
      ...options,
      result: 'tmpfile',
    });

    // Guardar en dispositivo
    const savedPath = await saveChartToDevice(imageUri, filename);

    return savedPath;
  } catch (error) {
    Logger.error('ChartExporter: Error en exportación completa', error);
    throw error;
  }
};


