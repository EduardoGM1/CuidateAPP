# 📊 Análisis Completo: Funciones de Mensajes de Voz

## 📋 Resumen Ejecutivo

Este documento identifica y clasifica todas las funciones relacionadas exclusivamente con el flujo de envío y reproducción de mensajes de voz en la aplicación.

**Total de funciones identificadas:** 47 funciones
- **Frontend:** 37 funciones
- **Backend:** 10 funciones

---

## 🎯 Funciones del Frontend

### 1. Componente: `VoiceRecorder.js`
**Ubicación:** `ClinicaMovil/src/components/chat/VoiceRecorder.js`  
**Propósito:** Componente principal para grabar mensajes de voz y permitir preview antes de enviar.

#### Funciones del Componente:

| Función | Tipo | Propósito |
|---------|------|-----------|
| `cleanup` | `async function` | Limpia recursos al desmontar el componente (timers, audio) |
| `startRecording` | `async function` | Inicia la grabación de audio usando `audioService` |
| `stopRecording` | `async function` | Detiene la grabación y guarda el archivo de audio |
| `playPreview` | `async function` | Reproduce el audio grabado para preview antes de enviar |
| `stopPreview` | `async function` | Detiene la reproducción del preview |
| `cancelRecording` | `async function` | Cancela la grabación y elimina el archivo temporal |
| `handleSend` | `async function` | Sube el archivo de audio al servidor y llama al callback de completado |
| `formatTime` | `function` | Formatea segundos a formato MM:SS para mostrar tiempo |

**Total: 8 funciones**

---

### 2. Componente: `VoicePlayer.js`
**Ubicación:** `ClinicaMovil/src/components/chat/VoicePlayer.js`  
**Propósito:** Componente para reproducir mensajes de voz recibidos.

#### Funciones del Componente:

| Función | Tipo | Propósito |
|---------|------|-----------|
| `generateWaveform` | `useCallback` | Genera datos de waveform visual para el audio |
| `loadProgress` | `async function` | Carga el progreso de reproducción guardado previamente |
| `downloadAudio` | `useCallback` | Descarga y cachea audio desde URL HTTP/HTTPS a almacenamiento local |
| `startPlayback` | `useCallback` | Inicia la reproducción del audio (descarga si es necesario) |
| `stopPlayback` | `useCallback` | Detiene la reproducción del audio |
| `togglePlayback` | `useCallback` | Alterna entre reproducir y pausar |
| `changeSpeed` | `useCallback` | Cambia la velocidad de reproducción (1.0x, 1.5x, 2.0x) |
| `handleWaveformPress` | `useCallback` | Maneja el toque en el waveform para saltar a una posición |
| `handleWaveformLayout` | `useCallback` | Maneja el layout del waveform para calcular ancho |
| `formatTime` | `useCallback` | Formatea segundos a formato MM:SS |

**Total: 10 funciones**

---

### 3. Servicio: `audioService.js`
**Ubicación:** `ClinicaMovil/src/services/audioService.js`  
**Propósito:** Servicio centralizado para grabación y reproducción de audio. Abstrae la complejidad de las librerías nativas.

#### Métodos de la Clase:

| Método | Tipo | Propósito |
|--------|------|-----------|
| `constructor` | `function` | Inicializa el servicio y establece propiedades |
| `_initializeRecorderPlayer` | `function` | Inicializa lazy de `AudioRecorderPlayer` (maneja diferentes export patterns) |
| `startRecording` | `async function` | Inicia la grabación de audio con manejo de permisos |
| `stopRecording` | `async function` | Detiene la grabación y retorna la ruta del archivo |
| `cancelRecording` | `async function` | Cancela la grabación y limpia recursos |
| `playAudio` | `async function` | Reproduce un archivo de audio desde una ruta local o URL |
| `stopPlayback` | `async function` | Detiene la reproducción actual |
| `fileExists` | `async function` | Verifica si un archivo existe en el sistema de archivos |
| `deleteFile` | `async function` | Elimina un archivo del sistema de archivos |
| `cleanup` | `async function` | Limpia todos los recursos de audio (grabación y reproducción) |

**Total: 10 funciones**

---

### 4. Servicio: `audioCacheService.js`
**Ubicación:** `ClinicaMovil/src/services/audioCacheService.js`  
**Propósito:** Servicio para cachear archivos de audio descargados desde el servidor.

#### Métodos de la Clase:

| Método | Tipo | Propósito |
|--------|------|-----------|
| `constructor` | `function` | Inicializa el servicio de cache |
| `initialize` | `async function` | Inicializa el directorio de cache y carga metadata |
| `_getCacheKey` | `function` | Genera una clave única para cachear una URL |
| `_getCachePath` | `function` | Genera la ruta local donde se guardará el archivo cacheado |
| `downloadAndCache` | `async function` | Descarga un archivo de audio desde URL y lo guarda en cache local |
| `getCachedPath` | `async function` | Obtiene la ruta local de un archivo cacheado si existe |
| `_cleanupOldEntries` | `async function` | Limpia entradas antiguas del cache cuando se excede el tamaño máximo |
| `_saveMetadata` | `async function` | Guarda los metadatos del cache en AsyncStorage |
| `cleanupInvalidEntries` | `async function` | Limpia entradas inválidas del cache (HTTP URLs, archivos no existentes) |
| `clearCache` | `async function` | Limpia todo el cache de audio |
| `getCacheStats` | `async function` | Obtiene estadísticas del cache (tamaño, número de archivos) |

