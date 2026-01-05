# 🔐 PERMISOS DE ALMACENAMIENTO DE DATOS POR ROL

**Fecha:** Diciembre 2024  
**Proyecto:** Sistema Clínica Móvil

---

## 📊 RESUMEN EJECUTIVO

Este documento detalla qué datos puede almacenar cada rol en el sistema:
- **👨‍⚕️ Doctor/Administrador:** Pueden crear y gestionar TODOS los datos médicos del paciente
- **👤 Paciente:** Solo puede crear sus propios **Signos Vitales** y leer sus datos

---

## 👨‍⚕️ DOCTOR / ADMINISTRADOR

### ✅ **DATOS QUE PUEDEN ALMACENAR**

#### 1. **DATOS PERSONALES DEL PACIENTE** ✅
**Tabla:** `pacientes`

**Operaciones:**
- ✅ **CREATE:** Crear nuevos pacientes completos
- ✅ **UPDATE:** Actualizar cualquier campo del paciente
- ✅ **READ:** Ver todos los datos del paciente

**Campos que pueden almacenar:**
- `nombre` ✅
- `apellido_paterno` ✅
- `apellido_materno` ✅
- `fecha_nacimiento` ✅
- `curp` ✅
- `institucion_salud` ✅ (IMSS, Bienestar, ISSSTE, Particular, Otro)
- `sexo` ✅ (Hombre, Mujer)
- `direccion` ✅
- `estado` ✅
- `localidad` ✅
- `numero_celular` ✅
- `id_modulo` ✅
- `activo` ✅ (Solo Admin puede cambiar este campo)

**Endpoints:**
- `POST /api/pacientes` - Crear paciente básico
- `POST /api/pacientes/completo` - Crear paciente completo (con usuario, PIN, primera consulta)
- `PUT /api/pacientes/:id` - Actualizar paciente
- `GET /api/pacientes/:id` - Ver datos del paciente

**Restricciones:**
- Doctor solo puede ver/editar pacientes asignados a él
- Admin puede ver/editar todos los pacientes

---

#### 2. **SIGNOS VITALES** ✅
**Tabla:** `signos_vitales`

**Operaciones:**
- ✅ **CREATE:** Crear registros de signos vitales
- ✅ **UPDATE:** Actualizar registros existentes
- ✅ **DELETE:** Eliminar registros (solo Admin)
- ✅ **READ:** Ver historial completo

**Campos que pueden almacenar:**
- `peso_kg` ✅
- `talla_m` ✅
- `imc` ✅ (calculado automáticamente)
- `medida_cintura_cm` ✅
- `presion_sistolica` ✅
- `presion_diastolica` ✅
- `glucosa_mg_dl` ✅
- `colesterol_mg_dl` ✅
- `trigliceridos_mg_dl` ✅
- `fecha_medicion` ✅
- `id_cita` ✅ (opcional - asociar a una cita)
- `observaciones` ✅
- `registrado_por` ✅ ('doctor' o 'paciente')

**Endpoints:**
- `POST /api/pacientes/:id/signos-vitales` - Crear signos vitales
- `PUT /api/pacientes/:id/signos-vitales/:signoId` - Actualizar signos vitales
- `DELETE /api/pacientes/:id/signos-vitales/:signoId` - Eliminar signos vitales
- `GET /api/pacientes/:id/signos-vitales` - Ver historial

**Restricciones:**
- Doctor solo puede gestionar signos vitales de pacientes asignados

---

#### 3. **DIAGNÓSTICOS** ✅
**Tabla:** `diagnosticos`

**Operaciones:**
- ✅ **CREATE:** Crear nuevos diagnósticos
- ✅ **UPDATE:** Actualizar diagnósticos existentes
- ✅ **DELETE:** Eliminar diagnósticos (solo Admin)
- ✅ **READ:** Ver historial de diagnósticos

**Campos que pueden almacenar:**
- `id_cita` ✅ (opcional - asociar a una cita)
- `descripcion` ✅ (TEXT - descripción del diagnóstico)
- `fecha_registro` ✅ (auto-generada)

