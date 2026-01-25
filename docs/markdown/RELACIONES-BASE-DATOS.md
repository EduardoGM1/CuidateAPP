# 📊 RELACIONES DE BASE DE DATOS - MODELO ENTIDAD-RELACIÓN

**Fecha:** 30 de Diciembre, 2025  
**Sistema:** API Clínica - Base de Datos MySQL

---

## 🔑 RELACIONES UNO A UNO (1:1)

### **1. Usuario ↔ Paciente**
- **Tipo:** 1:1
- **Descripción:** Un usuario puede ser un paciente
- **Foreign Key:** `pacientes.id_usuario` → `usuarios.id_usuario`
- **Nota:** Un usuario puede ser paciente O doctor, pero no ambos

### **2. Usuario ↔ Doctor**
- **Tipo:** 1:1
- **Descripción:** Un usuario puede ser un doctor
- **Foreign Key:** `doctores.id_usuario` → `usuarios.id_usuario`
- **Nota:** Un usuario puede ser doctor O paciente, pero no ambos

---

## 📋 RELACIONES UNO A MUCHOS (1:N)

### **ENTIDADES PRINCIPALES**

#### **Paciente (1) → Muchos (N)**

1. **Paciente → Signos Vitales**
   - `pacientes.id_paciente` → `signos_vitales.id_paciente`
   - Un paciente puede tener múltiples registros de signos vitales

2. **Paciente → Citas**
   - `pacientes.id_paciente` → `citas.id_paciente`
   - Un paciente puede tener múltiples citas

3. **Paciente → Planes de Medicación**
   - `pacientes.id_paciente` → `planes_medicacion.id_paciente`
   - Un paciente puede tener múltiples planes de medicación

4. **Paciente → Red de Apoyo**
   - `pacientes.id_paciente` → `red_apoyo.id_paciente`
   - Un paciente puede tener múltiples contactos de apoyo

5. **Paciente → Mensajes de Chat**
   - `pacientes.id_paciente` → `mensajes_chat.id_paciente`
   - Un paciente puede tener múltiples mensajes

6. **Paciente → Esquemas de Vacunación**
   - `pacientes.id_paciente` → `esquemas_vacunacion.id_paciente`
   - Un paciente puede tener múltiples registros de vacunación

7. **Paciente → Puntos de Chequeo**
   - `pacientes.id_paciente` → `puntos_chequeo.id_paciente`
   - Un paciente puede tener múltiples puntos de chequeo

8. **Paciente → Solicitudes de Reprogramación**
   - `pacientes.id_paciente` → `solicitudes_reprogramacion.id_paciente`
   - Un paciente puede tener múltiples solicitudes

9. **Paciente → Notificaciones Doctor**
   - `pacientes.id_paciente` → `notificaciones_doctor.id_paciente`
   - Un paciente puede generar múltiples notificaciones

10. **Paciente → Detecciones de Complicaciones**
    - `pacientes.id_paciente` → `deteccion_complicaciones.id_paciente`
    - Un paciente puede tener múltiples detecciones

11. **Paciente → Sesiones Educativas**
    - `pacientes.id_paciente` → `sesiones_educativas.id_paciente`
    - Un paciente puede tener múltiples sesiones educativas

12. **Paciente → Salud Bucal**
    - `pacientes.id_paciente` → `salud_bucal.id_paciente`
    - Un paciente puede tener múltiples registros de salud bucal

13. **Paciente → Detecciones de Tuberculosis**
    - `pacientes.id_paciente` → `deteccion_tuberculosis.id_paciente`
    - Un paciente puede tener múltiples detecciones

---

#### **Doctor (1) → Muchos (N)**

1. **Doctor → Citas**
   - `doctores.id_doctor` → `citas.id_doctor`
   - Un doctor puede atender múltiples citas

2. **Doctor → Planes de Medicación**
   - `doctores.id_doctor` → `planes_medicacion.id_doctor`
   - Un doctor puede prescribir múltiples planes

