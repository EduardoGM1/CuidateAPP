# 📋 Estructura del Chat del Doctor

## 📁 Archivo Principal
**`src/screens/doctor/ChatPaciente.js`** (1936 líneas)

---

## 🏗️ Arquitectura General

### **Componente Principal**
```javascript
const ChatPaciente = () => {
  // Componente funcional de React
  // Maneja toda la lógica del chat para doctores
}
```

---

## 📦 Dependencias y Servicios

### **Imports Principales**
```javascript
// React y React Native
- React, useState, useCallback, useEffect, useRef, useMemo
- View, Text, ScrollView, TouchableOpacity, TextInput, etc.
- SafeAreaView, KeyboardAvoidingView, Modal

// Navegación
- useNavigation, useRoute, useFocusEffect

// Contextos y Hooks
- useAuth (autenticación)
- useWebSocket (comunicación en tiempo real)

// Servicios
- chatService (API de mensajes)
- gestionService (API de gestión médica)
- hapticService (feedback háptico)
- audioFeedbackService (feedback de audio)
- offlineService (mensajes offline)
- chatNotificationService (notificaciones push)
- permissionsService (permisos)

// Componentes
- VoiceRecorder (grabación de voz)
- VoicePlayer (reproducción de audio)
- ConnectionBanner (banner de conexión)

// Utilidades
- obtenerIniciales, obtenerNombreCompleto, formatearUltimaActividad, agruparMensajesPorFecha
```

---

## 🗂️ Estados del Componente

### **Estados Principales**
```javascript
// Mensajes y Chat
- mensajes: Array de mensajes
- loading: Estado de carga inicial
- refreshing: Estado de pull-to-refresh
- enviando: Estado de envío de mensaje
- mensajeTexto: Texto del input
- mensajesNoLeidos: Contador de no leídos

// Audio
- grabandoAudio: Estado de grabación
- mostrarGrabador: Mostrar/ocultar grabador

// UI y Modales
- mostrarModalOpciones: Modal de opciones (editar/eliminar)
- mensajeSeleccionado: Mensaje seleccionado para acciones
- editandoMensaje: Estado de edición
- textoEditado: Texto editado

// Datos del Paciente
- pacienteData: Información del paciente
- mostrarHistorial: Mostrar modal de historial
- historialData: Datos del historial médico
- cargandoHistorial: Estado de carga del historial

// Indicadores
- escribiendo: Indicador "Paciente está escribiendo..."
- isOnline: Estado de conexión
- mensajesPendientes: Mensajes en cola offline
```

### **Refs (Referencias)**
```javascript
- pacienteIdRef: Ref para evitar closure stale
- cargarMensajesRef: Ref para función cargarMensajes
- scrollViewRef: Ref del ScrollView
- longPressTimerRef: Timer para long press
- typingTimeoutRef: Timer para indicador "escribiendo"
- typingDebounceRef: Debounce para evento "escribiendo"
```

---

## 🔧 Funcionalidades Principales

### **1. Carga de Datos**

#### **cargarMensajes()**
- Carga la conversación completa
- Obtiene mensajes no leídos
- Marca mensajes como leídos automáticamente
- Sincroniza mensajes pendientes

#### **cargarDatosPaciente()**
- Obtiene información del paciente
- Carga datos para mostrar en el header

#### **cargarHistorialMedico()**
- Carga citas recientes (últimas 3)
- Carga signos vitales (últimos 7 días)
- Carga medicamentos actuales
- Carga alergias
- Carga diagnósticos recientes

---

### **2. Envío de Mensajes**

#### **enviarMensaje()**
- Envía mensajes de texto
- Maneja estados: enviando → enviado → leído
- Sincroniza con servidor
- Maneja modo offline (cola de mensajes)

#### **handleGrabacionCompleta()**
- Procesa grabación de audio
- Envía mensaje de voz
- Maneja transcripción

---

### **3. Gestión de Mensajes**

