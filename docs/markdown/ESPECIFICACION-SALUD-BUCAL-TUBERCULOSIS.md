# 📋 ESPECIFICACIÓN: SALUD BUCAL Y DETECCIÓN DE TUBERCULOSIS

**Fecha:** 29 de Diciembre de 2025  
**Basado en:** Formato FORMA_2022_OFICIAL  
**Prioridad:** 🟢 BAJA (Datos complementarios)

---

## 🦷 SALUD BUCAL

### **Instrucciones del Formato Oficial**

Según el formato FORMA_2022_OFICIAL, en la sección **"OTRAS ACCIONES DE PREVENCIÓN Y CONTROL"**, subsección **"Salud Bucal"**, se requieren los siguientes campos:

#### **Instrucción ⑫: ¿Presenta enfermedades odontológicas?**
- **Campo en formato:** "¿Presenta enfermedades odontológicas? ⑫"
- **Tipo:** BOOLEAN (1=SI, 0=NO)
- **Descripción:** Indica si el paciente presenta enfermedades odontológicas detectadas durante la evaluación
- **Uso:** Reportes de salud bucal y cobertura de detección

#### **Instrucción: ¿Recibió tratamiento odontológico?**
- **Campo en formato:** "¿Recibió tratamiento odontológico?**"
- **Tipo:** BOOLEAN (1=SI, 0=NO)
- **Descripción:** Indica si el paciente recibió tratamiento odontológico
- **Uso:** Reportes de cobertura de tratamiento odontológico
- **Nota:** Campo marcado con doble asterisco (**) = Datos complementarios

---

### **Estructura de la Tabla `salud_bucal`**

```sql
CREATE TABLE salud_bucal (
  id_registro INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT NULL,
  fecha_registro DATE NOT NULL,
  presenta_enfermedades_odontologicas BOOLEAN DEFAULT FALSE 
    COMMENT '⑫ ¿Presenta enfermedades odontológicas?',
  recibio_tratamiento_odontologico BOOLEAN DEFAULT FALSE 
    COMMENT '¿Recibió tratamiento odontológico?',
  observaciones TEXT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
  
  INDEX idx_paciente (id_paciente),
  INDEX idx_cita (id_cita),
  INDEX idx_fecha_registro (fecha_registro),
  INDEX idx_paciente_fecha (id_paciente, fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT 'Registro de salud bucal del paciente según formato GAM';
```

---

### **Funcionalidades a Implementar**

#### **1. Modelo Sequelize (`SaludBucal.js`)**
- Definir modelo con todos los campos
- Validaciones:
  - `fecha_registro` obligatorio
  - `id_paciente` obligatorio
  - `id_cita` opcional
- Relaciones:
  - `belongsTo(Paciente)`
  - `belongsTo(Cita)` (opcional)

#### **2. Controller (`saludBucal.js`)**
- **GET `/api/pacientes/:id/salud-bucal`**
  - Obtener todos los registros de salud bucal de un paciente
  - Paginación (limit, offset)
  - Ordenamiento por fecha (DESC por defecto)
  - Incluir información de cita asociada (opcional)

- **POST `/api/pacientes/:id/salud-bucal`**
  - Crear nuevo registro de salud bucal
  - Validaciones:
    - Verificar que el paciente existe
    - Verificar acceso Doctor-Paciente (si es Doctor)
    - `fecha_registro` obligatorio
    - Validar formato de fecha
  - Campos requeridos:
    - `fecha_registro`
    - `presenta_enfermedades_odontologicas` (default: false)
    - `recibio_tratamiento_odontologico` (default: false)
  - Campos opcionales:
    - `id_cita`
    - `observaciones`

- **PUT `/api/pacientes/:pacienteId/salud-bucal/:id`**
  - Actualizar registro existente
  - Validaciones:
    - Verificar que el registro pertenece al paciente
    - Verificar acceso Doctor-Paciente (si es Doctor)
  - Solo Admin/Doctor pueden actualizar

- **DELETE `/api/pacientes/:pacienteId/salud-bucal/:id`**
  - Eliminar registro (soft delete o hard delete según política)
  - Solo Admin puede eliminar
  - Validar que el registro pertenece al paciente

#### **3. Rutas (`pacienteMedicalData.js`)**
- Agregar rutas bajo `/api/pacientes/:id/salud-bucal`
- Middlewares:
  - `authenticateToken` - Autenticación requerida
  - `authorizePatientAccess` - Verificar acceso al paciente
  - `authorizeRoles(['Admin', 'Doctor'])` - Solo Admin/Doctor pueden crear/actualizar
  - `authorizeRoles(['Admin'])` - Solo Admin puede eliminar
  - `writeRateLimit` / `searchRateLimit` - Rate limiting

