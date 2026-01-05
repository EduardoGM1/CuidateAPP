# 🚀 PLAN DE IMPLEMENTACIÓN COMPLETO - SISTEMA CLÍNICA MÓVIL

**Fecha:** 1 Noviembre 2025  
**Objetivo:** Implementar todas las funcionalidades faltantes (excepto Bluetooth)  
**Prioridad:** Basada en impacto y dependencias

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual vs Objetivo Final

| Categoría | Actual | Objetivo | Gap |
|-----------|--------|----------|-----|
| **Requerimientos Funcionales** | 75% | 100% | 25% |
| **Requerimientos No Funcionales** | 85% | 100% | 15% |
| **Datos de la App** | 98% | 100% | 2% |
| **GENERAL** | **82%** | **100%** | **18%** |

### Tiempo Estimado Total: **8-10 semanas**

---

## 🎯 FASES DE IMPLEMENTACIÓN

## 🔴 FASE 1: INTERFAZ DE PACIENTE SIMPLIFICADA (CRÍTICO)

**Prioridad:** 🔴 CRÍTICA  
**Tiempo Estimado:** 2-3 semanas  
**Dependencias:** Ninguna (base independiente)

### Objetivo
Crear interfaz ultra-simplificada para pacientes rurales con diseño accesible (íconos grandes, TTS, máximo 3-4 opciones por pantalla).

### Tecnologías Recomendadas

#### Frontend:
- ✅ **React Native** (ya en uso)
- ✅ **@react-native-community/tts** - Texto a voz
- ✅ **react-native-haptic-feedback** - Vibración táctil
- ✅ **react-native-sound** - Feedback auditivo
- ✅ **react-native-vector-icons** - Íconos grandes

#### Backend:
- ✅ Ya completo (no requiere cambios)

### Estructura de Archivos a Crear

```
ClinicaMovil/src/
├── screens/
│   └── paciente/                                    [NUEVO]
│       ├── InicioPaciente.js                       [NUEVO]
│       ├── MisDatos.js                             [NUEVO]
│       ├── RegistrarSignosVitales.js               [NUEVO]
│       ├── MisMedicamentos.js                      [NUEVO]
│       ├── MisCitas.js                             [NUEVO]
│       ├── HistorialMedico.js                      [NUEVO]
│       ├── GraficosEvolucion.js                    [NUEVO]
│       ├── ChatDoctor.js                           [NUEVO]
│       └── Configuracion.js                        [NUEVO]
│
├── components/
│   └── paciente/                                    [NUEVO]
│       ├── BigIconButton.js                        [NUEVO] - Botones 80x80px mínimo
│       ├── ValueCard.js                            [NUEVO] - Tarjetas de valores
│       ├── MedicationCard.js                        [NUEVO] - Cards de medicamentos
│       ├── SimpleForm.js                           [NUEVO] - Formularios ultra-simples
│       ├── AlertBanner.js                          [NUEVO] - Alertas visuales grandes
│       ├── VoicePrompt.js                          [NUEVO] - Prompt con TTS
│       └── ColorNavigation.js                      [NUEVO] - Navegación por colores
│
├── services/
│   ├── ttsService.js                               [NUEVO] - Texto a voz
│   ├── hapticService.js                            [NUEVO] - Vibración táctil
│   └── audioFeedbackService.js                     [NUEVO] - Sonidos de feedback
│
└── hooks/
    ├── useTTS.js                                   [NUEVO] - Hook para TTS
    ├── usePacienteData.js                          [NUEVO] - Hook para datos del paciente
    └── usePacienteNavigation.js                    [NUEVO] - Hook de navegación simplificada
```

### Especificaciones de Diseño

#### 1. **InicioPaciente.js** - Pantalla Principal
- **Máximo 4 opciones grandes** (80x80px íconos mínimo)
- **Colores distintivos** por función:
  - 🟢 Verde: Mis Citas
  - 🔴 Rojo: Signos Vitales (urgente)
  - 🔵 Azul: Chat Doctor
  - 🟠 Naranja: Mi Historia
