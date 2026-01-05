# Documentación Técnica - App Móvil Clínica

## Objetivo

Crear UN SOLO documento técnico completo que sirva como guía integral para el desarrollo de la aplicación móvil React Native. Estructura simplificada para desarrollo por una sola persona, con código en español y buenas prácticas.

## PARTE 1: VISIÓN GENERAL

### Descripción del Proyecto
Aplicación móvil React Native para gestión de clínica médica con dos interfaces completamente diferenciadas:
- **Interfaz Profesional**: Para doctores y administradores con diseño moderno y funcionalidades avanzadas
- **Interfaz Pacientes**: Para pacientes rurales con diseño ultra-simplificado, visual e intuitivo

### Público Objetivo
- **Doctores y Administradores**: Usuarios con conocimiento tecnológico, requieren interfaces complejas
- **Pacientes Rurales**: Usuarios sin experiencia tecnológica, muchos analfabetas, requieren accesibilidad extrema

### Diferenciación Clave
- **UI Profesional**: Tablas, gráficas, formularios detallados, navegación multi-nivel
- **UI Pacientes**: Máximo 4 opciones por pantalla, íconos grandes, audio-first, sin texto complejo

### Tecnologías Principales
- React Native CLI (JavaScript puro, sin TypeScript)
- Redux Toolkit para estado global
- React Navigation para navegación
- Axios + Socket.io para comunicación con backend

## PARTE 2: ARQUITECTURA TÉCNICA

### Stack Tecnológico
- **Frontend**: React Native CLI (JavaScript puro, sin TypeScript)
- **Estado**: Redux Toolkit + Redux Persist
- **Navegación**: React Navigation v6
- **Comunicación**: Axios + Socket.io
- **UI Profesional**: React Native Paper
- **UI Pacientes**: Componentes custom ultra-simples
- **Almacenamiento**: AsyncStorage + react-native-keychain
- **Accesibilidad**: react-native-tts, react-native-audio-recorder-player, react-native-haptic-feedback
- **Gráficas**: react-native-chart-kit
- **Animaciones**: lottie-react-native

### Estructura de Carpetas

```
Backend/react-app/
├── src/
│   ├── api/                 # servicioApi.js, configuracionAxios.js
│   ├── store/              # store.js, authSlice.js, pacienteSlice.js, citaSlice.js
│   ├── navigation/         # NavegacionAuth.js, NavegacionProfesional.js, NavegacionPaciente.js
│   ├── screens/
│   │   ├── auth/          # InicioSesion.js, Registro.js
│   │   ├── professional/  # DashboardDoctor.js, ListaPacientes.js, AgendaCitas.js
│   │   └── patient/       # InicioPaciente.js, MisCitas.js, SignosVitales.js, Chat.js
│   ├── components/
│   │   ├── common/        # Boton.js, Input.js, Tarjeta.js
│   │   ├── professional/  # GraficaSignos.js, TablaHistorial.js, FormularioPaciente.js
│   │   └── patient/       # BotonGrande.js, ReproductorAudio.js, GrabadorVoz.js
│   ├── services/          # servicioTTS.js, servicioAudio.js, servicioNotificaciones.js
│   ├── utils/             # formateadores.js, validadores.js, constantes.js
│   └── assets/           # imagenes/, iconos/, sonidos/
├── __tests__/             # Unit tests
├── android/               # Configuración Android
├── ios/                   # Configuración iOS
└── docs/                  # Documentación
```

### Decisiones Técnicas
- **JavaScript puro**: Más rápido para una persona, sin overhead de tipos
- **Carpetas planas**: Fácil de navegar y mantener
- **Separación clara**: professional/patient en components y screens
- **Servicios**: Para lógica compleja (TTS, audio, notificaciones)
- **Utils**: Para funciones reutilizables simples

## PARTE 3: NAVEGACIÓN

### Diagrama de Flujo

```
App.js
├── Si NO está autenticado → NavegacionAuth
│   ├── InicioSesion.js
│   └── Registro.js
│
└── Si está autenticado → Según rol:
    ├── Rol Admin/Doctor → NavegacionProfesional
    │   ├── Drawer Navigator (menú lateral)
    │   ├── Bottom Tabs (dashboard, pacientes, citas, perfil)
    │   └── Stack para detalles
    │
    └── Rol Paciente → NavegacionPaciente
        └── Stack simple (solo Home → Detalle → Home)
            ├── InicioPaciente.js (4 botones grandes)
            ├── MisCitas.js
            ├── SignosVitales.js
            └── Chat.js
```

