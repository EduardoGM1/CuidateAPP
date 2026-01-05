# 📋 INFORMACIÓN MOSTRADA EN SECCIÓN "DIAGNÓSTICOS"

**Ubicación:** `ClinicaMovil/src/screens/admin/DetallePaciente.js`  
**Líneas:** 1245-1276 (Vista principal), 2942-2984 (Modal completo)

---

## 📊 INFORMACIÓN DISPONIBLE

### **En la Vista Principal (Card):**
Muestra máximo 5 diagnósticos más recientes con:

1. **📅 Fecha de Registro** (`fecha_registro`)
   - Formato: "día de mes, año" (ej: "28 de octubre, 2025")
   - Función: `formatearFecha()`

2. **👨‍⚕️ Doctor Asignado** (`doctor_nombre`)
   - Muestra nombre del doctor que registró el diagnóstico
   - Fallback: "Sin doctor asignado" si no hay doctor

3. **📝 Descripción del Diagnóstico** (`descripcion`)
   - Texto completo del diagnóstico
   - Fallback: "Sin descripción" si está vacío

---

## 🎨 ESTRUCTURA VISUAL

### **Card de Diagnósticos:**
```javascript
<Title>🩺 Diagnósticos ({totalDiagnosticos})</Title>
+ Botón "Opciones" (permite ver más, agregar nuevo, etc.)

Lista de diagnósticos:
┌─────────────────────────────────────┐
│ 📅 [Fecha registro]                 │
│ 👨‍⚕️ [Doctor asignado]              │
│                                      │
│ 📝 [Descripción del diagnóstico]   │
└─────────────────────────────────────┘
```

---

## 🔍 CAMPOS ESPECÍFICOS DEL OBJETO DIAGNÓSTICO

```javascript
{
  id_diagnostico: number,           // ID único del diagnóstico
  fecha_registro: Date/string,      // Fecha cuando se registró
  descripcion: string,               // Descripción del diagnóstico
  doctor_nombre: string,             // Nombre completo del doctor
  id_cita: number                    // ID de la cita asociada (no visible)
}
```

---

## 📱 FUNCIONALIDADES

### **Vista Principal:**
1. **Título con contador:** "🩺 Diagnósticos (5)"
2. **Botón Opciones:** Menú de opciones (Ver todos, Agregar nuevo)
3. **Lista de 5 diagnósticos:**
   - Cada item muestra: Fecha, Doctor, Descripción

### **Modal Completo (Ver Todos):**
```
🩺 Diagnósticos Completos (total)
+ Botón cerrar "X"

ScrollView con todos los diagnósticos
┌─────────────────────────────────────┐
│ Card:                                │
│  📅 [Fecha]                          │
│  👨‍⚕️ [Doctor]                       │
│  📝 [Descripción completa]           │
└─────────────────────────────────────┘
```

### **Modal Agregar Diagnóstico:**
- **Campo 1:** Selector de Cita
- **Campo 2:** Descripción del diagnóstico (TextArea)
- Validaciones:
  - Cita es requerida
  - Descripción mínima 10 caracteres
  - Descripción es requerida

---

## 🗂️ FUENTE DE DATOS

### **Backend:**
```javascript
// Hook: usePacienteMedicalData
const {
  diagnosticos,      // Array de diagnósticos
  totalDiagnosticos, // Total de diagnósticos
  ...
} = usePacienteMedicalData(pacienteId, {
  limit: 5,  // Muestra máximo 5 en vista principal
  autoFetch: true
});
```

### **Endpoint Backend:**
```
GET /api/pacientes/:id/diagnosticos
```

---

## 📝 EJEMPLO DE USO

### **Vista Principal:**
```javascript
diagnosticos.map((diagnostico, diagIndex) => (
  <View style={styles.listItem}>
    <View style={styles.listItemHeader}>
      <Text>{formatearFecha(diagnostico.fecha_registro)}</Text>
      <Text>{diagnostico.doctor_nombre || 'Sin doctor asignado'}</Text>
    </View>
    <Text>{diagnostico.descripcion || 'Sin descripción'}</Text>
  </View>
))
```

---

## ✅ CAMPOS VISIBLES AL USUARIO

| Campo | Ubicación | Visibilidad |
|-------|-----------|-------------|
| **Fecha** | Vista principal + Modal completo | ✅ Sí |
| **Doctor** | Vista principal + Modal completo | ✅ Sí |
| **Descripción** | Vista principal + Modal completo | ✅ Sí |
| **ID Cita** | Solo backend | ❌ No visible |
| **ID Diagnóstico** | Solo backend/key | ❌ No visible |

---

## 🎯 FUNCIONALIDADES ADICIONALES

### **Desde el Menú "Opciones":**
1. ✅ Ver todos los diagnósticos (modal completo)
2. ✅ Agregar nuevo diagnóstico
3. ✅ Filtros (opción futura)

### **Validaciones al Agregar:**
- Cita seleccionada: **Requerida**
- Descripción: **Requerida** (mínimo 10 caracteres)

---

## 📋 RESUMEN

**En la sección Diagnósticos se muestra:**
1. ✅ Fecha de registro (formateada en español)
2. ✅ Nombre del doctor que registró el diagnóstico
3. ✅ Descripción completa del diagnóstico
4. ✅ Contador de total de diagnósticos en el título

**Funcionalidades:**
- ✅ Vista principal con primeros 5 diagnósticos
- ✅ Modal completo para ver todos los diagnósticos
- ✅ Agregar nuevo diagnóstico
- ✅ Deslizar para refrescar datos

**Campos técnicos (no visibles):**
- `id_diagnostico` - ID único
- `id_cita` - ID de cita asociada
- Otros metadatos del backend

---

**Última actualización:** 28/10/2025  
**Autor:** Senior Developer












