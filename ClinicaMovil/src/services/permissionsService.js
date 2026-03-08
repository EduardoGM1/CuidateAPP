/**
 * Servicio: Permisos
 * 
 * Maneja la solicitud de permisos de la aplicación de forma centralizada.
 */

import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import Logger from './logger';

class PermissionsService {
  /**
   * Solicitar permiso de micrófono
   * @returns {Promise<boolean>} true si se otorgó el permiso, false si se denegó
   */
  async requestMicrophonePermission() {
    try {
      if (Platform.OS === 'android') {
        // Android: Solicitar permiso explícitamente
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de Micrófono',
            message: 'CuidaTeApp necesita acceso al micrófono para grabar mensajes de voz en el chat.',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Permitir',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          Logger.info('PermissionsService: Permiso de micrófono otorgado');
          return true;
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Logger.warn('PermissionsService: Permiso de micrófono denegado permanentemente');
          this.showPermissionDeniedAlert('micrófono');
          return false;
        } else {
          Logger.warn('PermissionsService: Permiso de micrófono denegado');
          return false;
        }
      } else {
        // iOS: El permiso se solicita automáticamente cuando se intenta usar Voice
        // En iOS, asumimos que está disponible (el sistema mostrará el diálogo automáticamente)
        Logger.info('PermissionsService: iOS - El permiso se solicitará automáticamente');
        return true;
      }
    } catch (error) {
      Logger.error('PermissionsService: Error solicitando permiso de micrófono', error);
      return false;
    }
  }

  /**
   * Solicitar permiso de notificaciones (Android 13+).
   * En API 33+ el sistema muestra el diálogo; en versiones anteriores no es necesario.
   * @returns {Promise<boolean>} true si se otorgó o no aplica, false si se denegó
   */
  async requestNotificationPermission() {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }
      const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10) || 0;
      if (apiLevel < 33) {
        Logger.info('PermissionsService: Android < 13, no se solicita POST_NOTIFICATIONS');
        return true;
      }
      const perm = PermissionsAndroid.PERMISSIONS?.POST_NOTIFICATIONS ?? 'android.permission.POST_NOTIFICATIONS';
      const granted = await PermissionsAndroid.request(perm, {
        title: 'Permiso de notificaciones',
        message: 'CuidaTeApp necesita enviarte notificaciones para recordatorios de medicación, citas y mensajes importantes.',
        buttonNeutral: 'Preguntar después',
        buttonNegative: 'Cancelar',
        buttonPositive: 'Permitir',
      });
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        Logger.info('PermissionsService: Permiso de notificaciones otorgado');
        return true;
      }
      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Logger.warn('PermissionsService: Permiso de notificaciones denegado permanentemente');
        this.showPermissionDeniedAlert('notificaciones');
        return false;
      }
      Logger.warn('PermissionsService: Permiso de notificaciones denegado');
      return false;
    } catch (error) {
      Logger.error('PermissionsService: Error solicitando permiso de notificaciones', error);
      return false;
    }
  }

  /**
   * Verificar si el permiso de micrófono está otorgado
   * @returns {Promise<boolean>} true si está otorgado, false si no
   */
  async checkMicrophonePermission() {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        Logger.info('PermissionsService: Estado del permiso de micrófono', { granted: result });
        return result;
      } else {
        // iOS: En iOS no podemos verificar el estado directamente sin Voice
        // Retornamos true y dejamos que Voice maneje el permiso
        return true;
      }
    } catch (error) {
      Logger.error('PermissionsService: Error verificando permiso de micrófono', error);
      return false;
    }
  }

  /**
   * Mostrar alerta cuando el permiso fue denegado permanentemente
   * @param {string} permission - Nombre del permiso
   */
  showPermissionDeniedAlert(permission) {
    Alert.alert(
      'Permiso Requerido',
      `El permiso de ${permission} fue denegado. Para usar esta funcionalidad, necesitas habilitarlo manualmente en la configuración de la aplicación.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Abrir Configuración',
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.openSettings();
            } else {
              Linking.openURL('app-settings:');
            }
          },
        },
      ]
    );
  }

  /**
   * Solicitar permiso con mensaje personalizado
   * @param {string} permission - Tipo de permiso
   * @param {object} options - Opciones personalizadas
   * @returns {Promise<boolean>}
   */
  async requestPermission(permission, options = {}) {
    switch (permission) {
      case 'microphone':
      case 'RECORD_AUDIO':
        return await this.requestMicrophonePermission();
      case 'notifications':
      case 'POST_NOTIFICATIONS':
        return await this.requestNotificationPermission();
      default:
        Logger.warn('PermissionsService: Tipo de permiso no reconocido', { permission });
        return false;
    }
  }
}

export default new PermissionsService();

