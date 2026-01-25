# 🔧 Solución para Error de CMake - Permission Denied

**Error:** `CMake Error: file failed to open for reading (Permission denied)`  
**Módulo:** `react-native-nitro-modules`  
**Fecha:** 12 de enero de 2025

---

## 🔍 Análisis del Error

El error ocurre durante la configuración de CMake para `react-native-nitro-modules`:

```
CMake Error: file failed to open for reading (Permission denied): 
C:/Users/eduar/Desktop/Backend/ClinicaMovil/node_modules/react-native-nitro-modules/android/.cxx/Debug/29365a4u/arm64-v8a/CMakeFiles/...
```

**Causas posibles:**
1. Archivos bloqueados por procesos Java/Gradle activos
2. Antivirus bloqueando acceso a archivos temporales
3. Permisos insuficientes en el directorio `.cxx`
4. Archivos corruptos de compilaciones anteriores

---

## ✅ Correcciones Aplicadas

### **1. Detener Procesos Bloqueantes**
```powershell
Get-Process | Where-Object {$_.ProcessName -like "*java*" -or $_.ProcessName -like "*gradle*"} | Stop-Process -Force
```

### **2. Limpiar Directorio .cxx**
```powershell
Remove-Item -Path "node_modules\react-native-nitro-modules\android\.cxx" -Recurse -Force
```

### **3. Limpiar Build de Gradle**
```powershell
cd android
.\gradlew clean
.\gradlew --stop
cd ..
```

---

## 🚀 Soluciones Adicionales

### **Opción 1: Compilar Solo para Arquitectura del Dispositivo**

Si tu dispositivo no es `arm64-v8a`, puedes compilar solo para su arquitectura:

```powershell
# Verificar arquitectura del dispositivo
adb shell getprop ro.product.cpu.abi

# Compilar solo para esa arquitectura (ejemplo para armeabi-v7a)
cd android
.\gradlew assembleDebug -PreactNativeArchitectures=armeabi-v7a
```

### **Opción 2: Excluir Arquitecturas No Necesarias**

Edita `android/gradle.properties`:

```properties
# Compilar solo para arquitecturas necesarias
reactNativeArchitectures=armeabi-v7a,arm64-v8a
# O solo arm64-v8a si es lo único que necesitas
# reactNativeArchitectures=arm64-v8a
```

### **Opción 3: Ejecutar como Administrador (Temporal)**

Si el problema persiste, intenta ejecutar PowerShell como administrador:

1. Cierra todas las terminales
2. Abre PowerShell como administrador
3. Navega al proyecto
4. Ejecuta la compilación

### **Opción 4: Deshabilitar Antivirus Temporalmente**

Algunos antivirus bloquean CMake. Considera:
- Agregar excepción para el directorio del proyecto
- Deshabilitar temporalmente durante la compilación
- Usar modo de exclusión para procesos de compilación

### **Opción 5: Limpiar Completamente y Recompilar**

```powershell
# 1. Detener todos los procesos
Get-Process | Where-Object {$_.ProcessName -like "*java*" -or $_.ProcessName -like "*gradle*" -or $_.ProcessName -like "*node*"} | Stop-Process -Force

# 2. Limpiar directorios de build
Remove-Item -Recurse -Force "node_modules\react-native-nitro-modules\android\.cxx" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue

# 3. Limpiar con Gradle
cd android
.\gradlew clean
.\gradlew --stop
cd ..

# 4. Recompilar
npx react-native run-android
```

### **Opción 6: Actualizar react-native-nitro-modules**

El módulo puede tener un bug conocido. Intenta actualizarlo:

```powershell
npm update react-native-nitro-modules
# O reinstalar
npm uninstall react-native-nitro-modules
npm install react-native-nitro-modules@latest
```

---

## 🔍 Verificación de Permisos

Para verificar permisos del directorio:

```powershell
$path = "node_modules\react-native-nitro-modules\android\.cxx"
if (Test-Path $path) {
    $acl = Get-Acl $path
    $acl.Access | Where-Object {$_.IdentityReference -like "*$env:USERNAME*"} | Format-Table
}
```

Si no tienes permisos completos, puedes otorgarlos:

```powershell
$path = "node_modules\react-native-nitro-modules\android\.cxx"
$acl = Get-Acl $path
$permission = $env:USERNAME,"FullControl","Allow"
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
$acl.SetAccessRule($accessRule)
Set-Acl $path $acl
```

---

## ⚠️ Solución Temporal: Compilar Sin Nitro Modules

Si nada funciona y necesitas compilar urgentemente, puedes temporalmente deshabilitar nitro-modules:

1. **Comentar en package.json:**
   ```json
   // "react-native-nitro-modules": "^0.31.8",
   ```

2. **Ejecutar:**
   ```powershell
   npm install
   cd android
   .\gradlew clean
   cd ..
   npx react-native run-android
   ```

**Nota:** Esto deshabilitará las optimizaciones de nitro-modules, pero la app debería funcionar.

---

## 📋 Checklist de Solución

- [x] Detener procesos Java/Gradle
- [x] Limpiar directorio `.cxx`
- [x] Limpiar build de Gradle
- [ ] Verificar arquitectura del dispositivo
- [ ] Ajustar `reactNativeArchitectures` si es necesario
- [ ] Verificar permisos del directorio
- [ ] Considerar ejecutar como administrador
- [ ] Verificar antivirus

---

## 🎯 Próximos Pasos

1. **Verificar arquitectura del dispositivo conectado**
2. **Ajustar configuración de arquitecturas si es necesario**
3. **Intentar compilar nuevamente**
4. **Si persiste, seguir Opción 5 (limpieza completa)**

---

## 💡 Notas Importantes

- El error de permisos puede ser intermitente
- A veces simplemente esperar unos minutos y reintentar funciona
- El antivirus Windows Defender puede causar estos problemas
- CMake puede necesitar permisos de escritura en directorios temporales

---

## ✅ Estado Actual

- ✅ Procesos detenidos
- ✅ Directorio `.cxx` limpiado
- ✅ Build de Gradle limpiado
- ⏳ Compilación en progreso

Si el error persiste después de estas correcciones, sigue las opciones adicionales listadas arriba.
