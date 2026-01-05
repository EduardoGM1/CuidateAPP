# 🚀 Guía: Cómo Abrir la App en Modo Desarrollo

## 📋 Requisitos Previos

1. **Node.js** instalado (v18 o superior)
2. **React Native CLI** o **Expo CLI** (según tu setup)
3. **Android Studio** (para Android) o **Xcode** (para iOS)
4. **Dispositivo físico** conectado o **Emulador** ejecutándose

---

## 🔧 PASO 1: Verificar Instalación

### Verificar Node.js
```bash
node --version
# Debe mostrar v18 o superior
```

### Verificar que las dependencias estén instaladas
```bash
cd ClinicaMovil
npm install
```

---

## 📱 PASO 2: Para Android

### Opción A: Usando Emulador Android

1. **Abrir Android Studio**
   - Abre Android Studio
   - Ve a: Tools → Device Manager
   - Crea o inicia un emulador Android

2. **Ejecutar Metro Bundler**
   ```bash
   cd ClinicaMovil
   npm start
   ```
   O también:
   ```bash
   npx react-native start
   ```
   Deberías ver:
   ```
   Metro waiting on exp://192.168.x.x:8081
   ```

3. **En otra terminal, ejecutar la app**
   ```bash
   cd ClinicaMovil
   npm run android
   ```
   O:
   ```bash
   npx react-native run-android
   ```

### Opción B: Usando Dispositivo Físico Android

1. **Habilitar Opciones de Desarrollador**
   - Ve a: Ajustes → Acerca del teléfono
   - Toca "Número de compilación" 7 veces
   - Regresa a Ajustes → Opciones de desarrollador

2. **Activar Depuración USB**
   - En Opciones de desarrollador
   - Activa "Depuración USB"
   - Activa "Instalar vía USB" (opcional)

3. **Conectar dispositivo**
   - Conecta el dispositivo con USB
   - Acepta el diálogo de depuración USB en el teléfono

4. **Verificar conexión**
   ```bash
   adb devices
   ```
   Debe mostrar tu dispositivo

5. **Ejecutar la app**
   ```bash
   cd ClinicaMovil
   npm start
   # En otra terminal:
   npm run android
   ```

---

## 🍎 PASO 3: Para iOS (Solo Mac)

1. **Instalar CocoaPods** (si no está instalado)
   ```bash
   sudo gem install cocoapods
   ```

2. **Instalar dependencias iOS**
   ```bash
   cd ClinicaMovil/ios
   pod install
   cd ..
   ```

3. **Abrir Xcode**
   ```bash
   open ios/CuidateApp.xcworkspace
   ```

4. **Seleccionar dispositivo/Simulador**
   - En la parte superior de Xcode
   - Selecciona un simulador (iPhone 14, etc.) o dispositivo físico

5. **Ejecutar**
   - Presiona el botón "Play" en Xcode
   - O desde terminal:
     ```bash
     npm run ios
     ```

---

## 🔍 PASO 4: Verificar Modo Desarrollo

### Señales de que estás en modo desarrollo:

1. **Menú de desarrollo visible**
   - Agita el dispositivo/emulador
   - O presiona `Ctrl+M` (Android) / `Cmd+D` (iOS)
   - Deberías ver un menú con opciones

2. **Hot Reload activo**
   - Cambia algo en el código
   - La app debería actualizarse automáticamente

3. **Console logs visibles**
   - Abre React Native Debugger o Chrome DevTools
   - Deberías ver logs de la aplicación

4. **Performance Overlay disponible**
   - Toca 3 veces rápido en cualquier parte de la pantalla
   - Deberías ver el overlay de métricas

---

## 🛠️ PASO 5: Herramientas de Desarrollo

### React Native Debugger (Recomendado)

1. **Instalar**
   ```bash
   npm install -g react-native-debugger
   ```

2. **Ejecutar**
   - Abre React Native Debugger
   - En el menú de desarrollo de la app, selecciona "Debug"

3. **Usar**
   - Ve a la pestaña "Console" para ver logs
   - Ve a "React DevTools" para inspeccionar componentes
   - Ve a "Profiler" para analizar rendimiento

### Chrome DevTools (Alternativa)

1. **Abrir**
   - En el menú de desarrollo, selecciona "Debug"
   - O abre: `http://localhost:8081/debugger-ui`

2. **Abrir Chrome**
   - Presiona `F12` para abrir DevTools
   - Ve a la pestaña "Console"

---

## 🚨 Solución de Problemas

### Error: "Metro bundler failed"
```bash
# Limpiar cache
cd ClinicaMovil
npm start -- --reset-cache
```

### Error: "Unable to load script"
```bash
# Limpiar todo
cd ClinicaMovil
npm start -- --reset-cache
# En otra terminal:
npm run android -- --reset-cache
```

### Error: "Device not found"
```bash
# Android: Verificar conexión
adb devices

# Si no aparece, intenta:
adb kill-server
adb start-server
adb devices
```

### Error: "Port 8081 already in use"
```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8081 | xargs kill -9
```

---

## 📊 PASO 6: Activar Performance Overlay

Una vez que la app esté ejecutándose:

1. **Toca 3 veces rápidamente** en cualquier parte de la pantalla
2. Se abrirá el overlay de métricas de rendimiento
3. Observa:
   - FPS (debe ser ≥ 55)
   - Frame Time (debe ser < 16.67ms)
   - Memory usage
   - Render count

---

## ✅ Checklist de Verificación

- [ ] Metro bundler ejecutándose (`npm start`)
- [ ] App instalada en dispositivo/emulador
- [ ] Menú de desarrollo accesible (agitar dispositivo)
- [ ] Hot reload funcionando
- [ ] Console logs visibles
- [ ] Performance Overlay activo (3 taps rápidos)

---

## 🎯 Comandos Rápidos

```bash
# Iniciar Metro Bundler
npm start

# Android
npm run android

# iOS
npm run ios

# Limpiar cache
npm start -- --reset-cache

# Verificar dispositivos conectados (Android)
adb devices
```

---

## 💡 Tips

1. **Mantén Metro Bundler ejecutándose** mientras desarrollas
2. **Usa React Native Debugger** para mejor experiencia de debug
3. **Activa Performance Overlay** para monitorear rendimiento
4. **Usa Hot Reload** para desarrollo rápido (se activa automáticamente)

---

## 📝 Notas Importantes

- **Modo desarrollo = `__DEV__ === true`** (automático cuando usas `npm start`)
- **Performance Overlay solo funciona en modo desarrollo**
- **Los tests de rendimiento están disponibles globalmente en `__DEV__`**
- **Metro Bundler debe estar ejecutándose para que funcione Hot Reload**

---

¡Listo! Con estos pasos deberías tener la app ejecutándose en modo desarrollo con todas las herramientas de performance disponibles. 🚀

