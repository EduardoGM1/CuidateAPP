# 📊 Propuesta de Estadísticas para Reportes Administrativos

**Fecha:** 20 de enero de 2026  
**Pantalla:** `ReportesAdmin.js`  
**Objetivo:** Proporcionar métricas útiles para la gestión administrativa de la clínica

---

## 🎯 CATEGORÍAS DE ESTADÍSTICAS PROPUESTAS

### 1. 📈 **ESTADÍSTICAS DE CRECIMIENTO Y TENDENCIAS**

#### **Crecimiento de Pacientes**
- **Pacientes nuevos por mes** (últimos 6-12 meses)
  - Gráfico de línea o barras
  - Comparación mes a mes
  - Tasa de crecimiento porcentual
  
- **Crecimiento acumulado de pacientes**
  - Total de pacientes registrados desde el inicio
  - Proyección de crecimiento

#### **Tendencias de Citas**
- **Citas por mes** (últimos 6-12 meses)
  - Total de citas programadas
  - Citas completadas vs canceladas
  - Tasa de asistencia mensual

- **Citas por día de la semana**
  - Identificar días más/menos ocupados
  - Optimizar horarios

---

### 2. 👥 **ESTADÍSTICAS DE PACIENTES**

#### **Distribución Demográfica**
- **Distribución por edad**
  - Rangos: 0-18, 19-35, 36-50, 51-65, 65+
  - Gráfico de barras o pie chart
  
- **Distribución por género**
  - Porcentaje masculino/femenino
  - Gráfico de dona o barras

#### **Estado de Pacientes**
- **Pacientes activos vs inactivos**
  - Total activos
  - Total inactivos
  - Tasa de actividad
  
- **Pacientes nuevos vs recurrentes**
  - Nuevos este mes
  - Pacientes que regresan
  - Tasa de retención

#### **Distribución por Doctor**
- **Pacientes asignados por doctor**
  - Top 5 doctores con más pacientes
  - Carga de trabajo balanceada
  - Gráfico de barras horizontales

---

### 3. 👨‍⚕️ **ESTADÍSTICAS DE DOCTORES**

#### **Productividad de Doctores**
- **Citas atendidas por doctor** (último mes)
  - Ranking de doctores más activos
  - Promedio de citas por doctor
  - Identificar sobrecarga/subcarga

- **Pacientes asignados por doctor**
  - Distribución equitativa
  - Identificar desbalances

#### **Rendimiento de Doctores**
- **Tasa de asistencia por doctor**
  - Comparar tasas de asistencia
  - Identificar áreas de mejora

- **Tiempo promedio de consulta**
  - Si está disponible en los datos

---

### 4. 📅 **ESTADÍSTICAS DE CITAS**

#### **Estado de Citas**
- **Distribución de citas por estado**
  - Pendientes
  - Completadas
  - Canceladas
  - Perdidas
  - Gráfico de pie o barras

- **Tasa de asistencia general**
  - Porcentaje de citas completadas
  - Tendencias mensuales

#### **Razones de Cancelación**
- **Top razones de cancelación**
  - Motivos más frecuentes
  - Identificar patrones

- **Citas perdidas (no asistidas)**
  - Cantidad y porcentaje
  - Tendencias

#### **Distribución Temporal**
- **Citas por hora del día**
  - Horarios más solicitados
  - Optimizar disponibilidad

- **Citas por mes del año**
  - Estacionalidad
  - Planificación de recursos

---

### 5. 🏥 **ESTADÍSTICAS DE SALUD**

#### **Comorbilidades**
- **Comorbilidades más frecuentes** (YA IMPLEMENTADO)
  - Top 10 comorbilidades
  - Frecuencia y porcentaje
  - Heatmap por período

- **Distribución de comorbilidades por edad**
  - Relación edad-comorbilidad
  - Identificar grupos de riesgo

#### **Signos Vitales**
- **Pacientes con valores críticos**
  - Cantidad de alertas críticas
  - Tipos de alertas más frecuentes
  - Tendencias

- **Distribución de valores de signos vitales**
  - Promedios de glucosa, presión arterial
  - Valores dentro/fuera de rango

#### **Medicamentos**
- **Medicamentos más prescritos**
  - Top 10 medicamentos
  - Frecuencia de prescripción

---

### 6. 💬 **ESTADÍSTICAS DE COMUNICACIÓN**

#### **Mensajes de Chat**
- **Mensajes enviados por mes**
  - Total de mensajes
  - Mensajes por doctor
  - Mensajes por paciente

- **Tiempo promedio de respuesta**
  - Si está disponible en los datos

- **Conversaciones activas**
  - Número de conversaciones
  - Pacientes con más interacción

---

### 7. ⚠️ **ESTADÍSTICAS DE ALERTAS Y SEGURIDAD**

#### **Alertas Médicas**
- **Alertas críticas por tipo**
  - Glucosa alta
  - Presión arterial alta
  - Otros valores críticos

- **Pacientes con más alertas**
  - Identificar pacientes de alto riesgo

#### **Auditoría del Sistema**
- **Actividad del sistema**
  - Acciones más frecuentes
  - Usuarios más activos
  - Errores del sistema

---

### 8. 📊 **ESTADÍSTICAS OPERATIVAS**

#### **Uso del Sistema**
- **Usuarios activos por rol**
  - Doctores activos
  - Pacientes activos
  - Administradores

- **Actividad por día**
  - Logins
  - Acciones realizadas

#### **Eficiencia Operativa**
- **Tiempo promedio entre citas**
  - Frecuencia de seguimiento
  - Adherencia al tratamiento