- **TTS automático**: Lee cada opción al tocar
- **Feedback visual**: Animación al presionar
- **Navegación simple**: Solo tocar, sin menús complejos

#### 2. **RegistrarSignosVitales.js** - Formulario Ultra-Simple
- **Un campo a la vez**: Mostrar solo un input por pantalla
- **Instrucciones con TTS**: "Ingresa tu peso en kilogramos"
- **Validación visual**: Verde = correcto, Rojo = revisar
- **Botón grande "Siguiente"**: 60x60px mínimo
- **Progreso visual**: "Paso 2 de 5"
- **Botón "Escuchar"**: Repite instrucciones

#### 3. **MisMedicamentos.js** - Lista Simplificada
- **Cards grandes** con ícono del medicamento
- **Horario destacado**: "8:00 AM" en texto grande
- **Indicador visual**: 🟢 Tomado / 🔴 Pendiente
- **Botón grande "Tomé este medicamento"**
- **TTS**: "Es hora de tomar [nombre medicamento]"

#### 4. **MisCitas.js** - Próximas Citas
- **Cards grandes** por cita
- **Fecha destacada**: "Mañana 10:00 AM"
- **Recordatorio visual**: "Recordatorio: 1 día antes"
- **Botón "Ver detalles"** grande

### Plan de Implementación Detallado

#### Semana 1: Base y Servicios Core

**Día 1-2: Instalación de Dependencias**
```bash
cd ClinicaMovil
npm install @react-native-community/tts
npm install react-native-haptic-feedback
npm install react-native-sound
# Configurar permisos en Android/iOS
```

**Día 3-4: Servicios Base**
- Crear `services/ttsService.js`
  - Función `speak(text, options)` - Texto a voz
  - Función `stop()` - Detener reproducción
  - Idioma: Español mexicano
- Crear `services/hapticService.js`
  - Vibración para feedback táctil
  - Diferentes intensidades (light, medium, heavy)
- Crear `hooks/useTTS.js`
  - Hook para usar TTS fácilmente

**Día 5: Componentes Base**
- Crear `components/paciente/BigIconButton.js`
  - Botón mínimo 80x80px
  - Ícono grande + texto
  - TTS automático al tocar
  - Feedback visual y auditivo

#### Semana 2: Pantallas Principales

**Día 1-2: InicioPaciente.js**
- Pantalla principal con 4 opciones grandes
- Integración de TTS
- Navegación a otras pantallas
- Diseño accesible

**Día 3-4: RegistrarSignosVitales.js**
- Formulario paso a paso
- Un campo a la vez
- Instrucciones con TTS
- Validación visual
- Conexión con backend

**Día 5: MisCitas.js**
- Lista de citas próximas
- Cards grandes y claras
- Integración con `usePacienteMedicalData`

#### Semana 3: Pantallas Secundarias y Finalización

**Día 1-2: MisMedicamentos.js**
- Lista de medicamentos
- Cards grandes con horarios
- Indicador de "tomado/pendiente"
- Botón para marcar como tomado

**Día 3: MisDatos.js + HistorialMedico.js**
- Ver datos personales
- Historial médico simplificado

**Día 4-5: Integración y Testing**
- Integrar todas las pantallas
- Testing de usabilidad
- Ajustes de accesibilidad
- Optimización de TTS

### Criterios de Aceptación

- ✅ Máximo 4 opciones por pantalla principal
- ✅ Íconos mínimo 80x80px
- ✅ TTS funcional en todas las pantallas
- ✅ Feedback visual y auditivo en cada interacción
- ✅ Navegación por colores implementada
- ✅ Formularios ultra-simples (un campo a la vez)
- ✅ Sin menús complejos ni texto extenso

---

## 🔴 FASE 2: SISTEMA DE ALERTAS Y NOTIFICACIONES (CRÍTICO)

**Prioridad:** 🔴 CRÍTICA  
**Tiempo Estimado:** 1.5 semanas  
**Dependencias:** Fase 1 (para frontend de notificaciones)