### Convenciones de Navegación
- `useNavigation()` hook para navegar
- `navigation.navigate('NombrePantalla', { parametros })`
- Props de navegación en español: `navegacion`, `ruta`

## PARTE 4: DISEÑO UI/UX

### DISEÑO PROFESIONAL (Doctores/Admin)

#### Paleta de Colores
- **Primario**: `#1976D2` (azul médico)
- **Secundario**: `#424242` (gris oscuro)
- **Éxito**: `#4CAF50`
- **Error**: `#F44336`
- **Advertencia**: `#FF9800`
- **Fondo**: `#F5F5F5`

#### Componentes UI
- React Native Paper (Button, Card, TextInput, etc.)
- Material Icons para iconografía
- Tamaños de texto: 14px-18px (normal), 20px-24px (títulos)
- Espaciados: 8px, 16px, 24px

#### Pantallas Principales
1. **Dashboard**: Resumen con estadísticas, gráficas, alertas
2. **Lista Pacientes**: FlatList con búsqueda, filtros
3. **Perfil Paciente**: Tabs (info, historial, signos vitales, citas)
4. **Agenda Citas**: Calendario, lista por día
5. **Chat**: Mensajes en tiempo real, input de texto

### DISEÑO PACIENTES (ULTRA-SIMPLE)

#### Paleta de Colores Simplificada
- **Verde**: `#4CAF50` (bien, todo OK)
- **Amarillo**: `#FFC107` (cuidado, atención)
- **Rojo**: `#F44336` (urgente, peligro)
- **Azul**: `#2196F3` (información, neutral)
- **Blanco**: `#FFFFFF` (fondo)

#### Reglas de Diseño
- Botones mínimo 80x80px
- Texto mínimo 18px (si lo hay)
- Espaciado mínimo 20px entre elementos
- Máximo 4 opciones por pantalla
- Íconos + emojis grandes (40px-60px)
- Sin menús desplegables, sin tabs, sin gestos complejos

#### Wireframes de 4 Pantallas Principales

**1. InicioPaciente.js (Home)**
```
┌─────────────────────────────────┐
│    Hola, [Nombre Paciente]     │
│                                 │
│   [🗓️]                         │
│   MIS CITAS                    │
│   [🔊 Escuchar]                │
│                                 │
│   [💊]                         │
│   CÓMO ME SIENTO               │
│   [🔊 Escuchar]                │
│                                 │
│   [💬]                         │
│   HABLAR CON DOCTOR            │
│   [🔊 Escuchar]                │
│                                 │
│   [🚨]                         │
│   EMERGENCIA                   │
│                                 │
└─────────────────────────────────┘
```

**2. MisCitas.js**
```
┌─────────────────────────────────┐
│    📅 MI PRÓXIMA CITA          │
│                                 │
│         MAÑANA                  │
│       10:00 AM                  │
│                                 │
│     👨‍⚕️ DR. GARCÍA              │
│                                 │
│   [🔊 ESCUCHAR DETALLES]       │
│                                 │
│   [✅ CONFIRMAR]   [❌ CANCELAR] │
│                                 │
│   [← VOLVER]                   │
└─────────────────────────────────┘
```

**3. SignosVitales.js (Formulario)**
```
┌─────────────────────────────────┐
│    ¿CÓMO TE SIENTES HOY?       │
│                                 │
│   😊    😐    😢    🤒          │
│  Bien Regular Mal MuyMal       │
│                                 │
│   [🔊 ESCUCHAR PREGUNTA]       │
│                                 │
│   [🎤 GRABAR CÓMO ME SIENTO]   │
│   (presionar y mantener)        │
│                                 │
│   [✅ ENVIAR]   [❌ CANCELAR]   │
│                                 │
│   [← VOLVER]                   │
└─────────────────────────────────┘
```

