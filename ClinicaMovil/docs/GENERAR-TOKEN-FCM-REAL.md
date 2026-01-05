# 🔥 Generar Token FCM REAL - Guía Paso a Paso

## 📋 Requisitos Previos

✅ Firebase está configurado correctamente:
- ✅ `google-services.json` en `android/app/`
- ✅ Dependencias de Firebase instaladas
- ✅ Gradle configurado correctamente
- ✅ Backend configurado con credenciales

---

## 🚀 Pasos para Generar Token FCM REAL

### Paso 1: Limpiar Builds Anteriores

```bash
cd ClinicaMovil/android
.\gradlew.bat clean
cd ..
```

**Nota:** Si `gradlew clean` falla (como antes), puedes saltar este paso y continuar.

### Paso 2: Recompilar la App

```bash
cd ClinicaMovil
npm run android
```

**Esto es CRÍTICO:**
- El plugin de Google Services procesa `google-services.json` durante la compilación
- Genera código Java necesario para Firebase
- Sin recompilar, solo obtendrás tokens alternativos

### Paso 3: Iniciar Sesión en la App

1. **Abre la app** en tu dispositivo/emulador
2. **Inicia sesión** con el usuario (ID: 7 - Eduardo González González)
3. **Espera 5-10 segundos** para que el token se registre

### Paso 4: Verificar Token en Logs

**Método A: Logs de Metro Bundler**
- Busca: `✅ Token FCM REAL obtenido exitosamente`
- El token aparecerá en los logs

**Método B: Script del Backend**
```bash
cd api-clinica
node scripts/obtener-token-fcm-usuario.js 7
```

### Paso 5: Verificar que es FCM REAL

**Token FCM REAL:**
- ✅ NO empieza con `fcm_temp_`
- ✅ Es un string largo (generalmente 150+ caracteres)
- ✅ Ejemplo: `eXample1234567890abcdefghijklmnopqrstuvwxyz...`

**Token Alternativo (NO es FCM real):**
- ❌ Empieza con `fcm_temp_`
- ❌ No funciona con Firebase Console

---

## 🔍 Verificación de que Funcionó

### ✅ Indicadores de Éxito:

1. **En los logs de la app:**
   ```
   ✅ Token FCM REAL obtenido exitosamente usando Firebase Messaging
   ```

2. **En el script:**
   ```
   ✅ FCM real
   Token: eXample1234567890abcdefghijklmnopqrstuvwxyz...
   ```

3. **No aparece:**
   ```
   ⚠️ Firebase no está completamente inicializado
   ```

### ❌ Si Aún Obtienes Token Alternativo:

1. **Verifica que la app fue recompilada:**
   - Debe mostrar "BUILD SUCCESSFUL" después de `npm run android`
   - No uses una versión anterior de la app

2. **Verifica `google-services.json`:**
   - Debe estar en `android/app/google-services.json`
   - El `package_name` debe coincidir con `applicationId` en `build.gradle`

3. **Reinicia el emulador/dispositivo:**
   - A veces ayuda a limpiar cachés

4. **Vuelve a ejecutar:**
   ```bash
   cd ClinicaMovil/android
   .\gradlew.bat clean
   cd ..
   npm run android
   ```

---

## 🧪 Probar que el Token Funciona

Una vez que tengas el token FCM REAL:

### Opción 1: Firebase Console
1. Ve a Firebase Console → Cloud Messaging
2. Selecciona "Token FCM"
3. Pega el token
4. Envía una notificación de prueba
5. Deberías recibirla en el dispositivo ✅

### Opción 2: Script del Backend
```bash
cd api-clinica
node scripts/test-firebase-connection.js 7
```

Deberías ver:
```
✅ Firebase respondió exitosamente: { messageId: "..." }
```

---

## 📝 Checklist Final

- [ ] App recompilada con `npm run android`
- [ ] Build exitoso (BUILD SUCCESSFUL)
- [ ] Iniciado sesión en la app
- [ ] Token registrado (verificar con script)
- [ ] Token NO empieza con `fcm_temp_`
- [ ] Token funciona en Firebase Console

---

## ✅ Conclusión

**Para generar un token FCM REAL:**
1. ✅ Recompila la app (`npm run android`)
2. ✅ Inicia sesión en la app
3. ✅ Espera a que se registre el token
4. ✅ Verifica que sea FCM real (no alternativo)

**El token se generará automáticamente cuando inicies sesión en la app recompilada.**