### Objetivo
Activar sistema de alertas automáticas por valores fuera de rango y recordatorios programados (citas y medicamentos).

### Tecnologías Recomendadas

#### Backend:
- ✅ **node-cron** - Programación de tareas
- ✅ **Firebase Cloud Messaging** (ya configurado)
- ✅ **pushNotificationService.js** (ya existe, solo falta activar)

#### Frontend:
- ✅ **@react-native-community/push-notification-ios** - Notificaciones iOS
- ✅ **react-native-push-notification** - Notificaciones Android
- ✅ **@react-native-community/netinfo** - Detección de red

### Estructura de Archivos a Crear

```
api-clinica/
├── services/
│   ├── alertService.js                            [NUEVO]
│   ├── reminderService.js                         [NUEVO]
│   └── cronJobs.js                                [NUEVO] - Inicializador de cron jobs
│
└── controllers/
    └── alertController.js                         [NUEVO] - Endpoints de alertas

ClinicaMovil/src/
├── services/
│   ├── localNotificationService.js                [NUEVO]
│   └── alertService.js                            [NUEVO]
│
└── hooks/
    └── useNotifications.js                        [NUEVO]
```

### Especificaciones Técnicas

#### 1. **alertService.js** (Backend)

**Rangos de Valores Normales:**
```javascript
const RANGOS_NORMALES = {
  glucosa: { min: 70, max: 100 }, // mg/dL (ayunas)
  presion_sistolica: { min: 90, max: 120 }, // mmHg
  presion_diastolica: { min: 60, max: 80 }, // mmHg
  peso: { min: 50, max: 150 }, // kg (ajustable por paciente)
  imc: { min: 18.5, max: 24.9 }
};
```

**Funcionalidades:**
- Verificar valores al registrar signos vitales
- Alertar si está fuera de rango
- Notificar al paciente, familiar (red de apoyo) y médico
- Clasificar severidad: Leve, Moderada, Crítica

#### 2. **reminderService.js** (Backend)

**Recordatorios de Citas:**
- **1 día antes** a las 9:00 AM
- **3 horas antes** de la cita

**Recordatorios de Medicamentos:**
- **Diarios** según horario del plan de medicación
- **15 minutos antes** del horario

**Tecnología:**
```javascript
import cron from 'node-cron';

// Ejecutar diariamente a las 9:00 AM
cron.schedule('0 9 * * *', async () => {
  await verificarCitasManana();
});

// Ejecutar cada hora
cron.schedule('0 * * * *', async () => {
  await verificarCitasProximas();
  await verificarMedicamentosAhora();
});
```

#### 3. **localNotificationService.js** (Frontend)

**Características:**
- Configurar notificaciones locales
- Sincronizar con notificaciones push del backend
- Sonidos diferentes por tipo de alerta
- Vibración para alertas críticas

### Plan de Implementación Detallado

#### Día 1-2: Backend - Alertas Automáticas

**Crear `api-clinica/services/alertService.js`:**
```javascript
class AlertService {
  verificarSignosVitales(signosVitales, pacienteId) {
    // Verificar cada parámetro
    // Generar alertas si fuera de rango
    // Enviar notificaciones push
  }
  
  async enviarAlerta(pacienteId, tipo, severidad, mensaje) {
    // Notificar paciente
    // Notificar red de apoyo
    // Notificar médico asignado
  }
}
```

**Integrar en `api-clinica/controllers/pacienteMedicalData.js`:**
- Llamar a `alertService.verificarSignosVitales()` después de crear signos vitales

#### Día 3-4: Backend - Recordatorios Programados

**Crear `api-clinica/services/reminderService.js`:**
```javascript
import cron from 'node-cron';

class ReminderService {
  inicializarCronJobs() {
    // Cron job para citas (1 día antes)
    // Cron job para citas (3 horas antes)
    // Cron job para medicamentos (cada hora)
  }
  
  async verificarCitasManana() {
    // Buscar citas mañana
    // Enviar recordatorio a las 9:00 AM
  }
  
  async verificarCitasProximas() {
    // Buscar citas en próximas 3 horas
    // Enviar recordatorio
  }
  
  async verificarMedicamentosAhora() {
    // Buscar medicamentos según horario
    // Enviar recordatorio 15 min antes
  }
}
```

