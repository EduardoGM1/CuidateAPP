# 🚀 Guía de Inicio Rápido - API Clínica Médica

## ⚡ **INICIO EN 5 MINUTOS**

### **1. Prerrequisitos**

```bash
# Verificar Node.js (versión 18+)
node --version

# Verificar npm
npm --version

# Verificar MySQL
mysql --version
```

### **2. Instalación Express**

```bash
# Clonar repositorio
git clone https://github.com/EduardoGM1/api-clinica.git
cd api-clinica

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

### **3. Configurar Base de Datos**

```bash
# Crear base de datos
mysql -u root -p
CREATE DATABASE medical_db;
exit

# Importar esquema
mysql -u root -p medical_db < tablas_completas.sql
```

### **4. Configurar .env**

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=medical_db
DB_USER=root
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu-super-secret-key-aqui
JWT_REFRESH_SECRET=tu-refresh-secret-aqui

# Servidor
PORT=3000
NODE_ENV=development
```

### **5. Ejecutar Servidor**

```bash
# Desarrollo
npm run dev

# O producción
npm start
```

### **6. Verificar Instalación**

```bash
# Health check
curl http://localhost:3000/

# Configuración móvil
curl http://localhost:3000/api/mobile/config
```

**¡Listo! Tu API está funcionando en http://localhost:3000** 🎉

---

## 📱 **PRIMEROS PASOS CON MÓVIL**

### **1. Obtener Configuración**

```bash
curl http://localhost:3000/api/mobile/config
```

**Respuesta esperada:**
```json
{
  "api_version": "1.0.0",
  "features": {
    "biometric_auth": true,
    "push_notifications": true,
    "realtime_updates": true
  }
}
```

### **2. Registrar Usuario**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "rol": "Paciente"
  }'
```

### **3. Login Móvil**

```bash
curl -X POST http://localhost:3000/api/mobile/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: test-device-123" \
  -H "X-Platform: android" \
  -H "X-App-Version: 1.0.0" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

### **4. Registrar Dispositivo**

```bash
curl -X POST http://localhost:3000/api/mobile/device/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "X-Device-ID: test-device-123" \
  -d '{
    "device_token": "test-push-token-123",
    "platform": "android",
    "device_info": {
      "model": "Test Device",
      "os_version": "Android 12"
    }
  }'
```

---

## 🧪 **TESTING RÁPIDO**

### **1. Ejecutar Tests Básicos**

```bash
# Tests unitarios
npm test

# Tests de performance
npm run test:performance
```

### **2. Simular App Móvil**

```bash
# Ejecutar simulador completo
node testing/test-mobile-features.js
```

### **3. Test de Carga**

```bash
# Test de carga con Artillery
npm run perf:load
```

---

## 📊 **ENDPOINTS ESENCIALES**

### **Autenticación**
```bash
# Login
POST /api/auth/login
POST /api/mobile/login

# Registro
POST /api/auth/register
```

### **Pacientes**
```bash
# Listar
GET /api/pacientes

# Crear
POST /api/pacientes

# Obtener
GET /api/pacientes/:id
```

### **Citas**
```bash
# Listar
GET /api/citas

# Crear
POST /api/citas
```

### **Móvil**
```bash
# Configuración
GET /api/mobile/config

# Dashboard
GET /api/mobile/patient/dashboard
GET /api/mobile/doctor/dashboard
```

---

## 🔧 **CONFIGURACIÓN AVANZADA**

### **1. Variables de Entorno Completas**

```env
# Base de datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=medical_db
DB_USER=root
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu-super-secret-key-muy-largo-y-seguro
JWT_REFRESH_SECRET=tu-refresh-secret-diferente

# Servidor
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Firebase (opcional)
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# APNs (opcional)
APNS_KEY_PATH=./certs/AuthKey_XXXXXXXXXX.p8
APNS_KEY_ID=XXXXXXXXXX
APNS_TEAM_ID=XXXXXXXXXX

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
```

### **2. Scripts Útiles**