#### **handleEditarMensaje()**
- Permite editar mensajes propios
- Actualiza en tiempo real vía WebSocket

#### **handleEliminarMensaje()**
- Elimina mensajes propios
- Actualiza en tiempo real vía WebSocket

#### **handleLeerMensaje()**
- Reproduce mensaje con TTS (si es necesario)
- Marca como leído

---

### **4. Tiempo Real (WebSocket)**

#### **Eventos Suscritos**
```javascript
// Nuevo mensaje
subscribeToEvent('nuevo_mensaje', (data) => {
  // Recarga mensajes cuando llega uno nuevo
})

// Mensaje actualizado
subscribeToEvent('mensaje_actualizado', (data) => {
  // Recarga mensajes cuando se edita
})

// Mensaje eliminado
subscribeToEvent('mensaje_eliminado', (data) => {
  // Recarga mensajes cuando se elimina
})

// Usuario escribiendo
subscribeToEvent('usuario_escribiendo', (data) => {
  // Muestra indicador "Paciente está escribiendo..."
})

// Mensajes marcados como leídos
subscribeToEvent('mensajes_marcados_leidos', (data) => {
  // Recarga cuando el paciente marca como leído
})
```

#### **Eventos Enviados**
```javascript
// Usuario escribiendo
sendEvent('usuario_escribiendo', {
  id_paciente: pacienteId,
  remitente: 'Doctor'
})
```

---

### **5. Notificaciones Push**

#### **chatNotificationService.onNuevoMensaje()**
- Escucha notificaciones push
- Recarga mensajes cuando llega notificación
- Funciona incluso cuando la app está en background

---

### **6. Modo Offline**

#### **offlineService**
- Almacena mensajes pendientes
- Sincroniza automáticamente cuando hay conexión
- Muestra banner de conexión

---

## 🎨 Interfaz de Usuario

### **1. Header Mejorado**

```javascript
<View style={styles.header}>
  {/* Botón Atrás */}
  <TouchableOpacity onPress={navigation.goBack}>
    ← Atrás
  </TouchableOpacity>
  
  {/* Información del Paciente */}
  <View style={styles.pacienteInfoContainer}>
    {/* Avatar con Iniciales */}
    <View style={styles.pacienteAvatar}>
      {obtenerIniciales(pacienteData)}
    </View>
    
    {/* Nombre Completo */}
    <Text>{obtenerNombreCompleto(pacienteData)}</Text>
    
    {/* Última Actividad */}
    <Text>Última vez: {formatearUltimaActividad(...)}</Text>
  </View>
  
  {/* Botones de Acción */}
  <View style={styles.headerActions}>
    {/* Botón Historial Médico */}
    <TouchableOpacity onPress={cargarHistorialMedico}>
      📊
    </TouchableOpacity>
    
    {/* Badge de No Leídos */}
    {mensajesNoLeidos > 0 && (
      <View style={styles.badgeContainer}>
        <Text>{mensajesNoLeidos}</Text>
      </View>
    )}
  </View>
</View>
```

---

### **2. Banner de Conexión**

```javascript
<ConnectionBanner 
  pendingMessages={mensajesPendientes.length}
  onRetry={sincronizarMensajesPendientes}
/>
```

---

### **3. Lista de Mensajes**

#### **Agrupación por Fecha**
```javascript
agruparMensajesPorFecha(mensajes).map((grupo) => (
  <View>
    {/* Separador de Fecha */}
    <View style={styles.dateSeparator}>
      <Text>{grupo.fecha}</Text> {/* "Hoy", "Ayer", o fecha */}
    </View>
    
    {/* Mensajes del Grupo */}
    {grupo.mensajes.map((mensaje) => (
      <MensajeBubble />
    ))}
  </View>
))
```