#### **4. Validaciones de Negocio**
- Si `recibio_tratamiento_odontologico = true`, se recomienda que `presenta_enfermedades_odontologicas = true` (advertencia, no bloquea)
- `fecha_registro` no puede ser futura (validación opcional)
- `fecha_registro` debe ser >= fecha_registro del paciente (validación opcional)

#### **5. Reportes y Consultas**
- Contar pacientes con enfermedades odontológicas por mes
- Contar pacientes que recibieron tratamiento odontológico por mes
- Porcentaje de cobertura de detección de salud bucal
- Porcentaje de cobertura de tratamiento odontológico

---

## 🦠 DETECCIÓN DE TUBERCULOSIS

### **Instrucciones del Formato Oficial**

Según el formato FORMA_2022_OFICIAL, en la sección **"OTRAS ACCIONES DE PREVENCIÓN Y CONTROL"**, subsección **"Tuberculosis"**, se requieren los siguientes campos:

#### **Instrucción: Aplicación de ENCUESTA de Tuberculosis**
- **Campo en formato:** "Aplicación de ENCUESTA de Tuberculosis**"
- **Tipo:** BOOLEAN (1=SI, 0=NO)
- **Descripción:** Indica si se aplicó la encuesta de detección de tuberculosis al paciente
- **Uso:** Reportes de cobertura de detección de tuberculosis
- **Nota:** Campo marcado con doble asterisco (**) = Datos complementarios

#### **Instrucción ⑬: Resultado de Baciloscopia**
- **Campo en formato:** "En caso de Baciloscopia anote el resultado ⑬"
- **Tipo:** ENUM
- **Valores posibles:**
  - `positivo` - Resultado positivo
  - `negativo` - Resultado negativo
  - `indeterminado` - Resultado indeterminado
  - `pendiente` - Resultado pendiente
- **Descripción:** Resultado de la baciloscopia si se realizó
- **Uso:** Seguimiento de casos de tuberculosis y reportes epidemiológicos
- **Nota:** Solo se registra si se realizó baciloscopia

#### **Instrucción: ¿Ingresó a tratamiento?**
- **Campo en formato:** "**¿Ingresó a tratamiento?"
- **Tipo:** BOOLEAN (1=SI, 0=NO)
- **Descripción:** Indica si el paciente ingresó a tratamiento para tuberculosis
- **Uso:** Reportes de cobertura de tratamiento de tuberculosis
- **Nota:** Campo marcado con doble asterisco (**) = Datos complementarios

---

### **Estructura de la Tabla `deteccion_tuberculosis`**

```sql
CREATE TABLE deteccion_tuberculosis (
  id_deteccion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT NULL,
  fecha_deteccion DATE NOT NULL,
  
  -- Encuesta
  encuesta_aplicada BOOLEAN DEFAULT FALSE 
    COMMENT 'Aplicación de ENCUESTA de Tuberculosis',
  fecha_encuesta DATE NULL,
  
  -- Baciloscopia
  baciloscopia_realizada BOOLEAN DEFAULT FALSE 
    COMMENT 'Indica si se realizó baciloscopia',
  baciloscopia_resultado ENUM('positivo', 'negativo', 'indeterminado', 'pendiente') NULL 
    COMMENT '⑬ En caso de Baciloscopia anote el resultado',
  fecha_baciloscopia DATE NULL,
  
  -- Tratamiento
  ingreso_tratamiento BOOLEAN DEFAULT FALSE 
    COMMENT '¿Ingresó a tratamiento?',
  fecha_inicio_tratamiento DATE NULL,
  
  -- Metadatos
  observaciones TEXT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
  
  INDEX idx_paciente (id_paciente),
  INDEX idx_cita (id_cita),
  INDEX idx_fecha_deteccion (fecha_deteccion),
  INDEX idx_baciloscopia_resultado (baciloscopia_resultado),
  INDEX idx_ingreso_tratamiento (ingreso_tratamiento),
  INDEX idx_paciente_fecha (id_paciente, fecha_deteccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT 'Registro de detección y seguimiento de tuberculosis según formato GAM';
```

---

### **Funcionalidades a Implementar**

