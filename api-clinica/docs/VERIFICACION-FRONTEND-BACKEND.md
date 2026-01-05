# 🔍 VERIFICACIÓN FRONTEND-BACKEND

## 📋 Resumen Ejecutivo

**Fecha**: 2025-11-03
**Estado**: ⚠️ **PROBLEMAS CRÍTICOS ENCONTRADOS**

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **Frontend usa rutas legacy eliminadas**

**Archivo**: `ClinicaMovil/src/api/authService.js`

**Problema**: El frontend sigue usando endpoints que fueron eliminados:
- ❌ `/api/paciente-auth/setup-pin` 
- ❌ `/api/paciente-auth/login-pin`
- ❌ `/api/paciente-auth/setup-biometric`
- ❌ `/api/paciente-auth/login-biometric`

**Estado**: Estas rutas retornan **410 (Gone)** porque las tablas fueron eliminadas.

**Solución**: Migrar a:
- ✅ `/api/auth-unified/setup-pin`
- ✅ `/api/auth-unified/login-paciente` (usa `login-paciente`, no `login-paciente-unified`)
- ✅ `/api/auth-unified/setup-biometric`
- ✅ `/api/auth-unified/login-paciente` (mismo endpoint para PIN y biométrico)

---

### 2. **createPacienteCompleto usa tablas eliminadas**

**Archivo**: `api-clinica/controllers/paciente.js` (líneas 490-510)

**Problema**: El controlador todavía intenta usar:
- ❌ `PacienteAuth.create()` 
- ❌ `PacienteAuthPIN.create()`

**Estado**: **NO FUNCIONARÁ** - Estas tablas no existen.

**Solución**: Actualizar para usar `UnifiedAuthService.setupCredential()`

---

## 📊 COMPARACIÓN DE DATOS

### Frontend → Backend: Autenticación

#### **Login con PIN (Frontend)**
```javascript
// Frontend envía:
POST /api/paciente-auth/login-pin
{
  id_paciente: 1,
  pin: "1234",
  device_id: "device_xxx"
}
```

#### **Login con PIN (Backend - Unificado)**
```javascript
// Backend espera (nuevo):
POST /api/auth-unified/login-paciente
{
  id_paciente: 1,
  pin: "1234",
  device_id: "device_xxx"
}
```

✅ **Formato compatible** - Solo cambia la URL

---

#### **Setup PIN (Frontend)**
```javascript
// Frontend envía:
POST /api/paciente-auth/setup-pin
{
  id_paciente: 1,
  pin: "1234",
  device_id: "device_xxx"
}
```

#### **Setup PIN (Backend - Unificado)**
```javascript
// Backend espera:
POST /api/auth-unified/setup-pin
{
  id_paciente: 1,
  pin: "1234",
  device_id: "device_xxx",
  device_name: "optional",
  is_primary: false
}
```

✅ **Formato compatible** - Solo cambia la URL y campos opcionales adicionales

---

### Frontend → Backend: Crear Paciente

#### **createPacienteCompleto (Frontend)**
```javascript
// Frontend envía:
POST /api/pacientes/completo
{
  nombre: "Juan",
  apellido_paterno: "Pérez",
  apellido_materno: "García",
  fecha_nacimiento: "1990-01-01",
  curp: "PEGJ900101HDFRRN01",
  institucion_salud: "IMSS",
  sexo: "Hombre",
  direccion: "Calle 123",
  localidad: "Ciudad",
  numero_celular: "5512345678",
  id_modulo: 1,
  activo: true,
  pin: "1234",
  device_id: "device_xxx"
}
```

#### **createPacienteCompleto (Backend - ACTUAL)**
```javascript
// Backend espera:
POST /api/pacientes/completo
{
  // Mismos campos...
  pin: "1234",
  device_id: "device_xxx"
}
```

⚠️ **PROBLEMA**: El backend intenta crear registros en tablas eliminadas (líneas 490-510)

---

## ✅ ENDPOINTS FUNCIONALES

### Autenticación
- ✅ `/api/auth/login` - Doctor/Admin (sistema antiguo, aún funciona)
- ✅ `/api/auth-unified/login-doctor-admin` - Doctor/Admin (nuevo)
- ✅ `/api/auth-unified/login-paciente` - Paciente (nuevo, usar este)
- ✅ `/api/auth-unified/setup-pin` - Configurar PIN (nuevo)
- ✅ `/api/auth-unified/setup-biometric` - Configurar biométrica (nuevo)

### Pacientes
- ✅ `/api/pacientes/completo` - Crear paciente completo (⚠️ **necesita actualización**)
- ✅ `/api/pacientes/public` - Crear paciente (solo desarrollo)
- ✅ `/api/pacientes/:id` - Obtener paciente
- ✅ `/api/pacientes` - Listar pacientes

---

## 🔧 ACCIONES REQUERIDAS

### **URGENTE - Backend**

1. **Actualizar `createPacienteCompleto`** para usar `UnifiedAuthService`
   - Archivo: `api-clinica/controllers/paciente.js`
   - Líneas: 490-510
   - Reemplazar `PacienteAuth.create()` y `PacienteAuthPIN.create()` con `UnifiedAuthService.setupCredential()`

