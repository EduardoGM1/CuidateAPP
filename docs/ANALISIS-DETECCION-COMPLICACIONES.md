# 🔍 ANÁLISIS: DETECCIÓN DE COMPLICACIONES

**Fecha:** Diciembre 2024  
**Proyecto:** Sistema Clínica Móvil  
**Objetivo:** Analizar e implementar almacenamiento de datos de detección de complicaciones médicas

---

## 📋 RESUMEN EJECUTIVO

Se requiere añadir un nuevo módulo para registrar **detección de complicaciones** relacionadas con comorbilidades del paciente. Los datos incluyen exámenes médicos específicos, auto-monitoreo, tipo de complicación, fecha de diagnóstico y acciones realizadas.

---

## 🎯 DATOS IDENTIFICADOS DE LA IMAGEN

### **Campos Requeridos:**

1. **Exploración de pies ⑦** (Foot examination)
   - Tipo: Examen médico específico
   - Propósito: Detectar complicaciones en pies (común en diabetes)

2. **Exploración de Fondo de Ojo ⑧** (Funduscopy)
   - Tipo: Examen médico específico
   - Propósito: Detectar retinopatía (común en diabetes)

3. **Realiza Auto-monitoreo ⑨** (Self-monitoring)
   - Sub-campos:
     - **Glucosa** (Glucose)
     - **Presión A.** (Blood Pressure)
   - Tipo: Indicador booleano con sub-categorías

4. **Tipo ⑩** (Type)
   - Tipo: Clasificación de la complicación
   - Propósito: Categorizar el tipo de complicación detectada

5. **Fecha de diagnóstico** (Date of diagnosis)
   - Tipo: Fecha
   - Propósito: Registrar cuándo se detectó la complicación

6. **Referencia ⑪** (Reference)
   - Tipo: Texto/Referencia
   - Propósito: Referencia a otro documento o especialista

7. **Accion realizada** (Action performed)
   - Tipo: Texto/Descripción
   - Propósito: Registrar qué acción se tomó tras detectar la complicación

---

## 🗄️ ANÁLISIS DE MODELO DE BASE DE DATOS ACTUAL

### **Estructura Existente Relevante:**

1. **Tabla `paciente_comorbilidad`**
   - Relación N:M entre Paciente y Comorbilidad
   - Campos: `fecha_deteccion`, `observaciones`, `anos_padecimiento`
   - **Limitación:** No almacena detalles de complicaciones específicas

2. **Tabla `signos_vitales`**
   - Almacena glucosa y presión arterial
   - **Limitación:** No está vinculada a complicaciones específicas

3. **Tabla `diagnosticos`**
   - Almacena diagnósticos generales
   - **Limitación:** No tiene estructura específica para complicaciones

4. **Tabla `citas`**
   - Puede asociarse a exámenes
   - **Limitación:** No tiene campos específicos para exámenes de complicaciones

---

## 🏗️ PROPUESTA DE DISEÑO (NORMALIZACIÓN)

### **Opción 1: Tabla Única `deteccion_complicaciones` (RECOMENDADA)**

**Ventajas:**
- ✅ Normalización adecuada (3NF)
- ✅ Historial completo de detecciones
- ✅ Relación clara con comorbilidades
- ✅ Fácil consulta y análisis
- ✅ Escalable para nuevos tipos de exámenes

**Estructura Propuesta:**

