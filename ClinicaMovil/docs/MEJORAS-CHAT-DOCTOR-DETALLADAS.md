# 🎯 Mejoras Chat Doctor - Análisis Detallado

**Fecha:** 2025-11-18  
**Análisis:** Comparación entre requerimientos del proyecto y funcionalidades ya implementadas

---

## ✅ FUNCIONALIDADES YA IMPLEMENTADAS (NO RECOMENDAR)

### 1. ✅ Comunicación Básica
- ✅ Envío de mensajes de texto
- ✅ Envío de mensajes de voz (VoiceRecorder)
- ✅ Reproducción de mensajes de voz (VoicePlayer)
- ✅ Edición de mensajes (handleEditarMensaje)
- ✅ Eliminación de mensajes (handleEliminarMensaje)

### 2. ✅ Tiempo Real
- ✅ WebSocket para actualizaciones instantáneas
- ✅ Notificaciones push
- ✅ Actualización automática de mensajes nuevos
- ✅ Actualización automática de mensajes editados
- ✅ Actualización automática de mensajes eliminados

### 3. ✅ Estados y Feedback
- ✅ Estados de mensaje (enviando, enviado, entregado, leido, error, pendiente)
- ✅ Iconos de estado visuales (⏱️ ✓ ✓✓ ⚠️)
- ✅ Colores de estado (gris, verde, azul, rojo, naranja)
- ✅ Indicador de mensajes no leídos (badge en header)
- ✅ Marcar mensajes como leídos automáticamente
- ✅ Marcar todos como leídos

### 4. ✅ Modo Offline
- ✅ Detección de conexión (NetInfo)
- ✅ Banner de conexión (ConnectionBanner)
- ✅ Cola de mensajes pendientes (offlineService)
- ✅ Sincronización automática al reconectar
- ✅ Reintentar mensajes fallidos

### 5. ✅ UX Básica
- ✅ Pull to refresh
- ✅ Scroll automático al final
- ✅ Long press para opciones (editar/eliminar)
- ✅ Formateo de fechas relativo ("Hace 5 min", "Hoy", etc.)
- ✅ Modal de edición de mensajes
- ✅ Manejo de errores con Alert

---

## 🎯 MEJORAS NECESARIAS - ANÁLISIS DETALLADO

### 🔴 PRIORIDAD CRÍTICA (P0)

---

#### 1. **Información del Paciente en el Header**

**Requerimiento del Proyecto:**
- "Interfaz profesional para doctores con contexto médico completo"
- "Acceso rápido a información del paciente durante la comunicación"

**Problema Actual:**
- El header solo muestra "💬 Chat con Paciente"
- No hay información del paciente visible
- El doctor no tiene contexto médico mientras chatea
- Tiene que salir del chat para ver datos del paciente

**Solución Propuesta:**

**A. Header Mejorado:**
```
┌─────────────────────────────────────────────┐
│ ← [Iniciales] Nombre Completo del Paciente  │
│    📊 Ver Historial  🔍 Buscar               │
│    Última vez: Hace 5 min                    │
└─────────────────────────────────────────────┘
```

**B. Componentes a Añadir:**
1. **Iniciales del Paciente:**
   - Círculo con iniciales (ej: "JP" para Juan Pérez)
   - Color distintivo basado en el ID del paciente
   - NO requiere foto (según requerimientos)

2. **Nombre Completo:**
   - Mostrar: `nombre + apellido_paterno + apellido_materno`
   - Si no hay apellidos, solo nombre
   - Texto truncado si es muy largo (ej: "Juan Pérez G...")

3. **Botón "Ver Historial":**
   - Abre modal/drawer con información médica
   - NO navega fuera del chat (mantiene contexto)
   - Muestra:
     - Últimas 3 citas (fecha, doctor, motivo)
     - Signos vitales recientes (últimos 7 días)
     - Medicamentos actuales (nombre, dosis, frecuencia)
     - Alergias conocidas
     - Diagnósticos recientes (últimos 3)

4. **Indicador de Última Actividad:**
   - "Última vez: Hace X min/horas"
   - "Última vez: Ayer"
   - "Última vez: [Fecha]"
   - Basado en última conexión o último mensaje enviado

