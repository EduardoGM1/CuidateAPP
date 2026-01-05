# 📊 DIAGRAMA DE RELACIONES - BASE DE DATOS

**Fecha:** 30 de Diciembre, 2025

---

## 🎯 ENTIDADES PRINCIPALES Y SUS RELACIONES

### **1. USUARIO (Tabla Central de Autenticación)**

```
Usuario (1:1) → Paciente
Usuario (1:1) → Doctor
Usuario (1:N) → SistemaAuditoria
```

---

### **2. PACIENTE (Entidad Central del Sistema)**

**Relaciones 1:N:**
- Paciente → Signos Vitales
- Paciente → Citas
- Paciente → Planes Medicación
- Paciente → Red Apoyo
- Paciente → Mensajes Chat
- Paciente → Esquemas Vacunación
- Paciente → Puntos Chequeo
- Paciente → Solicitudes Reprogramación
- Paciente → Notificaciones Doctor
- Paciente → Detecciones Complicaciones
- Paciente → Sesiones Educativas
- Paciente → Salud Bucal
- Paciente → Detecciones Tuberculosis

**Relaciones N:M:**
- Paciente ↔ Doctor (vía `doctor_paciente`)
- Paciente ↔ Comorbilidad (vía `paciente_comorbilidad`)

**Relaciones 1:1:**
- Paciente ← Usuario

---

### **3. DOCTOR**

**Relaciones 1:N:**
- Doctor → Citas
- Doctor → Planes Medicación
- Doctor → Mensajes Chat
- Doctor → Notificaciones Doctor
- Doctor → Detecciones Complicaciones

**Relaciones N:M:**
- Doctor ↔ Paciente (vía `doctor_paciente`)

**Relaciones 1:1:**
- Doctor ← Usuario

**Relaciones 1:N (desde Modulo):**
- Modulo → Doctor

---

### **4. CITA (Tabla Conectora Principal)**

**Relaciones 1:N:**
- Cita → Signos Vitales
- Cita → Diagnósticos
- Cita → Planes Medicación
- Cita → Puntos Chequeo
- Cita → Solicitudes Reprogramación
- Cita → Notificaciones Doctor
- Cita → Detecciones Complicaciones
- Cita → Sesiones Educativas
- Cita → Salud Bucal
- Cita → Detecciones Tuberculosis

**Relaciones N:1:**
- Cita ← Paciente
- Cita ← Doctor

---

### **5. PLAN MEDICACIÓN**

**Relaciones 1:N:**
- PlanMedicacion → PlanDetalle
- PlanMedicacion → MedicamentoToma

**Relaciones N:1:**
- PlanMedicacion ← Paciente
- PlanMedicacion ← Doctor
- PlanMedicacion ← Cita

---

### **6. PLAN DETALLE**

**Relaciones 1:N:**
- PlanDetalle → MedicamentoToma

**Relaciones N:1:**
- PlanDetalle ← PlanMedicacion
- PlanDetalle ← Medicamento

---

### **7. COMORBILIDAD**

**Relaciones N:M:**
- Comorbilidad ↔ Paciente (vía `paciente_comorbilidad`)

**Relaciones 1:N:**
- Comorbilidad → Detecciones Complicaciones

---

## 🔗 RELACIONES CRÍTICAS

### **Flujo de Atención Médica:**

```
Paciente → Cita → Signos Vitales
         → Cita → Diagnóstico
         → Cita → Plan Medicación → Plan Detalle → Medicamento
         → Cita → Detección Complicaciones
```

### **Flujo de Comorbilidades:**

```
Paciente ↔ Comorbilidad (N:M)
         → Detección Complicaciones (relacionada con Comorbilidad)
```

### **Flujo de Asignación:**

```
Doctor ↔ Paciente (N:M vía doctor_paciente)
      → Cita
      → Plan Medicación
```

---

## 📊 ESTADÍSTICAS

- **Total de Tablas:** 25+
- **Relaciones 1:1:** 2
- **Relaciones 1:N:** 40+
- **Relaciones N:M:** 2
- **Tablas Intermedias:** 2

---

**Última Actualización:** 30 de Diciembre, 2025