3. **Doctor → Mensajes de Chat**
   - `doctores.id_doctor` → `mensajes_chat.id_doctor`
   - Un doctor puede tener múltiples mensajes

4. **Doctor → Notificaciones Doctor**
   - `doctores.id_doctor` → `notificaciones_doctor.id_doctor`
   - Un doctor puede recibir múltiples notificaciones

5. **Doctor → Detecciones de Complicaciones**
   - `doctores.id_doctor` → `deteccion_complicaciones.id_doctor`
   - Un doctor puede registrar múltiples detecciones

---

#### **Cita (1) → Muchos (N)**

1. **Cita → Signos Vitales**
   - `citas.id_cita` → `signos_vitales.id_cita` (opcional)
   - Una cita puede tener múltiples registros de signos vitales

2. **Cita → Diagnósticos**
   - `citas.id_cita` → `diagnosticos.id_cita`
   - Una cita puede tener múltiples diagnósticos

3. **Cita → Planes de Medicación**
   - `citas.id_cita` → `planes_medicacion.id_cita` (opcional)
   - Una cita puede generar múltiples planes

4. **Cita → Puntos de Chequeo**
   - `citas.id_cita` → `puntos_chequeo.id_cita` (opcional)
   - Una cita puede tener múltiples puntos de chequeo

5. **Cita → Solicitudes de Reprogramación**
   - `citas.id_cita` → `solicitudes_reprogramacion.id_cita`
   - Una cita puede tener múltiples solicitudes

6. **Cita → Notificaciones Doctor**
   - `citas.id_cita` → `notificaciones_doctor.id_cita` (opcional)
   - Una cita puede generar múltiples notificaciones

7. **Cita → Detecciones de Complicaciones**
   - `citas.id_cita` → `deteccion_complicaciones.id_cita` (opcional)
   - Una cita puede tener múltiples detecciones

8. **Cita → Sesiones Educativas**
   - `citas.id_cita` → `sesiones_educativas.id_cita` (opcional)
   - Una cita puede tener múltiples sesiones

9. **Cita → Salud Bucal**
   - `citas.id_cita` → `salud_bucal.id_cita` (opcional)
   - Una cita puede tener registros de salud bucal

10. **Cita → Detecciones de Tuberculosis**
    - `citas.id_cita` → `deteccion_tuberculosis.id_cita` (opcional)
    - Una cita puede tener múltiples detecciones

---

#### **PlanMedicacion (1) → Muchos (N)**

1. **PlanMedicacion → PlanDetalle**
   - `planes_medicacion.id_plan` → `planes_detalle.id_plan`
   - Un plan puede tener múltiples detalles (medicamentos)

2. **PlanMedicacion → MedicamentoToma**
   - `planes_medicacion.id_plan_medicacion` → `medicamentos_toma.id_plan_medicacion`
   - Un plan puede tener múltiples registros de toma

---

#### **PlanDetalle (1) → Muchos (N)**

1. **PlanDetalle → MedicamentoToma**
   - `planes_detalle.id_plan_detalle` → `medicamentos_toma.id_plan_detalle`
   - Un detalle puede tener múltiples tomas registradas

---

#### **Medicamento (1) → Muchos (N)**

1. **Medicamento → PlanDetalle**
   - `medicamentos.id_medicamento` → `planes_detalle.id_medicamento`
   - Un medicamento puede estar en múltiples planes

---

#### **Comorbilidad (1) → Muchos (N)**

1. **Comorbilidad → Detecciones de Complicaciones**
   - `comorbilidades.id_comorbilidad` → `deteccion_complicaciones.id_comorbilidad` (opcional)
   - Una comorbilidad puede tener múltiples detecciones

---

#### **Modulo (1) → Muchos (N)**

1. **Modulo → Pacientes**
   - `modulos.id_modulo` → `pacientes.id_modulo`
   - Un módulo puede tener múltiples pacientes

2. **Modulo → Doctores**
   - `modulos.id_modulo` → `doctores.id_modulo`
   - Un módulo puede tener múltiples doctores

---

#### **Usuario (1) → Muchos (N)**