**Endpoints:**
- `POST /api/pacientes/:id/diagnosticos` - Crear diagnóstico
- `PUT /api/pacientes/:id/diagnosticos/:diagnosticoId` - Actualizar diagnóstico
- `DELETE /api/pacientes/:id/diagnosticos/:diagnosticoId` - Eliminar diagnóstico
- `GET /api/pacientes/:id/diagnosticos` - Ver diagnósticos

**Restricciones:**
- Doctor solo puede gestionar diagnósticos de pacientes asignados

---

#### 4. **PLANES DE MEDICACIÓN** ✅
**Tablas:** `planes_medicacion`, `plan_detalle`, `medicamento_toma`

**Operaciones:**
- ✅ **CREATE:** Crear planes de medicación completos
- ✅ **UPDATE:** Actualizar planes y detalles
- ✅ **DELETE:** Eliminar planes (solo Admin)
- ✅ **READ:** Ver todos los planes y medicamentos

**Campos que pueden almacenar:**

**Plan de Medicación:**
- `id_doctor` ✅ (opcional)
- `id_cita` ✅ (opcional)
- `fecha_inicio` ✅
- `fecha_fin` ✅
- `observaciones` ✅
- `activo` ✅

**Detalle del Plan (medicamentos):**
- `id_medicamento` ✅ (FK a catálogo de medicamentos)
- `dosis` ✅
- `frecuencia` ✅
- `horario` ✅ (horario único)
- `horarios` ✅ (JSON array de horarios múltiples)
- `via_administracion` ✅
- `observaciones` ✅

**Registro de Toma:**
- `fecha_toma` ✅
- `hora_toma` ✅
- `confirmado_por` ✅ ('Paciente', 'Doctor', 'Familiar')
- `observaciones` ✅

**Endpoints:**
- `POST /api/pacientes/:id/planes-medicacion` - Crear plan de medicación
- `DELETE /api/pacientes/:id/planes-medicacion/:planId` - Eliminar plan
- `GET /api/pacientes/:id/medicamentos` - Ver medicamentos del paciente

**Restricciones:**
- Doctor solo puede gestionar planes de pacientes asignados

---

#### 5. **ESQUEMA DE VACUNACIÓN** ✅
**Tabla:** `esquema_vacunacion`

**Operaciones:**
- ✅ **CREATE:** Registrar vacunas aplicadas
- ✅ **UPDATE:** Actualizar registros de vacunas
- ✅ **DELETE:** Eliminar registros (solo Admin)
- ✅ **READ:** Ver historial completo de vacunación

**Campos que pueden almacenar:**
- `vacuna` ✅ (STRING - nombre de la vacuna del catálogo)
- `fecha_aplicacion` ✅ (DATEONLY - fecha de aplicación)
- `lote` ✅ (opcional - número de lote)
- `observaciones` ✅ (opcional)

**Endpoints:**
- `POST /api/pacientes/:id/esquema-vacunacion` - Registrar vacuna
- `PUT /api/pacientes/:id/esquema-vacunacion/:esquemaId` - Actualizar registro
- `DELETE /api/pacientes/:id/esquema-vacunacion/:esquemaId` - Eliminar registro
- `GET /api/pacientes/:id/esquema-vacunacion` - Ver esquema completo

**Restricciones:**
- Doctor solo puede gestionar vacunas de pacientes asignados

---

#### 6. **COMORBILIDADES** ✅
**Tablas:** `comorbilidades`, `paciente_comorbilidad`

**Operaciones:**
- ✅ **CREATE:** Agregar comorbilidades al paciente
- ✅ **UPDATE:** Actualizar fecha de detección y observaciones
- ✅ **DELETE:** Eliminar comorbilidades (solo Admin)
- ✅ **READ:** Ver todas las comorbilidades del paciente

**Campos que pueden almacenar:**
- `id_comorbilidad` ✅ (FK a catálogo de comorbilidades)
- `fecha_deteccion` ✅ (DATEONLY - fecha de detección/diagnóstico)
- `anos_padecimiento` ✅ (INTEGER - años que el paciente ha tenido la comorbilidad)
- `observaciones` ✅ (TEXT - observaciones adicionales)

**Comorbilidades disponibles:**
- Diabetes
- Hipertensión
- Obesidad
- Dislipidemia
- Asma
- EPOC
- Enfermedad Cardiovascular
- Enfermedad Renal Crónica
- Síndrome Metabólico
- Tabaquismo
- Tuberculosis
- Otro

