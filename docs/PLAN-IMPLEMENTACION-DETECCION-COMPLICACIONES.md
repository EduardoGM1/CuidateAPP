# 📋 PLAN DE IMPLEMENTACIÓN: DETECCIÓN DE COMPLICACIONES

**Fecha:** Diciembre 2024  
**Proyecto:** Sistema Clínica Móvil

---

## ✅ ESPECIFICACIONES FINALES

### **Campos a Implementar:**
1. ✅ Exploración de pies (BOOLEAN)
2. ✅ Exploración de fondo de ojo (BOOLEAN)
3. ✅ Realiza auto-monitoreo (BOOLEAN)
4. ✅ Auto-monitoreo glucosa (BOOLEAN)
5. ✅ Auto-monitoreo presión (BOOLEAN)
6. ✅ Tipo de complicación (VARCHAR 100, campo libre)
7. ✅ Fecha de diagnóstico (DATE)
8. ❌ **NO incluir:** "Accion realizada"
9. ❌ **NO incluir:** "Referencia"

### **Reglas de Negocio:**
- ✅ **NO hay campos obligatorios** (excepto `id_paciente` y `fecha_deteccion`)
- ✅ Solo Doctor/Admin pueden crear/actualizar
- ✅ Pacientes solo pueden leer (no crear ni modificar)
- ✅ Tipo es campo libre (no catálogo)
- ✅ Pacientes NO pueden registrar auto-monitoreo de complicaciones (solo signos vitales como actualmente)

---

## 🎯 ESTRUCTURA FINAL DE LA TABLA

```sql
CREATE TABLE deteccion_complicaciones (
  id_deteccion INTEGER PRIMARY KEY AUTO_INCREMENT,
  
  -- Relaciones (solo id_paciente es obligatorio)
  id_paciente INTEGER NOT NULL,
  id_comorbilidad INTEGER NULL,
  id_cita INTEGER NULL,
  id_doctor INTEGER NULL,
  
  -- Exámenes realizados (todos opcionales, default FALSE)
  exploracion_pies BOOLEAN DEFAULT FALSE,
  exploracion_fondo_ojo BOOLEAN DEFAULT FALSE,
  
  -- Auto-monitoreo (todos opcionales, default FALSE)
  realiza_auto_monitoreo BOOLEAN DEFAULT FALSE,
  auto_monitoreo_glucosa BOOLEAN DEFAULT FALSE,
  auto_monitoreo_presion BOOLEAN DEFAULT FALSE,
  
  -- Clasificación (opcional)
  tipo_complicacion VARCHAR(100) NULL,
  fecha_deteccion DATE NOT NULL, -- Único campo obligatorio además de id_paciente
  fecha_diagnostico DATE NULL,
  
  -- Metadatos
  observaciones TEXT NULL,
  registrado_por ENUM('doctor', 'paciente') DEFAULT 'doctor',
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices
  INDEX idx_paciente (id_paciente),
  INDEX idx_comorbilidad (id_comorbilidad),
  INDEX idx_cita (id_cita),
  INDEX idx_fecha_deteccion (fecha_deteccion),
  
  -- Foreign Keys
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
  FOREIGN KEY (id_comorbilidad) REFERENCES comorbilidades(id_comorbilidad) ON DELETE SET NULL,
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
  FOREIGN KEY (id_doctor) REFERENCES doctores(id_doctor) ON DELETE SET NULL
);
```

---

## 📝 PLAN DE IMPLEMENTACIÓN PASO A PASO

### **FASE 1: BASE DE DATOS Y MODELO**

#### **1.1 Crear Script de Migración SQL**
**Archivo:** `api-clinica/migrations/create-deteccion-complicaciones.sql`

**Contenido:**
- Script SQL para crear la tabla `deteccion_complicaciones`
- Verificación de existencia de tabla antes de crear
- Índices optimizados
- Foreign Keys con CASCADE/SET NULL apropiados

**Patrón a seguir:** Similar a `add-anos-padecimiento-comorbilidad.sql`

---

#### **1.2 Crear Modelo Sequelize**
**Archivo:** `api-clinica/models/DeteccionComplicacion.js`

**Contenido:**
- Definición del modelo con todos los campos
- Tipos de datos apropiados
- Comentarios descriptivos
- Configuración de tabla sin timestamps

**Patrón a seguir:** Similar a `PacienteComorbilidad.js` o `Comorbilidad.js`