**Implementación Técnica:**
- Obtener datos del paciente desde `route.params.paciente` o hacer query a API
- Crear componente `PacienteHeader.js` reutilizable
- Modal/Drawer con `react-native-modal` o `react-native-drawer`
- Llamadas a API: `/api/pacientes/:id/citas`, `/api/pacientes/:id/signos-vitales`, etc.

**Impacto:**
- ⭐⭐⭐⭐⭐ Crítico - Contexto médico esencial
- Mejora la calidad de la comunicación
- Reduce necesidad de cambiar de pantalla

**Tiempo Estimado:** 2-3 días

---

#### 2. **Indicador "Paciente está escribiendo..."**

**Requerimiento del Proyecto:**
- "Usabilidad mejorada para comunicación efectiva"
- "Feedback en tiempo real de actividad del usuario"

**Problema Actual:**
- No hay feedback cuando el paciente está escribiendo
- El doctor no sabe si el paciente está activo
- Puede enviar mensajes cuando el paciente ya está respondiendo

**Solución Propuesta:**

**A. Evento WebSocket:**
- Enviar evento `usuario_escribiendo` cuando el paciente empieza a escribir
- Enviar evento cada 2-3 segundos mientras sigue escribiendo
- Dejar de enviar cuando el paciente deja de escribir por 3 segundos

**B. Visualización:**
```
┌─────────────────────────────┐
│ [Mensaje del paciente]      │
│                             │
│ Paciente está escribiendo...│ ← Indicador animado
└─────────────────────────────┘
```

**C. Implementación:**

**Frontend (ChatDoctor.js - Paciente):**
```javascript
// Enviar evento cuando el usuario escribe
useEffect(() => {
  const typingTimeout = setTimeout(() => {
    if (mensajeTexto.length > 0 && isConnected) {
      sendEvent('usuario_escribiendo', {
        id_paciente: pacienteId,
        remitente: 'Paciente'
      });
    }
  }, 500); // Esperar 500ms antes de enviar

  return () => clearTimeout(typingTimeout);
}, [mensajeTexto]);
```

**Frontend (ChatPaciente.js - Doctor):**
```javascript
// Recibir evento y mostrar indicador
const [escribiendo, setEscribiendo] = useState(false);
const typingTimeoutRef = useRef(null);

useEffect(() => {
  const unsubscribe = subscribeToEvent('usuario_escribiendo', (data) => {
    if (data.id_paciente === pacienteId && data.remitente === 'Paciente') {
      setEscribiendo(true);
      
      // Limpiar timeout anterior
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Ocultar después de 3 segundos
      typingTimeoutRef.current = setTimeout(() => {
        setEscribiendo(false);
      }, 3000);
    }
  });

  return () => {
    unsubscribe();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
}, [subscribeToEvent, pacienteId]);
```

**Backend:**
- Ya existe el evento `usuario_escribiendo` en WebSocket
- Solo necesita propagarse correctamente

**UI Component:**
```javascript
{escribiendo && (
  <View style={styles.typingIndicator}>
    <Text style={styles.typingText}>
      Paciente está escribiendo...
    </Text>
    <ActivityIndicator size="small" color="#999" />
  </View>
)}
```

**Impacto:**
- ⭐⭐⭐⭐ Alta - Mejora experiencia de conversación
- Reduce ansiedad del doctor
- Feedback profesional

**Tiempo Estimado:** 1 día

---

#### 3. **Agrupación de Mensajes por Fecha**

**Requerimiento del Proyecto:**
- "Navegación profesional y organizada"
- "Acceso eficiente a conversaciones históricas"

**Problema Actual:**
- Todos los mensajes se muestran sin agrupar
- Difícil navegar conversaciones largas
- No hay separadores visuales
- No se puede identificar fácilmente cuándo fue cada mensaje

**Solución Propuesta:**

**A. Agrupación:**
- Agrupar mensajes del mismo día
- Mostrar separador de fecha entre grupos
- Formato de fecha:
  - "Hoy" - Para mensajes de hoy
  - "Ayer" - Para mensajes de ayer
  - "15 Nov 2025" - Para mensajes anteriores

