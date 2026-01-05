# 📋 PLAN DE IMPLEMENTACIÓN - CAMPOS FALTANTES FORMA 2022 OFICIAL

**Fecha:** 29 de diciembre de 2025  
**Objetivo:** Implementar todos los campos faltantes identificados en el análisis del formato GAM

---

## 📊 RESUMEN EJECUTIVO

**Total de campos a implementar:** 25+ campos  
**Tablas a modificar:** 4 tablas existentes  
**Tablas nuevas a crear:** 3 tablas  
**Tiempo estimado:** 4-6 horas  
**Riesgo:** Medio (requiere backups y pruebas)

---

## 🎯 ESTRATEGIA DE IMPLEMENTACIÓN

### **Principios:**
1. ✅ **Backup primero** - Crear backup completo antes de cualquier cambio
2. ✅ **Idempotencia** - Todas las migraciones deben poder ejecutarse múltiples veces sin errores
3. ✅ **Transacciones** - Usar transacciones SQL para garantizar atomicidad
4. ✅ **Validación** - Verificar cambios después de cada migración
5. ✅ **Priorización** - Implementar primero campos de alta prioridad (criterios de acreditación)
6. ✅ **Pruebas** - Probar cada cambio antes de continuar

---

## 📋 ORDEN DE IMPLEMENTACIÓN (POR PRIORIDAD)

### **FASE 1: ALTA PRIORIDAD (Criterios de Acreditación)** 🔴

#### **1.1 HbA1c (%) - Campo crítico**
- **Tabla:** `signos_vitales`
- **Campos:** `hba1c_porcentaje`, `edad_paciente_en_medicion`
- **Validación:** Rangos según edad (20-59 vs 60+)

#### **1.2 Microalbuminuria**
- **Tabla:** `deteccion_complicaciones`
- **Campos:** `microalbuminuria_realizada`, `microalbuminuria_resultado`

#### **1.3 Tratamiento (Farmacológico/No Farmacológico)**
- **Tabla:** `paciente_comorbilidad`
- **Campos:** `recibe_tratamiento_no_farmacologico`, `recibe_tratamiento_farmacologico`

---

### **FASE 2: MEDIA PRIORIDAD** 🟡

#### **2.1 Diagnóstico Basal**
- **Tabla:** `paciente_comorbilidad`
- **Campos:** `es_diagnostico_basal`, `año_diagnostico`, `es_agregado_posterior`

#### **2.2 Sesiones Educativas**
- **Tabla:** Nueva `sesiones_educativas`
- **Modelo:** Nuevo modelo Sequelize
- **Controller:** Nuevo controller con CRUD

#### **2.3 Referencia**
- **Tabla:** `deteccion_complicaciones`
- **Campos:** `fue_referido`, `referencia_observaciones`

---

### **FASE 3: BAJA PRIORIDAD** 🟢

#### **3.1 Salud Bucal**
- **Tabla:** Nueva `salud_bucal`
- **Modelo:** Nuevo modelo Sequelize
- **Controller:** Nuevo controller con CRUD

#### **3.2 Tuberculosis**
- **Tabla:** Nueva `deteccion_tuberculosis`
- **Modelo:** Nuevo modelo Sequelize
- **Controller:** Nuevo controller con CRUD

#### **3.3 Baja y Número GAM**
- **Tabla:** `pacientes`
- **Campos:** `fecha_baja`, `motivo_baja`, `numero_gam`

---

## 🔧 PROCESO DETALLADO DE IMPLEMENTACIÓN

### **PASO 0: PREPARACIÓN Y BACKUP**

#### **0.1 Crear Backup Completo**
```bash
# Crear backup de la base de datos
# Usar mysqldump o herramienta similar
# Guardar en: api-clinica/backups/backup-antes-campos-faltantes-YYYY-MM-DD_HH-MM-SS.sql
```

**Script a crear:** `api-clinica/scripts/crear-backup-antes-campos-faltantes.js`

#### **0.2 Verificar Estado Actual**
- Verificar que el servidor esté funcionando
- Verificar conexión a la base de datos
- Listar tablas y columnas actuales

---

### **PASO 1: FASE 1 - ALTA PRIORIDAD**

#### **1.1 Implementar HbA1c en Signos Vitales**