**Endpoints:**
- `POST /api/pacientes/:id/comorbilidades` - Agregar comorbilidad
- `PUT /api/pacientes/:id/comorbilidades/:comorbilidadId` - Actualizar comorbilidad
- `DELETE /api/pacientes/:id/comorbilidades/:comorbilidadId` - Eliminar comorbilidad
- `GET /api/pacientes/:id/comorbilidades` - Ver comorbilidades

**Restricciones:**
- Doctor solo puede gestionar comorbilidades de pacientes asignados

---

#### 7. **RED DE APOYO (CONTACTOS DE EMERGENCIA)** ✅
**Tabla:** `red_apoyo`

**Operaciones:**
- ✅ **CREATE:** Agregar contactos de emergencia
- ✅ **UPDATE:** Actualizar información de contactos
- ✅ **DELETE:** Eliminar contactos (solo Admin)
- ✅ **READ:** Ver todos los contactos

**Campos que pueden almacenar:**
- `nombre_contacto` ✅ (STRING(150) - obligatorio)
- `numero_celular` ✅ (opcional)
- `email` ✅ (opcional)
- `direccion` ✅ (opcional)
- `localidad` ✅ (opcional)
- `parentesco` ✅ (opcional - relación con el paciente)

**Endpoints:**
- `POST /api/pacientes/:id/red-apoyo` - Agregar contacto
- `PUT /api/pacientes/:id/red-apoyo/:contactoId` - Actualizar contacto
- `DELETE /api/pacientes/:id/red-apoyo/:contactoId` - Eliminar contacto
- `GET /api/pacientes/:id/red-apoyo` - Ver contactos

**Restricciones:**
- Doctor solo puede gestionar red de apoyo de pacientes asignados

---

#### 8. **CITAS MÉDICAS** ✅
**Tabla:** `citas`

**Operaciones:**
- ✅ **CREATE:** Crear nuevas citas
- ✅ **UPDATE:** Actualizar citas (fecha, motivo, estado, asistencia)
- ✅ **DELETE:** Eliminar citas (solo Admin)
- ✅ **READ:** Ver todas las citas del paciente

**Campos que pueden almacenar:**
- `id_doctor` ✅ (FK a doctores)
- `fecha_cita` ✅ (DATE - fecha y hora de la cita)
- `motivo` ✅ (STRING(255) - motivo de la consulta)
- `asistencia` ✅ (BOOLEAN - si el paciente asistió)
- `es_primera_consulta` ✅ (BOOLEAN - default: false)
- `estado` ✅ (STRING(50) - pendiente, confirmada, cancelada, etc.)
- `observaciones` ✅ (TEXT - observaciones adicionales)

**Endpoints:**
- `POST /api/citas` - Crear cita
- `PUT /api/citas/:id` - Actualizar cita
- `DELETE /api/citas/:id` - Eliminar cita (solo Admin)
- `GET /api/pacientes/:id/citas` - Ver citas del paciente

**Restricciones:**
- Doctor solo puede gestionar citas de pacientes asignados

---

#### 9. **ASIGNACIÓN DE DOCTORES** ✅
**Tabla:** `doctor_paciente`

**Operaciones:**
- ✅ **CREATE:** Asignar doctor a paciente
- ✅ **UPDATE:** Reemplazar doctor
- ✅ **DELETE:** Desasignar doctor
- ✅ **READ:** Ver doctores asignados

**Campos que pueden almacenar:**
- `id_doctor` ✅ (FK a doctores)
- `id_paciente` ✅ (FK a pacientes)
- `fecha_asignacion` ✅ (DATEONLY - auto-generada)
- `observaciones` ✅ (opcional)

**Endpoints:**
- `POST /api/pacientes/:id/doctores` - Asignar doctor
- `PUT /api/pacientes/:id/doctores/:doctorIdAntiguo` - Reemplazar doctor
- `DELETE /api/pacientes/:id/doctores/:doctorId` - Desasignar doctor
- `GET /api/pacientes/:id/doctores` - Ver doctores asignados

**Restricciones:**
- Solo Admin puede asignar/desasignar doctores
- Doctor puede ver sus pacientes asignados

---

### ❌ **DATOS QUE NO PUEDEN ALMACENAR DOCTORES**