**B. Visualización:**
```
┌─────────────────────────────┐
│ ──── Hoy ────               │ ← Separador
│                             │
│ [Mensaje 1]                 │
│ [Mensaje 2]                 │
│                             │
│ ──── Ayer ────              │ ← Separador
│                             │
│ [Mensaje 3]                 │
│ [Mensaje 4]                 │
└─────────────────────────────┘
```

**C. Implementación:**

**Función de Agrupación:**
```javascript
const agruparMensajesPorFecha = (mensajes) => {
  const grupos = [];
  let grupoActual = null;

  mensajes.forEach((mensaje) => {
    const fecha = new Date(mensaje.fecha_envio);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    let fechaLabel = '';
    if (fecha.toDateString() === hoy.toDateString()) {
      fechaLabel = 'Hoy';
    } else if (fecha.toDateString() === ayer.toDateString()) {
      fechaLabel = 'Ayer';
    } else {
      fechaLabel = fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    if (!grupoActual || grupoActual.fecha !== fechaLabel) {
      grupoActual = {
        fecha: fechaLabel,
        mensajes: []
      };
      grupos.push(grupoActual);
    }

    grupoActual.mensajes.push(mensaje);
  });

  return grupos;
};
```

**Renderizado:**
```javascript
{agruparMensajesPorFecha(mensajes).map((grupo, grupoIndex) => (
  <View key={grupoIndex}>
    {/* Separador de fecha */}
    <View style={styles.dateSeparator}>
      <View style={styles.dateSeparatorLine} />
      <Text style={styles.dateSeparatorText}>{grupo.fecha}</Text>
      <View style={styles.dateSeparatorLine} />
    </View>

    {/* Mensajes del grupo */}
    {grupo.mensajes.map((mensaje) => (
      <MensajeBubble key={mensaje.id_mensaje} mensaje={mensaje} />
    ))}
  </View>
))}
```

**Estilos:**
```javascript
dateSeparator: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 16,
  paddingHorizontal: 16,
},
dateSeparatorLine: {
  flex: 1,
  height: 1,
  backgroundColor: '#E0E0E0',
},
dateSeparatorText: {
  marginHorizontal: 12,
  fontSize: 12,
  color: '#999',
  fontWeight: '600',
},
```

**Impacto:**
- ⭐⭐⭐⭐ Alta - Navegación profesional
- Facilita encontrar mensajes antiguos
- Mejora la organización visual

**Tiempo Estimado:** 1 día

---

### 🟡 PRIORIDAD ALTA (P1)

---

#### 4. **Estados de Lectura Más Detallados**

**Requerimiento del Proyecto:**
- "Seguimiento de comunicación médica"
- "Confirmación de recepción y lectura de mensajes"

**Problema Actual:**
- Muestra estados básicos (enviando, enviado, leido, error)
- No diferencia claramente entre "entregado" y "leído"
- El color azul para "leído" ya existe pero podría ser más claro
- No hay tooltip o información adicional

**Solución Propuesta:**

**A. Estados Mejorados:**
- ⏱️ **Enviando** (gris) - Mensaje en cola local
- ✓ **Enviado** (gris) - Llegó al servidor
- ✓✓ **Entregado** (verde) - Llegó al dispositivo del paciente
- ✓✓ **Leído** (azul) - El paciente abrió/leyó el mensaje
- ⚠️ **Error** (rojo) - No se pudo enviar

**B. Implementación:**

**Backend - Nuevos Campos (si no existen):**
- `fecha_entrega` - Cuando llegó al dispositivo
- `fecha_lectura` - Cuando el paciente lo leyó

