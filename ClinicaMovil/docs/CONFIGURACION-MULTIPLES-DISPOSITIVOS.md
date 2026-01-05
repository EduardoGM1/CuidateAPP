# 📱 Configuración de Metro para Múltiples Dispositivos

**Guía completa para usar 1 dispositivo físico + 1 emulador simultáneamente**

---

## 🎯 Objetivo

Configurar Metro Bundler para que permita conexiones simultáneas desde:
- ✅ 1 Dispositivo físico (Android/iOS)
- ✅ 1 Emulador Android
- ✅ Múltiples dispositivos físicos (opcional)

---

## 📋 Requisitos Previos

1. ✅ Metro configurado correctamente (`metro.config.js`)
2. ✅ Scripts en `package.json` con `--host 0.0.0.0`
3. ✅ Dispositivo físico conectado (USB o misma red WiFi)
4. ✅ Emulador Android iniciado
5. ✅ Backend corriendo y accesible

---

## 🚀 Paso 1: Iniciar Metro en Modo Multi-Dispositivo

### Opción A: Usar script existente (Recomendado)

```bash
cd ClinicaMovil
npm run start:multi
```

### Opción B: Comando directo

```bash
cd ClinicaMovil
npx react-native start --host 0.0.0.0
```

### Opción C: Con reset de cache (si hay problemas)

```bash
cd ClinicaMovil
npm run start:multi:reset
```

**¿Qué hace `--host 0.0.0.0`?**
- Hace que Metro escuche en **todas las interfaces de red**
- Permite conexiones desde:
  - `localhost` (para emulador con adb reverse)
  - `192.168.x.x` (IP local para dispositivos físicos)
  - `10.0.2.2` (IP especial del emulador Android)

---

## 📱 Paso 2: Configurar Dispositivo Físico

### Opción A: Usar ADB Reverse (Recomendado - Más Simple)

```bash
# Conectar dispositivo físico por USB
adb devices

# Configurar reverse para Metro (puerto 8081)
adb reverse tcp:8081 tcp:8081

# Verificar que está configurado
adb reverse --list
```

**Ventajas:**
- ✅ El dispositivo usa `localhost:8081` (igual que el emulador)
- ✅ No necesitas conocer tu IP local
- ✅ Funciona automáticamente

**Desventajas:**
- ⚠️ Requiere conexión USB
- ⚠️ Si desconectas el USB, se pierde la configuración

### Opción B: Usar IP Local (Para WiFi o sin USB)

1. **Obtener tu IP local:**
   ```bash
   # Windows
   ipconfig
   # Busca "IPv4 Address" en tu adaptador de red activo
   # Ejemplo: 192.168.1.74
   
   # Linux/Mac
   ifconfig
   # o
   ip addr show
   ```

2. **Configurar el dispositivo para usar la IP:**
   - En la app, agita el dispositivo (shake gesture)
   - Selecciona "Settings" → "Debug server host & port for device"
   - Ingresa: `TU_IP_LOCAL:8081`
   - Ejemplo: `192.168.1.74:8081`

3. **O configurar desde terminal:**
   ```bash
   # Android
   adb shell input keyevent 82  # Abre Dev Menu
   # Luego selecciona "Settings" → "Debug server host"
   ```

---

## 🖥️ Paso 3: Configurar Emulador Android

### Opción A: Usar ADB Reverse (Recomendado)

```bash
# Configurar reverse para el emulador
adb -s emulator-5554 reverse tcp:8081 tcp:8081

# Verificar
adb -s emulator-5554 reverse --list
```

**Nota:** Reemplaza `emulator-5554` con el ID de tu emulador (ver con `adb devices`)

### Opción B: Usar IP Especial del Emulador

El emulador Android tiene una IP especial: `10.0.2.2` que apunta al `localhost` de tu PC.

**Configuración automática:**
- Si tu `apiConfig.js` detecta emulador, usa `10.0.2.2:8081` automáticamente
- No necesitas configuración adicional

**Configuración manual (si es necesario):**
- En Dev Menu → "Settings" → "Debug server host"
- Ingresa: `10.0.2.2:8081`

---

## 🔧 Paso 4: Verificar Configuración

### Verificar dispositivos conectados:

```bash
adb devices
```

**Salida esperada:**
```
List of devices attached
emulator-5554    device    # Emulador
ABC123XYZ        device    # Dispositivo físico
```

### Verificar ADB Reverse:

```bash
adb reverse --list
```

**Salida esperada:**
```
emulator-5554 tcp:8081 tcp:8081
ABC123XYZ tcp:8081 tcp:8081
```

### Verificar que Metro está escuchando:

Abre en el navegador:
- `http://localhost:8081/status` - Debe mostrar estado de Metro
- `http://TU_IP_LOCAL:8081/status` - Debe mostrar estado de Metro

---

## 🎮 Paso 5: Ejecutar la App en Ambos Dispositivos

### En Dispositivo Físico:

```bash
# Terminal 1: Metro ya está corriendo
# Terminal 2: Ejecutar app
cd ClinicaMovil
npm run android
```

### En Emulador:

