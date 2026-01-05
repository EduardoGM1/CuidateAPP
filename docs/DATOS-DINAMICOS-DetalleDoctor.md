# 📊 DATOS DINÁMICOS EN DETALLE DOCTOR

## 🎯 **RESUMEN EJECUTIVO**

La ventana **DetalleDoctor** muestra datos dinámicos obtenidos en tiempo real desde la base de datos a través del endpoint `/api/doctores/{id}/dashboard`.

## 🔄 **FLUJO DE DATOS DINÁMICOS**

### **1. Hook de Datos:**
```javascript
const { 
  doctor, 
  pacientesAsignados, 
  citasHoy, 
  citasRecientes, 
  loading, 
  error, 
  refetch 
} = useDoctorPatientData(doctorId);
```

### **2. Servicio Backend:**
```javascript
// Endpoint: GET /api/doctores/{id}/dashboard
// Servicio: DashboardService.getDoctorDashboard(doctorId)
```

### **3. Consultas de Base de Datos:**
```javascript
const [
  doctor,                    // getDoctorById(doctorId)
  pacientesAsignados,        // getPacientesDoctor(doctorId)
  citasHoy,                  // getCitasDoctorHoy(doctorId)
  citasRecientes             // getCitasRecientesDoctor(doctorId)
] = await Promise.all([...]);
```

## 📋 **DATOS DINÁMICOS MOSTRADOS**

### **🏥 INFORMACIÓN DEL DOCTOR**

#### **Datos Básicos (Tabla: Doctor + Usuario):**
- ✅ **Nombre completo**: `doctor.nombre + doctor.apellido_paterno + doctor.apellido_materno`
- ✅ **Email**: `doctor.Usuario.email` (relación con tabla Usuario)
- ✅ **Teléfono**: `doctor.telefono`
- ✅ **Institución hospitalaria**: `doctor.institucion_hospitalaria`
- ✅ **Grado de estudio**: `doctor.grado_estudio`
- ✅ **Años de servicio**: `doctor.anos_servicio`
- ✅ **Módulo asignado**: `doctor.Modulo.nombre_modulo` (relación con tabla Modulo)
- ✅ **Estado activo**: `doctor.activo`
- ✅ **Fecha de registro**: `doctor.fecha_registro`

#### **Métricas Calculadas:**
- ✅ **Total de pacientes asignados**: `pacientesAsignados.length`
- ✅ **Citas programadas hoy**: `citasHoy.length`
- ✅ **Citas recientes**: `citasRecientes.length`

### **👥 PACIENTES ASIGNADOS**

#### **Datos por Paciente (Tabla: Paciente + Comorbilidades):**
- ✅ **Nombre completo**: `paciente.nombre + paciente.apellido_paterno`
- ✅ **Edad calculada**: `calcularEdad(paciente.fecha_nacimiento)`
- ✅ **Teléfono**: `paciente.numero_celular`
- ✅ **Comorbilidades**: `paciente.Comorbilidades.map(c => c.nombre)` (relación many-to-many)

#### **Renderizado:**
```javascript
const renderPatientCard = (paciente) => (
  <Card>
    <Title>{paciente.nombre} {paciente.apellido}</Title>
    <Text>{paciente.edad} años • {paciente.telefono}</Text>
    <Chip>Activo</Chip>
    {paciente.comorbilidades.map(comorbilidad => 
      <Chip key={index}>{comorbilidad}</Chip>
    )}
  </Card>
);
```

### **📅 CITAS DE HOY**

#### **Datos por Cita (Tabla: Cita + Paciente):**
- ✅ **ID de cita**: `cita.id_cita`
- ✅ **Fecha y hora**: `cita.fecha_cita`
- ✅ **Motivo**: `cita.motivo`
- ✅ **Estado de asistencia**: `cita.asistencia`
- ✅ **Paciente**: `cita.Paciente.nombre + cita.Paciente.apellido_paterno`

#### **Renderizado:**
```javascript
const renderTodayAppointmentCard = (cita) => (
  <Card>
    <Text>{formatAppointmentDate(cita.fecha_cita)}</Text>
    <Chip>{cita.asistencia || 'Pendiente'}</Chip>
    <Title>{cita.paciente.nombre} {cita.paciente.apellido}</Title>
    <Paragraph>{cita.motivo}</Paragraph>
  </Card>
);
```

### **📋 CITAS RECIENTES**

#### **Datos por Cita (Tabla: Cita + Paciente):**
- ✅ **ID de cita**: `cita.id_cita`
- ✅ **Fecha y hora**: `cita.fecha_cita`
- ✅ **Motivo**: `cita.motivo`
- ✅ **Estado de asistencia**: `cita.asistencia`
- ✅ **Paciente**: `cita.Paciente.nombre + cita.Paciente.apellido_paterno`

