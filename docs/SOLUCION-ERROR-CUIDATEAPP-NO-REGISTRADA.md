# 🔧 Solución: Error "cuidateapp no ha sido registrada"

Este error ocurre cuando Metro Bundler no puede encontrar o registrar la aplicación correctamente.

---

## 🎯 Causas Comunes

1. **Metro está corriendo desde una carpeta incorrecta**
2. **Procesos de Metro antiguos aún corriendo**
3. **Cache de Metro corrupto**
4. **Metro no está corriendo**

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar que estás en la carpeta correcta

```powershell
# Debes estar en:
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil

# Verificar que estás en la carpeta correcta
Get-Location
# Debe mostrar: C:\Users\eduar\Desktop\Backend\ClinicaMovil
```

### Paso 2: Detener todos los procesos de Metro/Node

```powershell
# Detener todos los procesos Node
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Verificar que no hay procesos corriendo
Get-Process | Where-Object {$_.ProcessName -eq "node"}
# No debe mostrar nada
```

### Paso 3: Limpiar cache de Metro

```powershell
# Opción 1: Limpiar cache y reiniciar
npm run start:multi:reset

# Opción 2: Limpiar manualmente
npx react-native start --reset-cache --host 0.0.0.0
```

### Paso 4: Iniciar Metro desde la carpeta correcta

```powershell
# Asegúrate de estar en ClinicaMovil
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil

# Iniciar Metro
npm run start:multi

# O si prefieres el comando completo:
npx react-native start --host 0.0.0.0
```

---

## 🔍 Verificación

### Verificar que los archivos están correctos:

1. **app.json** debe contener:
```json
{
  "name": "CuidateApp",
  "displayName": "CuidateApp"
}
```

2. **index.js** debe contener:
```javascript
import { name as appName } from './app.json';
AppRegistry.registerComponent(appName, () => App);
```

3. **MainActivity.kt** debe contener:
```kotlin
override fun getMainComponentName(): String = "CuidateApp"
```

### Verificar que Metro está corriendo:

```powershell
# Verificar puerto 8081
netstat -ano | findstr ":8081"

# Debe mostrar algo como:
# TCP    0.0.0.0:8081         0.0.0.0:0              LISTENING       12345
```

---

## 🚨 Si el problema persiste

### 1. Verificar que Metro está en la carpeta correcta:

```powershell
# Verificar desde dónde está corriendo Metro
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Select-Object ProcessName, Id, Path
```

### 2. Reiniciar completamente:

```powershell
# 1. Detener todos los procesos
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# 2. Limpiar cache de npm
npm cache clean --force

# 3. Limpiar cache de Metro
npx react-native start --reset-cache --host 0.0.0.0
```

### 3. Verificar configuración de Metro:

El archivo `metro.config.js` debe tener:
```javascript
projectRoot: __dirname,
watchFolders: [__dirname],
```

---

## 📝 Script Automático

He creado un script para automatizar esto:

```powershell
# Ejecutar el script de verificación
powershell -ExecutionPolicy Bypass -File ".\scripts\solucionar-metro-carpeta.ps1"
```

---

## ✅ Checklist Final

- [ ] Estás en la carpeta `C:\Users\eduar\Desktop\Backend\ClinicaMovil`
- [ ] No hay procesos Node corriendo (excepto Metro)
- [ ] Metro está corriendo en el puerto 8081
- [ ] `app.json` tiene `"name": "CuidateApp"`
- [ ] `index.js` importa y registra correctamente
- [ ] `MainActivity.kt` tiene `"CuidateApp"` como nombre

---

**Si después de seguir estos pasos el problema persiste, el error puede estar en la configuración de Android. Verifica que `MainActivity.kt` tenga el nombre correcto.**

