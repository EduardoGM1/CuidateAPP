package com.clinicamovil

import android.content.Intent
import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Módulo nativo para abrir pantallas de Texto a voz (TTS) del sistema.
 * No se puede activar TTS automáticamente; el usuario debe instalar/activar en Ajustes.
 * Estos métodos llevan al usuario directo a la pantalla adecuada para reducir pasos.
 */
class TTSSettingsModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TTSSettingsModule"

    /** Abre Ajustes > Texto a voz (motor preferido, idioma, etc.). */
    @ReactMethod
    fun openTTSSettings() {
        val activity = currentActivity ?: return
        try {
            val intent = Intent().apply {
                action = "com.android.settings.TTS_SETTINGS"
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(intent)
        } catch (_: Exception) {
            // En algunos fabricantes la acción no existe; JS usará Linking.openSettings() como fallback
        }
    }

    /**
     * Abre la pantalla de instalación de datos de voz del motor TTS por defecto.
     * Lleva al usuario directo a descargar/instalar voces sin buscar en Accesibilidad.
     * En algunos dispositivos el intent no existe y no hace nada.
     */
    @ReactMethod
    fun openInstallTTSData() {
        val activity = currentActivity ?: return
        try {
            val intent = Intent().apply {
                action = TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(intent)
        } catch (_: Exception) {
            // Intent no disponible en este fabricante; la app puede llamar openTTSSettings() como fallback
        }
    }
}