1. **Gestión de Doctores:**
   - ❌ Crear, editar o eliminar doctores (solo Admin)
   - ❌ Activar/desactivar doctores (solo Admin)

2. **Gestión de Catálogos:**
   - ❌ Gestionar módulos (solo Admin)
   - ❌ Gestionar medicamentos del sistema (solo Admin)
   - ❌ Gestionar comorbilidades del sistema (solo Admin)
   - ❌ Gestionar vacunas del sistema (solo Admin)

3. **Eliminación de Datos Médicos:**
   - ❌ Eliminar signos vitales (solo Admin puede eliminar)
   - ❌ Eliminar diagnósticos (solo Admin puede eliminar)
   - ❌ Eliminar planes de medicación (solo Admin puede eliminar)
   - ❌ Eliminar red de apoyo (solo Admin puede eliminar)
   - ❌ Eliminar esquema de vacunación (solo Admin puede eliminar)
   - ❌ Eliminar comorbilidades (solo Admin puede eliminar)
   - ❌ Eliminar pacientes (solo Admin puede eliminar)

4. **Acceso Global:**
   - ❌ Ver todos los pacientes (solo ven asignados)
   - ❌ Ver historial de auditoría completo
   - ❌ Gestionar configuración del sistema
   - ❌ Ver reportes globales del sistema

---

## 👤 PACIENTE

### ✅ **DATOS QUE PUEDEN ALMACENAR**

#### 1. **SIGNOS VITALES** ✅ (ÚNICO DATO QUE PUEDEN CREAR)
**Tabla:** `signos_vitales`

**Operaciones:**
- ✅ **CREATE:** Crear registros de sus propios signos vitales
- ✅ **READ:** Ver su historial completo de signos vitales
- ❌ **UPDATE:** No pueden actualizar (solo Doctor/Admin)
- ❌ **DELETE:** No pueden eliminar (solo Admin)

**Campos que pueden almacenar:**
- `peso_kg` ✅
- `talla_m` ✅
- `imc` ✅ (calculado automáticamente si se proporciona peso y talla)
- `medida_cintura_cm` ✅
- `presion_sistolica` ✅
- `presion_diastolica` ✅
- `glucosa_mg_dl` ✅
- `colesterol_mg_dl` ✅
- `trigliceridos_mg_dl` ✅
- `fecha_medicion` ✅ (auto-generada si no se proporciona)
- `observaciones` ✅ (opcional)
- `registrado_por` ✅ (automáticamente se marca como 'paciente')

**Endpoint:**
- `POST /api/pacientes/:id/signos-vitales` - Crear signos vitales
  - **Autorización:** `authorizePatientAccess` (solo su propio ID)
  - **No requiere:** `authorizeRoles('Admin', 'Doctor')`

**Restricciones:**
- Solo pueden crear signos vitales para su propio `id_paciente`
- No pueden asociar signos vitales a citas (`id_cita` se ignora si lo envían)
- No pueden actualizar o eliminar registros existentes

**Ejemplo de uso:**
```javascript
// El paciente puede hacer esto desde su dashboard
POST /api/pacientes/123/signos-vitales
{
  "peso_kg": 70,
  "talla_m": 1.65,
  "presion_sistolica": 120,
  "presion_diastolica": 80,
  "glucosa_mg_dl": 95,
  "observaciones": "Medición matutina"
}
```

---

### ✅ **DATOS QUE PUEDEN LEER (SOLO CONSULTA)**

#### 1. **Datos Personales** ✅
- `GET /api/pacientes/:id` - Ver sus propios datos personales
  - Solo pueden ver su propio perfil
  - No pueden actualizar (solo lectura)

#### 2. **Citas** ✅
- `GET /api/pacientes/:id/citas` - Ver sus citas médicas
  - Pueden ver citas futuras y pasadas
  - Pueden solicitar reprogramación de citas

#### 3. **Signos Vitales** ✅
- `GET /api/pacientes/:id/signos-vitales` - Ver su historial completo
  - Pueden ver todos sus registros (los que crearon y los que creó el doctor)

#### 4. **Diagnósticos** ✅
- `GET /api/pacientes/:id/diagnosticos` - Ver sus diagnósticos
  - Solo lectura, no pueden crear ni modificar

