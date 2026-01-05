# 🔐 RESUMEN: Datos Sensibles Encriptados y Hasheados

**Fecha:** 31 de Diciembre, 2025  
**Objetivo:** Documentar todos los datos sensibles que están actualmente encriptados o hasheados en el sistema

---

## ✅ DATOS ACTUALMENTE ENCRIPTADOS (AES-256-GCM)

### **📋 Tabla: `pacientes`**

Los siguientes campos están **encriptados** usando AES-256-GCM mediante hooks de Sequelize:

1. ✅ **`curp`** (TEXT)
   - **Tipo:** Encriptado con AES-256-GCM
   - **Razón:** Identificador único personal (PII crítico)
   - **Implementación:** Hook automático en modelo `Paciente`
   - **Archivo:** `api-clinica/models/Paciente.js` línea 34-40
   - **Hook:** `api-clinica/middlewares/encryptionHooks.js`

2. ✅ **`numero_celular`** (TEXT)
   - **Tipo:** Encriptado con AES-256-GCM
   - **Razón:** Información de contacto personal (PII)
   - **Implementación:** Hook automático en modelo `Paciente`
   - **Archivo:** `api-clinica/models/Paciente.js` línea 66-71
   - **Hook:** `api-clinica/middlewares/encryptionHooks.js`

3. ✅ **`direccion`** (TEXT)
   - **Tipo:** Encriptado con AES-256-GCM
   - **Razón:** Ubicación física personal (PII)
   - **Implementación:** Hook automático en modelo `Paciente`
   - **Archivo:** `api-clinica/models/Paciente.js` línea 51-56
   - **Hook:** `api-clinica/middlewares/encryptionHooks.js`

**Configuración:**
```javascript
// api-clinica/middlewares/encryptionHooks.js
const ENCRYPTED_FIELDS_PACIENTE = [
  'curp',
  'numero_celular',
  'direccion'
];

// Aplicado en:
// api-clinica/models/Paciente.js línea 111
applyEncryptionHooks(Paciente, ENCRYPTED_FIELDS_PACIENTE);
```

---

## ✅ DATOS ACTUALMENTE HASHEADOS (bcrypt)

### **📋 Tabla: `usuarios`**

1. ✅ **`password_hash`** (STRING(255))
   - **Tipo:** Hash bcrypt
   - **Razón:** Contraseña de autenticación (nunca debe almacenarse en texto plano)
   - **Implementación:** Hash aplicado antes de guardar
   - **Archivo:** `api-clinica/models/Usuario.js` línea 16-19
   - **Algoritmo:** bcrypt

### **📋 Tabla: `auth_credentials`**

1. ✅ **`credential_value`** (TEXT)
   - **Tipo:** Hash bcrypt (para password/pin), Public Key (para biometric), Secret (para TOTP)
   - **Razón:** Credenciales de autenticación (sistema unificado)
   - **Implementación:** Hash aplicado según `auth_method`
   - **Archivo:** `api-clinica/models/AuthCredential.js` línea 34
   - **Algoritmo:** 
     - bcrypt para `password` y `pin`
     - Public Key para `biometric`
     - Secret para `totp`

2. ✅ **`credential_salt`** (STRING(64))
   - **Tipo:** Salt para hash
   - **Razón:** Mejora la seguridad del hash
   - **Archivo:** `api-clinica/models/AuthCredential.js` línea 36-37

### **📋 Tabla: `paciente_auth_pin` (DEPRECATED - Tabla eliminada)**

**Nota:** Esta tabla fue eliminada y reemplazada por `auth_credentials`. Los datos históricos usaban:
- `pin_hash` (bcrypt)
- `pin_salt` (STRING(32))

---

## 📊 RESUMEN POR TABLA