#### **1. Modelo Sequelize (`DeteccionTuberculosis.js`)**
- Definir modelo con todos los campos
- Validaciones:
  - `fecha_deteccion` obligatorio
  - `id_paciente` obligatorio
  - `id_cita` opcional
  - `baciloscopia_resultado` solo si `baciloscopia_realizada = true`
  - `fecha_baciloscopia` solo si `baciloscopia_realizada = true`
  - `fecha_inicio_tratamiento` solo si `ingreso_tratamiento = true`
- Relaciones:
  - `belongsTo(Paciente)`
  - `belongsTo(Cita)` (opcional)

#### **2. Controller (`deteccionTuberculosis.js`)**
- **GET `/api/pacientes/:id/deteccion-tuberculosis`**
  - Obtener todos los registros de detección de tuberculosis de un paciente
  - Paginación (limit, offset)
  - Ordenamiento por fecha (DESC por defecto)
  - Incluir información de cita asociada (opcional)
  - Filtros opcionales:
    - Por resultado de baciloscopia
    - Por ingreso a tratamiento
    - Por rango de fechas

- **GET `/api/pacientes/:id/deteccion-tuberculosis/:id`**
  - Obtener un registro específico por ID
  - Validar que pertenece al paciente

- **POST `/api/pacientes/:id/deteccion-tuberculosis`**
  - Crear nuevo registro de detección de tuberculosis
  - Validaciones:
    - Verificar que el paciente existe
    - Verificar acceso Doctor-Paciente (si es Doctor)
    - `fecha_deteccion` obligatorio
    - Validar formato de fechas
    - Si `baciloscopia_realizada = true`, `baciloscopia_resultado` debe estar presente
    - Si `ingreso_tratamiento = true`, `fecha_inicio_tratamiento` recomendado (advertencia)
  - Campos requeridos:
    - `fecha_deteccion`
    - `encuesta_aplicada` (default: false)
    - `baciloscopia_realizada` (default: false)
    - `ingreso_tratamiento` (default: false)
  - Campos opcionales:
    - `id_cita`
    - `fecha_encuesta`
    - `baciloscopia_resultado` (solo si `baciloscopia_realizada = true`)
    - `fecha_baciloscopia`
    - `fecha_inicio_tratamiento`
    - `observaciones`

- **PUT `/api/pacientes/:pacienteId/deteccion-tuberculosis/:id`**
  - Actualizar registro existente
  - Validaciones:
    - Verificar que el registro pertenece al paciente
    - Verificar acceso Doctor-Paciente (si es Doctor)
    - Mismas validaciones que en POST
  - Solo Admin/Doctor pueden actualizar

- **DELETE `/api/pacientes/:pacienteId/deteccion-tuberculosis/:id`**
  - Eliminar registro (soft delete o hard delete según política)
  - Solo Admin puede eliminar
  - Validar que el registro pertenece al paciente

#### **3. Rutas (`pacienteMedicalData.js`)**
- Agregar rutas bajo `/api/pacientes/:id/deteccion-tuberculosis`
- Middlewares:
  - `authenticateToken` - Autenticación requerida
  - `authorizePatientAccess` - Verificar acceso al paciente
  - `authorizeRoles(['Admin', 'Doctor'])` - Solo Admin/Doctor pueden crear/actualizar
  - `authorizeRoles(['Admin'])` - Solo Admin puede eliminar
  - `writeRateLimit` / `searchRateLimit` - Rate limiting

#### **4. Validaciones de Negocio**
- **Flujo lógico esperado:**
  1. Primero se aplica la encuesta (`encuesta_aplicada = true`)
  2. Si la encuesta indica riesgo, se realiza baciloscopia (`baciloscopia_realizada = true`)
  3. Si la baciloscopia es positiva, se ingresa a tratamiento (`ingreso_tratamiento = true`)
  
- **Validaciones específicas:**
  - Si `baciloscopia_resultado` está presente, `baciloscopia_realizada` debe ser `true`
  - Si `fecha_baciloscopia` está presente, `baciloscopia_realizada` debe ser `true`
  - Si `ingreso_tratamiento = true`, se recomienda que `baciloscopia_resultado = 'positivo'` (advertencia, no bloquea)
  - `fecha_deteccion` no puede ser futura (validación opcional)
  - `fecha_deteccion` debe ser >= fecha_registro del paciente (validación opcional)
  - `fecha_baciloscopia` debe ser >= `fecha_encuesta` (si ambas están presentes)
  - `fecha_inicio_tratamiento` debe ser >= `fecha_baciloscopia` (si ambas están presentes)

