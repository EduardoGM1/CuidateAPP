# 📱 Cómo Enviar Notificación desde Firebase Console

## ✅ Sí, puedes enviar notificaciones desde el panel de Firebase

Firebase Console tiene una herramienta integrada para enviar notificaciones de prueba directamente, sin necesidad del backend o la app.

---

## 🚀 Pasos para Enviar Notificación desde Firebase Console

### Paso 1: Acceder a Firebase Console
1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: **clinicamovil-f70e0**

### Paso 2: Ir a Cloud Messaging
1. En el menú lateral, busca **"Mensajería en la nube"** o **"Cloud Messaging"**
2. O ve directamente a: https://console.firebase.google.com/project/clinicamovil-f70e0/notification

### Paso 3: Enviar Notificación de Prueba
1. Haz clic en **"Enviar tu primer mensaje"** o **"Nuevo mensaje"**
2. Completa el formulario:
   - **Título de la notificación**: Ej. "Prueba desde Firebase Console"
   - **Texto de la notificación**: Ej. "Esta es una notificación de prueba enviada directamente desde Firebase"
   - **Imagen de notificación** (opcional): Puedes agregar una imagen
3. Haz clic en **"Siguiente"**

### Paso 4: Seleccionar Destinatarios
Tienes 3 opciones:

#### Opción A: Enviar a un Token FCM específico (Recomendado para pruebas)
1. Selecciona **"Token FCM"**
2. Ingresa el token FCM del dispositivo
   - Puedes obtenerlo de los logs de la app cuando inicies sesión
   - O desde el backend: busca en la base de datos el token registrado para el usuario
3. Haz clic en **"Siguiente"**

#### Opción B: Enviar a un tema
1. Selecciona **"Tema"**
2. Ingresa el nombre del tema (ej. "notificaciones_generales")
3. **Nota**: El dispositivo debe estar suscrito al tema primero

#### Opción C: Enviar a todos los usuarios
1. Selecciona **"Usuario único"** o **"Todos los usuarios"**
2. Selecciona la app Android
3. Haz clic en **"Siguiente"**

### Paso 5: Configurar Opciones Adicionales (Opcional)
- **Datos adicionales**: Puedes agregar datos personalizados (key-value pairs)
- **Programar envío**: Puedes programar la notificación para más tarde
- **Configuración de Android**: 
  - Canal de notificación: `clinica-movil-reminders`
  - Sonido: `default`
  - Prioridad: `high`

### Paso 6: Revisar y Enviar
1. Revisa la configuración
2. Haz clic en **"Revisar"** y luego **"Publicar"** o **"Enviar"**

---

## 🔍 Cómo Obtener el Token FCM para Probar

### Método 1: Desde los Logs de la App
1. Abre la app e inicia sesión
2. Revisa los logs en Metro/React Native
3. Busca: `✅ Token FCM REAL obtenido exitosamente`
4. El token aparecerá en los logs (es un string largo que comienza con algo como `e...`)

### Método 2: Desde la Base de Datos
1. Conecta a tu base de datos
2. Busca la tabla `usuarios` o el campo `device_tokens`
3. Encuentra el token del usuario que quieres probar
4. **Nota**: Solo funcionará con tokens FCM reales (no tokens alternativos que empiezan con `fcm_temp_`)

### Método 3: Desde el Backend
1. Ejecuta el script de prueba:
   ```bash
   cd api-clinica
   node scripts/test-firebase-connection.js 7
   ```
2. El script mostrará el token registrado para ese usuario

---

## ✅ Ventajas de Enviar desde Firebase Console

1. **Prueba rápida**: No necesitas usar el backend ni la app
2. **Verificación directa**: Confirma que Firebase está funcionando correctamente
3. **Debugging**: Útil para identificar problemas de configuración
4. **Sin código**: No necesitas escribir código, solo usar la interfaz

---

## ⚠️ Limitaciones

1. **Solo tokens FCM reales**: Los tokens alternativos (`fcm_temp_`) NO funcionarán
2. **Un token a la vez**: Para enviar a múltiples dispositivos, necesitas usar el backend
3. **Sin lógica de negocio**: No puedes agregar lógica personalizada (ej. filtros, condiciones)

---

## 🧪 Caso de Uso: Probar que Firebase Funciona

### Escenario:
Quieres verificar que Firebase está configurado correctamente después de recompilar la app.

### Pasos:
1. **Recompila la app** (si aún no lo has hecho):
   ```bash
   cd ClinicaMovil
   npm run android
   ```

2. **Inicia sesión en la app** y verifica que se obtenga el token FCM real

3. **Copia el token FCM** de los logs

4. **Ve a Firebase Console** → Cloud Messaging → Nuevo mensaje

5. **Envía una notificación de prueba** usando el token

6. **Verifica** que la notificación llegue al dispositivo

### ✅ Si la notificación llega:
- Firebase está configurado correctamente ✅
- El token FCM es válido ✅
- Las notificaciones push funcionan ✅

### ❌ Si la notificación NO llega:
- Verifica que el token sea FCM real (no alternativo)
- Verifica que el dispositivo tenga conexión a internet
- Verifica que los permisos de notificación estén otorgados
- Revisa los logs del dispositivo para ver si hay errores

---

## 📊 Comparación: Firebase Console vs Backend

| Característica | Firebase Console | Backend (Nuestro Sistema) |
|----------------|------------------|---------------------------|
| **Facilidad** | ⭐⭐⭐⭐⭐ Muy fácil | ⭐⭐⭐⭐ Fácil |
| **Pruebas rápidas** | ✅ Sí | ✅ Sí |
| **Lógica de negocio** | ❌ No | ✅ Sí |
| **Múltiples tokens** | ⚠️ Limitado | ✅ Sí |
| **Programación** | ⚠️ Básica | ✅ Completa |
| **Datos personalizados** | ⚠️ Limitado | ✅ Completo |
| **Integración con DB** | ❌ No | ✅ Sí |

---

## 🎯 Recomendación

**Usa Firebase Console para:**
- ✅ Probar que Firebase funciona después de configurarlo
- ✅ Verificar que un token FCM específico funciona
- ✅ Debugging rápido de notificaciones

**Usa el Backend para:**
- ✅ Notificaciones en producción
- ✅ Notificaciones programadas (medicamentos, citas)
- ✅ Notificaciones con lógica de negocio
- ✅ Enviar a múltiples usuarios

---

## 🔗 Enlaces Útiles

- **Firebase Console**: https://console.firebase.google.com/project/clinicamovil-f70e0
- **Cloud Messaging**: https://console.firebase.google.com/project/clinicamovil-f70e0/notification
- **Documentación**: https://firebase.google.com/docs/cloud-messaging

---

## ✅ Conclusión

**Sí, puedes enviar notificaciones desde Firebase Console** y es muy útil para:
- Verificar que Firebase está funcionando
- Probar tokens FCM específicos
- Debugging rápido

**Para producción**, usa el backend que ya tienes implementado, ya que tiene más funcionalidades y se integra con tu base de datos.


