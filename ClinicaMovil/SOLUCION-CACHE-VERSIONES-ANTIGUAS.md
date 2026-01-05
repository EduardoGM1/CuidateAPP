# 🔧 SOLUCIÓN: Compilando Versiones Antiguas del Proyecto

**Problema:** Al compilar, se están usando versiones pasadas del proyecto en lugar de los archivos refactorizados.

**Causa:** Caché persistente de Metro Bundler, Watchman, y builds antiguos.

---

## ✅ SOLUCIÓN RÁPIDA

### Opción 1: Script Automático (Recomendado)

```powershell
cd ClinicaMovil
powershell -ExecutionPolicy Bypass -File scripts/limpiar-todo-cache.ps1
npm start -- --reset-cache
```

### Opción 2: Limpieza Manual Completa

```powershell
# 1. Detener Metro y procesos Node
Get-Process -Name "node" | Stop-Process -Force

# 2. Limpiar caché de Metro
Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\haste-map-*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force ".metro" -ErrorAction SilentlyContinue

# 3. Limpiar Watchman
watchman watch-del-all
watchman shutdown-server

# 4. Limpiar node_modules/.cache
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue

# 5. Limpiar builds
Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue
cd android; .\gradlew clean; cd ..

# 6. Limpiar caché npm
npm cache clean --force

# 7. Reiniciar Metro con caché limpio
npm start -- --reset-cache
```

---

## 🔍 VERIFICACIONES

### 1. Verificar que los archivos refactorizados existen:

```powershell
Test-Path "src\hooks\useChat.js"           # Debe ser True
Test-Path "src\components\chat\MessageBubble.js"  # Debe ser True
```

### 2. Verificar imports en los componentes:

**ChatDoctor.js debe tener:**
```javascript
import useChat from '../../hooks/useChat';
import MessageBubble from '../../components/chat/MessageBubble';
```

**ChatPaciente.js debe tener:**
```javascript
import useChat from '../../hooks/useChat';
import MessageBubble from '../../components/chat/MessageBubble';
```

### 3. Verificar que no hay archivos duplicados:

```powershell
# Buscar archivos duplicados
Get-ChildItem -Recurse -Filter "useChat.js" | Select-Object FullName
Get-ChildItem -Recurse -Filter "MessageBubble.js" | Select-Object FullName
```

**Debe haber SOLO:**
- `ClinicaMovil\src\hooks\useChat.js`
- `ClinicaMovil\src\components\chat\MessageBubble.js`

---

## 🚀 PASOS PARA REINICIAR CORRECTAMENTE

### 1. Limpiar TODO el caché:
```powershell
cd ClinicaMovil
powershell -ExecutionPolicy Bypass -File scripts/limpiar-todo-cache.ps1
```

### 2. Reiniciar Metro con caché limpio:
```powershell
npm start -- --reset-cache
```

O alternativamente:
```powershell
npx react-native start --reset-cache
```

### 3. En otra terminal, recompilar la app:
```powershell
# Para Android
npx react-native run-android

# Para iOS
npx react-native run-ios
```

---

## ⚠️ SI EL PROBLEMA PERSISTE

### 1. Verificar que Metro está usando los archivos correctos:

Abre el navegador en `http://localhost:8081` y verifica:
- Los archivos `useChat.js` y `MessageBubble.js` aparecen en el bundle
- No hay errores de módulo no encontrado

### 2. Verificar metro.config.js:

El archivo `metro.config.js` debe tener:
```javascript
resolver: {
  sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  roots: [path.resolve(__dirname)],
}
```

### 3. Limpieza más agresiva:

```powershell
# Eliminar node_modules y reinstalar
Remove-Item -Recurse -Force "node_modules"
npm install

# Limpiar todo de nuevo
powershell -ExecutionPolicy Bypass -File scripts/limpiar-todo-cache.ps1
```

### 4. Verificar que no hay archivos en backups que interfieran:

```powershell
# Buscar archivos antiguos en backups
Get-ChildItem -Recurse -Path "backups" -Filter "useChat.js" -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -Path "backups" -Filter "MessageBubble.js" -ErrorAction SilentlyContinue
```

**Los archivos en backups NO deben interferir**, pero si hay problemas, verifica que no estén siendo importados accidentalmente.

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Archivos refactorizados existen en las ubicaciones correctas
- [ ] Imports están correctos en ChatDoctor.js y ChatPaciente.js
- [ ] No hay archivos duplicados
- [ ] Caché de Metro limpiado
- [ ] Watchman limpiado
- [ ] Builds de Android/iOS limpiados
- [ ] Metro reiniciado con `--reset-cache`
- [ ] App recompilada desde cero

---

## 🎯 COMANDOS RÁPIDOS

```powershell
# Limpiar todo y reiniciar
cd ClinicaMovil
powershell -ExecutionPolicy Bypass -File scripts/limpiar-todo-cache.ps1
npm start -- --reset-cache

# En otra terminal:
npx react-native run-android
```

---

**Última actualización:** 2025-11-26  
**Estado:** ✅ Scripts de limpieza creados y verificados



