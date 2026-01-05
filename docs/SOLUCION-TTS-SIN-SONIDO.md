# 🔧 Solución: TTS no reproduce sonido en dispositivo físico

## 🔍 Problema Identificado

El TTS se llama correctamente (se ve en logs), pero no reproduce sonido y no dispara eventos `tts-start` o `tts-finish`.

## ✅ Correcciones Aplicadas

### 1. **Llamada a `speak()` corregida para Android**
- **Problema**: En Android, `Tts.speak()` puede no devolver una promesa y debe llamarse de forma **síncrona**
- **Solución**: Llamar directamente sin `await` en Android, y esperar eventos en lugar de promesas

### 2. **Diagnóstico mejorado**
- Verificación de motores TTS disponibles
- Verificación de voces instaladas
- Verificación de voces en español
- Logs detallados de cada paso

### 3. **Manejo de errores robusto**
- Captura de errores en cada paso
- Fallbacks si no hay voces en español
- Sugerencias para el usuario

---

## 🧪 Diagnóstico Rápido

### Ejecutar en la consola de React Native:

```javascript
// Importar el diagnóstico
import ttsDiagnostic from './src/utils/ttsDiagnostic';

// Ejecutar diagnóstico completo
ttsDiagnostic.runDiagnostic().then(result => {
  console.log('Resultado:', result);
});

// Verificar configuración del dispositivo
ttsDiagnostic.checkDeviceSettings();
```

---

## 📋 Pasos para Solucionar el Problema

### **Paso 1: Verificar que hay voces instaladas**

En el dispositivo Android:
1. Ir a **Configuración** > **Sistema** > **Accesibilidad** > **Texto a voz**
2. Verificar que hay un motor seleccionado (Google Text-to-Speech)
3. Tocar **Preferencias de motor** > **Instalar datos de voz**
4. Descargar e instalar **Español (México)** o **Español (España)**

### **Paso 2: Verificar volumen y modo**

1. Verificar que el volumen multimedia esté activado
2. Verificar que el dispositivo no esté en modo silencioso
3. Probar aumentar el volumen mientras se presiona el botón

### **Paso 3: Verificar permisos**

1. Ir a **Configuración** > **Apps** > **Clínica Móvil** > **Permisos**
2. Verificar que los permisos de audio estén concedidos
3. Si no están, concederlos manualmente

### **Paso 4: Probar con otra app**

1. Abrir Google Translate
2. Escribir texto y usar el botón de "Escuchar"
3. Si funciona en Google Translate pero no en nuestra app, el problema es de configuración en nuestra app

---

## 🔍 Verificación en Logs

Después de presionar el botón, deberías ver en los logs:

### ✅ **Si funciona correctamente:**
```
[DEBUG] TTS: Estado antes de hablar { isInitialized: true, ... }
[DEBUG] TTS: Llamada a speak() realizada (Android) { ... }
[DEBUG] TTS: Inició habla { event: ... }
[DEBUG] TTS: Finalizó habla { event: ... }
```

### ❌ **Si hay problemas:**
```
[WARN] TTS: speak() llamado pero no se detectó tts-start después de 2 segundos
[DEBUG] TTS: Diagnóstico de disponibilidad { enginesCount: 0, voicesCount: 0, ... }
[ERROR] TTS: CRÍTICO - No hay voces instaladas en el dispositivo
```

---

## 🛠️ Soluciones por Problema

### **Problema 1: No hay motores TTS**
**Solución:**
- Instalar "Google Text-to-Speech" desde Google Play Store
- O usar otro motor TTS compatible

### **Problema 2: No hay voces instaladas**
**Solución:**
1. Configuración > Sistema > Accesibilidad > Texto a voz
2. Preferencias de motor > Instalar datos de voz
3. Descargar español

### **Problema 3: No hay voces en español**
**Solución:**
- Instalar voces en español desde las preferencias del motor TTS
- O aceptar que use la voz por defecto del sistema

### **Problema 4: Volumen silenciado**
**Solución:**
- Aumentar volumen multimedia
- Verificar modo "No molestar"
- Verificar que la app tenga permisos de audio

### **Problema 5: TTS no se inicializa**
**Solución:**
- Verificar logs de inicialización
- Reiniciar la app
- Reiniciar el dispositivo

---

## 📝 Cambios Técnicos Aplicados

### 1. **Llamada síncrona en Android**
```javascript
// ANTES (INCORRECTO)
await Tts.speak(text);

// DESPUÉS (CORRECTO para Android)
Tts.speak(text); // Sin await, esperar eventos
```

### 2. **Espera de eventos**
```javascript
// Esperar hasta 2 segundos para recibir evento tts-start
let eventReceived = false;
const maxWaitTime = 2000;
while (!eventReceived && waited < maxWaitTime) {
  await new Promise(resolve => setTimeout(resolve, 100));
  if (this.speaking) {
    eventReceived = true;
    break;
  }
}
```

### 3. **Diagnóstico automático**
- Si no hay eventos, se ejecuta diagnóstico automático
- Verifica motores, voces, idioma
- Muestra sugerencias al usuario

---

## ✅ Próximos Pasos

1. **Ejecutar el diagnóstico** en la consola
2. **Revisar los logs** para ver qué está fallando
3. **Seguir los pasos de solución** según el problema detectado
4. **Probar de nuevo** después de instalar voces/configurar

---

## 🎯 Resultado Esperado

Después de aplicar las correcciones y verificar que hay voces instaladas:

- ✅ Al presionar el botón 🔊, debe reproducir el audio
- ✅ Los logs deben mostrar `tts-start` y `tts-finish`
- ✅ El usuario debe escuchar el texto hablado

---

## 📞 Si el Problema Persiste

1. Ejecutar el diagnóstico completo
2. Compartir los logs completos
3. Verificar manualmente en el dispositivo:
   - ¿Hay voces instaladas?
   - ¿El volumen está activado?
   - ¿Los permisos están concedidos?