#### **Burbuja de Mensaje**
```javascript
<TouchableOpacity style={styles.mensajeBubble}>
  {/* Contenido */}
  {mensaje.mensaje_texto ? (
    <Text>{mensaje.mensaje_texto}</Text>
  ) : mensaje.mensaje_audio_url ? (
    <VoicePlayer audioUrl={...} />
  ) : (
    <Text>🎤 Mensaje de voz</Text>
  )}
  
  {/* Footer */}
  <View style={styles.mensajeFooter}>
    <Text>{formatearFecha(mensaje.fecha_envio)}</Text>
    {/* Estado del mensaje (solo para doctor) */}
    {esDoctor && (
      <Text style={estadoColor}>
        {estadoIconos[estado]} {/* ✓, ✓✓, ⏱️, ⚠️ */}
      </Text>
    )}
  </View>
  
  {/* Badge de No Leído (solo para paciente) */}
  {!mensaje.leido && !esDoctor && (
    <View style={styles.noLeidoBadge} />
  )}
</TouchableOpacity>
```

#### **Estados de Mensaje**
- **⏱️ Enviando**: Mensaje en proceso
- **✓ Enviado**: Mensaje enviado (gris)
- **✓✓ Entregado**: Mensaje entregado (verde)
- **✓✓ Leído**: Mensaje leído (azul)
- **⚠️ Error**: Error al enviar (rojo)
- **⏱️ Pendiente**: En cola offline (naranja)

---

### **4. Indicador "Paciente está escribiendo..."**

```javascript
{escribiendo && (
  <View style={styles.typingIndicator}>
    <Text>Paciente está escribiendo...</Text>
    <ActivityIndicator />
  </View>
)}
```

---

### **5. Input de Mensaje**

```javascript
<View style={styles.inputContainer}>
  {/* Botón de Audio */}
  <TouchableOpacity onPress={handleToggleGrabador}>
    🎤
  </TouchableOpacity>
  
  {/* Input de Texto */}
  <TextInput
    placeholder="Escribe un mensaje..."
    value={mensajeTexto}
    onChangeText={(text) => {
      setMensajeTexto(text);
      // Enviar evento "escribiendo..." con debounce
      sendEvent('usuario_escribiendo', {...});
    }}
  />
  
  {/* Botón Enviar */}
  <TouchableOpacity onPress={enviarMensaje}>
    {enviando ? <ActivityIndicator /> : 'Enviar'}
  </TouchableOpacity>
</View>
```

---

### **6. Modal de Historial Médico**

```javascript
<Modal visible={mostrarHistorial}>
  <View>
    {/* Citas Recientes */}
    <Text>📅 Citas Recientes</Text>
    {historialData.citas.map(cita => (
      <View>
        <Text>{cita.fecha_cita}</Text>
        <Text>{cita.motivo}</Text>
      </View>
    ))}
    
    {/* Signos Vitales */}
    <Text>📊 Signos Vitales (7 días)</Text>
    {historialData.signosVitales.map(signo => (
      <View>
        <Text>{signo.fecha_medicion}</Text>
        <Text>Presión: {signo.presion_sistolica}/{signo.presion_diastolica}</Text>
      </View>
    ))}
    
    {/* Medicamentos */}
    <Text>💊 Medicamentos Actuales</Text>
    {historialData.medicamentos.map(med => (
      <View>
        <Text>{med.nombre}</Text>
        <Text>Dosis: {med.dosis}</Text>
      </View>
    ))}
    
    {/* Alergias */}
    <Text>⚠️ Alergias</Text>
    {historialData.alergias.map(alergia => (
      <Text>{alergia.nombre}</Text>
    ))}
    
    {/* Diagnósticos */}
    <Text>🔬 Diagnósticos Recientes</Text>
    {historialData.diagnosticos.map(diag => (
      <View>
        <Text>{diag.fecha_diagnostico}</Text>
        <Text>{diag.diagnostico}</Text>
      </View>
    ))}
  </View>
</Modal>
```

---

### **7. Modal de Opciones (Editar/Eliminar)**