#### **5. Reportes y Consultas**
- Contar pacientes con encuesta aplicada por mes
- Contar pacientes con baciloscopia realizada por mes
- Contar pacientes con resultado positivo por mes
- Contar pacientes que ingresaron a tratamiento por mes
- Porcentaje de cobertura de encuesta de tuberculosis
- Porcentaje de cobertura de baciloscopia
- Tasa de positividad de baciloscopias
- Tasa de ingreso a tratamiento (de casos positivos)

---

## 📊 RESUMEN DE CAMPOS Y FUNCIONES

### **Salud Bucal**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id_registro` | INT | PK | ID único del registro |
| `id_paciente` | INT | ✅ | ID del paciente |
| `id_cita` | INT | ❌ | ID de la cita asociada (opcional) |
| `fecha_registro` | DATE | ✅ | Fecha del registro |
| `presenta_enfermedades_odontologicas` | BOOLEAN | ✅ | ¿Presenta enfermedades odontológicas? ⑫ |
| `recibio_tratamiento_odontologico` | BOOLEAN | ✅ | ¿Recibió tratamiento odontológico? |
| `observaciones` | TEXT | ❌ | Observaciones adicionales |
| `fecha_creacion` | DATETIME | Auto | Fecha de creación del registro |

**Funciones:**
- ✅ Crear registro de salud bucal
- ✅ Obtener registros de un paciente
- ✅ Actualizar registro
- ✅ Eliminar registro (solo Admin)
- ✅ Reportes de cobertura

---

### **Detección de Tuberculosis**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id_deteccion` | INT | PK | ID único de la detección |
| `id_paciente` | INT | ✅ | ID del paciente |
| `id_cita` | INT | ❌ | ID de la cita asociada (opcional) |
| `fecha_deteccion` | DATE | ✅ | Fecha de la detección |
| `encuesta_aplicada` | BOOLEAN | ✅ | Aplicación de ENCUESTA de Tuberculosis |
| `fecha_encuesta` | DATE | ❌ | Fecha de aplicación de encuesta |
| `baciloscopia_realizada` | BOOLEAN | ✅ | Indica si se realizó baciloscopia |
| `baciloscopia_resultado` | ENUM | ❌* | Resultado de baciloscopia ⑬ |
| `fecha_baciloscopia` | DATE | ❌ | Fecha de realización de baciloscopia |
| `ingreso_tratamiento` | BOOLEAN | ✅ | ¿Ingresó a tratamiento? |
| `fecha_inicio_tratamiento` | DATE | ❌ | Fecha de inicio de tratamiento |
| `observaciones` | TEXT | ❌ | Observaciones adicionales |
| `fecha_creacion` | DATETIME | Auto | Fecha de creación del registro |

*Requerido solo si `baciloscopia_realizada = true`

**Funciones:**
- ✅ Crear registro de detección
- ✅ Obtener registros de un paciente (con filtros)
- ✅ Obtener registro específico por ID
- ✅ Actualizar registro
- ✅ Eliminar registro (solo Admin)
- ✅ Reportes epidemiológicos
- ✅ Seguimiento de casos positivos

---

## 🔐 PERMISOS Y ROLES

### **Salud Bucal**
- **Ver:** Admin, Doctor, Paciente (solo sus propios registros)
- **Crear:** Admin, Doctor
- **Actualizar:** Admin, Doctor
- **Eliminar:** Solo Admin

### **Detección de Tuberculosis**
- **Ver:** Admin, Doctor, Paciente (solo sus propios registros)
- **Crear:** Admin, Doctor
- **Actualizar:** Admin, Doctor
- **Eliminar:** Solo Admin

---

## 📝 NOTAS IMPORTANTES

1. **Prioridad Baja:** Estos campos son complementarios según el formato oficial (marcados con **), no son criterios de acreditación.

2. **Relación con Citas:** Ambos módulos pueden asociarse a una cita médica, pero no es obligatorio. Esto permite registrar información fuera de consultas programadas.

3. **Historial:** Ambos módulos permiten múltiples registros por paciente, manteniendo un historial completo.

4. **Validaciones de Negocio:** Se implementarán validaciones lógicas (ej: no puede haber resultado de baciloscopia sin haberla realizado), pero algunas serán advertencias, no bloqueos.

5. **Reportes:** Ambos módulos generarán reportes para cumplimiento del formato GAM y análisis epidemiológicos.

---

**Documento creado el:** 29 de Diciembre de 2025  
**Basado en:** Formato FORMA_2022_OFICIAL  
**Estado:** 📋 Especificación lista para implementación