1. **Usuario → SistemaAuditoria**
   - `usuarios.id_usuario` → `sistema_auditoria.id_usuario`
   - Un usuario puede tener múltiples registros de auditoría

---

#### **MensajeChat (1) → Muchos (N)**

1. **MensajeChat → Notificaciones Doctor**
   - `mensajes_chat.id_mensaje` → `notificaciones_doctor.id_mensaje` (opcional)
   - Un mensaje puede generar múltiples notificaciones

---

## 🔗 RELACIONES MUCHOS A MUCHOS (N:M)

### **1. Doctor ↔ Paciente (N:M)**
- **Tabla Intermedia:** `doctor_paciente`
- **Foreign Keys:**
  - `doctor_paciente.id_doctor` → `doctores.id_doctor`
  - `doctor_paciente.id_paciente` → `pacientes.id_paciente`
- **Descripción:** Un doctor puede atender múltiples pacientes, y un paciente puede ser atendido por múltiples doctores
- **Campos adicionales en tabla intermedia:**
  - `fecha_asignacion`
  - `activo`
  - `observaciones`

### **2. Paciente ↔ Comorbilidad (N:M)**
- **Tabla Intermedia:** `paciente_comorbilidad`
- **Foreign Keys:**
  - `paciente_comorbilidad.id_paciente` → `pacientes.id_paciente`
  - `paciente_comorbilidad.id_comorbilidad` → `comorbilidades.id_comorbilidad`
- **Descripción:** Un paciente puede tener múltiples comorbilidades, y una comorbilidad puede estar presente en múltiples pacientes
- **Campos adicionales en tabla intermedia:**
  - `fecha_deteccion`
  - `es_diagnostico_basal` ✅ (Nuevo)
  - `año_diagnostico` ✅ (Nuevo)
  - `es_agregado_posterior` ✅ (Nuevo)
  - `recibe_tratamiento_no_farmacologico` ✅ (Nuevo)
  - `recibe_tratamiento_farmacologico` ✅ (Nuevo)

---

## 📊 DIAGRAMA DE RELACIONES PRINCIPALES

```
┌──────────┐
│ Usuario  │
└────┬─────┘
     │
     ├───(1:1)───→ Paciente
     │
     └───(1:1)───→ Doctor

┌──────────┐
│ Paciente │
└────┬─────┘
     │
     ├───(1:N)───→ Signos Vitales
     ├───(1:N)───→ Citas
     ├───(1:N)───→ Planes Medicación
     ├───(1:N)───→ Red Apoyo
     ├───(1:N)───→ Mensajes Chat
     ├───(1:N)───→ Esquemas Vacunación
     ├───(1:N)───→ Puntos Chequeo
     ├───(1:N)───→ Solicitudes Reprogramación
     ├───(1:N)───→ Notificaciones Doctor
     ├───(1:N)───→ Detecciones Complicaciones
     ├───(1:N)───→ Sesiones Educativas
     ├───(1:N)───→ Salud Bucal
     ├───(1:N)───→ Detecciones Tuberculosis
     │
     └───(N:M)───→ Comorbilidades (vía paciente_comorbilidad)
     └───(N:M)───→ Doctores (vía doctor_paciente)

┌──────────┐
│  Doctor  │
└────┬─────┘
     │
     ├───(1:N)───→ Citas
     ├───(1:N)───→ Planes Medicación
     ├───(1:N)───→ Mensajes Chat
     ├───(1:N)───→ Notificaciones Doctor
     ├───(1:N)───→ Detecciones Complicaciones
     │
     └───(N:M)───→ Pacientes (vía doctor_paciente)

┌──────────┐
│   Cita   │
└────┬─────┘
     │
     ├───(1:N)───→ Signos Vitales
     ├───(1:N)───→ Diagnósticos
     ├───(1:N)───→ Planes Medicación
     ├───(1:N)───→ Puntos Chequeo
     ├───(1:N)───→ Solicitudes Reprogramación
     ├───(1:N)───→ Notificaciones Doctor
     ├───(1:N)───→ Detecciones Complicaciones
     ├───(1:N)───→ Sesiones Educativas
     ├───(1:N)───→ Salud Bucal
     └───(1:N)───→ Detecciones Tuberculosis

┌──────────────┐
│PlanMedicacion│
└──────┬───────┘
       │
       ├───(1:N)───→ PlanDetalle
       └───(1:N)───→ MedicamentoToma

┌──────────────┐
│ PlanDetalle  │
└──────┬───────┘
       │
       └───(1:N)───→ MedicamentoToma
```

