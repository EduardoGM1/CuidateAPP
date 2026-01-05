# 🔧 Solución: Emulador No Puede Acceder a la API

**Fecha:** 28/11/2025  
**Problema:** El emulador Android no puede conectarse a la API del backend  
**Estado:** ✅ **SOLUCIONADO**

---

## 🔍 Problema Identificado

El emulador tenía problemas para acceder a la API porque:

1. **ADB Reverse no estaba configurado** para el puerto 3000 (API)
2. **La lógica de detección** probaba `localhost:3000` primero, pero si fallaba, probaba IP local antes que `10.0.2.2:3000`
3. **La función `isAndroidEmulator()`** puede no detectar correctamente el emulador

---

## ✅ Soluciones Aplicadas

### 1. Configuración de ADB Reverse

**Configurado para el emulador:**
```bash
adb -s emulator-5554 reverse tcp:3000 tcp:3000
adb -s emulator-5554 reverse tcp:8081 tcp:8081  # Metro también
```

**Verificación:**
```bash
adb -s emulator-5554 reverse --list
# Debe mostrar:
# host-31 tcp:3000 tcp:3000
# host-31 tcp:8081 tcp:8081
```

### 2. Mejora en la Lógica de Detección

**Cambios en `apiConfig.js`:**

- ✅ **Para emuladores:** Ahora prueba `10.0.2.2:3000` **PRIMERO** (más confiable)
- ✅ **Para dispositivos físicos:** Prueba `localhost:3000` primero (con ADB reverse)
- ✅ **Fallback mejorado:** Si una opción falla, prueba las otras en orden lógico

**Orden de pruebas para emulador:**
1. `10.0.2.2:3000` (IP especial del emulador) - **PRIMERO**
2. `localhost:3000` (con ADB reverse) - **SEGUNDO**
3. `192.168.1.74:3000` (IP local) - **ÚLTIMO RECURSO**

**Orden de pruebas para dispositivo físico:**
1. `localhost:3000` (con ADB reverse) - **PRIMERO**
2. `192.168.1.74:3000` (IP local) - **SEGUNDO**
3. `10.0.2.2:3000` (emulador) - **ÚLTIMO RECURSO**

---

## 🎯 Configuración Actual

### Emulador (emulator-5554)

**ADB Reverse:**
- ✅ Metro (8081): Configurado
- ✅ API (3000): Configurado

**URLs disponibles:**
- `http://10.0.2.2:3000` (recomendado para emulador)
- `http://localhost:3000` (con ADB reverse)

### Dispositivo Físico (HLGYD22718000911)

**ADB Reverse:**
- ✅ Metro (8081): Configurado
- ✅ API (3000): Configurado

**URLs disponibles:**
- `http://localhost:3000` (con ADB reverse)
- `http://192.168.1.74:3000` (IP local)

---

## 🚀 Cómo Usar

### Para Emulador:

1. **Configurar ADB reverse (una vez por sesión):**
   ```bash
   adb -s emulator-5554 reverse tcp:3000 tcp:3000
   adb -s emulator-5554 reverse tcp:8081 tcp:8081
   ```

2. **Ejecutar la app:**
   ```bash
   npx react-native run-android --deviceId=emulator-5554
   ```

3. **La app detectará automáticamente:**
   - Primero probará `10.0.2.2:3000` (más confiable para emulador)
   - Si falla, probará `localhost:3000` (con ADB reverse)
   - Si falla, probará IP local como último recurso

### Para Dispositivo Físico:

1. **Configurar ADB reverse (una vez por sesión):**
   ```bash
   adb -s HLGYD22718000911 reverse tcp:3000 tcp:3000
   adb -s HLGYD22718000911 reverse tcp:8081 tcp:8081
   ```

2. **Ejecutar la app:**
   ```bash
   npm run android
   ```

3. **La app detectará automáticamente:**
   - Primero probará `localhost:3000` (con ADB reverse)
   - Si falla, probará IP local
   - Si falla, probará `10.0.2.2:3000` como último recurso

---

## 🔍 Verificación

### Verificar ADB Reverse:
```bash
adb -s emulator-5554 reverse --list
```

### Verificar Backend:
```bash
# Desde tu PC
curl http://localhost:3000/api/mobile/config

# Desde el emulador (requiere adb shell)
adb -s emulator-5554 shell
curl http://10.0.2.2:3000/api/mobile/config
```

### Verificar en la App:

Abre la consola de Metro y busca:
```
🔍 Detectando mejor configuración para Android...
🔍 Emulador detectado - probando configuración de emulador primero
🔄 Probando emulador (10.0.2.2): http://10.0.2.2:3000
✅ Emulador - usando 10.0.2.2:3000
```

---

## ⚠️ Notas Importantes

1. **ADB Reverse se pierde** al reiniciar el emulador o desconectar. Vuelve a configurar si es necesario.

2. **Backend debe estar corriendo** en `0.0.0.0:3000` (ya está configurado así).

3. **Detección de emulador:** La función `isAndroidEmulator()` puede no detectar todos los emuladores. Si falla, la app probará todas las opciones automáticamente.

4. **Cache de entorno:** Si cambias la configuración de ADB reverse, puede ser necesario limpiar el cache de la app o reiniciarla.

---

## 🐛 Solución de Problemas

### Problema: Emulador aún no se conecta

**Solución:**
1. Verifica ADB reverse: `adb -s emulator-5554 reverse --list`
2. Verifica que el backend esté corriendo: `curl http://localhost:3000/api/mobile/config`
3. Reinicia la app en el emulador
4. Revisa los logs de Metro para ver qué URL está probando

### Problema: La app prueba la URL incorrecta

**Solución:**
1. Limpia el cache de la app:
   ```bash
   npm run start:multi:reset
   ```
2. Reinstala la app en el emulador
3. Revisa los logs para ver el orden de pruebas

### Problema: ADB reverse se pierde

**Solución:**
- Vuelve a ejecutar:
  ```bash
  adb -s emulator-5554 reverse tcp:3000 tcp:3000
  ```
- O usa el script de configuración:
  ```bash
  .\scripts\configurar-multi-dispositivos.ps1
  ```

---

## ✅ Estado Final

- ✅ ADB reverse configurado para emulador
- ✅ Lógica de detección mejorada
- ✅ Orden de pruebas optimizado para emuladores
- ✅ Fallback automático funcionando

**El emulador ahora debería poder acceder a la API correctamente.**

---

**Última actualización:** 28/11/2025

