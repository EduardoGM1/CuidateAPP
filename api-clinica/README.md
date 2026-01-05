# 🏥 API Clínica Médica - Documentación Completa

## 📋 **ÍNDICE**

1. [🎯 Descripción General](#-descripción-general)
2. [🚀 Inicio Rápido](#-inicio-rápido)
3. [📱 API Móvil](#-api-móvil)
4. [🔐 Autenticación](#-autenticación)
5. [📊 Endpoints por Módulo](#-endpoints-por-módulo)
6. [⚡ WebSockets](#-websockets)
7. [🔔 Push Notifications](#-push-notifications)
8. [🧪 Testing](#-testing)
9. [🔧 Configuración](#-configuración)
10. [📚 Referencias](#-referencias)

---

## 🎯 **DESCRIPCIÓN GENERAL**

API REST completa para sistema de gestión clínica médica con soporte completo para aplicaciones móviles (React Native), incluyendo funcionalidades de tiempo real, notificaciones push y sincronización offline.

### **✨ Características Principales**

- 🏥 **Gestión completa de clínica** (pacientes, doctores, citas, diagnósticos)
- 📱 **API optimizada para móviles** (React Native, iOS, Android)
- ⚡ **Tiempo real** con WebSockets
- 🔔 **Notificaciones push** (FCM + APNs)
- 🔐 **Autenticación biométrica** y PIN de 4 dígitos
- 🔄 **Sincronización offline**
- 🛡️ **Seguridad avanzada** (rate limiting, validación, sanitización)
- 📊 **Monitoreo y analytics**
- 🧪 **Testing completo** (unit, integration, performance, load)

### **🏗️ Arquitectura**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Native  │    │   Web App       │    │   Admin Panel   │
│   (iOS/Android) │    │   (React/Vue)   │    │   (Dashboard)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      API Clínica          │
                    │   (Node.js + Express)     │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Base de Datos        │
                    │   (MySQL + Sequelize)     │
                    └───────────────────────────┘
```

---

## 🚀 **INICIO RÁPIDO**

### **1. Instalación**

```bash
# Clonar repositorio
git clone https://github.com/EduardoGM1/api-clinica.git
cd api-clinica

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones
```

### **2. Configuración de Base de Datos**

```bash
# Crear base de datos MySQL
mysql -u root -p
CREATE DATABASE medical_db;
exit

# Importar esquema
mysql -u root -p medical_db < tablas_completas.sql
```

### **3. Ejecutar Servidor**

```bash
# Desarrollo
npm run dev

# Producción
npm start

# Con PM2 (recomendado para producción)
npm run production:pm2
```

### **4. Verificar Instalación**

```bash
# Health check
curl http://localhost:3000/health

# Configuración móvil
curl http://localhost:3000/api/mobile/config
```

---

## 📱 **API MÓVIL**

### **Configuración Inicial**

```javascript
// Configuración base para React Native
const API_BASE_URL = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000';

// Headers requeridos para móviles
const mobileHeaders = {
  'Content-Type': 'application/json',
  'X-Device-ID': 'unique-device-id',
  'X-Platform': 'android', // o 'ios'
  'X-App-Version': '1.0.0',
  'X-Client-Type': 'app'
};
```

### **Endpoints Móviles Principales**

| Endpoint | Método | Descripción | Autenticación |
|----------|--------|-------------|---------------|
| `/api/mobile/config` | GET | Configuración de la app | ❌ |
| `/api/mobile/login` | POST | Login optimizado | ❌ |
| `/api/mobile/refresh-token` | POST | Renovar token | ❌ |
| `/api/mobile/device/register` | POST | Registrar dispositivo | ✅ |
| `/api/mobile/device/info` | GET | Info del dispositivo | ✅ |
| `/api/mobile/patient/dashboard` | GET | Dashboard paciente | ✅ |
| `/api/mobile/doctor/dashboard` | GET | Dashboard doctor | ✅ |
| `/api/mobile/notification/test` | POST | Notificación de prueba | ✅ |
| `/api/mobile/sync/offline` | POST | Sincronización offline | ✅ |

---

## 🔐 **AUTENTICACIÓN**

### **Sistema de Tokens**

```javascript
// Login móvil
const loginResponse = await fetch('/api/mobile/login', {
  method: 'POST',
  headers: mobileHeaders,
  body: JSON.stringify({
    email: 'usuario@example.com',
    password: 'password123'
  })
});

const { token, refresh_token, expires_in } = await loginResponse.json();

// Usar token en requests
const authenticatedHeaders = {
  ...mobileHeaders,
  'Authorization': `Bearer ${token}`
};
```

### **Renovación Automática de Tokens**

```javascript
// Renovar token cuando esté próximo a expirar
const refreshResponse = await fetch('/api/mobile/refresh-token', {
  method: 'POST',
  headers: mobileHeaders,
  body: JSON.stringify({
    refresh_token: refresh_token
  })
});
```

### **Autenticación Biométrica (Pacientes)**

```javascript
// Login con PIN de 4 dígitos
const pinLogin = await fetch('/api/paciente-auth/login-pin', {
  method: 'POST',
  headers: mobileHeaders,
  body: JSON.stringify({
    curp: 'ABC123456789DEFG01',
    pin: '1234'
  })
});

// Login con biometría
const biometricLogin = await fetch('/api/paciente-auth/login-biometric', {
  method: 'POST',
  headers: mobileHeaders,
  body: JSON.stringify({
    curp: 'ABC123456789DEFG01',
    biometric_data: 'biometric_signature'
  })
});
```

---

## 📊 **ENDPOINTS POR MÓDULO**

### **🔐 Autenticación (`/api/auth`)**

| Endpoint | Método | Descripción | Parámetros |
|----------|--------|-------------|------------|
| `/register` | POST | Registrar usuario | `email`, `password`, `rol` |
| `/login` | POST | Login usuario | `email`, `password` |
| `/usuarios` | GET | Listar usuarios | `page`, `limit` |
| `/usuarios/:id` | GET | Obtener usuario | `id` |
| `/usuarios/:id` | PUT | Actualizar usuario | `id`, `data` |
| `/usuarios/:id` | DELETE | Eliminar usuario | `id` |

**Ejemplo de Registro:**
```javascript
const registerUser = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'doctor@clinica.com',
    password: 'SecurePass123',
    rol: 'Doctor'
  })
});
```

### **👥 Pacientes (`/api/pacientes`)**

| Endpoint | Método | Descripción | Parámetros |
|----------|--------|-------------|------------|
| `/` | GET | Listar pacientes | `page`, `limit`, `search` |
| `/:id` | GET | Obtener paciente | `id` |
| `/` | POST | Crear paciente | `nombre`, `apellido_paterno`, `fecha_nacimiento`, `curp`, `sexo` |
| `/:id` | PUT | Actualizar paciente | `id`, `data` |
| `/:id` | DELETE | Eliminar paciente | `id` |

**Ejemplo de Crear Paciente:**
```javascript
const createPatient = await fetch('/api/pacientes', {
  method: 'POST',
  headers: authenticatedHeaders,
  body: JSON.stringify({
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: 'García',
    fecha_nacimiento: '1990-05-15',
    curp: 'PEGJ900515HDFRRN01',
    sexo: 'M',
    numero_celular: '5551234567',
    institucion_salud: 'IMSS',
    direccion: 'Calle 123, Col. Centro',
    localidad: 'Ciudad de México'
  })
});
```

### **👨‍⚕️ Doctores (`/api/doctores`)**

| Endpoint | Método | Descripción | Parámetros |
|----------|--------|-------------|------------|
| `/` | GET | Listar doctores | `page`, `limit`, `search` |
| `/:id` | GET | Obtener doctor | `id` |
| `/` | POST | Crear doctor | `nombre`, `apellido_paterno`, `telefono`, `institucion_hospitalaria` |
| `/:id` | PUT | Actualizar doctor | `id`, `data` |
| `/:id` | DELETE | Eliminar doctor | `id` |

### **📅 Citas (`/api/citas`)**

| Endpoint | Método | Descripción | Parámetros |
|----------|--------|-------------|------------|
| `/` | GET | Listar citas | `page`, `limit`, `fecha`, `doctor_id` |
| `/:id` | GET | Obtener cita | `id` |
| `/` | POST | Crear cita | `paciente_id`, `doctor_id`, `fecha`, `hora` |
| `/:id` | PUT | Actualizar cita | `id`, `data` |
| `/:id` | DELETE | Cancelar cita | `id` |

**Ejemplo de Crear Cita:**
```javascript
const createAppointment = await fetch('/api/citas', {
  method: 'POST',
  headers: authenticatedHeaders,
  body: JSON.stringify({
    paciente_id: 1,
    doctor_id: 2,
    fecha: '2024-01-15',
    hora: '10:00:00',
    tipo_cita: 'Consulta general',
    notas: 'Primera consulta'
  })
});
```

### **💊 Medicamentos (`/api/medicamentos`)**

| Endpoint | Método | Descripción | Parámetros |
|----------|--------|-------------|------------|
| `/` | GET | Listar medicamentos | `page`, `limit`, `search` |
| `/:id` | GET | Obtener medicamento | `id` |
| `/` | POST | Crear medicamento | `nombre`, `presentacion`, `dosis` |
| `/:id` | PUT | Actualizar medicamento | `id`, `data` |
| `/:id` | DELETE | Eliminar medicamento | `id` |

### **🩺 Signos Vitales (`/api/signos-vitales`)**

| Endpoint | Método | Descripción | Parámetros |
|----------|--------|-------------|------------|
| `/` | GET | Listar signos vitales | `paciente_id`, `fecha` |
| `/:id` | GET | Obtener signos vitales | `id` |
| `/` | POST | Registrar signos vitales | `paciente_id`, `presion_arterial`, `temperatura`, `peso` |
| `/:id` | PUT | Actualizar signos vitales | `id`, `data` |

**Ejemplo de Registrar Signos Vitales:**
```javascript
const recordVitals = await fetch('/api/signos-vitales', {
  method: 'POST',
  headers: authenticatedHeaders,
  body: JSON.stringify({
    paciente_id: 1,
    presion_arterial_sistolica: 120,
    presion_arterial_diastolica: 80,
    temperatura: 36.5,
    peso: 70.5,
    altura: 175,
    frecuencia_cardiaca: 72,
    saturacion_oxigeno: 98
  })
});
```

### **🔬 Diagnósticos (`/api/diagnosticos`)**

| Endpoint | Método | Descripción | Parámetros |
|----------|--------|-------------|------------|
| `/` | GET | Listar diagnósticos | `paciente_id`, `doctor_id` |
| `/:id` | GET | Obtener diagnóstico | `id` |
| `/` | POST | Crear diagnóstico | `paciente_id`, `doctor_id`, `diagnostico`, `tratamiento` |
| `/:id` | PUT | Actualizar diagnóstico | `id`, `data` |

### **💉 Planes de Medicación (`/api/planes-medicacion`)**

| Endpoint | Método | Descripción | Parámetros |
|----------|--------|-------------|------------|
| `/` | GET | Listar planes | `paciente_id` |
| `/:id` | GET | Obtener plan | `id` |
| `/` | POST | Crear plan | `paciente_id`, `medicamento_id`, `dosis`, `frecuencia` |
| `/:id` | PUT | Actualizar plan | `id`, `data` |
| `/:id` | DELETE | Eliminar plan | `id` |

---

## ⚡ **WEBSOCKETS**

### **Conexión WebSocket**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token',
    device_id: 'unique-device-id'
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('Conectado al servidor');
});

socket.on('disconnect', () => {
  console.log('Desconectado del servidor');
});
```

### **Eventos Disponibles**

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `push_notification` | Notificación push | `{ title, message, data }` |
| `appointment_reminder` | Recordatorio de cita | `{ appointment_id, doctor_name, time }` |
| `medication_reminder` | Recordatorio de medicamento | `{ medication_id, name, dosage }` |
| `test_result` | Resultado de examen | `{ test_id, type, status }` |
| `emergency_alert` | Alerta médica | `{ alert_id, severity, message }` |
| `pong` | Respuesta heartbeat | `{ timestamp }` |

### **Enviar Eventos**

```javascript
// Heartbeat
socket.emit('ping');

// Notificar app en segundo plano
socket.emit('app_background');

// Notificar app en primer plano
socket.emit('app_foreground');

// Solicitar estado de sincronización
socket.emit('sync_status_request');
```

---

## 🔔 **PUSH NOTIFICATIONS**

### **Registrar Dispositivo**

```javascript
const registerDevice = await fetch('/api/mobile/device/register', {
  method: 'POST',
  headers: authenticatedHeaders,
  body: JSON.stringify({
    device_token: 'fcm-or-apns-token',
    platform: 'android', // o 'ios'
    device_info: {
      model: 'iPhone 14',
      os_version: '16.0',
      app_version: '1.0.0'
    }
  })
});
```

### **Enviar Notificación de Prueba**

```javascript
const sendTestNotification = await fetch('/api/mobile/notification/test', {
  method: 'POST',
  headers: authenticatedHeaders,
  body: JSON.stringify({
    message: 'Mensaje de prueba',
    type: 'test'
  })
});
```

### **Tipos de Notificaciones**

- **Recordatorios de citas**: `appointment_reminder`
- **Recordatorios de medicamentos**: `medication_reminder`
- **Resultados de exámenes**: `test_result`
- **Alertas médicas**: `emergency_alert`
- **Notificaciones generales**: `general`

---

## 🧪 **TESTING**

### **Ejecutar Tests**

```bash
# Tests unitarios
npm test

# Tests de performance
npm run test:performance

# Tests de carga
npm run test:load

# Tests de estrés
npm run test:stress

# Todos los tests
npm run test:all
```

### **Simulador de App Móvil**

```bash
# Ejecutar simulador completo
node testing/test-mobile-features.js

# Usar simulador programáticamente
import MobileAppSimulator from './testing/mobileSimulator.js';

const simulator = new MobileAppSimulator();
await simulator.simulateFullMobileFlow('test@test.com', 'Test123');
```

### **Tests de Performance con Artillery**

```bash
# Test de carga
npm run perf:load

# Test de estrés
npm run perf:stress

# Test de picos
npm run perf:spike

# Todos los tests de performance
npm run perf:all
```

---

## 🔧 **CONFIGURACIÓN**

### **Variables de Entorno (.env)**

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=medical_db
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Servidor
PORT=3000
NODE_ENV=development

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# APNs (iOS Push Notifications)
APNS_KEY_PATH=./certs/AuthKey_XXXXXXXXXX.p8
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **Scripts Disponibles**

```bash
# Desarrollo
npm run dev              # Servidor con nodemon
npm start               # Servidor de producción

# Testing
npm test                # Tests unitarios
npm run test:watch      # Tests en modo watch
npm run test:performance # Tests de performance
npm run test:load       # Tests de carga
npm run test:stress     # Tests de estrés

# Performance
npm run perf:load       # Artillery load test
npm run perf:stress     # Artillery stress test
npm run perf:spike      # Artillery spike test

# Seguridad
npm run audit:security  # Auditoría de seguridad
npm run audit:deps      # Auditoría de dependencias
npm run audit:complete  # Auditoría completa

# Producción
npm run production:check # Verificación pre-producción
npm run production:start # Inicio en producción
npm run production:pm2   # Inicio con PM2

# Utilidades
npm run health          # Health check
npm run logs:view       # Ver logs
npm run logs:errors     # Ver solo errores
```

---

## 📚 **REFERENCIAS**

### **Documentación Adicional**

- [📱 Guía de API Móvil](./MOBILE-API-GUIDE.md) - Guía completa para desarrollo móvil
- [🔒 Guía de Seguridad](./SECURITY-IMPROVEMENTS.md) - Mejoras de seguridad implementadas
- [⚡ Tests de Performance](./PERFORMANCE-TESTS.md) - Documentación de testing
- [🚀 Guía de Despliegue](./DEPLOYMENT-GUIDE.md) - Guía de despliegue en producción

### **Tecnologías Utilizadas**

- **Backend**: Node.js, Express.js
- **Base de Datos**: MySQL, Sequelize ORM
- **Autenticación**: JWT, bcryptjs
- **Tiempo Real**: Socket.IO
- **Push Notifications**: Firebase Cloud Messaging, APNs
- **Testing**: Jest, Supertest, Artillery
- **Seguridad**: Helmet, express-rate-limit, express-validator
- **Logging**: Winston, Morgan

### **APIs Externas**

- **Firebase Cloud Messaging**: Notificaciones push Android
- **Apple Push Notification Service**: Notificaciones push iOS
- **SMTP**: Envío de emails (opcional)

---

## 🤝 **CONTRIBUCIÓN**

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 **LICENCIA**

Este proyecto está bajo la Licencia ISC. Ver el archivo [LICENSE](LICENSE) para más detalles.

---

## 👨‍💻 **AUTOR**

**Eduardo Gonzalez Morelos**
- GitHub: [@EduardoGM1](https://github.com/EduardoGM1)
- Email: [tu-email@example.com]

---

## 🆘 **SOPORTE**

Si tienes preguntas o necesitas ayuda:

1. Revisa la [documentación](./README.md)
2. Busca en [Issues](https://github.com/EduardoGM1/api-clinica/issues)
3. Crea un [nuevo issue](https://github.com/EduardoGM1/api-clinica/issues/new)

---

**¡Gracias por usar la API Clínica Médica! 🏥✨**