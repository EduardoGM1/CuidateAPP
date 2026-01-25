# 📊 ESQUEMA ENTIDAD-RELACIÓN - BASE DE DATOS

**Fecha:** 31 de Diciembre, 2025  
**Versión:** 1.0

---

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Entidades Principales](#entidades-principales)
3. [Relaciones Detalladas](#relaciones-detalladas)
4. [Diagrama de Relaciones](#diagrama-de-relaciones)
5. [Tablas de Unión (Many-to-Many)](#tablas-de-unión)
6. [Campos Clave y Foreign Keys](#campos-clave-y-foreign-keys)
7. [Índices y Optimización](#índices-y-optimización)

---

## 🎯 RESUMEN EJECUTIVO

### **Total de Tablas:** 28 tablas principales

### **Tipos de Relaciones:**
- **1:1 (Uno a Uno):** 2 relaciones
- **1:N (Uno a Muchos):** 35+ relaciones
- **N:M (Muchos a Muchos):** 2 relaciones (con tablas intermedias)

### **Entidades Centrales:**
- `Usuario` - Sistema de autenticación
- `Paciente` - Entidad principal del sistema
- `Doctor` - Personal médico
- `Cita` - Consultas médicas
- `Modulo` - Organización por módulos

---

## 🏗️ ENTIDADES PRINCIPALES

### **1. USUARIOS Y AUTENTICACIÓN**

#### **`usuarios`**
- **PK:** `id_usuario` (INTEGER, AUTO_INCREMENT)
- **Campos:**
  - `email` (STRING, UNIQUE)
  - `password_hash` (STRING)
  - `rol` (ENUM: 'Paciente', 'Doctor', 'Admin')
  - `fecha_creacion` (DATE)
  - `ultimo_login` (DATE)
  - `activo` (BOOLEAN)
  - `device_tokens` (JSON)

#### **`auth_credentials`**
- **PK:** `id_credential` (INTEGER, AUTO_INCREMENT)
- **Campos:**
  - `user_type` (ENUM: 'Usuario', 'Paciente', 'Doctor', 'Admin')
  - `user_id` (INTEGER)
  - `auth_method` (ENUM: 'password', 'pin', 'biometric', 'totp')
  - `credential_value` (TEXT) - Hash encriptado
  - `credential_salt` (STRING)
  - `device_id` (STRING)
  - `device_name` (STRING)
  - `device_type` (ENUM)
  - `credential_metadata` (JSON)
  - `is_primary` (BOOLEAN)
  - `failed_attempts` (SMALLINT)
  - `locked_until` (DATE)
  - `last_used` (DATE)
  - `expires_at` (DATE)
  - `activo` (BOOLEAN)

#### **`refresh_tokens`**
- **PK:** `id` (INTEGER, AUTO_INCREMENT)
- **Campos:**
  - `user_id` (INTEGER)
  - `token` (TEXT)
  - `expires_at` (DATE)
  - `revoked` (BOOLEAN)
  - `created_at` (DATE)

---

### **2. ORGANIZACIÓN Y MÓDULOS**

#### **`modulos`**
- **PK:** `id_modulo` (INTEGER, AUTO_INCREMENT)
- **Campos:**
  - `nombre_modulo` (STRING, UNIQUE)
  - `created_at` (DATE)
  - `updated_at` (DATE)

---

### **3. PACIENTES**

#### **`pacientes`**
- **PK:** `id_paciente` (INTEGER, AUTO_INCREMENT)
- **FK:** 
  - `id_usuario` → `usuarios.id_usuario` (1:1, opcional)
  - `id_modulo` → `modulos.id_modulo` (N:1)
- **Campos:**
  - `nombre` (STRING)
  - `apellido_paterno` (STRING)
  - `apellido_materno` (STRING)
  - `fecha_nacimiento` (DATEONLY)
  - `curp` (TEXT) - **ENCRIPTADO**
  - `institucion_salud` (ENUM)
  - `sexo` (ENUM: 'Hombre', 'Mujer')
  - `direccion` (TEXT) - **ENCRIPTADO**
  - `estado` (STRING)
  - `localidad` (STRING)
  - `numero_celular` (TEXT) - **ENCRIPTADO**
  - `fecha_registro` (DATE)
  - `activo` (BOOLEAN)
  - `fecha_baja` (DATEONLY)
  - `motivo_baja` (TEXT)
  - `numero_gam` (INTEGER)

---

### **4. DOCTORES**

#### **`doctores`**
- **PK:** `id_doctor` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_usuario` → `usuarios.id_usuario` (1:1, UNIQUE)
  - `id_modulo` → `modulos.id_modulo` (N:1)
- **Campos:**
  - `nombre` (STRING)
  - `apellido_paterno` (STRING)
  - `apellido_materno` (STRING)
  - `telefono` (STRING)
  - `institucion_hospitalaria` (STRING)
  - `grado_estudio` (STRING)
  - `anos_servicio` (SMALLINT)
  - `fecha_registro` (DATE)
  - `activo` (BOOLEAN)

---

### **5. CITAS MÉDICAS**

#### **`citas`**
- **PK:** `id_cita` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_doctor` → `doctores.id_doctor` (N:1, opcional)
- **Campos:**
  - `fecha_cita` (DATE)
  - `estado` (ENUM: 'pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada')
  - `asistencia` (BOOLEAN)
  - `fecha_reprogramada` (DATEONLY)
  - `motivo_reprogramacion` (TEXT)
  - `solicitado_por` (ENUM: 'paciente', 'doctor', 'admin')
  - `fecha_solicitud_reprogramacion` (DATE)
  - `motivo` (STRING)
  - `es_primera_consulta` (BOOLEAN)
  - `observaciones` (TEXT)
  - `fecha_creacion` (DATE)

---

### **6. SIGNOS VITALES**

#### **`signos_vitales`**
- **PK:** `id_signo` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_cita` → `citas.id_cita` (N:1, opcional)
- **Campos:**
  - `fecha_medicion` (DATE)
  - `peso_kg` (DECIMAL)
  - `talla_m` (DECIMAL)
  - `imc` (DECIMAL)
  - `medida_cintura_cm` (DECIMAL)
  - `presion_sistolica` (SMALLINT)
  - `presion_diastolica` (SMALLINT)
  - `glucosa_mg_dl` (DECIMAL)
  - `colesterol_mg_dl` (DECIMAL) - Total
  - `colesterol_ldl` (DECIMAL) - Solo para Hipercolesterolemia
  - `colesterol_hdl` (DECIMAL) - Solo para Hipercolesterolemia
  - `trigliceridos_mg_dl` (DECIMAL) - Solo para Hipertrigliceridemia
  - `hba1c_porcentaje` (DECIMAL) - Obligatorio para acreditación
  - `edad_paciente_en_medicion` (INTEGER) - Para clasificar rangos HbA1c
  - `registrado_por` (ENUM: 'paciente', 'doctor')
  - `observaciones` (TEXT)
  - `fecha_creacion` (DATE)

---

### **7. DIAGNÓSTICOS**

#### **`diagnosticos`**
- **PK:** `id_diagnostico` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_cita` → `citas.id_cita` (N:1, opcional)
- **Campos:**
  - `descripcion` (TEXT)
  - `fecha_registro` (DATE)

---

### **8. COMORBILIDADES**

#### **`comorbilidades`**
- **PK:** `id_comorbilidad` (INTEGER, AUTO_INCREMENT)
- **Campos:**
  - `nombre_comorbilidad` (STRING, UNIQUE)
  - `descripcion` (TEXT)

#### **`paciente_comorbilidad`** (Tabla de Unión N:M)
- **PK Compuesta:** `id_paciente` + `id_comorbilidad`
- **FK:**
  - `id_paciente` → `pacientes.id_paciente`
  - `id_comorbilidad` → `comorbilidades.id_comorbilidad`
- **Campos Adicionales:**
  - `fecha_deteccion` (DATEONLY)
  - `observaciones` (TEXT)
  - `anos_padecimiento` (INTEGER)
  - `es_diagnostico_basal` (BOOLEAN)
  - `es_agregado_posterior` (BOOLEAN)
  - `año_diagnostico` (INTEGER)
  - `recibe_tratamiento_no_farmacologico` (BOOLEAN)
  - `recibe_tratamiento_farmacologico` (BOOLEAN)

---

### **9. MEDICAMENTOS Y PLANES**

#### **`medicamentos`**
- **PK:** `id_medicamento` (INTEGER, AUTO_INCREMENT)
- **Campos:**
  - `nombre_medicamento` (STRING, UNIQUE)
  - `descripcion` (TEXT)

#### **`planes_medicacion`**
- **PK:** `id_plan` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_doctor` → `doctores.id_doctor` (N:1, opcional)
  - `id_cita` → `citas.id_cita` (N:1, opcional)
- **Campos:**
  - `fecha_inicio` (DATEONLY)
  - `fecha_fin` (DATEONLY)
  - `observaciones` (TEXT)
  - `activo` (BOOLEAN)
  - `fecha_creacion` (DATE)

#### **`plan_detalle`**
- **PK:** `id_detalle` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_plan` → `planes_medicacion.id_plan` (N:1)
  - `id_medicamento` → `medicamentos.id_medicamento` (N:1)
- **Campos:**
  - `dosis` (STRING)
  - `frecuencia` (STRING)
  - `horario` (STRING) - Legacy
  - `horarios` (JSON) - Array de horarios
  - `via_administracion` (STRING)
  - `observaciones` (TEXT)

#### **`medicamento_toma`**
- **PK:** `id_toma` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_plan_medicacion` → `planes_medicacion.id_plan` (N:1)
  - `id_plan_detalle` → `plan_detalle.id_detalle` (N:1)
- **Campos:**
  - `fecha_toma` (DATE)
  - `hora_toma` (TIME)
  - `tomado` (BOOLEAN)
  - `observaciones` (TEXT)

---

### **10. MENSAJERÍA**

#### **`mensajes_chat`**
- **PK:** `id_mensaje` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_doctor` → `doctores.id_doctor` (N:1, opcional)
- **Campos:**
  - `remitente` (ENUM: 'Paciente', 'Doctor', 'Sistema')
  - `mensaje_texto` (TEXT)
  - `mensaje_audio_url` (STRING)
  - `mensaje_audio_duracion` (INTEGER)
  - `mensaje_audio_transcripcion` (TEXT)
  - `leido` (BOOLEAN)
  - `fecha_envio` (DATE)

---

### **11. RED DE APOYO**

#### **`red_apoyo`**
- **PK:** `id_red_apoyo` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
- **Campos:**
  - `nombre_contacto` (STRING)
  - `numero_celular` (STRING)
  - `email` (STRING)
  - `direccion` (STRING)
  - `localidad` (STRING)
  - `parentesco` (STRING)
  - `fecha_creacion` (DATE)

---

### **12. VACUNACIÓN**

#### **`vacunas`**
- **PK:** `id_vacuna` (INTEGER, AUTO_INCREMENT)
- **Campos:**
  - `nombre_vacuna` (STRING, UNIQUE)
  - `descripcion` (TEXT)

#### **`esquema_vacunacion`**
- **PK:** `id_esquema` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_vacuna` → `vacunas.id_vacuna` (N:1)
- **Campos:**
  - `fecha_aplicacion` (DATEONLY)
  - `dosis` (INTEGER)
  - `lote` (STRING)
  - `observaciones` (TEXT)

---

### **13. DETECCIÓN DE COMPLICACIONES**

#### **`deteccion_complicaciones`**
- **PK:** `id_deteccion` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_comorbilidad` → `comorbilidades.id_comorbilidad` (N:1, opcional)
  - `id_cita` → `citas.id_cita` (N:1, opcional)
  - `id_doctor` → `doctores.id_doctor` (N:1, opcional)
- **Campos:**
  - `exploracion_pies` (BOOLEAN)
  - `exploracion_fondo_ojo` (BOOLEAN)
  - `realiza_auto_monitoreo` (BOOLEAN)
  - `microalbuminuria_realizada` (BOOLEAN)
  - `microalbuminuria_resultado` (DECIMAL)
  - `auto_monitoreo_glucosa` (BOOLEAN)
  - `auto_monitoreo_presion` (BOOLEAN)
  - `tipo_complicacion` (STRING)
  - `fecha_deteccion` (DATEONLY)
  - `fecha_diagnostico` (DATEONLY)
  - `observaciones` (TEXT)
  - `registrado_por` (ENUM: 'doctor', 'paciente')
  - `fue_referido` (BOOLEAN)
  - `referencia_observaciones` (TEXT)
  - `fecha_creacion` (DATE)

---

### **14. SESIONES EDUCATIVAS**

#### **`sesiones_educativas`**
- **PK:** `id_sesion` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_cita` → `citas.id_cita` (N:1, opcional)
- **Campos:**
  - `fecha_sesion` (DATEONLY)
  - `asistio` (BOOLEAN)
  - `tipo_sesion` (ENUM: 'nutricional', 'actividad_fisica', 'medico_preventiva', 'trabajo_social', 'psicologica', 'odontologica')
  - `numero_intervenciones` (INTEGER)
  - `observaciones` (TEXT)
  - `fecha_creacion` (DATE)

---

### **15. SALUD BUCAL**

#### **`salud_bucal`**
- **PK:** `id_salud_bucal` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_cita` → `citas.id_cita` (N:1, opcional)
- **Campos:**
  - `fecha_evaluacion` (DATEONLY)
  - `observaciones` (TEXT)
  - `fecha_creacion` (DATE)

---

### **16. DETECCIÓN DE TUBERCULOSIS**

#### **`deteccion_tuberculosis`**
- **PK:** `id_deteccion_tb` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_cita` → `citas.id_cita` (N:1, opcional)
- **Campos:**
  - `fecha_deteccion` (DATEONLY)
  - `observaciones` (TEXT)
  - `fecha_creacion` (DATE)

---

### **17. RELACIONES DOCTOR-PACIENTE**

#### **`doctor_paciente`** (Tabla de Unión N:M)
- **PK Compuesta:** `id_doctor` + `id_paciente`
- **FK:**
  - `id_doctor` → `doctores.id_doctor`
  - `id_paciente` → `pacientes.id_paciente`
- **Campos Adicionales:**
  - `fecha_asignacion` (DATEONLY)
  - `observaciones` (TEXT)

---

### **18. PUNTOS DE CHEQUEO**

#### **`puntos_chequeo`**
- **PK:** `id_punto` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_paciente` → `pacientes.id_paciente` (N:1)
  - `id_cita` → `citas.id_cita` (N:1, opcional)
- **Campos:**
  - `fecha_chequeo` (DATEONLY)
  - `observaciones` (TEXT)

---

### **19. SOLICITUDES DE REPROGRAMACIÓN**

#### **`solicitudes_reprogramacion`**
- **PK:** `id_solicitud` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_cita` → `citas.id_cita` (N:1)
  - `id_paciente` → `pacientes.id_paciente` (N:1)
- **Campos:**
  - `fecha_solicitud` (DATE)
  - `fecha_propuesta` (DATE)
  - `motivo` (TEXT)
  - `estado` (ENUM)
  - `observaciones` (TEXT)

---

### **20. NOTIFICACIONES**

#### **`notificaciones_doctor`**
- **PK:** `id_notificacion` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_doctor` → `doctores.id_doctor` (N:1)
  - `id_paciente` → `pacientes.id_paciente` (N:1, opcional)
  - `id_cita` → `citas.id_cita` (N:1, opcional)
  - `id_mensaje` → `mensajes_chat.id_mensaje` (N:1, opcional)
- **Campos:**
  - `tipo` (ENUM)
  - `titulo` (STRING)
  - `mensaje` (TEXT)
  - `leida` (BOOLEAN)
  - `fecha_creacion` (DATE)

---

### **21. AUDITORÍA**

#### **`sistema_auditoria`**
- **PK:** `id_auditoria` (INTEGER, AUTO_INCREMENT)
- **FK:**
  - `id_usuario` → `usuarios.id_usuario` (N:1)
- **Campos:**
  - `accion` (STRING)
  - `tabla_afectada` (STRING)
  - `registro_id` (INTEGER)
  - `datos_anteriores` (JSON)
  - `datos_nuevos` (JSON)
  - `ip_address` (STRING)
  - `user_agent` (STRING)
  - `fecha_accion` (DATE)

---

## 🔗 RELACIONES DETALLADAS

### **RELACIONES 1:1 (Uno a Uno)**

1. **Usuario ↔ Paciente**
   - `usuarios.id_usuario` → `pacientes.id_usuario`
   - Un usuario puede tener un paciente (opcional)

2. **Usuario ↔ Doctor**
   - `usuarios.id_usuario` → `doctores.id_usuario` (UNIQUE)
   - Un usuario puede tener un doctor (opcional, único)

---

### **RELACIONES 1:N (Uno a Muchos)**

#### **Desde `modulos`:**
- `modulos` → `pacientes` (1:N)
- `modulos` → `doctores` (1:N)

#### **Desde `usuarios`:**
- `usuarios` → `sistema_auditoria` (1:N)

#### **Desde `pacientes`:**
- `pacientes` → `signos_vitales` (1:N)
- `pacientes` → `citas` (1:N)
- `pacientes` → `planes_medicacion` (1:N)
- `pacientes` → `red_apoyo` (1:N)
- `pacientes` → `mensajes_chat` (1:N)
- `pacientes` → `esquema_vacunacion` (1:N)
- `pacientes` → `deteccion_complicaciones` (1:N)
- `pacientes` → `sesiones_educativas` (1:N)
- `pacientes` → `salud_bucal` (1:N)
- `pacientes` → `deteccion_tuberculosis` (1:N)
- `pacientes` → `puntos_chequeo` (1:N)
- `pacientes` → `solicitudes_reprogramacion` (1:N)
- `pacientes` → `notificaciones_doctor` (1:N)

#### **Desde `doctores`:**
- `doctores` → `citas` (1:N)
- `doctores` → `planes_medicacion` (1:N)
- `doctores` → `mensajes_chat` (1:N)
- `doctores` → `deteccion_complicaciones` (1:N)
- `doctores` → `notificaciones_doctor` (1:N)

#### **Desde `citas`:**
- `citas` → `signos_vitales` (1:N, opcional)
- `citas` → `diagnosticos` (1:N)
- `citas` → `planes_medicacion` (1:N, opcional)
- `citas` → `deteccion_complicaciones` (1:N, opcional)
- `citas` → `sesiones_educativas` (1:N, opcional)
- `citas` → `salud_bucal` (1:N, opcional)
- `citas` → `deteccion_tuberculosis` (1:N, opcional)
- `citas` → `puntos_chequeo` (1:N, opcional)
- `citas` → `solicitudes_reprogramacion` (1:N)
- `citas` → `notificaciones_doctor` (1:N, opcional)

#### **Desde `planes_medicacion`:**
- `planes_medicacion` → `plan_detalle` (1:N)
- `planes_medicacion` → `medicamento_toma` (1:N)

#### **Desde `plan_detalle`:**
- `plan_detalle` → `medicamento_toma` (1:N)

#### **Desde `medicamentos`:**
- `medicamentos` → `plan_detalle` (1:N)

#### **Desde `comorbilidades`:**
- `comorbilidades` → `deteccion_complicaciones` (1:N, opcional)

#### **Desde `mensajes_chat`:**
- `mensajes_chat` → `notificaciones_doctor` (1:N, opcional)

---

### **RELACIONES N:M (Muchos a Muchos)**

1. **Doctor ↔ Paciente**
   - **Tabla Intermedia:** `doctor_paciente`
   - Un doctor puede tener muchos pacientes
   - Un paciente puede tener muchos doctores

2. **Paciente ↔ Comorbilidad**
   - **Tabla Intermedia:** `paciente_comorbilidad`
   - Un paciente puede tener muchas comorbilidades
   - Una comorbilidad puede estar en muchos pacientes
   - **Campos adicionales en tabla intermedia:**
     - `fecha_deteccion`
     - `observaciones`
     - `anos_padecimiento`
     - `es_diagnostico_basal`
     - `es_agregado_posterior`
     - `año_diagnostico`
     - `recibe_tratamiento_no_farmacologico`
     - `recibe_tratamiento_farmacologico`

---

## 📊 DIAGRAMA DE RELACIONES

```
┌─────────────┐
│   USUARIO   │
└──────┬──────┘
       │ 1:1
       ├─────────────────┐
       │                 │
┌──────▼──────┐   ┌──────▼──────┐
│  PACIENTE   │   │   DOCTOR    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │ N:M             │ N:M
       │                 │
       ├─────────┬───────┤
       │         │       │
┌──────▼──────┐ │ ┌──────▼──────┐
│DOCTOR_PACIE │ │ │    CITAS     │
│    NTE      │ │ └──────┬───────┘
└─────────────┘ │        │
                │        │ 1:N
                │ ┌──────▼──────┐
                │ │SIGNOS_VITALES│
                │ └─────────────┘
                │
                │ ┌──────────────┐
                │ │  DIAGNOSTICO  │
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │PLAN_MEDICACION│
                │ └──────┬───────┘
                │        │ 1:N
                │ ┌──────▼──────┐
                │ │ PLAN_DETALLE│
                │ └──────┬──────┘
                │        │ 1:N
                │ ┌──────▼──────────┐
                │ │MEDICAMENTO_TOMA │
                │ └─────────────────┘
                │
                │ ┌──────────────┐
                │ │ MENSAJE_CHAT  │
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │  RED_APOYO    │
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │DETECCION_COMPL│
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │SESION_EDUCATI│
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │ SALUD_BUCAL  │
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │DETECCION_TB  │
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │PUNTO_CHEQUEO │
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │SOL_REPROGRAM │
                │ └──────────────┘
                │
                │ ┌──────────────┐
                │ │NOTIF_DOCTOR  │
                │ └──────────────┘
                │
                │ N:M
                │
┌───────────────▼──────┐
│PACIENTE_COMORBILIDAD │
└──────┬───────────────┘
       │
       │ N:1
┌──────▼──────┐
│ COMORBILIDAD│
└─────────────┘

┌─────────────┐
│   MODULO    │
└──────┬──────┘
       │ 1:N
       ├──────────────┐
       │              │
┌──────▼──────┐ ┌──────▼──────┐
│  PACIENTE   │ │   DOCTOR    │
└─────────────┘ └──────────────┘
```

---

## 🔑 CAMPOS CLAVE Y FOREIGN KEYS

### **Primary Keys (PK):**
- Todas las tablas tienen un `id_*` como PK (INTEGER, AUTO_INCREMENT)
- Excepciones:
  - `doctor_paciente`: PK compuesta (`id_doctor`, `id_paciente`)
  - `paciente_comorbilidad`: PK compuesta (`id_paciente`, `id_comorbilidad`)

### **Foreign Keys (FK) - Resumen:**

| Tabla | Foreign Keys |
|-------|-------------|
| `pacientes` | `id_usuario`, `id_modulo` |
| `doctores` | `id_usuario`, `id_modulo` |
| `citas` | `id_paciente`, `id_doctor` |
| `signos_vitales` | `id_paciente`, `id_cita` |
| `diagnosticos` | `id_cita` |
| `planes_medicacion` | `id_paciente`, `id_doctor`, `id_cita` |
| `plan_detalle` | `id_plan`, `id_medicamento` |
| `medicamento_toma` | `id_plan_medicacion`, `id_plan_detalle` |
| `mensajes_chat` | `id_paciente`, `id_doctor` |
| `red_apoyo` | `id_paciente` |
| `esquema_vacunacion` | `id_paciente`, `id_vacuna` |
| `deteccion_complicaciones` | `id_paciente`, `id_comorbilidad`, `id_cita`, `id_doctor` |
| `sesiones_educativas` | `id_paciente`, `id_cita` |
| `salud_bucal` | `id_paciente`, `id_cita` |
| `deteccion_tuberculosis` | `id_paciente`, `id_cita` |
| `doctor_paciente` | `id_doctor`, `id_paciente` |
| `paciente_comorbilidad` | `id_paciente`, `id_comorbilidad` |
| `puntos_chequeo` | `id_paciente`, `id_cita` |
| `solicitudes_reprogramacion` | `id_cita`, `id_paciente` |
| `notificaciones_doctor` | `id_doctor`, `id_paciente`, `id_cita`, `id_mensaje` |
| `sistema_auditoria` | `id_usuario` |
| `auth_credentials` | (Polimórfica: `user_type` + `user_id`) |
| `refresh_tokens` | `user_id` |

---

## 📈 ÍNDICES Y OPTIMIZACIÓN

### **Índices Únicos:**
- `usuarios.email` (UNIQUE)
- `doctores.id_usuario` (UNIQUE)
- `modulos.nombre_modulo` (UNIQUE)
- `comorbilidades.nombre_comorbilidad` (UNIQUE)
- `medicamentos.nombre_medicamento` (UNIQUE)
- `vacunas.nombre_vacuna` (UNIQUE)

### **Índices Compuestos:**
- `doctor_paciente`: (`id_doctor`, `id_paciente`) - PK compuesta
- `paciente_comorbilidad`: (`id_paciente`, `id_comorbilidad`) - PK compuesta
- `auth_credentials`: (`user_type`, `user_id`, `auth_method`)
- `auth_credentials`: (`user_type`, `user_id`, `is_primary`)

### **Índices de Rendimiento:**
- `signos_vitales`: `idx_paciente`, `idx_cita`, `idx_fecha_medicion`
- `deteccion_complicaciones`: `idx_paciente`, `idx_comorbilidad`, `idx_cita`, `idx_fecha_deteccion`
- `sesiones_educativas`: `idx_paciente`, `idx_cita`, `idx_fecha_sesion`, `idx_tipo_sesion`
- `auth_credentials`: `idx_user_lookup`, `idx_device_lookup`, `idx_locked_until`, `idx_primary_credential`

---

## 🔐 SEGURIDAD Y ENCRIPTACIÓN

### **Campos Encriptados (AES-256-GCM):**
- `pacientes.curp` (TEXT)
- `pacientes.direccion` (TEXT)
- `pacientes.numero_celular` (TEXT)

### **Campos con Hash:**
- `usuarios.password_hash` (bcrypt)
- `auth_credentials.credential_value` (bcrypt para password/pin)

---

## 📝 NOTAS IMPORTANTES

1. **Encriptación:** Los campos sensibles de `pacientes` se encriptan automáticamente mediante hooks de Sequelize.

2. **Relaciones Opcionales:** Muchas relaciones son opcionales (nullable), permitiendo flexibilidad en el registro de datos.

3. **Tablas de Unión:** `doctor_paciente` y `paciente_comorbilidad` almacenan información adicional además de la relación.

4. **Auditoría:** `sistema_auditoria` registra todas las acciones importantes del sistema.

5. **Autenticación:** `auth_credentials` es un sistema unificado que reemplaza las tablas legacy de autenticación.

6. **Refresh Tokens:** `refresh_tokens` permite renovación segura de tokens JWT.

---

**Última Actualización:** 31 de Diciembre, 2025

