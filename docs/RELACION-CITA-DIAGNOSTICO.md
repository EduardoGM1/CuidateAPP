# 📋 RELACIÓN: CITA - DIAGNÓSTICO

**Fecha:** 28/10/2025  
**Tipo de Relación:** One-to-Many (1:N)

---

## 🔗 RELACIÓN EN LA BASE DE DATOS

### **Estructura:**

```
CITA (1) ────────< (N) DIAGNÓSTICO
```

- **Una CITA** puede tener **varios DIAGNÓSTICOS**
- **Un DIAGNÓSTICO** pertenece a **una sola CITA**

---

## 📊 MODELOS

### **Modelo Cita:**
```javascript
id_cita (PK)
id_paciente
id_doctor
fecha_cita
motivo
asistencia
es_primera_consulta
observaciones
```

### **Modelo Diagnostico:**
```javascript
id_diagnostico (PK)
id_cita (FK)  // ← Clave foránea hacia Cita
descripcion
fecha_registro
```

---

## 🔗 ASOCIACIÓN SEQUELIZE

```javascript
// En api-clinica/models/associations.js

// Cita - Diagnostico (1:N)
Cita.hasMany(Diagnostico, { foreignKey: 'id_cita' });
Diagnostico.belongsTo(Cita, { foreignKey: 'id_cita' });
```

**Significado:**
- Una Cita puede tener muchos Diagnósticos
- Un Diagnóstico pertenece a una Cita
- La clave foránea es `id_cita` en la tabla `diagnosticos`

---

## 💡 CASOS DE USO

### **1. Crear Diagnóstico:**
```javascript
// El diagnóstico se asocia automáticamente a la cita
const diagnostico = await Diagnostico.create({
  id_cita: citaId,
  descripcion: 'Diabetes tipo 2',
  fecha_registro: new Date()
});
```

### **2. Obtener Diagnósticos de una Cita:**
```javascript
const cita = await Cita.findOne({
  where: { id_cita: citaId },
  include: [{
    model: Diagnostico,
    required: false // LEFT JOIN
  }]
});

const diagnosticos = cita.Diagnosticos; // Array de diagnósticos
```

### **3. Obtener Cita de un Diagnóstico:**
```javascript
const diagnostico = await Diagnostico.findOne({
  where: { id_diagnostico: diagnosticoId },
  include: [{
    model: Cita,
    required: true, // INNER JOIN
    include: [{
      model: Doctor // También incluir el doctor
    }]
  }]
});

const cita = diagnostico.Cita;
const doctor = diagnostico.Cita.Doctor;
```

---

## 🎯 EN LA APLICACIÓN

### **Flujo Normal:**
1. Se crea una **Cita** para el paciente
2. En la consulta, el doctor asigna **Diagnósticos**
3. Los **Diagnósticos** quedan asociados a esa **Cita**
4. El diagnóstico incluye: descripción, fecha, cita asociada

### **Pantalla de Detalle Paciente:**
- Muestra los diagnósticos del paciente
- Cada diagnóstico muestra:
  - Descripción
  - Fecha de registro
  - Doctor que lo registró (a través de la cita)

---

## 🔍 QUERIES EJEMPLO

### **Obtener todos los diagnósticos de un paciente:**
```javascript
const diagnosticos = await Diagnostico.findAll({
  include: [{
    model: Cita,
    where: { id_paciente: pacienteId },
    include: [{
      model: Doctor,
      attributes: ['nombre', 'apellido_paterno']
    }]
  }],
  order: [['fecha_registro', 'DESC']]
});
```

### **Contar diagnósticos por cita:**
```javascript
const cita = await Cita.findOne({
  where: { id_cita: citaId },
  include: [{
    model: Diagnostico
  }]
});

const totalDiagnosticos = cita.Diagnosticos.length;
```

---

## 📝 RESUMEN

| Aspecto | Detalle |
|---------|---------|
| **Relación** | 1:N (One-to-Many) |
| **Desde** | Cita |
| **Hacia** | Diagnostico |
| **Clave Foránea** | `id_cita` en tabla `diagnosticos` |
| **Cardinalidad** | Una cita tiene muchos diagnósticos |
| **Es obligatorio** | Sí, un diagnóstico debe tener una cita |

---

**Autor:** Senior Developer  
**Fecha:** 28/10/2025