#### **Renderizado:**
```javascript
const renderAppointmentCard = (cita) => (
  <Card>
    <Title>{cita.paciente.nombre} {cita.paciente.apellido}</Title>
    <Text>{formatAppointmentDate(cita.fecha_cita)}</Text>
    <Paragraph>Motivo: {cita.motivo}</Paragraph>
    <Chip>{cita.asistencia || 'Pendiente'}</Chip>
  </Card>
);
```

## 🔄 **ACTUALIZACIÓN EN TIEMPO REAL**

### **Mecanismos de Actualización:**
- ✅ **Pull to Refresh**: `RefreshControl` en `ScrollView`
- ✅ **Hook refetch**: `useDoctorPatientData` proporciona función `refetch()`
- ✅ **Navegación**: Se actualiza al regresar a la pantalla
- ✅ **WebSocket**: Eventos de actualización en tiempo real (si está implementado)

### **Estados de Carga:**
- ✅ **Loading**: Spinner mientras cargan los datos
- ✅ **Error**: Mensaje de error con botón de reintento
- ✅ **Empty State**: Mensajes cuando no hay datos

## 📊 **CONSULTAS DE BASE DE DATOS**

### **1. Información del Doctor:**
```sql
SELECT d.*, u.email, m.nombre_modulo
FROM Doctor d
LEFT JOIN Usuario u ON d.id_usuario = u.id_usuario
LEFT JOIN Modulo m ON d.id_modulo = m.id_modulo
WHERE d.id_doctor = ?
```

### **2. Pacientes Asignados:**
```sql
SELECT p.*, c.nombre_comorbilidad
FROM Paciente p
LEFT JOIN PacienteComorbilidad pc ON p.id_paciente = pc.id_paciente
LEFT JOIN Comorbilidad c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE p.id_doctor = ?
```

### **3. Citas de Hoy:**
```sql
SELECT c.*, p.nombre, p.apellido_paterno
FROM Cita c
INNER JOIN Paciente p ON c.id_paciente = p.id_paciente
WHERE c.id_doctor = ? 
AND DATE(c.fecha_cita) = CURDATE()
```

### **4. Citas Recientes:**
```sql
SELECT c.*, p.nombre, p.apellido_paterno
FROM Cita c
INNER JOIN Paciente p ON c.id_paciente = p.id_paciente
WHERE c.id_doctor = ?
ORDER BY c.fecha_cita DESC
LIMIT 10
```

## 🎯 **CARACTERÍSTICAS TÉCNICAS**

### **Performance:**
- ✅ **Consultas paralelas**: `Promise.all()` para obtener todos los datos simultáneamente
- ✅ **Caching**: Los datos se cachean en el hook `useDoctorPatientData`
- ✅ **Lazy loading**: Solo se cargan cuando se accede a la pantalla

### **Validación:**
- ✅ **Validación de ID**: Verifica que el doctorId sea válido
- ✅ **Validación de datos**: Verifica que los datos estén completos antes de renderizar
- ✅ **Manejo de errores**: Estados de error con opciones de reintento

### **UX:**
- ✅ **Estados de carga**: Indicadores visuales durante la carga
- ✅ **Refresh manual**: Pull to refresh para actualizar datos
- ✅ **Mensajes informativos**: Textos claros cuando no hay datos

## ✅ **RESUMEN DE DATOS DINÁMICOS**

### **Total de Datos Dinámicos:**
- 🏥 **1 Doctor**: Información completa + métricas
- 👥 **N Pacientes**: Lista completa con comorbilidades
- 📅 **N Citas Hoy**: Citas del día actual
- 📋 **N Citas Recientes**: Últimas 10 citas

### **Fuentes de Datos:**
- ✅ **Tabla Doctor**: Información básica del doctor
- ✅ **Tabla Usuario**: Email del doctor
- ✅ **Tabla Modulo**: Módulo asignado
- ✅ **Tabla Paciente**: Pacientes asignados
- ✅ **Tabla Comorbilidad**: Comorbilidades de pacientes
- ✅ **Tabla Cita**: Citas del doctor
- ✅ **Relaciones**: PacienteComorbilidad, DoctorPaciente

### **Actualización:**
- ✅ **Tiempo real**: WebSocket (si implementado)
- ✅ **Manual**: Pull to refresh
- ✅ **Automática**: Al navegar a la pantalla

**¡La ventana DetalleDoctor muestra datos completamente dinámicos obtenidos en tiempo real desde la base de datos!**