---

#### **1.3 Añadir Relaciones en Associations**
**Archivo:** `api-clinica/models/associations.js`

**Relaciones a añadir:**
```javascript
// Paciente - DeteccionComplicacion (1:N)
Paciente.hasMany(DeteccionComplicacion, { foreignKey: 'id_paciente' });
DeteccionComplicacion.belongsTo(Paciente, { foreignKey: 'id_paciente' });

// Comorbilidad - DeteccionComplicacion (1:N, opcional)
Comorbilidad.hasMany(DeteccionComplicacion, { foreignKey: 'id_comorbilidad' });
DeteccionComplicacion.belongsTo(Comorbilidad, { foreignKey: 'id_comorbilidad' });

// Cita - DeteccionComplicacion (1:N, opcional)
Cita.hasMany(DeteccionComplicacion, { foreignKey: 'id_cita' });
DeteccionComplicacion.belongsTo(Cita, { foreignKey: 'id_cita' });

// Doctor - DeteccionComplicacion (1:N, opcional)
Doctor.hasMany(DeteccionComplicacion, { foreignKey: 'id_doctor' });
DeteccionComplicacion.belongsTo(Doctor, { foreignKey: 'id_doctor' });
```

**Importar modelo al inicio del archivo:**
```javascript
import DeteccionComplicacion from './DeteccionComplicacion.js';
```

---

### **FASE 2: BACKEND - REPOSITORIO**

#### **2.1 Crear Repositorio**
**Archivo:** `api-clinica/repositories/deteccionComplicacionRepository.js`

**Métodos a implementar:**
1. `getDeteccionesByPaciente(pacienteId, options)` - Obtener todas las detecciones de un paciente
2. `getDeteccionById(deteccionId)` - Obtener una detección específica
3. `createDeteccion(deteccionData)` - Crear nueva detección
4. `updateDeteccion(deteccionId, updateData)` - Actualizar detección
5. `deleteDeteccion(deteccionId)` - Eliminar detección (soft delete o hard delete según política)

**Patrón a seguir:** Similar a `dashboardRepository.js` o repositorios existentes

**Validaciones en repositorio:**
- Validar que `id_paciente` existe
- Validar que `id_cita` pertenece al mismo paciente (si se proporciona)
- Validar que `id_comorbilidad` existe (si se proporciona)
- Validar que `fecha_deteccion` no es futura
- Validar que `fecha_diagnostico` >= `fecha_deteccion` (si ambas están presentes)

---

### **FASE 3: BACKEND - SERVICIO**

#### **3.1 Crear Servicio**
**Archivo:** `api-clinica/services/deteccionComplicacionService.js`

**Métodos a implementar:**
1. `getDeteccionesPaciente(pacienteId, doctorId, userRole)` - Con autorización
2. `getDeteccionById(deteccionId, doctorId, userRole)` - Con autorización
3. `createDeteccion(deteccionData, doctorId, userRole)` - Con validación y autorización
4. `updateDeteccion(deteccionId, updateData, doctorId, userRole)` - Con validación y autorización
5. `deleteDeteccion(deteccionId, userRole)` - Solo Admin

**Lógica de autorización:**
- Doctor: Solo puede ver/editar detecciones de pacientes asignados
- Admin: Puede ver/editar todas las detecciones
- Paciente: Solo puede leer sus propias detecciones

**Validaciones de negocio:**
- Si `realiza_auto_monitoreo = true`, al menos uno de `auto_monitoreo_glucosa` o `auto_monitoreo_presion` debe ser `true`
- Si `realiza_auto_monitoreo = false`, ambos sub-campos deben ser `false`
- Al menos un campo de examen o auto-monitoreo debe estar activo (validación opcional, ya que no hay campos obligatorios)

**Patrón a seguir:** Similar a `dashboardService.js`

---

### **FASE 4: BACKEND - CONTROLADOR**

#### **4.1 Crear Controlador**
**Archivo:** `api-clinica/controllers/deteccionComplicacionController.js`

**Funciones a implementar:**
1. `getDeteccionesPaciente(req, res)` - GET /api/pacientes/:id/detecciones-complicaciones
2. `getDeteccionById(req, res)` - GET /api/detecciones-complicaciones/:id
3. `createDeteccion(req, res)` - POST /api/pacientes/:id/detecciones-complicaciones
4. `updateDeteccion(req, res)` - PUT /api/detecciones-complicaciones/:id
5. `deleteDeteccion(req, res)` - DELETE /api/detecciones-complicaciones/:id