| Tabla | Campo | Tipo de Protección | Estado |
|-------|-------|-------------------|--------|
| `pacientes` | `curp` | 🔐 Encriptado (AES-256-GCM) | ✅ Implementado |
| `pacientes` | `numero_celular` | 🔐 Encriptado (AES-256-GCM) | ✅ Implementado |
| `pacientes` | `direccion` | 🔐 Encriptado (AES-256-GCM) | ✅ Implementado |
| `usuarios` | `password_hash` | 🔒 Hasheado (bcrypt) | ✅ Implementado |
| `auth_credentials` | `credential_value` | 🔒 Hasheado (bcrypt/pin) | ✅ Implementado |
| `auth_credentials` | `credential_salt` | 🔒 Salt (bcrypt) | ✅ Implementado |

---

## ❌ DATOS QUE NO ESTÁN ENCRIPTADOS (pero podrían serlo)

### **📋 Tabla: `pacientes`**

Los siguientes campos **NO están encriptados** actualmente:

- ❌ `fecha_nacimiento` - **CRÍTICO** (PII)
- ❌ `nombre` - Dato personal (pero necesario para búsqueda)
- ❌ `apellido_paterno` - Dato personal (pero necesario para búsqueda)
- ❌ `apellido_materno` - Dato personal (pero necesario para búsqueda)
- ❌ `estado` - Ubicación (menos crítico)
- ❌ `localidad` - Ubicación (menos crítico)

### **📋 Tabla: `red_apoyo`**

Los siguientes campos **NO están encriptados** actualmente (aunque hay documentación que sugiere que deberían):

- ❌ `numero_celular` - Información de contacto
- ❌ `email` - Información de contacto
- ❌ `direccion` - Ubicación física
- ❌ `nombre_contacto` - Dato personal

**Nota:** El archivo `autoDecryption.js` menciona que estos campos deberían estar encriptados, pero **NO tienen hooks aplicados** en el modelo `RedApoyo.js`.

### **📋 Tabla: `doctores`**

Los siguientes campos **NO están encriptados** actualmente:

- ❌ `telefono` - Información de contacto (aunque hay documentación que sugiere que debería)
- ❌ `nombre` - Dato personal
- ❌ `apellido_paterno` - Dato personal
- ❌ `apellido_materno` - Dato personal

**Nota:** El archivo `autoDecryption.js` menciona que `telefono` debería estar encriptado, pero **NO tiene hooks aplicados** en el modelo `Doctor.js`.

### **📋 Tabla: `diagnosticos`**

- ❌ `descripcion` - Información médica sensible (PHI)

**Nota:** El archivo `autoDecryption.js` menciona que `descripcion` debería estar encriptado, pero **NO tiene hooks aplicados** en el modelo `Diagnostico.js`.

### **📋 Tabla: `signos_vitales`**

- ❌ `observaciones` - Información médica (aunque hay documentación que sugiere que debería)
- ❌ `presion_sistolica` - Datos médicos críticos (PHI)
- ❌ `presion_diastolica` - Datos médicos críticos (PHI)
- ❌ `glucosa_mg_dl` - Datos médicos críticos (PHI)
- ❌ `colesterol_mg_dl` - Datos médicos críticos (PHI)
- ❌ `trigliceridos_mg_dl` - Datos médicos críticos (PHI)

**Nota:** El archivo `autoDecryption.js` menciona que estos campos deberían estar encriptados, pero **NO tienen hooks aplicados** en el modelo `SignoVital.js`.

### **📋 Otras Tablas**

- ❌ `citas.motivo` - Información médica (PHI)
- ❌ `citas.observaciones` - Información médica (PHI)
- ❌ `planes_medicacion.observaciones` - Información médica (PHI)
- ❌ `plan_detalle.observaciones` - Información médica (PHI)
- ❌ `paciente_comorbilidad.observaciones` - Información médica (PHI)
- ❌ `esquema_vacunacion.observaciones` - Información médica (PHI)

---

## 🔍 VERIFICACIÓN DE IMPLEMENTACIÓN

### **✅ Campos con Encriptación Implementada (Hooks Aplicados):**