**4. Chat.js**
```
┌─────────────────────────────────┐
│    💬 DOCTOR GARCÍA             │
│                                 │
│  🎵 Mensaje del doctor          │
│  [▶ REPRODUCIR]                │
│  Hace 2 horas                   │
│                                 │
│  🎤 Tu mensaje                  │
│  [▶ REPRODUCIR]                │
│  Ayer                           │
│                                 │
│  [🎤 GRABAR MENSAJE]            │
│  (presionar y mantener)         │
│                                 │
│  [← VOLVER]                    │
└─────────────────────────────────┘
```

#### Feedback Visual y Auditivo
- Cada tap: vibración suave + sonido "tap.mp3"
- Acción exitosa: ✓ grande verde + vibración doble + "exito.mp3"
- Error: ✗ grande rojo + vibración fuerte + "error.mp3"
- Grabando audio: onda animada + "grabando.mp3"
- Mensaje recibido: notificación + vibración + "mensaje.mp3"

## PARTE 5: INTEGRACIÓN CON BACKEND

### URL Base
`http://localhost:3000` (desarrollo)

### Mapeo de Endpoints a Pantallas

| Endpoint | Método | Pantalla | Descripción |
|----------|--------|----------|-------------|
| `/api/auth/login` | POST | InicioSesion.js | Login con email/password |
| `/api/auth/register` | POST | Registro.js | Registro de usuario |
| `/api/pacientes` | GET | ListaPacientes.js | Obtener lista de pacientes |
| `/api/pacientes/:id` | GET | PerfilPaciente.js | Detalle de un paciente |
| `/api/citas` | GET | AgendaCitas.js, MisCitas.js | Obtener citas |
| `/api/citas` | POST | AgendarCita.js | Crear nueva cita |
| `/api/signos-vitales` | POST | SignosVitales.js | Registrar signos vitales |
| `/api/signos-vitales/:id_paciente` | GET | HistorialSignos.js | Historial de signos |
| WebSocket `ws://localhost:3000` | - | Chat.js | Mensajes en tiempo real |

### Ejemplos de Requests/Responses

```javascript
// Login
const iniciarSesion = async (email, contrasena) => {
  const respuesta = await axios.post('/api/auth/login', {
    email: email,
    password: contrasena
  });
  // Respuesta: { token: "jwt...", user: { id, email, rol } }
  return respuesta.data;
};

// Registrar Signos Vitales
const registrarSignosVitales = async (datos) => {
  const respuesta = await axios.post('/api/signos-vitales', {
    id_paciente: datos.idPaciente,
    presion_sistolica: datos.presionAlta,
    presion_diastolica: datos.presionBaja,
    frecuencia_cardiaca: datos.pulso,
    temperatura: datos.temperatura,
    glucosa: datos.azucar
  });
  return respuesta.data;
};
```

### Manejo de Errores

```javascript
// Interceptor de Axios para manejar errores globalmente
axios.interceptors.response.use(
  respuesta => respuesta,
  error => {
    if (error.response?.status === 401) {
      // Token expirado: cerrar sesión
      store.dispatch(cerrarSesion());
    } else if (error.response?.status === 500) {
      // Error del servidor: reintentar
      mostrarMensaje('Error del servidor, reintentando...');
    } else if (!error.response) {
      // Sin conexión: guardar en cola offline
      guardarEnColaOffline(error.config);
    }
    return Promise.reject(error);
  }
);
```

## PARTE 6: ACCESIBILIDAD (CRÍTICO PARA PACIENTES)

### Sistema de Texto a Voz (TTS)

#### Librería
`react-native-tts`

#### Configuración

```javascript
// servicioTTS.js
import Tts from 'react-native-tts';

export const inicializarTTS = async () => {
  Tts.setDefaultLanguage('es-MX'); // Español México
  Tts.setDefaultRate(0.8); // Más lento que normal
  Tts.setDefaultPitch(1.0); // Normal
};

export const hablar = async (texto) => {
  try {
    await Tts.speak(texto);
  } catch (error) {
    console.log('Error TTS:', error);
  }
};

export const detener = () => {
  Tts.stop();
};
```

#### Cuándo usar TTS
- Al entrar a una pantalla de paciente: leer el título
- Cuando se enfoca un botón: leer su función
- Confirmaciones: "Cita confirmada correctamente"
- Errores: "Hubo un problema, intenta de nuevo"
- Mensajes del doctor: reproducir el texto completo

