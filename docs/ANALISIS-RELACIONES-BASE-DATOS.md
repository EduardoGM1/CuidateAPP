# 📊 ANÁLISIS COMPLETO DE RELACIONES - BASE DE DATOS CLÍNICA

**Fecha:** 28 Octubre 2025, 02:30 AM  
**Archivo analizado:** `api-clinica/models/associations.js`

---

## 🗂️ ENTIDADES PRINCIPALES (17 Tablas)

### 1. **ENTIDADES BASE**
- `Usuario` - Usuarios del sistema
- `Modulo` - Módulos de consulta (1, 2, 3, 4, 5)
- `Paciente` - Pacientes del sistema
- `Doctor` - Doctores/Profesionales de salud

### 2. **ENTIDADES MÉDICAS**
- `Cita` - Citas médicas
- `SignoVital` - Signos vitales del paciente
- `Diagnostico` - Diagnósticos médicos
- `PlanMedicacion` - Planes de medicación
- `PlanDetalle` - Detalle de medicamentos en un plan
- `Medicamento` - Catálogo de medicamentos
- `Comorbilidad` - Comorbilidades/Enfermedades crónicas
- `PuntoChequeo` - Puntos de control de asistencia

### 3. **ENTIDADES DE APOYO**
- `RedApoyo` - Red de apoyo del paciente
- `EsquemaVacunacion` - Esquema de vacunación
- `MensajeChat` - Mensajes entre paciente y doctor
- `PacienteAuth` - Autenticación del paciente
- `PacienteAuthPIN` - PIN de autenticación del paciente

### 4. **TABLAS DE UNIÓN (Many-to-Many)**
- `DoctorPaciente` - Asignación de pacientes a doctores
- `PacienteComorbilidad` - Comorbilidades de cada paciente

---

## 🔗 RELACIONES DETALLADAS

### **RELACIONES 1:1**

#### 1. **Usuario ↔ Paciente**
- Un Usuario tiene UN Paciente
- Un Paciente pertenece a UN Usuario
- **FK:** `Paciente.id_usuario` → `Usuario.id_usuario`
- **Propósito:** Sistema de autenticación para pacientes

#### 2. **Usuario ↔ Doctor**
- Un Usuario tiene UN Doctor
- Un Doctor pertenece a UN Usuario
- **FK:** `Doctor.id_usuario` → `Usuario.id_usuario`
- **Propósito:** Sistema de autenticación para doctores

#### 3. **Paciente ↔ PacienteAuth**
- Un Paciente tiene UN registro de autenticación
- **FK:** `PacienteAuth.id_paciente` → `Paciente.id_paciente`
- **Propósito:** Autenticación específica para pacientes (login con PIN)

#### 4. **PacienteAuth ↔ PacienteAuthPIN**
- Un PacienteAuth tiene UN PIN
- **FK:** `PacienteAuthPIN.id_auth` → `PacienteAuth.id_auth`
- **Propósito:** Almacenar PIN de acceso del paciente

---

### **RELACIONES 1:N**

#### 5. **Modulo ↔ Paciente (1:N)**
- **Propósito:** Asignar pacientes a módulos de consulta
- **FK:** `Paciente.id_modulo` → `Modulo.id_modulo`
- **Ejemplo:** Módulo 1 puede tener múltiples pacientes

#### 6. **Modulo ↔ Doctor (1:N)**
- **Propósito:** Asignar doctores a módulos de consulta
- **FK:** `Doctor.id_modulo` → `Modulo.id_modulo`
- **Ejemplo:** Módulo 1 puede tener múltiples doctores

#### 7. **Paciente ↔ Cita (1:N)**
- **Propósito:** Una paciente puede tener múltiples citas
- **FK:** `Cita.id_paciente` → `Paciente.id_paciente`
- **Notas:** Citas médicas con fecha, motivo, asistencia

#### 8. **Doctor ↔ Cita (1:N)**
- **Propósito:** Un doctor puede atender múltiples citas
- **FK:** `Cita.id_doctor` → `Doctor.id_doctor`
- **Notas:** Es nullable (citas pueden no tener doctor asignado inicialmente)

#### 9. **Cita ↔ SignoVital (1:N)**
- **Propósito:** Cada cita puede tener múltiples registros de signos vitales
- **FK:** `SignoVital.id_cita` → `Cita.id_cita`
- **Notas:** Los signos vitales están relacionados con una cita específica