**Frontend - Mejora Visual:**
```javascript
const getEstadoMensaje = (mensaje) => {
  if (mensaje.estado === 'error') return { icono: '⚠️', color: '#F44336', texto: 'Error' };
  if (mensaje.estado === 'enviando') return { icono: '⏱️', color: '#999', texto: 'Enviando' };
  if (mensaje.estado === 'pendiente') return { icono: '⏱️', color: '#FF9800', texto: 'Pendiente' };
  
  if (mensaje.fecha_lectura) {
    return { icono: '✓✓', color: '#2196F3', texto: 'Leído' };
  }
  if (mensaje.fecha_entrega) {
    return { icono: '✓✓', color: '#4CAF50', texto: 'Entregado' };
  }
  if (mensaje.estado === 'enviado') {
    return { icono: '✓', color: '#999', texto: 'Enviado' };
  }
  
  return { icono: '✓', color: '#999', texto: 'Enviado' };
};
```

**Tooltip al hacer tap:**
```javascript
<TouchableOpacity
  onPress={() => {
    Alert.alert(
      'Estado del mensaje',
      `Estado: ${estado.texto}\n` +
      `Enviado: ${formatearFecha(mensaje.fecha_envio)}\n` +
      (mensaje.fecha_entrega ? `Entregado: ${formatearFecha(mensaje.fecha_entrega)}\n` : '') +
      (mensaje.fecha_lectura ? `Leído: ${formatearFecha(mensaje.fecha_lectura)}` : '')
    );
  }}
>
  <Text style={[styles.estadoIcono, { color: estado.color }]}>
    {estado.icono}
  </Text>
</TouchableOpacity>
```

**Impacto:**
- ⭐⭐⭐ Media-Alta - Mejora seguimiento médico
- Confianza en la comunicación
- Información más precisa

**Tiempo Estimado:** 1-2 días (depende si backend ya tiene los campos)

---

#### 5. **Plantillas de Mensajes Rápidos**

**Requerimiento del Proyecto:**
- "Eficiencia en comunicación médica"
- "Reducción de tiempo en mensajes frecuentes"

**Problema Actual:**
- Los doctores escriben mensajes comunes repetidamente
- No hay forma de guardar mensajes frecuentes
- Tiempo perdido escribiendo lo mismo

**Solución Propuesta:**

**A. Sistema de Plantillas:**
- Botón de plantillas en el input (icono 📝)
- Modal con lista de plantillas
- Plantillas predefinidas:
  - "¿Cómo te sientes hoy?"
  - "Recuerda tomar tu medicamento [nombre]"
  - "Tu cita es el [fecha] a las [hora]"
  - "Por favor, comparte tus signos vitales"
  - "¿Tienes alguna duda sobre tu tratamiento?"
  - "¿Has notado algún cambio en tus síntomas?"
- Permitir crear plantillas personalizadas
- Guardar en AsyncStorage

**B. Implementación:**

**Componente de Plantillas:**
```javascript
const [mostrarPlantillas, setMostrarPlantillas] = useState(false);
const [plantillas, setPlantillas] = useState([
  { id: 1, nombre: 'Saludo', texto: '¿Cómo te sientes hoy?' },
  { id: 2, nombre: 'Medicamento', texto: 'Recuerda tomar tu medicamento' },
  { id: 3, nombre: 'Cita', texto: 'Tu cita es el [fecha] a las [hora]' },
  { id: 4, nombre: 'Signos Vitales', texto: 'Por favor, comparte tus signos vitales' },
]);

const handleSeleccionarPlantilla = (plantilla) => {
  // Reemplazar variables si existen
  let texto = plantilla.texto;
  if (texto.includes('[fecha]')) {
    // Obtener próxima cita del paciente
    // texto = texto.replace('[fecha]', proximaCita.fecha);
  }
  if (texto.includes('[hora]')) {
    // texto = texto.replace('[hora]', proximaCita.hora);
  }
  
  setMensajeTexto(texto);
  setMostrarPlantillas(false);
  // Focus en el input
};
```