**Crear `api-clinica/services/cronJobs.js`:**
```javascript
import ReminderService from './reminderService.js';

const reminderService = new ReminderService();

// Inicializar al arrancar el servidor
reminderService.inicializarCronJobs();
```

**Integrar en `api-clinica/server.js`:**
```javascript
import './services/cronJobs.js'; // Inicializar cron jobs
```

#### Día 5: Frontend - Notificaciones Locales

**Instalar dependencias:**
```bash
cd ClinicaMovil
npm install react-native-push-notification
npm install @react-native-community/push-notification-ios
```

**Crear `ClinicaMovil/src/services/localNotificationService.js`:**
- Configurar notificaciones locales
- Registrar handlers de notificaciones
- Sincronizar con backend

#### Día 6-7: Frontend - Sistema de Alertas

**Crear `ClinicaMovil/src/services/alertService.js`:**
- Mostrar alertas visuales en la app
- Integrar con notificaciones locales
- Feedback sonoro y táctil para alertas críticas

**Integrar en pantallas de paciente:**
- Banner de alerta en `InicioPaciente.js`
- Indicadores visuales en `RegistrarSignosVitales.js`

#### Día 8-10: Testing y Ajustes

- Testing de alertas automáticas
- Testing de recordatorios programados
- Ajustes de timing y mensajes
- Optimización de notificaciones push

### Criterios de Aceptación

- ✅ Alertas automáticas cuando valores fuera de rango
- ✅ Notificaciones push a paciente, familiar y médico
- ✅ Recordatorio de citas 1 día antes (9:00 AM)
- ✅ Recordatorio de citas 3 horas antes
- ✅ Recordatorio de medicamentos 15 min antes del horario
- ✅ Notificaciones locales en el dispositivo
- ✅ Feedback visual y auditivo para alertas críticas

---

## 🟡 FASE 3: MODO OFFLINE Y SINCRONIZACIÓN (IMPORTANTE)

**Prioridad:** 🟡 IMPORTANTE  
**Tiempo Estimado:** 1 semana  
**Dependencias:** Ninguna (funcionalidad independiente)

### Objetivo
Implementar funcionalidad offline completa: registro de datos sin conexión y sincronización automática al volver online.

### Tecnologías Recomendadas

- ✅ **@react-native-async-storage/async-storage** (ya instalado)
- ✅ **@react-native-community/netinfo** - Detección de red
- ✅ **Redux Persist** (ya instalado) - Persistencia de estado

### Estructura de Archivos a Crear

```
ClinicaMovil/src/
├── services/
│   ├── offlineSyncService.js                      [NUEVO]
│   └── networkDetector.js                         [NUEVO]
│
├── storage/
│   ├── offlineQueue.js                            [NUEVO]
│   └── offlineStorage.js                          [NUEVO]
│
└── hooks/
    └── useOfflineSync.js                          [NUEVO]

api-clinica/
└── routes/
    └── sync.js                                    [NUEVO] - Endpoint de sincronización
```

### Especificaciones Técnicas

#### 1. **offlineQueue.js** - Cola de Acciones Offline

**Estructura:**
```javascript
{
  id: "unique_id",
  action: "CREATE_SIGNO_VITAL",
  data: { ... },
  timestamp: "2025-11-01T10:00:00Z",
  retries: 0,
  status: "pending"
}
```

**Acciones Soportadas:**
- `CREATE_SIGNO_VITAL` - Registrar signos vitales
- `UPDATE_PROFILE` - Actualizar perfil
- `SEND_MESSAGE` - Enviar mensaje (chat)

#### 2. **offlineSyncService.js** - Servicio de Sincronización

**Funcionalidades:**
- Detectar estado de red
- Guardar acciones en cola offline
- Sincronizar automáticamente al volver online
- Manejar conflictos de datos
- Reintentos automáticos (3 intentos máximo)