- **Pacientes sin seguimiento reciente**
  - Pacientes que no han tenido cita en X meses
  - Identificar pacientes perdidos

---

## 🎨 **PRIORIZACIÓN DE IMPLEMENTACIÓN**

### **Fase 1: Alta Prioridad (Implementar Primero)**
1. ✅ **Citas por estado** - Ya disponible parcialmente
2. ✅ **Distribución de pacientes por doctor** - Útil para balancear carga
3. ✅ **Tasa de asistencia mensual** - Métrica clave de operación
4. ✅ **Pacientes nuevos por mes** - Ya disponible parcialmente
5. ✅ **Top doctores más activos** - Ya disponible parcialmente

### **Fase 2: Media Prioridad**
6. **Distribución por edad y género** - Análisis demográfico
7. **Citas por día de la semana** - Optimización de horarios
8. **Razones de cancelación** - Mejora de procesos
9. **Medicamentos más prescritos** - Gestión de inventario
10. **Pacientes con valores críticos** - Ya disponible parcialmente

### **Fase 3: Baja Prioridad (Futuro)**
11. **Mensajes de chat** - Análisis de comunicación
12. **Tiempo promedio de consulta** - Si se implementa tracking
13. **Actividad del sistema** - Auditoría avanzada
14. **Proyecciones y tendencias** - Análisis predictivo

---

## 📋 **ESTADÍSTICAS YA DISPONIBLES**

### **Desde `useAdminDashboard`:**
- ✅ Total de pacientes
- ✅ Total de doctores
- ✅ Citas de hoy (completadas/total)
- ✅ Tasa de asistencia
- ✅ Citas últimos 7 días
- ✅ Pacientes nuevos últimos 7 días
- ✅ Citas por estado
- ✅ Doctores más activos
- ✅ Alertas críticas

### **Desde `usePacientes`:**
- ✅ Lista completa de pacientes
- ✅ Filtros por estado, fecha, comorbilidades

---

## 🔧 **ESTADÍSTICAS FÁCILES DE IMPLEMENTAR**

### **1. Distribución de Pacientes por Doctor**
```javascript
// Calcular desde pacientes con id_doctor asignado
const pacientesPorDoctor = pacientes.reduce((acc, paciente) => {
  const doctorId = paciente.id_doctor;
  acc[doctorId] = (acc[doctorId] || 0) + 1;
  return acc;
}, {});
```

### **2. Citas por Estado (Mensual)**
```javascript
// Agrupar citas por estado y mes
const citasPorEstado = citas.reduce((acc, cita) => {
  const estado = cita.estado || 'pendiente';
  acc[estado] = (acc[estado] || 0) + 1;
  return acc;
}, {});
```

### **3. Distribución por Edad**
```javascript
// Calcular edad desde fecha_nacimiento
const pacientesPorEdad = pacientes.reduce((acc, paciente) => {
  const edad = calcularEdad(paciente.fecha_nacimiento);
  const rango = obtenerRangoEdad(edad);
  acc[rango] = (acc[rango] || 0) + 1;
  return acc;
}, {});
```

### **4. Citas por Día de la Semana**
```javascript
// Agrupar citas por día de semana
const citasPorDiaSemana = citas.reduce((acc, cita) => {
  const dia = new Date(cita.fecha_cita).getDay();
  const nombreDia = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dia];
  acc[nombreDia] = (acc[nombreDia] || 0) + 1;
  return acc;
}, {});
```

---

## 💡 **RECOMENDACIONES DE DISEÑO**

### **Layout Sugerido:**
1. **Sección 1: Resumen General** (Ya implementado)
   - Métricas principales en cards

2. **Sección 2: Gráficos de Tendencias**
   - Citas últimos 7 días (Ya implementado)
   - Pacientes nuevos últimos 7 días (Ya implementado)
   - **NUEVO:** Citas por mes (últimos 6 meses)
   - **NUEVO:** Crecimiento de pacientes (últimos 6 meses)

3. **Sección 3: Distribuciones**
   - **NUEVO:** Citas por estado (pie chart)
   - **NUEVO:** Pacientes por doctor (barras horizontales)
   - **NUEVO:** Distribución por edad (barras)
   - **NUEVO:** Distribución por género (pie chart)

4. **Sección 4: Comorbilidades** (Ya implementado)
   - Comorbilidades más frecuentes
   - Heatmap por período

5. **Sección 5: Doctores**
   - **NUEVO:** Top 5 doctores más activos (barras)
   - **NUEVO:** Citas atendidas por doctor (barras)
   - **NUEVO:** Tasa de asistencia por doctor

6. **Sección 6: Alertas y Seguridad**
   - **NUEVO:** Alertas críticas por tipo
   - **NUEVO:** Pacientes con más alertas

---

## 🚀 **PRÓXIMOS PASOS SUGERIDOS**

1. **Implementar estadísticas de Fase 1** (alta prioridad)
2. **Agregar filtros de fecha** para análisis por período
3. **Exportar reportes** a PDF/Excel
4. **Gráficos interactivos** con drill-down
5. **Comparaciones** (mes actual vs mes anterior)

---

## 📝 **NOTAS TÉCNICAS**

- Todas las estadísticas deben calcularse desde datos reales de la BD
- Usar `useAdminDashboard` y `usePacientes` como fuentes principales
- Implementar caching para mejorar rendimiento
- Agregar opción de refrescar datos manualmente
- Considerar límites de tiempo para consultas pesadas