**1.1.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-hba1c-to-signos-vitales.sql`
- **Contenido:**
  - Agregar `hba1c_porcentaje DECIMAL(5,2) NULL`
  - Agregar `edad_paciente_en_medicion INT NULL`
  - Agregar índices si es necesario
  - Incluir comentarios con instrucciones del formato

**1.1.2 Crear Script de Ejecución**
- **Archivo:** `api-clinica/scripts/ejecutar-migracion-hba1c.js`
- **Funcionalidad:**
  - Verificar si las columnas ya existen (idempotencia)
  - Ejecutar migración SQL
  - Verificar cambios aplicados
  - Logging detallado

**1.1.3 Actualizar Modelo Sequelize**
- **Archivo:** `api-clinica/models/SignoVital.js`
- **Cambios:**
  - Agregar campo `hba1c_porcentaje`
  - Agregar campo `edad_paciente_en_medicion`
  - Actualizar comentarios

**1.1.4 Actualizar Controller**
- **Archivo:** `api-clinica/controllers/pacienteMedicalData.js`
- **Cambios:**
  - Incluir `hba1c_porcentaje` y `edad_paciente_en_medicion` en `createPacienteSignosVitales`
  - Incluir en `updatePacienteSignosVitales`
  - Incluir en `getPacienteSignosVitales` (formato de respuesta)
  - **Validación:** Validar rangos según edad (20-59 años: <7%, 60+: <8%)

**1.1.5 Actualizar Frontend (Opcional - Fase posterior)**
- Agregar campos en formulario de signos vitales
- Validación de rangos según edad

**1.1.6 Ejecutar y Verificar**
```bash
cd api-clinica
node scripts/ejecutar-migracion-hba1c.js
```

---

#### **1.2 Implementar Microalbuminuria en Detección de Complicaciones**

**1.2.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-microalbuminuria-to-deteccion-complicaciones.sql`
- **Contenido:**
  - Agregar `microalbuminuria_realizada BOOLEAN DEFAULT FALSE`
  - Agregar `microalbuminuria_resultado DECIMAL(10,2) NULL`
  - Incluir comentarios con instrucción ⑥

**1.2.2 Crear Script de Ejecución**
- **Archivo:** `api-clinica/scripts/ejecutar-migracion-microalbuminuria.js`
- Similar estructura a migración de HbA1c

**1.2.3 Actualizar Modelo Sequelize**
- **Archivo:** `api-clinica/models/DeteccionComplicacion.js`
- Agregar los dos nuevos campos

**1.2.4 Actualizar Controller**
- **Archivo:** `api-clinica/controllers/deteccionComplicacion.js` (o donde corresponda)
- Incluir campos en create/update/get

**1.2.5 Ejecutar y Verificar**

---

#### **1.3 Implementar Tratamiento en Paciente Comorbilidad**

**1.3.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-tratamiento-to-paciente-comorbilidad.sql`
- **Contenido:**
  - Agregar `recibe_tratamiento_no_farmacologico BOOLEAN DEFAULT FALSE` (instrucción ②)
  - Agregar `recibe_tratamiento_farmacologico BOOLEAN DEFAULT FALSE` (instrucción ③)

**1.3.2 Crear Script de Ejecución**
- **Archivo:** `api-clinica/scripts/ejecutar-migracion-tratamiento.js`

**1.3.3 Actualizar Modelo Sequelize**
- **Archivo:** `api-clinica/models/PacienteComorbilidad.js`
- Agregar los dos nuevos campos

**1.3.4 Actualizar Controller**
- **Archivo:** `api-clinica/controllers/pacienteComorbilidad.js` (o donde corresponda)
- Incluir campos en create/update/get

**1.3.5 Ejecutar y Verificar**

---

### **PASO 2: FASE 2 - MEDIA PRIORIDAD**

#### **2.1 Implementar Diagnóstico Basal**

**2.1.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-diagnostico-basal-to-paciente-comorbilidad.sql`
- **Contenido:**
  - Agregar `es_diagnostico_basal BOOLEAN DEFAULT FALSE` (instrucción ①)
  - Agregar `año_diagnostico INTEGER NULL`
  - Agregar `es_agregado_posterior BOOLEAN DEFAULT FALSE`

**2.1.2 Crear Script de Ejecución**
- **Archivo:** `api-clinica/scripts/ejecutar-migracion-diagnostico-basal.js`

**2.1.3 Actualizar Modelo Sequelize**
- **Archivo:** `api-clinica/models/PacienteComorbilidad.js`

**2.1.4 Actualizar Controller**
- Incluir campos en operaciones CRUD

**2.1.5 Ejecutar y Verificar**

---

#### **2.2 Implementar Sesiones Educativas (Nueva Tabla)**