#### Componente BotonEscuchar

```javascript
// components/patient/BotonEscuchar.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { hablar } from '../../services/servicioTTS';

const BotonEscuchar = ({ texto }) => {
  const alPresionar = () => {
    hablar(texto);
  };

  return (
    <TouchableOpacity style={estilos.boton} onPress={alPresionar}>
      <Icon name="volume-up" size={30} color="#2196F3" />
      <Text style={estilos.texto}>Escuchar</Text>
    </TouchableOpacity>
  );
};

const estilos = StyleSheet.create({
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10
  },
  texto: {
    fontSize: 18,
    marginLeft: 10,
    color: '#1976D2'
  }
});

export default BotonEscuchar;
```

### Sistema de Notas de Voz

#### Librería
`react-native-audio-recorder-player`

#### Configuración

```javascript
// servicioAudio.js
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const grabador = new AudioRecorderPlayer();

export const iniciarGrabacion = async () => {
  const ruta = await grabador.startRecorder();
  grabador.addRecordBackListener((e) => {
    // Actualizar UI con tiempo de grabación
    console.log('Grabando:', e.currentPosition);
  });
  return ruta;
};

export const detenerGrabacion = async () => {
  const resultado = await grabador.stopRecorder();
  grabador.removeRecordBackListener();
  return resultado;
};

export const reproducirAudio = async (ruta) => {
  await grabador.startPlayer(ruta);
  grabador.addPlayBackListener((e) => {
    if (e.currentPosition === e.duration) {
      grabador.stopPlayer();
    }
  });
};
```

#### Componente GrabadorVoz

```javascript
// components/patient/GrabadorVoz.js
import React, { useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { iniciarGrabacion, detenerGrabacion } from '../../services/servicioAudio';
import { vibrar } from '../../utils/feedback';

const GrabadorVoz = ({ alTerminarGrabacion }) => {
  const [estaGrabando, setEstaGrabando] = useState(false);

  const manejarPresionar = async () => {
    vibrar('suave');
    setEstaGrabando(true);
    await iniciarGrabacion();
  };

  const manejarSoltar = async () => {
    const rutaAudio = await detenerGrabacion();
    setEstaGrabando(false);
    vibrar('doble');
    alTerminarGrabacion(rutaAudio);
  };

  return (
    <TouchableOpacity
      style={[estilos.boton, estaGrabando && estilos.botonGrabando]}
      onPressIn={manejarPresionar}
      onPressOut={manejarSoltar}
    >
      <Icon name="mic" size={60} color="#FFF" />
      <Text style={estilos.texto}>
        {estaGrabando ? 'Suelta para enviar' : 'Mantén presionado'}
      </Text>
    </TouchableOpacity>
  );
};

const estilos = StyleSheet.create({
  boton: {
    backgroundColor: '#2196F3',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    margin: 20
  },
  botonGrabando: {
    backgroundColor: '#F44336'
  },
  texto: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 10
  }
});

export default GrabadorVoz;
```

### Feedback Haptic

#### Librería
`react-native-haptic-feedback`

#### Configuración

```javascript
// utils/feedback.js
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const opciones = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false
};

export const vibrar = (tipo) => {
  switch(tipo) {
    case 'suave':
      ReactNativeHapticFeedback.trigger('impactLight', opciones);
      break;
    case 'medio':
      ReactNativeHapticFeedback.trigger('impactMedium', opciones);
      break;
    case 'fuerte':
      ReactNativeHapticFeedback.trigger('impactHeavy', opciones);
      break;
    case 'doble':
      ReactNativeHapticFeedback.trigger('notificationSuccess', opciones);
      break;
    case 'error':
      ReactNativeHapticFeedback.trigger('notificationError', opciones);
      break;
    case 'alerta':
      ReactNativeHapticFeedback.trigger('notificationWarning', opciones);
      break;
  }
};
```

## PARTE 7: MODO OFFLINE

### Estrategia
1. Cachear datos importantes en AsyncStorage
2. Cola de operaciones pendientes (redux-persist)
3. Sincronización automática al recuperar conexión
4. Indicador visual de estado de conexión

