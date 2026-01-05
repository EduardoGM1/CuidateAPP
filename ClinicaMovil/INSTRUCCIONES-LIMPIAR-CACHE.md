# 🧹 INSTRUCCIONES PARA LIMPIAR CACHÉ Y COMPILAR VERSIÓN ACTUAL

## ⚠️ PROBLEMA
Al compilar, se están usando versiones antiguas del proyecto en lugar de los archivos refactorizados.

## ✅ SOLUCIÓN

### Paso 1: Limpiar TODO el caché

Ejecuta este comando en PowerShell desde la raíz del proyecto (`Backend`):

```powershell
cd ClinicaMovil
powershell -ExecutionPolicy Bypass -File scripts/limpiar-todo-cache.ps1
```

O manualmente:

```powershell
# Detener procesos
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

# Limpiar caché de Metro
Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\haste-map-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".metro" -ErrorAction SilentlyContinue

# Limpiar Watchman
watchman watch-del-all
watchman shutdown-server

# Limpiar node_modules/.cache
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue

# Limpiar builds
Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue
cd android; .\gradlew clean; cd ..

# Limpiar caché npm
npm cache clean --force
```

### Paso 2: Reiniciar Metro con caché limpio

```powershell
npm start -- --reset-cache
```

O:

```powershell
npx react-native start --reset-cache
```

### Paso 3: Recompilar la app (en otra terminal)

```powershell
# Para Android
npx react-native run-android

# Para iOS  
npx react-native run-ios
```

---

## 🔍 VERIFICACIÓN

### Archivos que DEBEN existir:

✅ `ClinicaMovil/src/hooks/useChat.js`  
✅ `ClinicaMovil/src/components/chat/MessageBubble.js`  
✅ `ClinicaMovil/src/screens/paciente/ChatDoctor.js` (refactorizado)  
✅ `ClinicaMovil/src/screens/doctor/ChatPaciente.js` (refactorizado)

### Verificar imports:

**ChatDoctor.js** debe tener:
```javascript
import useChat from '../../hooks/useChat';
import MessageBubble from '../../components/chat/MessageBubble';
```

**ChatPaciente.js** debe tener:
```javascript
import useChat from '../../hooks/useChat';
import MessageBubble from '../../components/chat/MessageBubble';
```

---

## 🚨 SI EL PROBLEMA PERSISTE

### Opción 1: Limpieza más agresiva

```powershell
# Eliminar node_modules y reinstalar
Remove-Item -Recurse -Force "node_modules"
npm install

# Limpiar todo de nuevo
powershell -ExecutionPolicy Bypass -File scripts/limpiar-todo-cache.ps1
npm start -- --reset-cache
```

### Opción 2: Verificar que Metro está usando los archivos correctos

1. Abre `http://localhost:8081` en el navegador
2. Busca en el código fuente del bundle por "useChat" o "MessageBubble"
3. Verifica que aparezcan los archivos refactorizados

### Opción 3: Reinstalar dependencias

```powershell
# Limpiar todo
Remove-Item -Recurse -Force "node_modules"
Remove-Item -Force "package-lock.json"

# Reinstalar
npm install

# Limpiar caché
powershell -ExecutionPolicy Bypass -File scripts/limpiar-todo-cache.ps1

# Reiniciar
npm start -- --reset-cache
```

---

## 📋 CHECKLIST

- [ ] Caché de Metro limpiado
- [ ] Watchman limpiado  
- [ ] Builds de Android/iOS limpiados
- [ ] node_modules/.cache eliminado
- [ ] Metro reiniciado con `--reset-cache`
- [ ] App recompilada desde cero
- [ ] Archivos refactorizados verificados

---

**IMPORTANTE:** Siempre usa `--reset-cache` al iniciar Metro después de cambios importantes en la estructura del código.



