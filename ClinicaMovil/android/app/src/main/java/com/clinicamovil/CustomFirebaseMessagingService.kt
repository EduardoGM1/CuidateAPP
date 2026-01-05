package com.clinicamovil

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactApplication
import android.content.Intent

/**
 * Servicio personalizado de Firebase Cloud Messaging
 * 
 * Este servicio maneja:
 * 1. Recepción de notificaciones push
 * 2. Generación y actualización de tokens FCM
 * 3. Envío de tokens al módulo JavaScript cuando cambian
 * 
 * Según la documentación oficial de Firebase:
 * - El token se genera cuando la app se inicia por primera vez
 * - El token puede cambiar en varias situaciones (reset, reinstalación, borrado de datos)
 * - Es necesario implementar onNewToken para detectar cuando el token cambia
 */
class CustomFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "CustomFCMService"
    }

    /**
     * Se llama cuando se recibe un nuevo token FCM o cuando el token se actualiza
     * 
     * Este método se activa en dos escenarios:
     * 1) Cuando se genera un nuevo token en el inicio inicial de la app
     * 2) Cuando cambia un token existente
     * 
     * El token puede cambiar en las siguientes situaciones:
     * A) La app se restaura en un dispositivo nuevo
     * B) El usuario desinstala/reinstala la app
     * C) El usuario borra los datos de la app
     */
    override fun onNewToken(token: String) {
        Log.d(TAG, "Refreshed FCM token: $token")
        
        // Enviar el token al módulo JavaScript
        sendTokenToReactNative(token)
        
        // También podemos guardarlo localmente si es necesario
        // pero el registro en el servidor se hace desde JavaScript
    }

    /**
     * Se llama cuando se recibe un mensaje remoto de Firebase
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "From: ${remoteMessage.from}")

        // Verificar si el mensaje contiene datos
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Message data payload: ${remoteMessage.data}")
            
            // Enviar datos al módulo JavaScript
            sendMessageToReactNative(remoteMessage)
        }

        // Verificar si el mensaje contiene notificación
        remoteMessage.notification?.let {
            Log.d(TAG, "Message Notification Body: ${it.body}")
            // Las notificaciones se muestran automáticamente si la app está en segundo plano
            // Si quieres manejarlas manualmente, puedes hacerlo aquí
        }
    }

    /**
     * Envía el token FCM al módulo JavaScript de React Native
     * Esto permite que el código JavaScript registre el token en el servidor
     */
    private fun sendTokenToReactNative(token: String) {
        try {
            val reactApplication = application as? ReactApplication
            val reactContext = reactApplication?.reactNativeHost?.reactInstanceManager?.currentReactContext
            
            reactContext?.let { context ->
                val params = Arguments.createMap().apply {
                    putString("token", token)
                    putString("type", "FCM_TOKEN")
                }
                
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("FCMTokenReceived", params)
                
                Log.d(TAG, "Token enviado al módulo JavaScript")
            } ?: run {
                Log.w(TAG, "ReactContext no está disponible, el token se obtendrá cuando la app se cargue")
                // Guardar el token temporalmente para enviarlo cuando React Native esté listo
                // Esto se maneja en pushTokenService.js cuando se carga el módulo
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error enviando token a React Native: ${e.message}")
        }
    }

    /**
     * Envía el mensaje recibido al módulo JavaScript
     */
    private fun sendMessageToReactNative(remoteMessage: RemoteMessage) {
        try {
            val reactApplication = application as? ReactApplication
            val reactContext = reactApplication?.reactNativeHost?.reactInstanceManager?.currentReactContext
            
            reactContext?.let { context ->
                val params = Arguments.createMap().apply {
                    putString("title", remoteMessage.notification?.title)
                    putString("body", remoteMessage.notification?.body)
                    
                    // Agregar datos del mensaje
                    val dataMap = Arguments.createMap()
                    remoteMessage.data.forEach { (key, value) ->
                        dataMap.putString(key, value)
                    }
                    putMap("data", dataMap)
                }
                
                context
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("FCMessageReceived", params)
                
                Log.d(TAG, "Mensaje enviado al módulo JavaScript")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error enviando mensaje a React Native: ${e.message}")
        }
    }

    /**
     * Obtener el token actual de FCM
     * Este método puede ser llamado desde cualquier parte de la app
     */
    fun getCurrentToken(callback: (String?) -> Unit) {
        com.google.firebase.messaging.FirebaseMessaging.getInstance().token
            .addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    Log.w(TAG, "Fetching FCM registration token failed", task.exception)
                    callback(null)
                    return@addOnCompleteListener
                }

                // Obtener el token FCM
                val token = task.result
                Log.d(TAG, "Current FCM token: $token")
                callback(token)
            }
    }
}