#### 3. **Endpoint de Sincronización** (Backend)

**Ruta:** `POST /api/sync/offline`

**Body:**
```json
{
  "actions": [
    {
      "id": "action_id",
      "action": "CREATE_SIGNO_VITAL",
      "data": { ... },
      "timestamp": "2025-11-01T10:00:00Z"
    }
  ]
}
```

### Plan de Implementación Detallado

#### Día 1-2: Servicios Base

**Crear `storage/offlineQueue.js`:**
- Funciones: `addAction()`, `getQueue()`, `clearQueue()`
- Persistencia en AsyncStorage

**Crear `services/networkDetector.js`:**
- Detectar estado de conexión
- Listener de cambios de red
- Hook `useNetworkStatus()`

#### Día 3-4: Servicio de Sincronización

**Crear `services/offlineSyncService.js`:**
- Interceptar llamadas API
- Guardar en cola si offline
- Sincronizar automáticamente al volver online
- Manejo de errores y reintentos

#### Día 5: Backend - Endpoint de Sincronización

**Crear `api-clinica/routes/sync.js`:**
- Endpoint para recibir acciones offline
- Procesar múltiples acciones
- Devolver resultados

#### Día 6-7: Integración y Testing

- Integrar en formularios de paciente
- Testing sin conexión
- Testing de sincronización
- Manejo de conflictos

### Criterios de Aceptación

- ✅ Registrar signos vitales sin conexión
- ✅ Guardar datos localmente de forma segura
- ✅ Sincronización automática al volver online
- ✅ Indicador visual de estado offline
- ✅ Cola de acciones funcionando correctamente
- ✅ Reintentos automáticos en caso de error

---

## 🟡 FASE 4: GRÁFICOS DE EVOLUCIÓN Y EXPORTACIÓN (IMPORTANTE)

**Prioridad:** 🟡 IMPORTANTE  
**Tiempo Estimado:** 1.5 semanas  
**Dependencias:** Fase 1 (interfaz de paciente)

### Objetivo
Implementar gráficos de evolución temporal de signos vitales y exportación de datos a PDF/CSV.

### Tecnologías Recomendadas

#### Frontend:
- ✅ **victory-native** (ya instalado) - Gráficos
- ✅ **react-native-svg** (ya instalado) - Gráficos vectoriales

#### Backend:
- ✅ **pdfkit** - Generación de PDF
- ✅ **csv-stringify** - Generación de CSV
- ✅ **nodemailer** (ya instalado) - Envío por email

### Estructura de Archivos a Crear

```
ClinicaMovil/src/
├── screens/
│   └── paciente/
│       └── GraficosEvolucion.js                   [NUEVO]
│
├── components/
│   └── charts/
│       ├── BloodPressureChart.js                 [NUEVO]
│       ├── GlucoseChart.js                       [NUEVO]
│       ├── WeightChart.js                        [NUEVO]
│       └── IMChart.js                            [NUEVO]
│
└── services/
    └── reportService.js                          [NUEVO] - Generación de reportes

api-clinica/
├── services/
│   └── reportService.js                          [NUEVO]
│
└── routes/
    └── reports.js                                [NUEVO]
```

### Especificaciones Técnicas

#### 1. **Gráficos de Evolución** (Frontend)

**Tipos de Gráficos:**
- **Línea temporal** - Evolución de glucosa, presión, peso, IMC
- **Rango de normalidad** - Zona sombreada con valores normales
- **Puntos destacados** - Valores fuera de rango en rojo
- **Selector de período** - Últimos 7 días, 30 días, 6 meses, 1 año

**Tecnología:**
```javascript
import { VictoryLine, VictoryChart, VictoryAxis } from 'victory-native';
```

#### 2. **Exportación de Datos** (Backend)

**Formato PDF:**
- Portada con datos del paciente
- Gráficos de evolución
- Tabla de signos vitales históricos
- Diagnósticos y medicamentos
- Fecha de generación