```sql
CREATE TABLE deteccion_complicaciones (
  id_deteccion INTEGER PRIMARY KEY AUTO_INCREMENT,
  id_paciente INTEGER NOT NULL,
  id_comorbilidad INTEGER NULL, -- FK a comorbilidades (opcional, puede ser complicación sin comorbilidad específica)
  id_cita INTEGER NULL, -- FK a citas (opcional, puede ser detección fuera de cita)
  id_doctor INTEGER NULL, -- FK a doctores (quien detectó)
  
  -- Exámenes realizados
  exploracion_pies BOOLEAN DEFAULT FALSE,
  exploracion_fondo_ojo BOOLEAN DEFAULT FALSE,
  
  -- Auto-monitoreo
  realiza_auto_monitoreo BOOLEAN DEFAULT FALSE,
  auto_monitoreo_glucosa BOOLEAN DEFAULT FALSE,
  auto_monitoreo_presion BOOLEAN DEFAULT FALSE,
  
  -- Clasificación
  tipo_complicacion VARCHAR(100) NULL, -- Ej: "Retinopatía", "Neuropatía", "Nefropatía", etc.
  
  -- Fechas
  fecha_deteccion DATE NOT NULL,
  fecha_diagnostico DATE NULL, -- Puede ser diferente a fecha_deteccion
  
  -- Acciones y referencias
  accion_realizada TEXT NULL,
  referencia VARCHAR(255) NULL, -- Referencia a especialista, documento, etc.
  
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

**Modelo Sequelize Propuesto:**

```javascript
const DeteccionComplicacion = sequelize.define('DeteccionComplicacion', {
  id_deteccion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  id_paciente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'pacientes', key: 'id_paciente' }
  },
  id_comorbilidad: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: { model: 'comorbilidades', key: 'id_comorbilidad' }
  },
  id_cita: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: { model: 'citas', key: 'id_cita' }
  },
  id_doctor: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: { model: 'doctores', key: 'id_doctor' }
  },
  
  // Exámenes realizados
  exploracion_pies: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si se realizó exploración de pies'
  },
  exploracion_fondo_ojo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si se realizó exploración de fondo de ojo'
  },
  
  // Auto-monitoreo
  realiza_auto_monitoreo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si el paciente realiza auto-monitoreo'
  },
  auto_monitoreo_glucosa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si realiza auto-monitoreo de glucosa'
  },
  auto_monitoreo_presion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica si realiza auto-monitoreo de presión arterial'
  },
  
  // Clasificación
  tipo_complicacion: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
    comment: 'Tipo de complicación detectada (ej: Retinopatía, Neuropatía, Nefropatía)'
  },
  
  // Fechas
  fecha_deteccion: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Fecha en que se detectó la complicación'
  },
  fecha_diagnostico: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: null,
    comment: 'Fecha de diagnóstico formal (puede ser diferente a fecha_deteccion)'
  },
  
  // Acciones y referencias
  accion_realizada: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
    comment: 'Descripción de la acción realizada tras detectar la complicación'
  },
  referencia: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: null,
    comment: 'Referencia a especialista, documento, o recurso externo'
  },
  
  // Metadatos
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  registrado_por: {
    type: DataTypes.ENUM('doctor', 'paciente'),
    allowNull: false,
    defaultValue: 'doctor',
    comment: 'Quién registró la detección'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'deteccion_complicaciones',
  timestamps: false,
  indexes: [
    { fields: ['id_paciente'] },
    { fields: ['id_comorbilidad'] },
    { fields: ['id_cita'] },
    { fields: ['fecha_deteccion'] },
    { fields: ['id_paciente', 'fecha_deteccion'] } // Índice compuesto para consultas frecuentes
  ]
});
```

---

## 🔗 RELACIONES PROPUESTAS

### **Relaciones 1:N:**

1. **Paciente → DeteccionComplicacion**
   - Un paciente puede tener múltiples detecciones de complicaciones
   - `Paciente.hasMany(DeteccionComplicacion, { foreignKey: 'id_paciente' })`
   - `DeteccionComplicacion.belongsTo(Paciente, { foreignKey: 'id_paciente' })`

2. **Comorbilidad → DeteccionComplicacion** (opcional)
   - Una comorbilidad puede tener múltiples detecciones
   - `Comorbilidad.hasMany(DeteccionComplicacion, { foreignKey: 'id_comorbilidad' })`
   - `DeteccionComplicacion.belongsTo(Comorbilidad, { foreignKey: 'id_comorbilidad' })`

3. **Cita → DeteccionComplicacion** (opcional)
   - Una cita puede tener múltiples detecciones
   - `Cita.hasMany(DeteccionComplicacion, { foreignKey: 'id_cita' })`
   - `DeteccionComplicacion.belongsTo(Cita, { foreignKey: 'id_cita' })`

4. **Doctor → DeteccionComplicacion** (opcional)
   - Un doctor puede detectar múltiples complicaciones
   - `Doctor.hasMany(DeteccionComplicacion, { foreignKey: 'id_doctor' })`
   - `DeteccionComplicacion.belongsTo(Doctor, { foreignKey: 'id_doctor' })`

---

## 📊 NORMALIZACIÓN Y BUENAS PRÁCTICAS

### **✅ Cumple con 3NF (Tercera Forma Normal):**

1. **Eliminación de redundancia:**
   - No duplica datos de pacientes, comorbilidades o citas
   - Usa Foreign Keys para referencias

2. **Dependencias funcionales:**
   - Cada campo depende directamente de la clave primaria
   - No hay dependencias transitivas

3. **Separación de conceptos:**
   - Exámenes (exploracion_pies, exploracion_fondo_ojo) separados
   - Auto-monitoreo separado con sub-categorías
   - Acciones y referencias como campos independientes

### **✅ Índices Optimizados:**

- `idx_paciente`: Consultas por paciente
- `idx_comorbilidad`: Análisis por tipo de comorbilidad
- `idx_cita`: Vinculación con citas
- `idx_fecha_deteccion`: Análisis temporales
- `idx_paciente_fecha`: Consultas combinadas (más frecuentes)

### **✅ Tipos de Datos Apropiados:**

- `BOOLEAN` para exámenes y auto-monitoreo (binario)
- `DATEONLY` para fechas (sin hora)
- `TEXT` para descripciones largas
- `STRING(100/255)` para campos limitados
- `ENUM` para valores controlados

---

## 🔒 SEGURIDAD Y VALIDACIONES

### **Validaciones de Negocio:**

1. **Fechas:**
   - `fecha_deteccion` no puede ser futura
   - `fecha_diagnostico` no puede ser anterior a `fecha_deteccion`
   - Ambas fechas no pueden ser anteriores a `fecha_nacimiento` del paciente

2. **Auto-monitoreo:**
   - Si `realiza_auto_monitoreo = true`, al menos uno de `auto_monitoreo_glucosa` o `auto_monitoreo_presion` debe ser `true`
   - Si `realiza_auto_monitoreo = false`, ambos sub-campos deben ser `false`

3. **Exámenes:**
   - Al menos uno de los exámenes o auto-monitoreo debe estar activo
   - Si hay `tipo_complicacion`, debe haber al menos un examen realizado

4. **Relaciones:**
   - Si `id_cita` está presente, debe existir y pertenecer al mismo paciente
   - Si `id_comorbilidad` está presente, el paciente debe tener esa comorbilidad

### **Permisos y Autorización:**

1. **CREATE:**
   - ✅ Doctor/Admin pueden crear detecciones
   - ❌ Pacientes NO pueden crear detecciones (solo lectura)

2. **READ:**
   - ✅ Doctor puede ver detecciones de pacientes asignados
   - ✅ Admin puede ver todas las detecciones
   - ✅ Paciente puede ver sus propias detecciones (solo lectura)

3. **UPDATE:**
   - ✅ Doctor puede actualizar detecciones de pacientes asignados
   - ✅ Admin puede actualizar todas las detecciones
   - ❌ Pacientes NO pueden actualizar

4. **DELETE:**
   - ❌ Solo Admin puede eliminar (soft delete recomendado)

### **Auditoría:**

- Campo `registrado_por` para rastrear quién creó el registro
- Campo `fecha_creacion` para auditoría temporal
- Integración con `sistema_auditoria` para cambios importantes

---

## 🎯 CASOS DE USO

### **1. Registro de Detección en Consulta:**
```
- Doctor realiza exploración de pies durante cita
- Detecta complicación (neuropatía)
- Registra: exploracion_pies=true, tipo_complicacion="Neuropatía"
- Asocia a cita y comorbilidad (Diabetes)
```

### **2. Seguimiento de Auto-monitoreo:**
```
- Paciente con diabetes realiza auto-monitoreo
- Doctor registra: realiza_auto_monitoreo=true
- Especifica: auto_monitoreo_glucosa=true, auto_monitoreo_presion=true
- Vincula a comorbilidad (Diabetes)
```

### **3. Detección de Retinopatía:**
```
- Doctor realiza exploración de fondo de ojo
- Detecta retinopatía
- Registra: exploracion_fondo_ojo=true, tipo_complicacion="Retinopatía"
- Acción: referencia a oftalmólogo
```

### **4. Análisis Temporal:**
```
- Consultar todas las detecciones de complicaciones por periodo
- Filtrar por tipo de complicación
- Analizar tendencias por comorbilidad
```

---

## 📈 VENTAJAS DEL DISEÑO PROPUESTO

### **✅ Escalabilidad:**
- Fácil añadir nuevos tipos de exámenes (nuevas columnas boolean)
- Fácil añadir nuevos campos sin afectar estructura existente
- Soporta múltiples detecciones por paciente

### **✅ Consultas Eficientes:**
- Índices optimizados para consultas frecuentes
- Relaciones claras para JOINs eficientes
- Soporte para análisis temporales y por comorbilidad

### **✅ Integridad de Datos:**
- Foreign Keys con CASCADE/SET NULL apropiados
- Validaciones a nivel de aplicación y base de datos
- No permite datos inconsistentes

### **✅ Mantenibilidad:**
- Estructura clara y documentada
- Separación de responsabilidades
- Fácil de entender y modificar

---

## ⚠️ CONSIDERACIONES ADICIONALES

### **1. Catálogo de Tipos de Complicaciones (OPCIONAL):**

Si se requiere estandarización, se puede crear una tabla de catálogo:

```sql
CREATE TABLE tipos_complicacion (
  id_tipo_complicacion INTEGER PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT NULL,
  activo BOOLEAN DEFAULT TRUE
);
```

**Ventajas:**
- Estandarización de nombres
- Facilita reportes y análisis
- Permite desactivar tipos obsoletos

**Desventajas:**
- Añade complejidad
- Requiere mantenimiento del catálogo

**Recomendación:** Empezar con campo `STRING` libre, migrar a catálogo si es necesario.

### **2. Historial de Cambios (OPCIONAL):**

Para auditoría detallada, considerar tabla de historial:

```sql
CREATE TABLE deteccion_complicaciones_historial (
  id_historial INTEGER PRIMARY KEY AUTO_INCREMENT,
  id_deteccion INTEGER NOT NULL,
  campo_modificado VARCHAR(50),
  valor_anterior TEXT,
  valor_nuevo TEXT,
  modificado_por INTEGER,
  fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Recomendación:** Implementar solo si es requerimiento específico de auditoría.

### **3. Integración con Signos Vitales:**

Los datos de auto-monitoreo (glucosa, presión) pueden relacionarse con `signos_vitales`:
- Crear relación lógica (no FK directa)
- Usar `fecha_deteccion` para vincular con registros de signos vitales cercanos
- Considerar vista materializada para análisis combinados

---

## 🚀 PLAN DE IMPLEMENTACIÓN SUGERIDO

### **Fase 1: Modelo y Migración**
1. Crear modelo Sequelize `DeteccionComplicacion`
2. Crear script de migración SQL
3. Añadir relaciones en `associations.js`
4. Probar migración en base de datos de desarrollo

### **Fase 2: Backend**
1. Crear controlador `deteccionComplicacionController.js`
2. Crear servicio `deteccionComplicacionService.js`
3. Crear repositorio `deteccionComplicacionRepository.js`
4. Crear rutas en `routes/deteccionComplicacion.js`
5. Añadir validaciones y middlewares de seguridad
6. Implementar autorización por roles

### **Fase 3: Frontend**
1. Crear componente de formulario para registro
2. Crear componente de visualización (lista/detalle)
3. Integrar en pantalla de detalle de paciente
4. Añadir filtros y búsqueda
5. Implementar permisos por rol

### **Fase 4: Testing y Validación**
1. Tests unitarios de modelo
2. Tests de integración de API
3. Tests de autorización
4. Validación de datos de prueba
5. Pruebas de rendimiento con datos masivos

---

## 📝 CONCLUSIÓN

La propuesta utiliza una **tabla única normalizada** que:
- ✅ Cumple con principios de normalización (3NF)
- ✅ Mantiene integridad referencial
- ✅ Es escalable y mantenible
- ✅ Sigue las convenciones del sistema existente
- ✅ Implementa seguridad y validaciones apropiadas
- ✅ Permite análisis y reportes eficientes

**Recomendación:** Proceder con la implementación de la Opción 1 (Tabla Única).

---

## ❓ PREGUNTAS PARA CLARIFICACIÓN

Antes de implementar, confirmar:

1. **¿El campo "Tipo" debe ser libre o catálogo?**
   - Propuesta: Empezar con campo libre, migrar a catálogo si es necesario

2. **¿"Referencia" es texto libre o FK a otra entidad?**
   - Propuesta: Empezar con texto libre (especialista, documento, URL)

3. **¿Se requiere historial de cambios detallado?**
   - Propuesta: No inicialmente, añadir si es requerimiento específico

4. **¿Los pacientes pueden registrar auto-monitoreo?**
   - Propuesta: Solo lectura para pacientes, creación solo por Doctor/Admin

5. **¿Se requiere integración con signos vitales?**
   - Propuesta: Relación lógica por fecha, no FK directa