**UI:**
```javascript
{/* Botón de plantillas */}
<TouchableOpacity
  style={styles.plantillaButton}
  onPress={() => setMostrarPlantillas(true)}
>
  <Text style={styles.plantillaButtonText}>📝</Text>
</TouchableOpacity>

{/* Modal de plantillas */}
<Modal
  visible={mostrarPlantillas}
  transparent={true}
  animationType="slide"
>
  <View style={styles.plantillaModal}>
    <View style={styles.plantillaContent}>
      <Text style={styles.plantillaTitle}>Plantillas de Mensajes</Text>
      
      <ScrollView>
        {plantillas.map((plantilla) => (
          <TouchableOpacity
            key={plantilla.id}
            style={styles.plantillaItem}
            onPress={() => handleSeleccionarPlantilla(plantilla)}
          >
            <Text style={styles.plantillaNombre}>{plantilla.nombre}</Text>
            <Text style={styles.plantillaTexto}>{plantilla.texto}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.plantillaClose}
        onPress={() => setMostrarPlantillas(false)}
      >
        <Text>Cerrar</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

**Guardar Plantillas Personalizadas:**
```javascript
// Guardar en AsyncStorage
const guardarPlantilla = async (nombre, texto) => {
  const nuevasPlantillas = [...plantillas, { id: Date.now(), nombre, texto }];
  setPlantillas(nuevasPlantillas);
  await AsyncStorage.setItem('plantillas_chat', JSON.stringify(nuevasPlantillas));
};

// Cargar al iniciar
useEffect(() => {
  const cargarPlantillas = async () => {
    const guardadas = await AsyncStorage.getItem('plantillas_chat');
    if (guardadas) {
      setPlantillas(JSON.parse(guardadas));
    }
  };
  cargarPlantillas();
}, []);
```

**Impacto:**
- ⭐⭐⭐⭐ Alta - Ahorro de tiempo significativo
- Eficiencia en comunicación
- Mensajes más consistentes

**Tiempo Estimado:** 2 días

---

#### 6. **Búsqueda en el Historial de Conversación**

**Requerimiento del Proyecto:**
- "Acceso a información histórica"
- "Búsqueda eficiente en conversaciones largas"

**Problema Actual:**
- No hay forma de buscar mensajes antiguos
- Difícil encontrar información específica
- Tiene que hacer scroll manualmente

**Solución Propuesta:**

**A. Funcionalidad de Búsqueda:**
- Botón de búsqueda en el header (🔍)
- Input de búsqueda que aparece al hacer tap
- Búsqueda en tiempo real mientras escribe
- Resaltar términos encontrados
- Scroll automático al mensaje encontrado
- Contador de resultados (ej: "3 resultados encontrados")

**B. Implementación:**

**Estado y Funciones:**
```javascript
const [buscando, setBuscando] = useState(false);
const [terminoBusqueda, setTerminoBusqueda] = useState('');
const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
const [indiceResultado, setIndiceResultado] = useState(0);

const buscarMensajes = (termino) => {
  if (!termino.trim()) {
    setResultadosBusqueda([]);
    return;
  }

  const resultados = mensajes.filter((mensaje) => {
    const texto = mensaje.mensaje_texto?.toLowerCase() || '';
    const transcripcion = mensaje.mensaje_audio_transcripcion?.toLowerCase() || '';
    const busqueda = termino.toLowerCase();
    
    return texto.includes(busqueda) || transcripcion.includes(busqueda);
  });

  setResultadosBusqueda(resultados);
  setIndiceResultado(0);
  
  // Scroll al primer resultado
  if (resultados.length > 0) {
    scrollToMensaje(resultados[0].id_mensaje);
  }
};

const scrollToMensaje = (mensajeId) => {
  // Implementar scroll al mensaje específico
  // Puede requerir refs a cada mensaje o usar scrollToOffset
};
```

**UI:**
```javascript
{/* Botón de búsqueda en header */}
<TouchableOpacity
  style={styles.searchButton}
  onPress={() => setBuscando(!buscando)}
>
  <Text style={styles.searchButtonText}>🔍</Text>
</TouchableOpacity>

{/* Input de búsqueda */}
{buscando && (
  <View style={styles.searchContainer}>
    <TextInput
      style={styles.searchInput}
      placeholder="Buscar en conversación..."
      value={terminoBusqueda}
      onChangeText={(text) => {
        setTerminoBusqueda(text);
        buscarMensajes(text);
      }}
      autoFocus
    />
    {terminoBusqueda && (
      <Text style={styles.searchResults}>
        {resultadosBusqueda.length} resultado{resultadosBusqueda.length !== 1 ? 's' : ''}
      </Text>
    )}
    <TouchableOpacity
      style={styles.searchClose}
      onPress={() => {
        setBuscando(false);
        setTerminoBusqueda('');
        setResultadosBusqueda([]);
      }}
    >
      <Text>✕</Text>
    </TouchableOpacity>
  </View>
)}