**Formato CSV:**
- Datos tabulares de signos vitales
- Columnas: Fecha, Peso, Talla, IMC, Presión, Glucosa, etc.
- Compatible con Excel

### Plan de Implementación Detallado

#### Día 1-3: Gráficos de Evolución

**Crear componentes de gráficos:**
- `BloodPressureChart.js` - Gráfico de presión arterial
- `GlucoseChart.js` - Gráfico de glucosa
- `WeightChart.js` - Gráfico de peso
- `IMChart.js` - Gráfico de IMC

**Crear `GraficosEvolucion.js`:**
- Pantalla con múltiples gráficos
- Selector de período
- Navegación entre gráficos

#### Día 4-6: Exportación de Datos

**Backend - Instalar dependencias:**
```bash
cd api-clinica
npm install pdfkit csv-stringify
```

**Crear `api-clinica/services/reportService.js`:**
- Función `generarPDFReporte(pacienteId, periodo)`
- Función `generarCSVReporte(pacienteId, periodo)`
- Función `enviarReportePorEmail(pacienteId, email)`

**Crear `api-clinica/routes/reports.js`:**
- `GET /api/reports/:pacienteId/pdf`
- `GET /api/reports/:pacienteId/csv`
- `POST /api/reports/:pacienteId/send-email`

#### Día 7-10: Integración y Testing

- Integrar gráficos en interfaz de paciente
- Agregar botones de exportación
- Testing de generación de PDF/CSV
- Optimización de rendimiento

### Criterios de Aceptación

- ✅ Gráficos de evolución de glucosa, presión, peso, IMC
- ✅ Selector de período (7 días, 30 días, 6 meses, 1 año)
- ✅ Exportación a PDF con gráficos y datos
- ✅ Exportación a CSV compatible con Excel
- ✅ Envío de reporte por email
- ✅ Zona de valores normales visible en gráficos

---

## 🟢 FASE 5: SISTEMA DE CHAT/MENSAJERÍA (COMPLEMENTARIO)

**Prioridad:** 🟢 COMPLEMENTARIO  
**Tiempo Estimado:** 1 semana  
**Dependencias:** Fase 1 (interfaz de paciente)

### Objetivo
Implementar sistema de mensajería en tiempo real entre pacientes y doctores.

### Tecnologías Recomendadas

#### Backend:
- ✅ **Socket.IO** (ya instalado) - Comunicación en tiempo real
- ✅ **MensajeChat** (modelo ya existe)

#### Frontend:
- ✅ **socket.io-client** (ya instalado)
- ✅ **react-native-gifted-chat** - UI de chat (instalar)

### Estructura de Archivos a Crear

```
api-clinica/
├── routes/
│   └── chat.js                                    [NUEVO]
│
├── controllers/
│   └── chatController.js                          [NUEVO]
│
└── services/
    └── chatService.js                             [NUEVO]

ClinicaMovil/src/
├── screens/
│   ├── paciente/
│   │   └── ChatDoctor.js                          [NUEVO]
│   └── doctor/
│       └── ChatPaciente.js                        [NUEVO]
│
├── components/
│   └── chat/
│       ├── MessageBubble.js                       [NUEVO]
│       └── ChatInput.js                           [NUEVO]
│
└── hooks/
    └── useChat.js                                 [NUEVO]
```

### Plan de Implementación Detallado

#### Día 1-2: Backend - Endpoints de Chat

**Crear `api-clinica/controllers/chatController.js`:**
- `GET /api/chat/conversaciones` - Listar conversaciones
- `GET /api/chat/:conversacionId/mensajes` - Obtener mensajes
- `POST /api/chat/:conversacionId/mensajes` - Enviar mensaje
- `PUT /api/chat/mensajes/:id/leer` - Marcar como leído

**Crear `api-clinica/routes/chat.js`:**
- Rutas con autenticación
- Validación de permisos (paciente solo puede chatear con su doctor)

#### Día 3-4: Backend - WebSocket (Socket.IO)