**Total: 11 funciones**

---

### 5. API Service: `chatService.js`
**Ubicación:** `ClinicaMovil/src/api/chatService.js`  
**Propósito:** Servicio para comunicación con la API del backend relacionada con mensajes de chat.

#### Funciones Relacionadas con Audio:

| Función | Tipo | Propósito |
|---------|------|-----------|
| `performUploadWithXHR` | `function` | Realiza upload de archivo usando XMLHttpRequest (soporta onUploadProgress) |
| `uploadAudioFile` | `async function` | Sube un archivo de audio al servidor y retorna la URL del archivo subido |
| `enviarMensajeAudio` | `async function` | Envía un mensaje de audio al servidor (crea registro en BD) |

**Total: 3 funciones**

---

### 6. Hook: `useChat.js`
**Ubicación:** `ClinicaMovil/src/hooks/useChat.js`  
**Propósito:** Hook personalizado que maneja la lógica del chat, incluyendo mensajes de voz.

#### Funciones Relacionadas con Audio:

| Función | Tipo | Propósito |
|---------|------|-----------|
| `handleGrabacionCompleta` | `useCallback` | Maneja el callback cuando se completa una grabación de voz (sube y envía) |
| `handleToggleGrabador` | `useCallback` | Alterna la visibilidad del componente VoiceRecorder |

**Total: 2 funciones**

---

## 🔧 Funciones del Backend

### 1. Controlador: `mensajeChat.js`
**Ubicación:** `api-clinica/controllers/mensajeChat.js`  
**Propósito:** Controlador que maneja las peticiones HTTP relacionadas con mensajes de chat.

#### Funciones Relacionadas con Audio:

| Función | Tipo | Propósito |
|---------|------|-----------|
| `uploadAudio` | `async function` | Maneja la subida de archivos de audio (POST /api/mensajes-chat/upload-audio) |
| `uploadAudioMiddleware` | `function` | Middleware de Multer para procesar el archivo de audio en la petición |

**Total: 2 funciones**

---

### 2. Configuración de Multer: `mensajeChat.js` (configuración)
**Ubicación:** `api-clinica/controllers/mensajeChat.js` (líneas 16-50)  
**Propósito:** Configuración de Multer para manejar uploads de archivos de audio.

#### Funciones/Configuraciones:

| Elemento | Tipo | Propósito |
|----------|------|-----------|
| `storage` | `multer.diskStorage` | Configuración de almacenamiento en disco para archivos de audio |
| `fileFilter` | `function` | Filtro que valida que solo se acepten archivos de audio (m4a, mp3, wav, aac) |
| `upload` | `multer instance` | Instancia configurada de Multer para procesar uploads |

**Total: 3 configuraciones/funciones**

---

### 3. Ruta: `mensajeChat.js`
**Ubicación:** `api-clinica/routes/mensajeChat.js`  
**Propósito:** Define las rutas HTTP para los endpoints de mensajes de chat.

#### Rutas Relacionadas con Audio:

| Ruta | Método | Propósito |
|------|--------|-----------|
| `/upload-audio` | `POST` | Endpoint para subir archivos de audio al servidor |

**Total: 1 ruta**

---

### 4. Modelo: `MensajeChat` (uso indirecto)
**Ubicación:** `api-clinica/models/MensajeChat.js`  
**Propósito:** Modelo de Sequelize que representa un mensaje de chat en la base de datos.

#### Campos Relacionados con Audio:

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `mensaje_audio_url` | `STRING` | URL del archivo de audio del mensaje |
| `mensaje_audio_duracion` | `INTEGER` | Duración del audio en segundos |
| `mensaje_audio_transcripcion` | `TEXT` | Transcripción de texto del audio (opcional) |

**Total: 3 campos (uso indirecto, no son funciones)**

---

## 📊 Resumen por Categoría

### Frontend (37 funciones)

| Categoría | Archivo | Cantidad |
|-----------|---------|----------|
| Componente de Grabación | `VoiceRecorder.js` | 8 funciones |
| Componente de Reproducción | `VoicePlayer.js` | 10 funciones |
| Servicio de Audio | `audioService.js` | 10 funciones |
| Servicio de Cache | `audioCacheService.js` | 11 funciones |
| API Service | `chatService.js` | 3 funciones |
| Hook de Chat | `useChat.js` | 2 funciones |

### Backend (10 funciones/configuraciones)

| Categoría | Archivo | Cantidad |
|-----------|---------|----------|
| Controlador | `mensajeChat.js` | 2 funciones |
| Configuración Multer | `mensajeChat.js` | 3 configuraciones |
| Rutas | `mensajeChat.js` | 1 ruta |
| Modelo (campos) | `MensajeChat.js` | 3 campos |

