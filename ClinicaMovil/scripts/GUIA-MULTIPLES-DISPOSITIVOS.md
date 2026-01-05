# Guía: Lanzar App en Múltiples Dispositivos/Emuladores

Esta guía te permite lanzar la aplicación en **1 o más dispositivos** simultáneamente para probar diferentes usuarios con diferentes roles.

## Características

✅ **Funciona con cualquier combinación:**
- 1 o más dispositivos
- Emuladores Android
- Dispositivos físicos (USB/WiFi)
- Cualquier mezcla de ambos

✅ **Detección automática** de todos los dispositivos conectados

✅ **Instalación automática** en todos los dispositivos detectados

## Requisitos Previos

1. **Android SDK instalado** con ADB en el PATH
2. **Emuladores creados** en Android Studio (AVD Manager) - *Opcional si usas dispositivos físicos*
3. **Metro configurado** para múltiples dispositivos (ya está configurado)

## Opción 1: Script Automático (Recomendado)

### Paso 1: Ejecutar el script principal

```powershell
.\scripts\lanzar-en-2-emuladores.ps1
```

Este script:
- ✅ Detecta **todos los dispositivos** ya conectados (emuladores y físicos)
- ✅ Inicia emuladores adicionales solo si es necesario
- ✅ Construye la aplicación
- ✅ Instala la app en **todos los dispositivos** detectados
- ✅ Configura `adb reverse` para cada dispositivo
- ✅ Funciona con **1 o más dispositivos** (no requiere exactamente 2)

### Paso 2: Iniciar Metro

En una **terminal separada**:

```powershell
npx react-native start
```

### Paso 3: Iniciar las apps

```powershell
.\scripts\iniciar-apps-en-dispositivos.ps1
```

O manualmente en cada dispositivo:
- Agita el dispositivo → "Reload"
- O desde terminal: `adb -s <device-id> shell am start -n com.clinicamovil/.MainActivity`

## Opción 2: Manual (Paso a Paso)

### Paso 1: Conectar dispositivos

**Opción A: Emuladores**
- Desde **Android Studio**: Abre **AVD Manager** e inicia emuladores
- O usa el comando: `emulator -avd <nombre_avd>`

**Opción B: Dispositivos Físicos**
- Conecta vía USB con depuración USB habilitada
- O conecta vía WiFi (configura `adb connect <ip>`)

**Opción C: Combinación**
- Puedes tener 1 emulador + 1 dispositivo físico
- O cualquier otra combinación

### Paso 2: Verificar dispositivos

```powershell
adb devices
```

Deberías ver algo como:
```
List of devices attached
emulator-5554    device
R58M123456       device    # Dispositivo físico
```

### Paso 3: Instalar la app

```powershell
.\scripts\instalar-en-multiples-dispositivos.ps1
```

Este script:
- Detecta todos los dispositivos conectados
- Construye la app (si es necesario)
- Instala en todos los dispositivos
- Configura `adb reverse` para cada uno

### Paso 4: Iniciar Metro

```powershell
npx react-native start
```

### Paso 5: Iniciar las apps

```powershell
.\scripts\iniciar-apps-en-dispositivos.ps1
```

## Verificar que Funciona

1. **Metro debe mostrar**: "Metro waiting on..."
2. **Todos los dispositivos** deben tener la app instalada
3. **Cada dispositivo** puede tener un usuario diferente:
   - Dispositivo 1: Doctor/Administrador
   - Dispositivo 2: Paciente
   - Dispositivo 3: Otro rol (si tienes más)

## Solución de Problemas

### "No se encontraron dispositivos"

1. Verifica que los emuladores estén completamente iniciados
2. Ejecuta: `adb devices`
3. Si no aparecen, reinicia ADB: `adb kill-server && adb start-server`

### "Error al instalar"

1. Desinstala la app anterior: `adb -s <device-id> uninstall com.clinicamovil`
2. Vuelve a ejecutar el script de instalación

### "Metro no conecta"

1. Verifica que Metro esté corriendo
2. Verifica `adb reverse`: `adb -s <device-id> reverse tcp:8081 tcp:8081`
3. Recarga la app en el dispositivo

## Scripts Disponibles

- `lanzar-en-2-emuladores.ps1` - Script completo automático
- `instalar-en-multiples-dispositivos.ps1` - Solo instala en dispositivos conectados
- `iniciar-apps-en-dispositivos.ps1` - Solo inicia las apps

## Notas Importantes

- **Metro puede servir a múltiples dispositivos** simultáneamente
- Cada dispositivo necesita su propio `adb reverse` configurado (se hace automáticamente)
- Los cambios en código se reflejan en **todos los dispositivos** conectados
- **Funciona con 1 o más dispositivos** - no requiere exactamente 2
- Puedes mezclar emuladores y dispositivos físicos sin problemas
- Si solo tienes 1 dispositivo, el script funcionará igual