```javascript
// api-clinica/models/Paciente.js
import { applyEncryptionHooks, ENCRYPTED_FIELDS_PACIENTE } from '../middlewares/encryptionHooks.js';

// Línea 111
applyEncryptionHooks(Paciente, ENCRYPTED_FIELDS_PACIENTE);
```

**Campos encriptados:**
- ✅ `curp`
- ✅ `numero_celular`
- ✅ `direccion`

### **❌ Campos Documentados pero SIN Implementación:**

El archivo `api-clinica/middlewares/autoDecryption.js` contiene una lista de campos que **deberían** estar encriptados, pero estos campos **NO tienen hooks aplicados** en sus respectivos modelos:

- ❌ `red_apoyo.numero_celular` - Modelo sin hooks
- ❌ `red_apoyo.email` - Modelo sin hooks
- ❌ `red_apoyo.direccion` - Modelo sin hooks
- ❌ `doctores.telefono` - Modelo sin hooks
- ❌ `diagnosticos.descripcion` - Modelo sin hooks
- ❌ `signos_vitales.observaciones` - Modelo sin hooks
- ❌ `signos_vitales.presion_sistolica` - Modelo sin hooks
- ❌ `signos_vitales.presion_diastolica` - Modelo sin hooks
- ❌ `signos_vitales.glucosa_mg_dl` - Modelo sin hooks
- ❌ `signos_vitales.colesterol_mg_dl` - Modelo sin hooks
- ❌ `signos_vitales.trigliceridos_mg_dl` - Modelo sin hooks
- ❌ `citas.motivo` - Modelo sin hooks
- ❌ `citas.observaciones` - Modelo sin hooks
- ❌ `planes_medicacion.observaciones` - Modelo sin hooks
- ❌ `plan_detalle.observaciones` - Modelo sin hooks
- ❌ `paciente_comorbilidad.observaciones` - Modelo sin hooks
- ❌ `esquema_vacunacion.observaciones` - Modelo sin hooks

---

## 📝 NOTAS IMPORTANTES

### **1. Diferencia entre Encriptación y Hash:**

- **Encriptación (AES-256-GCM):** 
  - Bidireccional (se puede desencriptar)
  - Se usa para datos que necesitan ser leídos en texto plano
  - Ejemplo: CURP, dirección, teléfono

- **Hash (bcrypt):**
  - Unidireccional (no se puede revertir)
  - Se usa para contraseñas y credenciales
  - Ejemplo: password_hash, pin_hash

### **2. Hooks de Sequelize:**

Los hooks de encriptación se aplican automáticamente:
- **Antes de crear/actualizar:** Encripta los campos
- **Después de cargar:** Desencripta los campos

Esto significa que:
- ✅ Los datos se almacenan encriptados en la base de datos
- ✅ Los datos se desencriptan automáticamente al leerlos
- ✅ La aplicación trabaja con datos desencriptados transparentemente

### **3. Campos Hasheados:**

Los campos hasheados (passwords, PINs) **nunca** se desencriptan. En su lugar:
- Se compara el hash del valor ingresado con el hash almacenado
- Se usa `bcrypt.compare()` para verificar credenciales

---

## 🎯 CONCLUSIÓN

### **Datos Actualmente Protegidos:**

**Encriptados (AES-256-GCM):**
- ✅ `pacientes.curp`
- ✅ `pacientes.numero_celular`
- ✅ `pacientes.direccion`

**Hasheados (bcrypt):**
- ✅ `usuarios.password_hash`
- ✅ `auth_credentials.credential_value` (para password/pin)
- ✅ `auth_credentials.credential_salt`

### **Total de Campos Protegidos:**
- **Encriptados:** 3 campos
- **Hasheados:** 2 campos (más salt)
- **Total:** 5 campos protegidos

### **Campos Documentados pero NO Implementados:**
- **Aproximadamente 15+ campos** mencionados en documentación pero sin hooks aplicados

---

**Última Actualización:** 31 de Diciembre, 2025