#### 5. **Medicamentos** ✅
- `GET /api/pacientes/:id/medicamentos` - Ver sus planes de medicación
  - Pueden ver medicamentos prescritos
  - Pueden registrar tomas de medicamentos (a través de `medicamento_toma`)

#### 6. **Comorbilidades** ✅
- `GET /api/pacientes/:id/comorbilidades` - Ver sus comorbilidades
  - Solo lectura

#### 7. **Red de Apoyo** ✅
- `GET /api/pacientes/:id/red-apoyo` - Ver sus contactos de emergencia
  - Solo lectura (no pueden crear ni modificar)

#### 8. **Esquema de Vacunación** ✅
- `GET /api/pacientes/:id/esquema-vacunacion` - Ver su historial de vacunas
  - Solo lectura

#### 9. **Resumen Médico** ✅
- `GET /api/pacientes/:id/resumen-medico` - Ver resumen completo
  - Resumen con conteos y últimos registros de cada tipo

---

### ❌ **DATOS QUE NO PUEDEN ALMACENAR**

#### 1. **Datos Personales** ❌
- ❌ No pueden actualizar su nombre, apellidos, CURP, fecha de nacimiento
- ❌ No pueden actualizar dirección, teléfono, estado, localidad
- ❌ No pueden cambiar institución de salud o módulo
- **Razón:** Estos datos deben ser gestionados por el personal médico para mantener integridad

#### 2. **Diagnósticos** ❌
- ❌ No pueden crear diagnósticos
- ❌ No pueden actualizar diagnósticos
- ❌ No pueden eliminar diagnósticos
- **Razón:** Los diagnósticos solo pueden ser creados por profesionales médicos

#### 3. **Planes de Medicación** ❌
- ❌ No pueden crear planes de medicación
- ❌ No pueden modificar planes existentes
- ❌ No pueden eliminar planes
- **Razón:** Los planes de medicación deben ser prescritos por doctores
- ✅ **PERO:** Pueden registrar tomas de medicamentos (confirmar que tomaron su medicamento)

#### 4. **Vacunas** ❌
- ❌ No pueden registrar vacunas aplicadas
- ❌ No pueden actualizar registros de vacunas
- ❌ No pueden eliminar registros
- **Razón:** Las vacunas deben ser registradas por personal médico autorizado

#### 5. **Comorbilidades** ❌
- ❌ No pueden agregar comorbilidades
- ❌ No pueden actualizar comorbilidades
- ❌ No pueden eliminar comorbilidades
- **Razón:** Las comorbilidades deben ser diagnosticadas por doctores

#### 6. **Red de Apoyo** ❌
- ❌ No pueden agregar contactos de emergencia
- ❌ No pueden actualizar contactos
- ❌ No pueden eliminar contactos
- **Razón:** Los contactos de emergencia se gestionan durante el registro inicial

#### 7. **Citas** ❌
- ❌ No pueden crear citas directamente
- ❌ No pueden actualizar citas (fecha, motivo, etc.)
- ❌ No pueden eliminar citas
- ✅ **PERO:** Pueden solicitar reprogramación de citas
- ✅ **PERO:** Pueden cancelar solicitudes de reprogramación

---

## 📊 TABLA COMPARATIVA DE PERMISOS