**2.2.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/create-sesiones-educativas.sql`
- **Contenido:**
  - Crear tabla `sesiones_educativas` completa
  - Foreign keys, índices, comentarios

**2.2.2 Crear Script de Ejecución**
- **Archivo:** `api-clinica/scripts/ejecutar-migracion-sesiones-educativas.js`

**2.2.3 Crear Modelo Sequelize**
- **Archivo:** `api-clinica/models/SesionEducativa.js`
- Definir todos los campos según SQL

**2.2.4 Actualizar Associations**
- **Archivo:** `api-clinica/models/associations.js`
- Agregar import de `SesionEducativa`
- Definir relaciones: `Paciente.hasMany(SesionEducativa)`
- Exportar modelo

**2.2.5 Crear Controller**
- **Archivo:** `api-clinica/controllers/sesionEducativa.js`
- CRUD completo:
  - `createSesionEducativa`
  - `getSesionesEducativas` (por paciente, por tipo, por mes)
  - `updateSesionEducativa`
  - `deleteSesionEducativa`

**2.2.6 Crear Routes**
- **Archivo:** `api-clinica/routes/sesionEducativa.js`
- Endpoints:
  - `POST /sesiones-educativas`
  - `GET /sesiones-educativas/:id_paciente`
  - `GET /sesiones-educativas/:id_paciente/:tipo`
  - `PUT /sesiones-educativas/:id`
  - `DELETE /sesiones-educativas/:id`

**2.2.7 Registrar Routes en index.js**
- **Archivo:** `api-clinica/index.js`
- Agregar: `app.use('/api/sesiones-educativas', sesionEducativaRoutes)`

**2.2.8 Ejecutar y Verificar**

---

#### **2.3 Implementar Referencia en Detección de Complicaciones**

**2.3.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-referencia-to-deteccion-complicaciones.sql`
- **Contenido:**
  - Agregar `fue_referido BOOLEAN DEFAULT FALSE` (instrucción ⑪)
  - Agregar `referencia_observaciones TEXT NULL`

**2.3.2 Crear Script de Ejecución**
- **Archivo:** `api-clinica/scripts/ejecutar-migracion-referencia.js`

**2.3.3 Actualizar Modelo Sequelize**
- **Archivo:** `api-clinica/models/DeteccionComplicacion.js`

**2.3.4 Actualizar Controller**
- Incluir campos en operaciones CRUD

**2.3.5 Ejecutar y Verificar**

---

### **PASO 3: FASE 3 - BAJA PRIORIDAD**

#### **3.1 Implementar Salud Bucal (Nueva Tabla)**

**3.1.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/create-salud-bucal.sql`
- Similar proceso a sesiones educativas

**3.1.2 Crear Modelo, Controller, Routes**
- **Modelo:** `api-clinica/models/SaludBucal.js`
- **Controller:** `api-clinica/controllers/saludBucal.js`
- **Routes:** `api-clinica/routes/saludBucal.js`

**3.1.3 Actualizar Associations y Registrar Routes**

**3.1.4 Ejecutar y Verificar**

---

#### **3.2 Implementar Tuberculosis (Nueva Tabla)**

**3.2.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/create-deteccion-tuberculosis.sql`

**3.2.2 Crear Modelo, Controller, Routes**
- **Modelo:** `api-clinica/models/DeteccionTuberculosis.js`
- **Controller:** `api-clinica/controllers/deteccionTuberculosis.js`
- **Routes:** `api-clinica/routes/deteccionTuberculosis.js`

**3.2.3 Actualizar Associations y Registrar Routes**

**3.2.4 Ejecutar y Verificar**

---

#### **3.3 Implementar Baja y Número GAM en Pacientes**