---

## 📋 RESUMEN POR TIPO DE RELACIÓN

### **Relaciones 1:1 (2)**
- Usuario ↔ Paciente
- Usuario ↔ Doctor

### **Relaciones 1:N (40+)**
- Paciente → 13 relaciones
- Doctor → 5 relaciones
- Cita → 10 relaciones
- PlanMedicacion → 2 relaciones
- PlanDetalle → 1 relación
- Medicamento → 1 relación
- Comorbilidad → 1 relación
- Modulo → 2 relaciones
- Usuario → 1 relación
- MensajeChat → 1 relación

### **Relaciones N:M (2)**
- Doctor ↔ Paciente (vía `doctor_paciente`)
- Paciente ↔ Comorbilidad (vía `paciente_comorbilidad`)

---

## 🔍 TABLAS INTERMEDIAS (Junction Tables)

### **1. doctor_paciente**
- **Propósito:** Relación N:M entre doctores y pacientes
- **Foreign Keys:**
  - `id_doctor` → `doctores.id_doctor`
  - `id_paciente` → `pacientes.id_paciente`
- **Campos adicionales:**
  - `fecha_asignacion`
  - `activo`
  - `observaciones`

### **2. paciente_comorbilidad**
- **Propósito:** Relación N:M entre pacientes y comorbilidades
- **Foreign Keys:**
  - `id_paciente` → `pacientes.id_paciente`
  - `id_comorbilidad` → `comorbilidades.id_comorbilidad`
- **Campos adicionales:**
  - `fecha_deteccion`
  - `es_diagnostico_basal` ✅
  - `año_diagnostico` ✅
  - `es_agregado_posterior` ✅
  - `recibe_tratamiento_no_farmacologico` ✅
  - `recibe_tratamiento_farmacologico` ✅

---

## 📊 ENTIDADES SIN RELACIONES DIRECTAS

### **Tablas Independientes:**
- `medicamentos` - Catálogo de medicamentos (relacionado solo vía PlanDetalle)
- `comorbilidades` - Catálogo de comorbilidades (relacionado vía PacienteComorbilidad)
- `vacunas` - Catálogo de vacunas (relacionado vía EsquemaVacunacion)
- `modulos` - Módulos del sistema
- `auth_credentials` - Credenciales de autenticación (relación polimórfica)

---

## 🔑 CLAVES FORÁNEAS PRINCIPALES

### **Paciente (id_paciente)**
- Referenciado en: 20+ tablas
- Es la entidad central del sistema

### **Cita (id_cita)**
- Referenciado en: 10+ tablas
- Conecta múltiples entidades médicas

### **Doctor (id_doctor)**
- Referenciado en: 7+ tablas
- Entidad clave para atención médica

### **Usuario (id_usuario)**
- Referenciado en: Paciente, Doctor, SistemaAuditoria
- Base del sistema de autenticación

---

## 📝 NOTAS IMPORTANTES

1. **Relaciones Opcionales:** Muchas relaciones con `Cita` son opcionales (pueden ser NULL)
2. **Normalización:** El modelo sigue 3NF (Tercera Forma Normal)
3. **Integridad Referencial:** Todas las relaciones tienen foreign keys definidas
4. **Cascadas:** Algunas relaciones pueden tener `ON DELETE CASCADE` según el modelo
5. **Alias:** Algunas relaciones usan alias (`as:`) para evitar conflictos de nombres

---

**Última Actualización:** 30 de Diciembre, 2025