```javascript
<Modal visible={mostrarModalOpciones}>
  <View>
    {/* Editar */}
    <TouchableOpacity onPress={handleEditarMensaje}>
      ✏️ Editar
    </TouchableOpacity>
    
    {/* Eliminar */}
    <TouchableOpacity onPress={handleEliminarMensaje}>
      🗑️ Eliminar
    </TouchableOpacity>
  </View>
</Modal>
```

---

## 🔄 Flujo de Datos

### **Carga Inicial**
```
1. Componente se monta
2. useFocusEffect ejecuta:
   - cargarMensajes()
   - cargarDatosPaciente()
3. Se suscribe a eventos WebSocket
4. Se suscribe a notificaciones push
```

### **Envío de Mensaje**
```
1. Usuario escribe texto
2. onChangeText → Envía evento "usuario_escribiendo"
3. Usuario presiona "Enviar"
4. enviarMensaje():
   - setEnviando(true)
   - Crea mensaje local (estado: "enviando")
   - Envía a API
   - Actualiza estado: "enviado"
   - WebSocket emite "nuevo_mensaje"
   - Otros dispositivos reciben y actualizan
```

### **Recepción de Mensaje**
```
1. WebSocket recibe "nuevo_mensaje"
2. Verifica que sea para este paciente
3. Recarga mensajes (cargarMensajesRef.current(false))
4. Scroll automático al final
5. Haptic feedback
```

### **Actualización/Eliminación**
```
1. WebSocket recibe "mensaje_actualizado" o "mensaje_eliminado"
2. Verifica que sea para este paciente
3. Recarga mensajes (delay 300ms)
4. UI se actualiza automáticamente
```

---

## 🎯 Características Especiales

### **1. Prevención de Closure Stale**
- Usa `useRef` para `pacienteId` y funciones
- Evita problemas con callbacks de WebSocket
- Garantiza acceso a valores actuales

### **2. Agrupación Inteligente**
- Agrupa mensajes por "Hoy", "Ayer" o fecha
- Separadores visuales claros

### **3. Indicador de Escritura**
- Debounce de 500ms
- Timeout automático de 3 segundos
- Solo muestra si el paciente está escribiendo

### **4. Modo Offline**
- Cola de mensajes pendientes
- Sincronización automática
- Banner informativo

### **5. Estados de Mensaje**
- Visualización clara del estado
- Colores diferenciados
- Iconos intuitivos

---

## 📊 Resumen de Componentes

| Componente | Función |
|------------|---------|
| **Header** | Información del paciente, botón historial, badge no leídos |
| **ConnectionBanner** | Estado de conexión y mensajes pendientes |
| **ScrollView** | Lista de mensajes con pull-to-refresh |
| **MensajeBubble** | Burbuja de mensaje individual |
| **VoiceRecorder** | Grabador de audio |
| **VoicePlayer** | Reproductor de audio |
| **InputContainer** | Input de texto y botones |
| **Modal Historial** | Historial médico completo |
| **Modal Opciones** | Editar/eliminar mensaje |

---

## 🔐 Seguridad y Validación

- ✅ Verificación de permisos de micrófono
- ✅ Validación de mensajes vacíos
- ✅ Manejo de errores de red
- ✅ Autenticación vía token
- ✅ Validación de IDs de paciente/doctor

---

## 📱 Responsive y UX

- ✅ KeyboardAvoidingView para iOS/Android
- ✅ Auto-scroll al final del chat
- ✅ Pull-to-refresh
- ✅ Haptic feedback en acciones
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling

---

## 🚀 Optimizaciones

- ✅ useMemo para valores calculados
- ✅ useCallback para funciones
- ✅ useRef para evitar re-renders
- ✅ Debounce en eventos
- ✅ Lazy loading de historial
- ✅ Cache de mensajes

---

Este es el resumen completo de cómo está conformado el chat del doctor. Es una interfaz profesional y completa con todas las funcionalidades necesarias para la comunicación médico-paciente.