**Manejo de errores:**
- Validación de datos
- Errores de autorización
- Errores de base de datos
- Logging apropiado

**Patrón a seguir:** Similar a `pacienteMedicalData.js` o `paciente.js`

---

### **FASE 5: BACKEND - RUTAS**

#### **5.1 Crear Rutas**
**Archivo:** `api-clinica/routes/deteccionComplicacion.js` (NUEVO)
**O integrar en:** `api-clinica/routes/pacienteMedicalData.js` (EXISTENTE)

**Rutas a implementar:**
```javascript
// Obtener todas las detecciones de un paciente
GET /api/pacientes/:id/detecciones-complicaciones
- authorizePatientAccess
- authorizeRoles('Admin', 'Doctor', 'Paciente') // Paciente solo lectura

// Obtener una detección específica
GET /api/detecciones-complicaciones/:id
- authorizeRoles('Admin', 'Doctor', 'Paciente')

// Crear nueva detección
POST /api/pacientes/:id/detecciones-complicaciones
- authorizeRoles('Admin', 'Doctor') // Solo doctor/admin
- authorizePatientAccess
- writeRateLimit

// Actualizar detección
PUT /api/detecciones-complicaciones/:id
- authorizeRoles('Admin', 'Doctor') // Solo doctor/admin
- authorizePatientAccess
- writeRateLimit

// Eliminar detección
DELETE /api/detecciones-complicaciones/:id
- authorizeRoles('Admin') // Solo admin
- authorizePatientAccess
- writeRateLimit
```

**Middlewares a aplicar:**
- `authenticateToken` - Autenticación JWT
- `authorizeRoles` - Autorización por rol
- `authorizePatientAccess` - Verificar acceso al paciente
- `writeRateLimit` / `searchRateLimit` - Rate limiting
- `autoEncryptRequest` / `autoDecryptResponse` - Si aplica

**Patrón a seguir:** Similar a `pacienteMedicalData.js`

---

#### **5.2 Registrar Rutas en App Principal**
**Archivo:** `api-clinica/routes/index.js` o `api-clinica/app.js`

**Añadir:**
```javascript
import deteccionComplicacionRoutes from './deteccionComplicacion.js';
// O si se integra en pacienteMedicalData:
// Las rutas ya estarán en pacienteMedicalData.js

app.use('/api/pacientes', deteccionComplicacionRoutes);
// O
app.use('/api', pacienteMedicalDataRoutes); // Si se integra ahí
```

---

### **FASE 6: VALIDACIONES Y SEGURIDAD**

#### **6.1 Validaciones de Middleware**
**Archivo:** `api-clinica/middlewares/securityValidator.js` (si es necesario añadir validaciones específicas)

**Validaciones a implementar:**
- Validar formato de fechas
- Validar que booleanos sean booleanos
- Validar longitud de `tipo_complicacion` (max 100 caracteres)
- Validar que `fecha_deteccion` no sea futura
- Validar que `fecha_diagnostico` >= `fecha_deteccion` (si ambas presentes)

**O implementar en el servicio/controlador directamente**

---

#### **6.2 Protección contra Mass Assignment**
**Archivo:** `api-clinica/middlewares/massAssignmentProtection.js`

**Añadir campos permitidos:**
```javascript
deteccionComplicacion: [
  'id_paciente',
  'id_comorbilidad',
  'id_cita',
  'id_doctor',
  'exploracion_pies',
  'exploracion_fondo_ojo',
  'realiza_auto_monitoreo',
  'auto_monitoreo_glucosa',
  'auto_monitoreo_presion',
  'tipo_complicacion',
  'fecha_deteccion',
  'fecha_diagnostico',
  'observaciones'
  // NO incluir: registrado_por, fecha_creacion (se establecen automáticamente)
]
```

---

### **FASE 7: EXPORTAR MODELO EN INDEX**

#### **7.1 Añadir a Exports**
**Archivo:** `api-clinica/models/index.js` (si existe) o `api-clinica/models/associations.js`

**Asegurar que el modelo se exporta correctamente para uso en otros archivos**

---

## 🔒 SEGURIDAD IMPLEMENTADA