### Implementación

```javascript
// store/store.js
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

const configuracionPersistencia = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'citas', 'signosVitales'] // Solo cachear estos
};

const reductorPersistido = persistReducer(configuracionPersistencia, reducerRaiz);

export const store = configureStore({
  reducer: reductorPersistido,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export const persistor = persistStore(store);
```

### Cola de Operaciones Offline

```javascript
// store/colaOfflineSlice.js
import { createSlice } from '@reduxjs/toolkit';

const colaOfflineSlice = createSlice({
  name: 'colaOffline',
  initialState: {
    operacionesPendientes: []
  },
  reducers: {
    agregarOperacion: (state, action) => {
      state.operacionesPendientes.push({
        id: Date.now(),
        tipo: action.payload.tipo,
        datos: action.payload.datos,
        timestamp: new Date().toISOString()
      });
    },
    eliminarOperacion: (state, action) => {
      state.operacionesPendientes = state.operacionesPendientes.filter(
        op => op.id !== action.payload
      );
    },
    sincronizar: async (state, thunkAPI) => {
      // Ejecutar operaciones pendientes cuando hay conexión
      for (const operacion of state.operacionesPendientes) {
        try {
          await ejecutarOperacion(operacion);
          thunkAPI.dispatch(eliminarOperacion(operacion.id));
        } catch (error) {
          console.log('Error sincronizando:', error);
        }
      }
    }
  }
});
```

## PARTE 8: CONVENCIONES DE CÓDIGO (ESPAÑOL)

### Nombres de Archivos
- **Componentes**: `BotonGrande.js`, `ReproductorAudio.js`, `TarjetaPaciente.js`
- **Pantallas**: `InicioSesion.js`, `ListaPacientes.js`, `DashboardDoctor.js`
- **Servicios**: `servicioApi.js`, `servicioTTS.js`, `servicioNotificaciones.js`
- **Utils**: `formateadores.js`, `validadores.js`, `constantes.js`
- **Slices**: `authSlice.js`, `pacienteSlice.js`, `citaSlice.js`

### Variables

```javascript
// camelCase en español
const nombrePaciente = 'Juan Pérez';
const listaCitas = [];
const datosFormulario = {};

// Booleanos con "es/tiene/puede"
const estaConectado = true;
const tienePermiso = false;
const puedeEditar = true;

// Constantes en MAYÚSCULAS
const COLORES_PACIENTE = {
  BIEN: '#4CAF50',
  CUIDADO: '#FFC107',
  URGENTE: '#F44336'
};

const TIEMPO_ESPERA_API = 5000;
```

### Funciones

```javascript
// camelCase en español, verbos
const obtenerPacientes = async () => { };
const registrarSignoVital = (datos) => { };
const formatearFecha = (fecha) => { };
const validarEmail = (email) => { };

// Handlers con "manejar" o "al"
const manejarPresion = () => { };
const alPresionarBoton = () => { };
const alCambiarTexto = (texto) => { };
```

### Componentes React

```javascript
// PascalCase
const BotonGrande = ({ textoBoton, alPresionar, colorFondo }) => {
  return (
    <TouchableOpacity onPress={alPresionar}>
      <Text>{textoBoton}</Text>
    </TouchableOpacity>
  );
};

export default BotonGrande;
```

### Redux Actions y Reducers

```javascript
// Slice de autenticación
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    usuario: null,
    token: null,
    estaAutenticado: false
  },
  reducers: {
    iniciarSesion: (state, action) => {
      state.usuario = action.payload.usuario;
      state.token = action.payload.token;
      state.estaAutenticado = true;
    },
    cerrarSesion: (state) => {
      state.usuario = null;
      state.token = null;
      state.estaAutenticado = false;
    }
  }
});

// Uso
dispatch(iniciarSesion({ usuario, token }));
```

## PARTE 9: TESTING

### Estrategia Simplificada (una persona)
1. **Testing manual exhaustivo** (prioridad)
2. **Unit tests** para lógica crítica (utils, slices)
3. **Beta testing** con usuarios reales (CRÍTICO para pacientes)

### Testing Manual
- Checklist de funcionalidades por pantalla
- Testing en dispositivo real (Android + iOS)
- Testing con diferentes tamaños de pantalla
- Testing de accesibilidad con personas mayores