```bash
# Desarrollo
npm run dev              # Servidor con nodemon
npm run test:watch       # Tests en modo watch

# Testing
npm test                 # Tests unitarios
npm run test:performance # Tests de performance
npm run test:load        # Tests de carga
npm run test:stress      # Tests de estrés

# Performance
npm run perf:load        # Artillery load test
npm run perf:stress      # Artillery stress test

# Seguridad
npm run audit:security   # Auditoría de seguridad
npm run audit:deps       # Auditoría de dependencias

# Producción
npm run production:check # Verificación pre-producción
npm run production:pm2   # Inicio con PM2
```

---

## 📱 **INTEGRACIÓN CON REACT NATIVE**

### **1. Instalar Dependencias**

```bash
# En tu proyecto React Native
npm install axios socket.io-client
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### **2. Configuración Base**

```javascript
// config/api.js
export const API_CONFIG = {
  baseURL: 'http://localhost:3000/api',
  wsURL: 'ws://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
    'X-Device-ID': 'unique-device-id',
    'X-Platform': 'react-native',
    'X-App-Version': '1.0.0'
  }
};
```

### **3. Servicio de API**

```javascript
// services/api.js
import axios from 'axios';
import { API_CONFIG } from '../config/api';

const api = axios.create(API_CONFIG);

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### **4. WebSocket**

```javascript
// services/websocket.js
import io from 'socket.io-client';
import { API_CONFIG } from '../config/api';

const socket = io(API_CONFIG.wsURL, {
  auth: {
    token: getStoredToken(),
    device_id: getDeviceId()
  }
});

export default socket;
```

---

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### **Error: "Cannot connect to database"**

```bash
# Verificar que MySQL esté corriendo
sudo service mysql start

# Verificar credenciales en .env
# Verificar que la base de datos existe
mysql -u root -p -e "SHOW DATABASES;"
```

### **Error: "Port 3000 already in use"**

```bash
# Cambiar puerto en .env
PORT=3001

# O matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9
```

### **Error: "JWT_SECRET not defined"**

```bash
# Agregar JWT_SECRET en .env
JWT_SECRET=tu-super-secret-key-aqui
```

### **Error: "CORS policy"**

```bash
# Verificar ALLOWED_ORIGINS en .env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

---

## 📚 **PRÓXIMOS PASOS**

### **1. Leer Documentación Completa**
- [README.md](./README.md) - Documentación principal
- [API-REFERENCE.md](./API-REFERENCE.md) - Referencia completa de endpoints
- [MOBILE-API-GUIDE.md](./MOBILE-API-GUIDE.md) - Guía específica para móviles

### **2. Configurar Producción**
- [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Guía de despliegue

### **3. Configurar Seguridad**
- [SECURITY-IMPROVEMENTS.md](./SECURITY-IMPROVEMENTS.md) - Mejoras de seguridad

### **4. Configurar Testing**
- [PERFORMANCE-TESTS.md](./PERFORMANCE-TESTS.md) - Tests de performance

---

## 🆘 **SOPORTE**

### **Problemas Comunes**

1. **Base de datos no conecta**: Verificar credenciales y que MySQL esté corriendo
2. **Puerto ocupado**: Cambiar puerto o matar proceso existente
3. **CORS errors**: Verificar ALLOWED_ORIGINS en .env
4. **JWT errors**: Verificar JWT_SECRET en .env
5. **Tests fallan**: Verificar que la base de datos esté configurada

### **Obtener Ayuda**

1. Revisar logs: `npm run logs:view`
2. Verificar health: `curl http://localhost:3000/health`
3. Ejecutar tests: `npm test`
4. Revisar documentación completa

---

## ✅ **CHECKLIST DE INSTALACIÓN**

- [ ] Node.js 18+ instalado
- [ ] MySQL instalado y corriendo
- [ ] Repositorio clonado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo .env configurado
- [ ] Base de datos creada e importada
- [ ] Servidor ejecutándose (`npm run dev`)
- [ ] Health check exitoso
- [ ] Tests básicos pasando
- [ ] Configuración móvil accesible

**¡Felicidades! Tu API Clínica Médica está lista para usar** 🎉