#### 10. **Paciente ↔ SignoVital (1:N)**
- **Propósito:** Un paciente puede tener múltiples registros de signos vitales
- **FK:** `SignoVital.id_paciente` → `Paciente.id_paciente`
- **Notas:** Histórico completo de signos vitales del paciente

#### 11. **Cita ↔ Diagnostico (1:N)**
- **Propósito:** Una cita puede tener múltiples diagnósticos
- **FK:** `Diagnostico.id_cita` → `Cita.id_cita`
- **Notas:** Un paciente puede tener múltiples diagnósticos en una visita

#### 12. **Cita ↔ PlanMedicacion (1:N)**
- **Propósito:** Una cita puede generar múltiples planes de medicación
- **FK:** `PlanMedicacion.id_cita` → `Cita.id_cita`
- **Notas:** Los planes de medicación pueden estar asociados a una cita

#### 13. **Paciente ↔ PlanMedicacion (1:N)**
- **Propósito:** Un paciente puede tener múltiples planes de medicación
- **FK:** `PlanMedicacion.id_paciente` → `Paciente.id_paciente`
- **Notas:** Historial de tratamientos médicos

#### 14. **Doctor ↔ PlanMedicacion (1:N)**
- **Propósito:** Un doctor puede prescribir múltiples planes
- **FK:** `PlanMedicacion.id_doctor` → `Doctor.id_doctor`
- **Notas:** Registro de quién prescribió el plan

#### 15. **Paciente ↔ RedApoyo (1:N)**
- **Propósito:** Un paciente puede tener múltiples contactos de apoyo
- **FK:** `RedApoyo.id_paciente` → `Paciente.id_paciente`
- **Notas:** Familiares, tutores, responsables

#### 16. **Paciente ↔ EsquemaVacunacion (1:N)**
- **Propósito:** Un paciente puede tener múltiples vacunas registradas
- **FK:** `EsquemaVacunacion.id_paciente` → `Paciente.id_paciente`
- **Notas:** Historial de vacunación completo

#### 17. **Paciente ↔ PuntoChequeo (1:N)**
- **Propósito:** Un paciente puede tener múltiples puntos de control
- **FK:** `PuntoChequeo.id_paciente` → `Paciente.id_paciente`
- **Notas:** Control de asistencia y chequeos

#### 18. **Cita ↔ PuntoChequeo (1:N)**
- **Propósito:** Una cita puede tener múltiples puntos de control
- **FK:** `PuntoChequeo.id_cita` → `Cita.id_cita`
- **Notas:** Control de antropometría, parámetros, etc.

#### 19. **Paciente ↔ MensajeChat (1:N)**
- **Propósito:** Un paciente puede tener múltiples mensajes
- **FK:** `MensajeChat.id_paciente` → `Paciente.id_paciente`
- **Notas:** Comunicación entre paciente y doctor

#### 20. **Doctor ↔ MensajeChat (1:N)**
- **Propósito:** Un doctor puede tener múltiples mensajes
- **FK:** `MensajeChat.id_doctor` → `Doctor.id_doctor`
- **Notas:** Comunicación bidireccional

#### 21. **PlanMedicacion ↔ PlanDetalle (1:N)**
- **Propósito:** Un plan de medicación tiene múltiples medicamentos
- **FK:** `PlanDetalle.id_plan` → `PlanMedicacion.id_plan`
- **Notas:** Detalle específico de cada medicamento en el plan

#### 22. **Medicamento ↔ PlanDetalle (1:N)**
- **Propósito:** Un medicamento puede estar en múltiples planes
- **FK:** `PlanDetalle.id_medicamento` → `Medicamento.id_medicamento`
- **Notas:** Relación con catálogo de medicamentos

---

### **RELACIONES N:M (MANY-TO-MANY)**

#### 23. **Doctor ↔ Paciente (N:M) a través de `DoctorPaciente`**
- **Propósito:** Un doctor puede atender múltiples pacientes, un paciente puede tener múltiples doctores
- **Tabla de unión:** `DoctorPaciente`
- **FKs:** 
  - `DoctorPaciente.id_doctor` → `Doctor.id_doctor`
  - `DoctorPaciente.id_paciente` → `Paciente.id_paciente`
- **Notas:** Asignación flexible de pacientes a doctores

#### 24. **Paciente ↔ Comorbilidad (N:M) a través de `PacienteComorbilidad`**
- **Propósito:** Un paciente puede tener múltiples comorbilidades
- **Tabla de unión:** `PacienteComorbilidad`
- **FKs:**
  - `PacienteComorbilidad.id_paciente` → `Paciente.id_paciente`
  - `PacienteComorbilidad.id_comorbilidad` → `Comorbilidad.id_comorbilidad`