**3.3.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-baja-numero-gam-to-pacientes.sql`
- **Contenido:**
  - Agregar `fecha_baja DATE NULL` (instrucción ⑭)
  - Agregar `motivo_baja TEXT NULL`
  - Agregar `numero_gam INT NULL`

**3.3.2 Crear Script de Ejecución**
- **Archivo:** `api-clinica/scripts/ejecutar-migracion-baja-numero-gam.js`

**3.3.3 Actualizar Modelo Sequelize**
- **Archivo:** `api-clinica/models/Paciente.js`
- Agregar los tres nuevos campos

**3.3.4 Actualizar Controller**
- **Archivo:** `api-clinica/controllers/paciente.js`
- Incluir campos en create/update/get

**3.3.5 Ejecutar y Verificar**

---

## 🔒 SEGURIDAD Y VALIDACIONES

### **Validaciones a Implementar:**

#### **HbA1c:**
- Rango válido: 3.0% - 15.0%
- Validar según edad:
  - 20-59 años: objetivo <7%
  - 60+ años: objetivo <8%
- Campo opcional pero si se proporciona, debe ser válido

#### **Microalbuminuria:**
- Resultado válido: 0 - 1000 mg/g
- Solo puede tener resultado si `microalbuminuria_realizada = true`

#### **Tratamiento:**
- Al menos uno debe ser true si el paciente tiene comorbilidad activa

#### **Año de Diagnóstico:**
- Rango válido: 1900 - año actual
- Debe ser <= año actual

#### **Número GAM:**
- Debe ser único por módulo/GAM
- Entero positivo

---

## 📝 ESTRUCTURA DE ARCHIVOS A CREAR

### **Migraciones SQL:**
```
api-clinica/migrations/
├── add-hba1c-to-signos-vitales.sql
├── add-microalbuminuria-to-deteccion-complicaciones.sql
├── add-tratamiento-to-paciente-comorbilidad.sql
├── add-diagnostico-basal-to-paciente-comorbilidad.sql
├── create-sesiones-educativas.sql
├── add-referencia-to-deteccion-complicaciones.sql
├── create-salud-bucal.sql
├── create-deteccion-tuberculosis.sql
└── add-baja-numero-gam-to-pacientes.sql
```

### **Scripts de Ejecución:**
```
api-clinica/scripts/
├── crear-backup-antes-campos-faltantes.js
├── ejecutar-migracion-hba1c.js
├── ejecutar-migracion-microalbuminuria.js
├── ejecutar-migracion-tratamiento.js
├── ejecutar-migracion-diagnostico-basal.js
├── ejecutar-migracion-sesiones-educativas.js
├── ejecutar-migracion-referencia.js
├── ejecutar-migracion-salud-bucal.js
├── ejecutar-migracion-tuberculosis.js
└── ejecutar-migracion-baja-numero-gam.js
```

### **Modelos Nuevos:**
```
api-clinica/models/
├── SesionEducativa.js
├── SaludBucal.js
└── DeteccionTuberculosis.js
```

### **Controllers Nuevos:**
```
api-clinica/controllers/
├── sesionEducativa.js
├── saludBucal.js
└── deteccionTuberculosis.js
```

### **Routes Nuevos:**
```
api-clinica/routes/
├── sesionEducativa.js
├── saludBucal.js
└── deteccionTuberculosis.js
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### **Antes de Implementar:**
- [ ] Backup completo creado
- [ ] Servidor detenido (opcional, recomendado)
- [ ] Documentación del plan revisada

### **Durante Implementación:**
- [ ] Cada migración ejecutada exitosamente
- [ ] Modelos actualizados correctamente
- [ ] Controllers actualizados/creados
- [ ] Routes registrados (si aplica)
- [ ] Associations actualizadas (si aplica)

### **Después de Implementar:**
- [ ] Verificar columnas en base de datos
- [ ] Probar endpoints nuevos/modificados
- [ ] Verificar que datos existentes no se afectaron
- [ ] Probar validaciones
- [ ] Documentar cambios

---

## 🧪 PLAN DE PRUEBAS

### **Pruebas Unitarias:**
- Validar modelos con nuevos campos
- Validar controllers con nuevos endpoints

### **Pruebas de Integración:**
- Probar creación de registros con nuevos campos
- Probar actualización de registros
- Probar consultas y filtros

### **Pruebas Manuales:**
- Probar endpoints con Postman/Thunder Client
- Verificar que datos se guardan correctamente
- Verificar que validaciones funcionan

---

## 📊 ESTIMACIÓN DE TIEMPO

- **Fase 1 (Alta Prioridad):** 2-3 horas
- **Fase 2 (Media Prioridad):** 1.5-2 horas
- **Fase 3 (Baja Prioridad):** 1-1.5 horas
- **Pruebas y Verificación:** 0.5-1 hora
- **Total:** 4-6 horas

---

## ⚠️ RIESGOS Y MITIGACIONES

### **Riesgos Identificados:**
1. **Pérdida de datos:** Mitigado con backups
2. **Errores en migraciones:** Mitigado con transacciones y verificaciones
3. **Incompatibilidad con código existente:** Mitigado con pruebas exhaustivas
4. **Tiempo de inactividad:** Mitigado con migraciones rápidas y opcionales

### **Plan de Rollback:**
- Restaurar backup si algo falla
- Scripts de migración deben ser reversibles (si es posible)
- Documentar cambios para facilitar rollback manual

---

## 📋 ORDEN DE EJECUCIÓN FINAL

1. ✅ Crear backup completo
2. ✅ Fase 1: Alta Prioridad (HbA1c, Microalbuminuria, Tratamiento)
3. ✅ Verificar Fase 1
4. ✅ Fase 2: Media Prioridad (Diagnóstico Basal, Sesiones Educativas, Referencia)
5. ✅ Verificar Fase 2
6. ✅ Fase 3: Baja Prioridad (Salud Bucal, Tuberculosis, Baja/GAM)
7. ✅ Verificar Fase 3
8. ✅ Pruebas completas
9. ✅ Documentación final

---

**¿Proceder con la implementación según este plan?**