| Entidad | CREATE | READ | UPDATE | DELETE |
|---------|--------|------|--------|--------|
| **Pacientes** | | | | |
| └─ Doctor/Admin | ✅ | ✅ (asignados) | ✅ (asignados) | ❌ Solo Admin |
| └─ Paciente | ❌ | ✅ (propio) | ❌ | ❌ |
| **Signos Vitales** | | | | |
| └─ Doctor/Admin | ✅ | ✅ (asignados) | ✅ (asignados) | ❌ Solo Admin |
| └─ Paciente | ✅ (propio) | ✅ (propio) | ❌ | ❌ |
| **Diagnósticos** | | | | |
| └─ Doctor/Admin | ✅ | ✅ (asignados) | ✅ (asignados) | ❌ Solo Admin |
| └─ Paciente | ❌ | ✅ (propio) | ❌ | ❌ |
| **Planes Medicación** | | | | |
| └─ Doctor/Admin | ✅ | ✅ (asignados) | ✅ (asignados) | ❌ Solo Admin |
| └─ Paciente | ❌ | ✅ (propio) | ❌ | ❌ |
| **Vacunas** | | | | |
| └─ Doctor/Admin | ✅ | ✅ (asignados) | ✅ (asignados) | ❌ Solo Admin |
| └─ Paciente | ❌ | ✅ (propio) | ❌ | ❌ |
| **Comorbilidades** | | | | |
| └─ Doctor/Admin | ✅ | ✅ (asignados) | ✅ (asignados) | ❌ Solo Admin |
| └─ Paciente | ❌ | ✅ (propio) | ❌ | ❌ |
| **Red de Apoyo** | | | | |
| └─ Doctor/Admin | ✅ | ✅ (asignados) | ✅ (asignados) | ❌ Solo Admin |
| └─ Paciente | ❌ | ✅ (propio) | ❌ | ❌ |
| **Citas** | | | | |
| └─ Doctor/Admin | ✅ | ✅ (asignados) | ✅ (asignados) | ❌ Solo Admin |
| └─ Paciente | ❌ | ✅ (propio) | ✅ (reprogramación) | ❌ |

---

## 🔒 SEGURIDAD Y VALIDACIONES

### **Para Pacientes:**
1. **Autorización:** `authorizePatientAccess` valida que el `id_paciente` en la URL coincida con el `id_paciente` del usuario autenticado
2. **Solo Signos Vitales:** El único endpoint POST disponible para pacientes es `/api/pacientes/:id/signos-vitales`
3. **Auto-marcado:** Cuando un paciente crea signos vitales, `registrado_por` se establece automáticamente como `'paciente'`

### **Para Doctores:**
1. **Autorización:** `authorizePatientAccess` valida que el doctor tenga acceso al paciente (tabla `doctor_paciente`)
2. **Solo Asignados:** Los doctores solo pueden gestionar datos de pacientes asignados a ellos
3. **Sin Eliminación:** Los doctores no pueden eliminar datos médicos (solo Admin)

### **Para Administradores:**
1. **Acceso Total:** Pueden gestionar todos los pacientes sin restricciones
2. **Eliminación:** Solo los administradores pueden eliminar datos del sistema
3. **Gestión de Sistema:** Pueden gestionar doctores, módulos y catálogos

---

## 📝 NOTAS IMPORTANTES

1. **Registro de Paciente:**
   - Los pacientes NO se registran a sí mismos
   - El registro inicial es realizado por Admin/Doctor durante la primera consulta
   - Se crea el usuario, PIN, perfil de paciente, red de apoyo y primera consulta

2. **Signos Vitales del Paciente:**
   - Los pacientes pueden registrar sus signos vitales desde su dashboard móvil
   - El sistema genera alertas automáticas si los valores están fuera de rangos normales
   - Los doctores pueden ver todos los signos vitales (tanto los registrados por el paciente como por ellos)

3. **Medicamentos:**
   - Los pacientes NO pueden crear planes de medicación
   - Los pacientes PUEDEN registrar tomas de medicamentos (confirmar adherencia)
   - Los doctores crean los planes y los pacientes confirman las tomas

4. **Citas:**
   - Los pacientes NO pueden crear citas directamente
   - Los pacientes PUEDEN solicitar reprogramación de citas existentes
   - Los doctores/Admin crean y gestionan las citas

---

## 🎯 CONCLUSIÓN

### **Doctor/Administrador:**
- ✅ Pueden almacenar **TODOS** los datos médicos del paciente
- ✅ Pueden crear, leer, actualizar (y Admin puede eliminar) todos los registros
- ✅ Tienen acceso completo a la gestión médica del paciente

### **Paciente:**
- ✅ Solo pueden almacenar **SIGNOS VITALES** (crear nuevos registros)
- ✅ Pueden leer todos sus datos médicos
- ❌ No pueden modificar datos personales, diagnósticos, medicamentos, vacunas, comorbilidades, etc.
- ✅ Pueden solicitar reprogramación de citas

**Razón del diseño:** Los pacientes de zonas rurales pueden registrar sus signos vitales de forma autónoma para monitoreo continuo, pero todos los datos médicos críticos (diagnósticos, medicamentos, etc.) deben ser gestionados por profesionales médicos para garantizar la integridad y seguridad de la información clínica.