{/* Resaltar términos en mensajes */}
{mensajes.map((mensaje) => {
  const texto = mensaje.mensaje_texto || '';
  const partes = terminoBusqueda 
    ? texto.split(new RegExp(`(${terminoBusqueda})`, 'gi'))
    : [texto];
  
  return (
    <View key={mensaje.id_mensaje}>
      {partes.map((parte, index) => {
        const esResaltado = parte.toLowerCase() === terminoBusqueda.toLowerCase();
        return (
          <Text
            key={index}
            style={esResaltado ? styles.textoResaltado : styles.textoNormal}
          >
            {parte}
          </Text>
        );
      })}
    </View>
  );
})}
```

**Impacto:**
- ⭐⭐⭐ Media-Alta - Útil para conversaciones largas
- Acceso rápido a información
- Mejora productividad

**Tiempo Estimado:** 2 días

---

### 🟢 PRIORIDAD MEDIA (P2)

---

#### 7. **Copiar Mensaje**

**Problema Actual:**
- No se puede copiar texto de mensajes
- Funcionalidad estándar esperada en chats

**Solución Propuesta:**
- Opción "Copiar" en el menú de long press
- Usar `Clipboard` de React Native
- Copiar texto completo del mensaje
- Feedback visual al copiar (Toast o Alert breve)

**Implementación:**
```javascript
import { Clipboard } from '@react-native-clipboard/clipboard';

const handleCopiarMensaje = async (mensaje) => {
  const texto = mensaje.mensaje_texto || mensaje.mensaje_audio_transcripcion || '';
  await Clipboard.setString(texto);
  Alert.alert('Copiado', 'Mensaje copiado al portapapeles');
  setMostrarModalOpciones(false);
};
```

**Impacto:**
- ⭐⭐ Baja-Media - Funcionalidad estándar
- Útil ocasionalmente

**Tiempo Estimado:** 0.5 días

---

#### 8. **Acceso Rápido al Historial Médico (Modal/Drawer)**

**Requerimiento del Proyecto:**
- "Contexto médico completo durante la comunicación"
- "Acceso rápido a información del paciente"

**Problema Actual:**
- El doctor tiene que salir del chat para ver el historial
- Se pierde el contexto de la conversación
- Múltiples navegaciones necesarias

**Solución Propuesta:**

**A. Modal/Drawer con Información Médica:**
- Botón "Ver Historial" en el header (junto a información del paciente)
- Modal que se abre desde el lado derecho o como overlay
- Muestra:
  - **Últimas Citas:**
    - Fecha, hora, doctor, motivo
    - Estado (confirmada, completada, cancelada)
    - Botón para ver detalles completos
  - **Signos Vitales Recientes:**
    - Últimos 7 días
    - Glucosa, presión, peso, IMC
    - Gráfica simple si es posible
  - **Medicamentos Actuales:**
    - Nombre, dosis, frecuencia
    - Fecha de inicio
    - Próxima dosis
  - **Alergias:**
    - Lista de alergias conocidas
  - **Diagnósticos Recientes:**
    - Últimos 3 diagnósticos
    - Fecha, descripción

**B. Implementación:**

**Componente:**
```javascript
const [mostrarHistorial, setMostrarHistorial] = useState(false);
const [datosHistorial, setDatosHistorial] = useState({
  citas: [],
  signosVitales: [],
  medicamentos: [],
  alergias: [],
  diagnosticos: []
});