---

## 🔄 Flujo Completo de Envío de Mensajes de Voz

### 1. Grabación (Frontend)
```
Usuario presiona "Iniciar grabación"
  → VoiceRecorder.startRecording()
    → audioService.startRecording()
      → AudioRecorderPlayer.startRecorder()
```

### 2. Detención y Preview (Frontend)
```
Usuario presiona "Detener"
  → VoiceRecorder.stopRecording()
    → audioService.stopRecording()
      → AudioRecorderPlayer.stopRecorder()
      → Retorna ruta del archivo
  → VoiceRecorder.playPreview() (opcional)
    → audioService.playAudio()
```

### 3. Envío (Frontend → Backend)
```
Usuario presiona "Enviar"
  → VoiceRecorder.handleSend()
    → chatService.uploadAudioFile()
      → performUploadWithXHR()
        → POST /api/mensajes-chat/upload-audio
          → mensajeChatController.uploadAudioMiddleware (Multer)
            → mensajeChatController.uploadAudio()
              → Guarda archivo en uploads/audio/
              → Retorna URL del archivo
    → chatService.enviarMensajeAudio()
      → POST /api/mensajes-chat
        → Crea registro en BD con mensaje_audio_url
```

### 4. Reproducción (Frontend)
```
Usuario toca mensaje de audio
  → VoicePlayer.startPlayback()
    → Si es URL HTTP/HTTPS:
      → VoicePlayer.downloadAudio()
        → audioCacheService.getCachedPath() (verifica cache)
        → Si no está cacheado:
          → audioCacheService.downloadAndCache()
            → RNFS.downloadFile() (descarga)
            → Guarda en cache local
    → audioService.playAudio()
      → Sound.load() (react-native-sound)
      → Sound.play()
```

---

## 🎯 Puntos Críticos para Depuración

### 1. **Grabación de Audio**
- **Archivo:** `audioService.js` → `_initializeRecorderPlayer()`
- **Problema conocido:** Inicialización de `AudioRecorderPlayer` puede fallar si el módulo nativo no está listo
- **Funciones relacionadas:** `startRecording()`, `stopRecording()`, `cancelRecording()`

### 2. **Subida de Archivos**
- **Archivo:** `chatService.js` → `uploadAudioFile()`, `performUploadWithXHR()`
- **Problema conocido:** Normalización de rutas en Android (`file://` vs `file:///`)
- **Funciones relacionadas:** `uploadAudioFile()`, `performUploadWithXHR()`

### 3. **Descarga y Cache de Audio**
- **Archivo:** `audioCacheService.js` → `downloadAndCache()`, `getCachedPath()`
- **Problema conocido:** Validación de rutas HTTP vs rutas locales (`file://http://...`)
- **Funciones relacionadas:** `downloadAndCache()`, `getCachedPath()`, `cleanupInvalidEntries()`

### 4. **Reproducción de Audio**
- **Archivo:** `VoicePlayer.js` → `startPlayback()`, `downloadAudio()`
- **Problema conocido:** `react-native-sound` no puede reproducir directamente desde URLs HTTP en Android
- **Funciones relacionadas:** `startPlayback()`, `downloadAudio()`, `audioService.playAudio()`

### 5. **Validación de Rutas**
- **Archivos:** `VoicePlayer.js`, `audioCacheService.js`
- **Problema conocido:** Detección de URLs HTTP en rutas que pueden estar codificadas o con prefijos `file://`
- **Funciones relacionadas:** Todas las que usan `httpPattern = /https?:/i`

---

## 📝 Notas Adicionales

1. **Servicios Auxiliares (no incluidos en el conteo):**
   - `audioFeedbackService.js`: Sonidos de feedback (éxito/error)
   - `hapticService.js`: Vibraciones hápticas
   - `audioProgressService.js`: Guarda progreso de reproducción
   - `logger.js`: Sistema de logging

2. **Componentes Auxiliares (no incluidos en el conteo):**
   - `AudioWaveform.js`: Componente visual de waveform

3. **Dependencias Externas:**
   - `react-native-audio-recorder-player`: Grabación de audio
   - `react-native-sound`: Reproducción de audio
   - `react-native-fs`: Operaciones de sistema de archivos
   - `multer`: Procesamiento de uploads en el backend

---

## ✅ Conclusión

Este análisis identifica **47 funciones/configuraciones** relacionadas exclusivamente con el flujo de mensajes de voz:

- **37 funciones en Frontend** distribuidas en 6 archivos principales
- **10 funciones/configuraciones en Backend** distribuidas en 3 archivos principales

Todas estas funciones trabajan en conjunto para proporcionar un flujo completo de:
1. Grabación de audio
2. Preview antes de enviar
3. Subida al servidor
4. Almacenamiento en base de datos
5. Descarga y cache local
6. Reproducción en el dispositivo

Este documento puede servir como referencia para depuración, optimización y mantenimiento del sistema de mensajes de voz.