### **URGENTE - Frontend**

1. **Migrar `authService.js`** a rutas unificadas
   - Archivo: `ClinicaMovil/src/api/authService.js`
   - Cambiar todas las URLs de `/api/paciente-auth/*` a `/api/auth-unified/*`
   - Ajustar nombre de endpoint: `login-paciente` (no `login-paciente-unified`)

2. **Actualizar `LoginPIN.js`** si es necesario
   - Verificar que use el servicio actualizado

3. **Actualizar `LoginPaciente.js`** si es necesario
   - Verificar que use el servicio actualizado

---

## 📝 MAPA DE MIGRACIÓN

| Endpoint Legacy | Endpoint Nuevo | Estado |
|----------------|----------------|--------|
| `POST /api/paciente-auth/setup-pin` | `POST /api/auth-unified/setup-pin` | ⚠️ Migrar |
| `POST /api/paciente-auth/login-pin` | `POST /api/auth-unified/login-paciente` | ⚠️ Migrar |
| `POST /api/paciente-auth/setup-biometric` | `POST /api/auth-unified/setup-biometric` | ⚠️ Migrar |
| `POST /api/paciente-auth/login-biometric` | `POST /api/auth-unified/login-paciente` | ⚠️ Migrar |

**Nota**: El endpoint unificado `/api/auth-unified/login-paciente` maneja tanto PIN como biométrico según los parámetros enviados.

---

## 🔍 VERIFICACIÓN DE DATOS

### Datos enviados desde Frontend

#### Autenticación PIN
```javascript
{
  id_paciente: number,
  pin: string (4 dígitos),
  device_id: string
}
```

#### Autenticación Biométrica
```javascript
{
  id_paciente: number,
  signature: string (base64),
  challenge: string,
  credential_id: string,
  device_id: string (opcional)
}
```

#### Crear Paciente Completo
```javascript
{
  // Datos personales
  nombre: string,
  apellido_paterno: string,
  apellido_materno: string,
  fecha_nacimiento: string (YYYY-MM-DD),
  curp: string,
  sexo: "Hombre" | "Mujer",
  institucion_salud: "IMSS" | "Bienestar" | "ISSSTE" | "Particular" | "Otro",
  
  // Datos de contacto
  direccion: string,
  localidad: string,
  numero_celular: string,
  
  // Datos del sistema
  id_modulo: number,
  activo: boolean,
  
  // Autenticación
  pin: string (4 dígitos),
  device_id: string
}
```

---

## ✅ VALIDACIONES DEL BACKEND

### Endpoint: `POST /api/auth-unified/login-paciente`

**Validaciones**:
- ✅ `id_paciente` requerido
- ✅ `pin` o (`signature` + `challenge`) requerido
- ✅ `device_id` requerido para PIN
- ✅ `credential_id` o `device_id` requerido para biométrica

**Respuesta exitosa**:
```json
{
  "success": true,
  "token": "jwt_token",
  "refresh_token": "refresh_token",
  "paciente": {
    "id_paciente": 1,
    "nombre": "Juan",
    ...
  }
}
```

---

### Endpoint: `POST /api/pacientes/completo`

**Validaciones actuales**:
- ✅ Campos requeridos: nombre, apellido_paterno, fecha_nacimiento, curp, etc.
- ✅ Formato CURP
- ✅ Fecha válida
- ✅ ENUMs válidos (sexo, institucion_salud)

**Problema**: ⚠️ Usa tablas eliminadas para crear PIN

**Validaciones después de actualizar**:
- ✅ Usará `UnifiedAuthService.setupCredential()` para crear PIN
- ✅ Validará unicidad del PIN a nivel global

---

## 🎯 PLAN DE ACCIÓN

### Fase 1: Backend (Inmediato)
1. ✅ Eliminar tablas legacy - **COMPLETADO**
2. ⚠️ Actualizar `createPacienteCompleto` - **PENDIENTE**
3. ✅ Rutas unificadas funcionando - **COMPLETADO**

### Fase 2: Frontend (Inmediato)
1. ⚠️ Migrar `authService.js` - **PENDIENTE**
2. ⚠️ Probar login con PIN - **PENDIENTE**
3. ⚠️ Probar login biométrico - **PENDIENTE**
4. ⚠️ Probar crear paciente completo - **PENDIENTE**

### Fase 3: Validación
1. ⚠️ Probar flujo completo de creación de paciente
2. ⚠️ Probar flujo completo de login de paciente
3. ⚠️ Verificar datos recibidos/enviados

---

## 📊 ESTADO ACTUAL

| Componente | Estado | Acción Requerida |
|-----------|--------|------------------|
| Backend: Rutas unificadas | ✅ Funcional | Ninguna |
| Backend: createPacienteCompleto | ❌ No funcional | Actualizar a AuthCredential |
| Frontend: authService | ❌ Usa rutas legacy | Migrar a rutas unificadas |
| Frontend: LoginPIN | ⚠️ Funcionará después de migración | Esperar migración |
| Frontend: LoginPaciente | ⚠️ Funcionará después de migración | Esperar migración |

---

**Última actualización**: 2025-11-03
**Siguiente paso**: Actualizar `createPacienteCompleto` y migrar frontend