### **Autorización por Rol:**
- ✅ **CREATE:** Solo `Doctor` y `Admin`
- ✅ **READ:** `Doctor` (pacientes asignados), `Admin` (todos), `Paciente` (solo propio)
- ✅ **UPDATE:** Solo `Doctor` (pacientes asignados) y `Admin` (todos)
- ✅ **DELETE:** Solo `Admin`

### **Validaciones:**
- ✅ Foreign Keys con CASCADE/SET NULL apropiados
- ✅ Validación de fechas (no futuras, orden lógico)
- ✅ Validación de auto-monitoreo (consistencia de sub-campos)
- ✅ Protección contra Mass Assignment
- ✅ Rate Limiting

### **Auditoría:**
- ✅ Campo `registrado_por` para rastrear quién creó
- ✅ Campo `fecha_creacion` para auditoría temporal
- ✅ Logging en controladores y servicios

---

## 📦 ARCHIVOS A CREAR/MODIFICAR

### **Archivos NUEVOS:**
1. ✅ `api-clinica/migrations/create-deteccion-complicaciones.sql`
2. ✅ `api-clinica/models/DeteccionComplicacion.js`
3. ✅ `api-clinica/repositories/deteccionComplicacionRepository.js`
4. ✅ `api-clinica/services/deteccionComplicacionService.js`
5. ✅ `api-clinica/controllers/deteccionComplicacionController.js`
6. ✅ `api-clinica/routes/deteccionComplicacion.js`

### **Archivos a MODIFICAR:**
1. ✅ `api-clinica/models/associations.js` - Añadir relaciones
2. ✅ `api-clinica/middlewares/massAssignmentProtection.js` - Añadir campos permitidos
3. ✅ `api-clinica/routes/index.js` o `api-clinica/app.js` - Registrar rutas

### **Archivos que NO se crearán:**
- ❌ No se creará catálogo de tipos de complicaciones
- ❌ No se creará tabla de historial
- ❌ No se creará vista materializada
- ❌ No se creará servicio de notificaciones específico (usar existente si es necesario)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Backend:**
- [ ] Script de migración SQL creado y probado
- [ ] Modelo Sequelize creado con todos los campos
- [ ] Relaciones añadidas en associations.js
- [ ] Repositorio implementado con validaciones
- [ ] Servicio implementado con autorización
- [ ] Controlador implementado con manejo de errores
- [ ] Rutas creadas con middlewares apropiados
- [ ] Middleware de Mass Assignment actualizado
- [ ] Rutas registradas en app principal
- [ ] Tests básicos de integración

### **Validaciones:**
- [ ] Validación de fechas implementada
- [ ] Validación de auto-monitoreo implementada
- [ ] Validación de Foreign Keys implementada
- [ ] Autorización por rol implementada
- [ ] Rate limiting aplicado

### **Documentación:**
- [ ] Comentarios en código
- [ ] Documentación de API (si aplica)

---

## 🚀 ORDEN DE IMPLEMENTACIÓN

1. **Migración SQL** → Probar en BD de desarrollo
2. **Modelo Sequelize** → Verificar estructura
3. **Relaciones** → Verificar asociaciones
4. **Repositorio** → Tests básicos
5. **Servicio** → Tests de lógica de negocio
6. **Controlador** → Tests de endpoints
7. **Rutas** → Tests de integración
8. **Validaciones** → Tests de seguridad
9. **Integración final** → Pruebas end-to-end

---

## 📝 NOTAS IMPORTANTES

1. **No hay campos obligatorios** excepto `id_paciente` y `fecha_deteccion`
2. **Pacientes NO pueden crear/actualizar** - Solo lectura
3. **Tipo es campo libre** - No se crea catálogo
4. **No se almacena "referencia" ni "accion realizada"**
5. **Seguir patrones existentes** - Reutilizar código y estructura similar
6. **Evitar duplicación** - Usar funciones y componentes existentes cuando sea posible

---

## ✅ CONCLUSIÓN

Este plan implementa la funcionalidad de detección de complicaciones siguiendo:
- ✅ Buenas prácticas de normalización (3NF)
- ✅ Seguridad y autorización apropiadas
- ✅ Patrones existentes del sistema
- ✅ Sin crear archivos o funciones innecesarias
- ✅ Validaciones completas
- ✅ Escalabilidad futura

**Listo para implementar siguiendo este plan paso a paso.**

