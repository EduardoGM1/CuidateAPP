# 🔧 Configuración de Metro para Dispositivo Físico

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## ✅ Configuración Actual

### Metro Config (`metro.config.js`)
- ✅ Configurado para permitir múltiples dispositivos
- ✅ CORS habilitado para conexiones desde diferentes dispositivos
- ✅ Middleware personalizado para soporte multi-dispositivo

### Scripts Disponibles

1. **`scripts/instalar-dispositivo-fisico.ps1`**
   - Instalación completa automática
   - Detecta dispositivo automáticamente
   - Configura ADB reverse
   - Instala la aplicación

2. **`scripts/configurar-dispositivo-fisico.ps1`**
   - Solo configura ADB reverse
   - Útil cuando Metro ya está ejecutándose

3. **`scripts/configurar-adb-reverse.ps1`**
   - Configura ADB reverse para todos los dispositivos
   - Soporta múltiples dispositivos simultáneos

4. **`scripts/listar-dispositivos.ps1`**
   - Lista dispositivos con información detallada
   - Muestra modelo y versión de Android

### Comandos NPM

- `npm start` - Metro estándar (localhost)
- `npm run start:multi` - Metro para múltiples dispositivos (0.0.0.0)
- `npm run start:device` - Alias para dispositivos físicos
- `npm run android:device` - Instalar en dispositivo físico

---

## 🚀 Uso Rápido

### Opción 1: Script Automático (Recomendado)

```powershell
# Terminal 1: Iniciar Metro
cd ClinicaMovil
npm run start:multi

# Terminal 2: Instalar en dispositivo
.\scripts\instalar-dispositivo-fisico.ps1
```

### Opción 2: Manual

```powershell
# 1. Configurar ADB reverse
.\scripts\configurar-dispositivo-fisico.ps1

# 2. Iniciar Metro
npm run start:multi

# 3. Instalar app
npx react-native run-android
```

---

## 📋 Checklist de Configuración

- [x] `metro.config.js` configurado para múltiples dispositivos
- [x] Scripts de instalación creados
- [x] Comandos NPM configurados
- [x] Documentación creada
- [x] ADB reverse configurado automáticamente

---

## 🔍 Verificación

### Verificar que Metro está escuchando correctamente:
```powershell
netstat -ano | findstr :8081
```

Deberías ver:
```
TCP    0.0.0.0:8081    0.0.0.0:0    LISTENING
```

### Verificar ADB reverse:
```powershell
adb reverse --list
```

Deberías ver:
```
8081 tcp:8081
3000 tcp:3000
```

---

## 📝 Notas Importantes

1. **Metro debe escuchar en 0.0.0.0** para dispositivos físicos
2. **ADB reverse es necesario** para que el dispositivo acceda a localhost
3. **Backend debe estar ejecutándose** en localhost:3000
4. **Mismo WiFi** no es necesario si usas USB + ADB reverse

---

**Configuración lista para usar en dispositivos físicos.**