- **Notas:** Registro de enfermedades crónicas del paciente

---

## 📐 DIAGRAMA DE RELACIONES

```
┌─────────────────────────────────────────────────────────────┐
│                     ENTIDADES BASE                          │
├─────────────────────────────────────────────────────────────┤
│ Usuario (1:1) → Paciente                                    │
│ Usuario (1:1) → Doctor                                     │
│ Modulo (1:N) → Paciente                                    │
│ Modulo (1:N) → Doctor                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  ENTIDADES MÉDICAS                          │
├─────────────────────────────────────────────────────────────┤
│ Paciente (1:N) → Cita ← (1:N) Doctor                       │
│ Cita (1:N) → SignoVital ← (1:N) Paciente                   │
│ Cita (1:N) → Diagnostico                                    │
│ Cita (1:N) → PlanMedicacion ← (1:N) Paciente & Doctor     │
│ Cita (1:N) → PuntoChequeo ← (1:N) Paciente                  │
│ PlanMedicacion (1:N) → PlanDetalle ← (1:N) Medicamento     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ENTIDADES DE APOYO                       │
├─────────────────────────────────────────────────────────────┤
│ Paciente (1:N) → RedApoyo                                   │
│ Paciente (1:N) → EsquemaVacunacion                          │
│ Paciente (1:N) → MensajeChat ← (1:N) Doctor                 │
│ Paciente (1:1) → PacienteAuth (1:1) → PacienteAuthPIN      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              RELACIONES MANY-TO-MANY                         │
├─────────────────────────────────────────────────────────────┤
│ Doctor (N:M) Paciente [through: DoctorPaciente]            │
│ Paciente (N:M) Comorbilidad [through: PacienteComorbilidad] │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 CLAVES FORÁNEAS IMPORTANTES

### **Paciente**
- `id_usuario` → Usuario
- `id_modulo` → Modulo

### **Doctor**
- `id_usuario` → Usuario
- `id_modulo` → Modulo

### **Cita**
- `id_paciente` → Paciente
- `id_doctor` → Doctor (nullable)

### **SignoVital**
- `id_paciente` → Paciente
- `id_cita` → Cita

### **PlanDetalle**
- `id_plan` → PlanMedicacion
- `id_medicamento` → Medicamento

### **PuntoChequeo**
- `id_paciente` → Paciente
- `id_cita` → Cita

### **MensajeChat**
- `id_paciente` → Paciente
- `id_doctor` → Doctor

---

## 📋 NOTAS IMPORTANTES

### **Cascadas y Constraints**
- Las relaciones usan Sequelize estándar
- No hay `onDelete: CASCADE` explícito en el código
- Depende de la configuración de MySQL

### **Nullables importantes**
- `Cita.id_doctor` es **nullable** (citas pueden no tener doctor asignado inicialmente)
- `SignoVital.id_cita` es **nullable** (pueden existir signos vitales sin cita asociada)

### **Relaciones múltiples**
- `SignoVital` puede pertenecer a UN paciente Y UNA cita simultáneamente
- `PlanMedicacion` pertenece a UN paciente, UN doctor Y UNA cita
- `PuntoChequeo` pertenece a UN paciente Y UNA cita

---

## 🎯 USOS COMUNES

### **Para obtener todos los datos de un paciente:**
```javascript
const paciente = await Paciente.findByPk(id, {
  include: [
    { model: Usuario },
    { model: Modulo },
    { model: Cita, include: [{ model: Doctor }, { model: Diagnostico }, { model: SignoVital }] },
    { model: SignoVital },
    { model: PlanMedicacion, include: [{ model: PlanDetalle, include: [{ model: Medicamento }] }] },
    { model: RedApoyo },
    { model: EsquemaVacunacion },
    { model: PuntoChequeo },
    { model: Comorbilidad, through: PacienteComorbilidad },
    { model: Doctor, through: DoctorPaciente },
    { model: PacienteAuth, include: [{ model: PacienteAuthPIN }] }
  ]
});
```

### **Para obtener citas de un doctor:**
```javascript
const doctor = await Doctor.findByPk(id, {
  include: [{ model: Cita, include: [{ model: Paciente }] }]
});
```

---

**Autor:** AI Assistant  
**Fecha:** 28/10/2025 02:30 AM