```bash
# Terminal 3: Ejecutar app en emulador
cd ClinicaMovil
npx react-native run-android --deviceId=emulator-5554
```

**O desde Android Studio:**
- Selecciona el emulador en el dropdown
- Click en "Run"

---

## 🔍 Solución de Problemas

### Problema 1: "Unable to connect to Metro"

**Solución:**
1. Verifica que Metro está corriendo con `--host 0.0.0.0`
2. Verifica ADB reverse: `adb reverse --list`
3. Verifica firewall de Windows (permite puerto 8081)
4. Verifica que ambos dispositivos están conectados: `adb devices`

### Problema 2: Solo un dispositivo se conecta

**Solución:**
1. Asegúrate de usar `--host 0.0.0.0` al iniciar Metro
2. Reinicia Metro: `Ctrl+C` y luego `npm run start:multi`
3. Limpia cache: `npm run start:multi:reset`

### Problema 3: Dispositivo físico no se conecta

**Solución:**
1. Verifica conexión USB: `adb devices`
2. Configura ADB reverse: `adb reverse tcp:8081 tcp:8081`
3. O usa IP local en Dev Menu del dispositivo

### Problema 4: Emulador no se conecta

**Solución:**
1. Verifica que el emulador está corriendo: `adb devices`
2. Configura ADB reverse para el emulador específico:
   ```bash
   adb -s emulator-5554 reverse tcp:8081 tcp:8081
   ```
3. O usa `10.0.2.2:8081` en Dev Menu del emulador

### Problema 5: Firewall bloquea conexiones

**Solución Windows:**
1. Abre "Windows Defender Firewall"
2. "Configuración avanzada"
3. "Reglas de entrada" → "Nueva regla"
4. Puerto → TCP → 8081
5. Permitir conexión

**O desde PowerShell (Admin):**
```powershell
New-NetFirewallRule -DisplayName "Metro Bundler" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
```

---

## 📊 Configuración de Red por Dispositivo

### Dispositivo Físico (USB con ADB Reverse):
```
Metro URL: localhost:8081
API URL: localhost:3000 (con adb reverse tcp:3000 tcp:3000)
```

### Dispositivo Físico (WiFi):
```
Metro URL: 192.168.1.74:8081 (tu IP local)
API URL: 192.168.1.74:3000 (tu IP local)
```

### Emulador Android:
```
Metro URL: 10.0.2.2:8081 (o localhost:8081 con adb reverse)
API URL: 10.0.2.2:3000 (o localhost:3000 con adb reverse)
```

---

## 🎯 Scripts Útiles

### Script para configurar todo automáticamente:

Crea `ClinicaMovil/scripts/configurar-multi-dispositivos.ps1`:

```powershell
# Configurar ADB Reverse para todos los dispositivos
Write-Host "🔍 Detectando dispositivos..." -ForegroundColor Cyan
$devices = adb devices | Select-String "device$" | ForEach-Object { ($_ -split "\s+")[0] }

if ($devices.Count -eq 0) {
    Write-Host "❌ No se encontraron dispositivos" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dispositivos encontrados: $($devices.Count)" -ForegroundColor Green

foreach ($device in $devices) {
    Write-Host "🔧 Configurando $device..." -ForegroundColor Yellow
    adb -s $device reverse tcp:8081 tcp:8081
    adb -s $device reverse tcp:3000 tcp:3000
}

Write-Host "`n✅ Configuración completada" -ForegroundColor Green
Write-Host "📋 Resumen:" -ForegroundColor Cyan
adb reverse --list
```

**Uso:**
```powershell
cd ClinicaMovil
.\scripts\configurar-multi-dispositivos.ps1
```

---

## ✅ Checklist de Configuración

- [ ] Metro iniciado con `--host 0.0.0.0`
- [ ] Dispositivo físico conectado (`adb devices`)
- [ ] Emulador iniciado (`adb devices`)
- [ ] ADB reverse configurado para ambos dispositivos
- [ ] Firewall permite puerto 8081
- [ ] Backend corriendo y accesible
- [ ] App ejecutada en ambos dispositivos
- [ ] Ambos dispositivos se conectan a Metro correctamente

---

## 🎉 Resultado Esperado

Cuando todo está configurado correctamente:

1. ✅ Metro muestra conexiones de ambos dispositivos en la consola
2. ✅ Ambos dispositivos cargan la app correctamente
3. ✅ Hot reload funciona en ambos dispositivos
4. ✅ Cambios en código se reflejan en ambos dispositivos simultáneamente

---

## 📝 Notas Importantes

1. **Puerto 8081:** Es el puerto por defecto de Metro. Si necesitas cambiarlo, usa `--port XXXX`

2. **ADB Reverse:** Se pierde al desconectar el USB. Reconfigura si es necesario.

3. **IP Local:** Si tu IP cambia (cambias de red WiFi), actualiza la configuración.

4. **Rendimiento:** Múltiples dispositivos pueden hacer que Metro sea más lento. Es normal.

5. **Cache:** Si hay problemas, limpia el cache: `npm run start:multi:reset`

---

**Última actualización:** 28/11/2025