### Unit Tests Básicos

```javascript
// __tests__/validadores.test.js
import { validarEmail, validarTelefono } from '../utils/validadores';

describe('Validadores', () => {
  test('debe validar email correcto', () => {
    expect(validarEmail('test@ejemplo.com')).toBe(true);
  });

  test('debe rechazar email inválido', () => {
    expect(validarEmail('invalido')).toBe(false);
  });
});
```

### Beta Testing con Usuarios Reales
- Grupo de 5 pacientes rurales
- Observar sin intervenir
- Medir: tiempo para completar tareas, errores, confusión
- Iterar rápidamente basado en feedback

## PARTE 10: CRONOGRAMA

### Timeline para 1 persona (18 semanas)

#### Semanas 1-2: Setup
- Inicializar proyecto React Native CLI
- Instalar dependencias
- Crear estructura de carpetas
- Configurar Redux + Navigation
- Configurar ESLint + Prettier

#### Semanas 3-4: Autenticación
- Pantallas Login/Register
- Integración con backend (`/api/auth`)
- JWT storage (react-native-keychain)
- Navegación condicional por rol

#### Semanas 5-8: Módulo Profesional
- Dashboard doctor (4 días)
- Lista pacientes con búsqueda (3 días)
- Perfil paciente completo (4 días)
- Agenda de citas (4 días)
- Chat básico texto (3 días)

#### Semanas 9-12: Módulo Pacientes (MÁS IMPORTANTE)
- InicioPaciente con 4 botones (2 días)
- MisCitas con audio (3 días)
- SignosVitales formulario visual (4 días)
- Chat con notas de voz (4 días)
- Sistema TTS completo (3 días)
- Botón emergencia (1 día)
- Testing con usuarios (3 días)

#### Semanas 13-14: WebSockets y Notificaciones
- Integración Socket.io (3 días)
- Push notifications Firebase (3 días)
- Actualización en tiempo real (2 días)

#### Semanas 15-16: Modo Offline
- Redux persist (2 días)
- Cola de operaciones (3 días)
- Sincronización automática (2 días)
- Indicadores visuales (1 día)

#### Semanas 17-18: Testing y Refinamiento
- Testing completo manual (3 días)
- Beta testing con 5 pacientes (3 días)
- Corrección de bugs (4 días)
- Optimización performance (2 días)

## PARTE 11: COMANDOS Y CONFIGURACIÓN

### Ubicación del Proyecto
El proyecto móvil se creará en: `Backend/react-app/`

### Inicializar Proyecto

```bash
cd Backend
npx react-native init react-app
cd react-app
```

### Instalar Dependencias Core

```bash
npm install @react-navigation/native @react-navigation/stack @react-navigation/drawer @react-navigation/bottom-tabs
npm install @reduxjs/toolkit react-redux redux-persist
npm install axios socket.io-client
npm install @react-native-async-storage/async-storage react-native-keychain
npm install react-native-paper react-native-vector-icons react-native-chart-kit
npm install react-native-tts react-native-audio-recorder-player react-native-haptic-feedback
npm install lottie-react-native react-native-config react-native-permissions date-fns
```

### Configuración ESLint (.eslintrc.js)

```javascript
module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    'prettier/prettier': 'off',
    'react-native/no-inline-styles': 'off'
  }
};
```

### Variables de Entorno (.env)

```
API_URL=http://localhost:3000
WS_URL=ws://localhost:3000
ENVIRONMENT=development
```

## Entregable Final

Este documento único `docs/DOCUMENTACION-TECNICA.md` contiene:

- ✅ Arquitectura completa y decisiones técnicas
- ✅ Estructura de carpetas simplificada
- ✅ Navegación y flujos de usuario
- ✅ Diseño UI/UX diferenciado (profesional vs paciente)
- ✅ Integración con backend (endpoints y ejemplos)
- ✅ Sistema de accesibilidad completo (TTS, voz, haptic)
- ✅ Estrategia de modo offline
- ✅ Convenciones de código en español
- ✅ Plan de testing simplificado
- ✅ Cronograma de 18 semanas

Este documento único servirá como guía completa para el desarrollo de la aplicación móvil React Native.