**Integrar en `api-clinica/server.js`:**
```javascript
import { Server } from 'socket.io';

const io = new Server(server);

io.on('connection', (socket) => {
  socket.on('join-conversation', (conversacionId) => {
    socket.join(conversacionId);
  });
  
  socket.on('send-message', async (data) => {
    // Guardar en BD
    // Emitir a participantes
    io.to(data.conversacionId).emit('new-message', data);
  });
});
```

#### Día 5-7: Frontend - Interfaz de Chat

**Instalar dependencias:**
```bash
cd ClinicaMovil
npm install react-native-gifted-chat
```

**Crear `ChatDoctor.js` (Paciente):**
- Interfaz simplificada
- TTS para leer mensajes
- Botones grandes para enviar
- Indicador de "escribiendo"

**Crear `ChatPaciente.js` (Doctor):**
- Interfaz profesional
- Múltiples conversaciones
- Notificaciones de mensajes nuevos

### Criterios de Aceptación

- ✅ Mensajería en tiempo real con Socket.IO
- ✅ Interfaz simplificada para pacientes
- ✅ Interfaz profesional para doctores
- ✅ Notificaciones de mensajes nuevos
- ✅ Indicador de "leído/no leído"
- ✅ Soporte para mensajes de audio (futuro)

---

## 🟢 FASE 6: CAMPO "AÑOS CON PADECIMIENTO" (COMPLEMENTARIO)

**Prioridad:** 🟢 COMPLEMENTARIO  
**Tiempo Estimado:** 2 días  
**Dependencias:** Ninguna

### Objetivo
Agregar campo "años con padecimiento" a la relación paciente-comorbilidad.

### Cambios Necesarios

#### Backend:

**1. Migración de Base de Datos:**
```sql
ALTER TABLE paciente_comorbilidades 
ADD COLUMN anos_padecimiento INT NULL;
```

**2. Actualizar Modelo:**
```javascript
// api-clinica/models/PacienteComorbilidad.js
anos_padecimiento: {
  type: DataTypes.INTEGER,
  allowNull: true,
  defaultValue: null
}
```

**3. Actualizar Endpoints:**
- `POST /api/pacientes/:id/comorbilidades` - Incluir `anos_padecimiento`
- `PUT /api/pacientes/:id/comorbilidades/:comorbilidadId` - Permitir actualizar

#### Frontend:

**Actualizar `DetallePaciente.js`:**
- Agregar campo en formulario de comorbilidades
- Validar que sea número entero positivo
- Mostrar en historial de comorbilidades

### Plan de Implementación

#### Día 1: Backend
- Crear migración
- Actualizar modelo
- Actualizar endpoints
- Testing

#### Día 2: Frontend
- Actualizar formulario
- Actualizar visualización
- Testing

### Criterios de Aceptación

- ✅ Campo "años con padecimiento" en base de datos
- ✅ Formulario permite ingresar años
- ✅ Validación de número entero positivo
- ✅ Visualización en historial de comorbilidades

---

## 📅 CRONOGRAMA CONSOLIDADO

| Fase | Duración | Inicio | Fin |
|------|----------|--------|-----|
| **FASE 1:** Interfaz de Paciente | 2-3 semanas | Semana 1 | Semana 3 |
| **FASE 2:** Alertas y Notificaciones | 1.5 semanas | Semana 3 | Semana 4-5 |
| **FASE 3:** Modo Offline | 1 semana | Semana 5 | Semana 6 |
| **FASE 4:** Gráficos y Exportación | 1.5 semanas | Semana 6 | Semana 7-8 |
| **FASE 5:** Chat/Mensajería | 1 semana | Semana 8 | Semana 9 |
| **FASE 6:** Campo Años Padecimiento | 2 días | Semana 9 | Semana 9 |

**Tiempo Total:** 8-10 semanas

---

## 🎯 PRIORIZACIÓN POR IMPACTO

### 🔴 CRÍTICO (Implementar Primero)
1. **Interfaz de Paciente** - Funcionalidad fundamental no existe
2. **Sistema de Alertas** - Requerimiento crítico para seguridad del paciente
3. **Recordatorios** - Mejora adherencia al tratamiento