const cargarHistorial = async () => {
  try {
    const [citas, signos, medicamentos, alergias, diagnosticos] = await Promise.all([
      api.get(`/api/pacientes/${pacienteId}/citas?limit=3`),
      api.get(`/api/pacientes/${pacienteId}/signos-vitales?dias=7`),
      api.get(`/api/pacientes/${pacienteId}/medicamentos?activos=true`),
      api.get(`/api/pacientes/${pacienteId}/alergias`),
      api.get(`/api/pacientes/${pacienteId}/diagnosticos?limit=3`)
    ]);
    
    setDatosHistorial({
      citas: citas.data,
      signosVitales: signos.data,
      medicamentos: medicamentos.data,
      alergias: alergias.data,
      diagnosticos: diagnosticos.data
    });
  } catch (error) {
    Logger.error('Error cargando historial:', error);
  }
};
```

**UI Modal:**
```javascript
<Modal
  visible={mostrarHistorial}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setMostrarHistorial(false)}
>
  <View style={styles.historialModal}>
    <View style={styles.historialContent}>
      <View style={styles.historialHeader}>
        <Text style={styles.historialTitle}>Historial Médico</Text>
        <TouchableOpacity
          onPress={() => setMostrarHistorial(false)}
        >
          <Text style={styles.historialClose}>✕</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView>
        {/* Últimas Citas */}
        <View style={styles.historialSection}>
          <Text style={styles.historialSectionTitle}>Últimas Citas</Text>
          {datosHistorial.citas.map((cita) => (
            <View key={cita.id_cita} style={styles.historialItem}>
              <Text>{cita.fecha_cita} - {cita.motivo}</Text>
            </View>
          ))}
        </View>
        
        {/* Signos Vitales */}
        <View style={styles.historialSection}>
          <Text style={styles.historialSectionTitle}>Signos Vitales (7 días)</Text>
          {/* Mostrar últimos signos vitales */}
        </View>
        
        {/* Medicamentos */}
        <View style={styles.historialSection}>
          <Text style={styles.historialSectionTitle}>Medicamentos Actuales</Text>
          {/* Lista de medicamentos */}
        </View>
        
        {/* Alergias */}
        <View style={styles.historialSection}>
          <Text style={styles.historialSectionTitle}>Alergias</Text>
          {/* Lista de alergias */}
        </View>
      </ScrollView>
    </View>
  </View>
</Modal>
```

**Impacto:**
- ⭐⭐⭐ Media - Contexto médico completo
- Reduce navegación
- Mejora eficiencia

**Tiempo Estimado:** 3-4 días (depende de APIs disponibles)

---

## ❌ FUNCIONALIDADES QUE NO SE REQUIEREN

### 1. ❌ Avatares/Fotos de Pacientes
- **Razón:** No es requerimiento del proyecto
- **Alternativa:** Usar iniciales en círculo de color

### 2. ❌ Exportar Conversación
- **Razón:** No es requerimiento del proyecto
- **Nota:** Podría ser útil en el futuro pero no es prioridad

### 3. ❌ Estadísticas de Conversación
- **Razón:** No es requerimiento del proyecto
- **Nota:** Analytics opcional, no crítico

### 4. ❌ Adjuntar Imágenes/Documentos
- **Razón:** No es requerimiento del proyecto
- **Nota:** Podría ser útil pero no está en requerimientos

### 5. ❌ Etiquetas/Categorías de Mensajes
- **Razón:** No es requerimiento del proyecto
- **Nota:** Organización avanzada, no necesaria ahora

### 6. ❌ Respuestas Rápidas para Pacientes
- **Razón:** No es requerimiento del proyecto
- **Nota:** Mejora UX del paciente pero no crítico

### 7. ❌ Notificaciones de Urgencia
- **Razón:** No es requerimiento del proyecto
- **Nota:** Podría ser útil pero no está especificado

---

## 📊 RESUMEN FINAL

### 🔴 CRÍTICO (P0) - 3 mejoras:
1. Información del paciente en header
2. Indicador "Paciente está escribiendo..."
3. Agrupación de mensajes por fecha

### 🟡 ALTA (P1) - 3 mejoras:
4. Estados de lectura más detallados
5. Plantillas de mensajes rápidos
6. Búsqueda en historial

### 🟢 MEDIA (P2) - 2 mejoras:
7. Copiar mensaje
8. Acceso rápido al historial médico

**Total:** 8 mejoras recomendadas (excluyendo avatares/fotos y otras no requeridas)

**Tiempo Total Estimado:** 12-15 días de desarrollo