### 🟡 IMPORTANTE (Segunda Prioridad)
4. **Modo Offline** - Necesario para zonas rurales
5. **Gráficos de Evolución** - Visualización de datos importante
6. **Exportación de Datos** - Requerimiento médico

### 🟢 COMPLEMENTARIO (Tercera Prioridad)
7. **Chat/Mensajería** - Mejora comunicación pero no crítico
8. **Campo Años Padecimiento** - Mejora datos pero no crítico

---

## 📦 DEPENDENCIAS NPM A INSTALAR

### Frontend (ClinicaMovil):
```bash
npm install @react-native-community/tts
npm install react-native-haptic-feedback
npm install react-native-sound
npm install react-native-push-notification
npm install @react-native-community/push-notification-ios
npm install @react-native-community/netinfo
npm install react-native-gifted-chat
```

### Backend (api-clinica):
```bash
npm install node-cron
npm install pdfkit
npm install csv-stringify
```

---

## ✅ CHECKLIST FINAL

### Fase 1 - Interfaz de Paciente
- [ ] Instalar dependencias TTS y haptic
- [ ] Crear servicios base (ttsService, hapticService)
- [ ] Crear componentes base (BigIconButton, etc.)
- [ ] Crear pantalla InicioPaciente.js
- [ ] Crear pantalla RegistrarSignosVitales.js
- [ ] Crear pantalla MisCitas.js
- [ ] Crear pantalla MisMedicamentos.js
- [ ] Crear pantalla MisDatos.js
- [ ] Crear pantalla HistorialMedico.js
- [ ] Integrar TTS en todas las pantallas
- [ ] Testing de usabilidad

### Fase 2 - Alertas y Notificaciones
- [ ] Instalar node-cron en backend
- [ ] Crear alertService.js (backend)
- [ ] Crear reminderService.js (backend)
- [ ] Integrar alertas en registro de signos vitales
- [ ] Configurar cron jobs
- [ ] Instalar react-native-push-notification
- [ ] Crear localNotificationService.js (frontend)
- [ ] Integrar notificaciones en app
- [ ] Testing de alertas y recordatorios

### Fase 3 - Modo Offline
- [ ] Crear offlineQueue.js
- [ ] Crear networkDetector.js
- [ ] Crear offlineSyncService.js
- [ ] Crear endpoint de sincronización (backend)
- [ ] Integrar en formularios
- [ ] Testing offline/online

### Fase 4 - Gráficos y Exportación
- [ ] Crear componentes de gráficos (victory-native)
- [ ] Crear pantalla GraficosEvolucion.js
- [ ] Instalar pdfkit y csv-stringify (backend)
- [ ] Crear reportService.js (backend)
- [ ] Crear endpoints de exportación
- [ ] Integrar en interfaz de paciente
- [ ] Testing de exportación

### Fase 5 - Chat/Mensajería
- [ ] Crear endpoints de chat (backend)
- [ ] Integrar Socket.IO
- [ ] Instalar react-native-gifted-chat
- [ ] Crear ChatDoctor.js (paciente)
- [ ] Crear ChatPaciente.js (doctor)
- [ ] Testing de mensajería

### Fase 6 - Campo Años Padecimiento
- [ ] Crear migración de base de datos
- [ ] Actualizar modelo PacienteComorbilidad
- [ ] Actualizar endpoints
- [ ] Actualizar formularios frontend
- [ ] Testing

---

## 🚀 INICIO RÁPIDO

### Para empezar con Fase 1 (Interfaz de Paciente):

```bash
# 1. Instalar dependencias
cd ClinicaMovil
npm install @react-native-community/tts react-native-haptic-feedback react-native-sound

# 2. Crear estructura de carpetas
mkdir -p src/screens/paciente
mkdir -p src/components/paciente
mkdir -p src/services
mkdir -p src/hooks

# 3. Seguir plan día por día
```

---

**Documento creado:** 1 Noviembre 2025  
**Versión:** 1.0  
**Estado:** Plan completo listo para implementación




