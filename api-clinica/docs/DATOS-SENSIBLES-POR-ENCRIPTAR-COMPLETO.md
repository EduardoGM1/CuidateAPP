# 🔐 Análisis Completo: Datos Sensibles a Encriptar/Ocultar

**Fecha:** 2025-11-05  
**Normas Aplicables:** LGPD, NOM-004-SSA3-2012, NOM-024-SSA3-2012

---

## 📊 RESUMEN EJECUTIVO

### ✅ **Datos Ya Encriptados (Actual)**
- CURP (pacientes)
- Número de celular (pacientes, red_apoyo)
- Dirección (pacientes, red_apoyo)
- Teléfono (doctores)
- Email (red_apoyo)
- Descripción (diagnósticos)
- Observaciones (signos_vitales)

### ❌ **Datos Críticos Faltantes (Alta Prioridad)**
- Email (pacientes, doctores, usuarios)
- Fecha de nacimiento (pacientes)
- Signos vitales críticos (presión, glucosa, colesterol)
- Motivo de citas
- Observaciones médicas (citas, planes_medicacion)

---

## 🔴 CATEGORÍA 1: DATOS DE IDENTIFICACIÓN PERSONAL (PII) - CRÍTICO

### 📋 **Pacientes**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `curp` | ✅ Encriptado | - | Identificación única | LGPD |
| `numero_celular` | ✅ Encriptado | - | Contacto personal | LGPD |
| `direccion` | ✅ Encriptado | - | Ubicación física | LGPD |
| `fecha_nacimiento` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Identificación + edad | LGPD, NOM |
| `email` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Identificación personal | LGPD |
| `localidad` | ❌ NO encriptado | 🟠 ALTO | Ubicación + identificación | LGPD |
| `nombre` | ❌ NO encriptado | 🟡 MEDIO | Dato personal (pero necesario para búsqueda) | - |
| `apellido_paterno` | ❌ NO encriptado | 🟡 MEDIO | Dato personal (pero necesario para búsqueda) | - |
| `apellido_materno` | ❌ NO encriptado | 🟡 MEDIO | Dato personal (pero necesario para búsqueda) | - |

**Recomendación:** Encriptar `fecha_nacimiento` y `email` inmediatamente. Los nombres pueden quedar sin encriptar si se usan para búsqueda, pero deberían ocultarse en logs.

### 📋 **Doctores**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `telefono` | ✅ Encriptado | - | Contacto personal | LGPD |
| `email` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Identificación personal | LGPD |
| `nombre` | ❌ NO encriptado | 🟡 MEDIO | Dato personal (pero necesario para búsqueda) | - |

**Recomendación:** Encriptar `email` de doctores.

### 📋 **Usuarios**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `email` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Identificación + login | LGPD |

**Recomendación:** Encriptar `email` de usuarios. Nota: Esto puede afectar el login, necesitaría búsqueda por hash.

---

## 🔴 CATEGORÍA 2: DATOS MÉDICOS (PHI) - CRÍTICO

### 📋 **Signos Vitales**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `observaciones` | ✅ Encriptado | - | Notas médicas | NOM |
| `presion_sistolica` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Datos médicos críticos | NOM |
| `presion_diastolica` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Datos médicos críticos | NOM |
| `glucosa_mg_dl` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Datos médicos críticos | NOM |
| `colesterol_mg_dl` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Datos médicos críticos | NOM |
| `trigliceridos_mg_dl` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Datos médicos críticos | NOM |
| `peso_kg` | ❌ NO encriptado | 🟠 ALTO | Datos médicos sensibles | NOM |
| `talla_m` | ❌ NO encriptado | 🟠 ALTO | Datos médicos sensibles | NOM |
| `imc` | ❌ NO encriptado | 🟠 ALTO | Datos médicos sensibles | NOM |
| `medida_cintura_cm` | ❌ NO encriptado | 🟠 ALTO | Datos médicos sensibles | NOM |

**Recomendación:** Encriptar todos los valores numéricos de signos vitales, especialmente presión, glucosa y colesterol.

### 📋 **Diagnósticos**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `descripcion` | ✅ Encriptado | - | Información médica | NOM |

**Estado:** ✅ Completo

### 📋 **Citas**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `motivo` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Puede revelar condición médica | NOM |
| `observaciones` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Notas médicas detalladas | NOM |

**Recomendación:** Encriptar `motivo` y `observaciones` de citas.

### 📋 **Planes de Medicación**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `observaciones` | ❌ **NO encriptado** | 🔴 **CRÍTICO** | Notas médicas | NOM |

**Recomendación:** Encriptar `observaciones` de planes de medicación.

### 📋 **Detalles de Plan de Medicación**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `dosis` | ❌ NO encriptado | 🟠 ALTO | Información médica | NOM |
| `frecuencia` | ❌ NO encriptado | 🟠 ALTO | Información médica | NOM |
| `horario` | ❌ NO encriptado | 🟠 ALTO | Información médica | NOM |
| `via_administracion` | ❌ NO encriptado | 🟠 ALTO | Información médica | NOM |
| `observaciones` | ❌ NO encriptado | 🔴 CRÍTICO | Notas médicas | NOM |

**Recomendación:** Encriptar `observaciones` y considerar encriptar `dosis`, `frecuencia` si se considera información sensible.

### 📋 **Comorbilidades**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `fecha_deteccion` | ❌ NO encriptado | 🟠 ALTO | Puede revelar historial médico | NOM |
| `observaciones` | ❌ NO encriptado | 🔴 CRÍTICO | Notas médicas | NOM |

**Recomendación:** Encriptar `observaciones` de comorbilidades.

### 📋 **Esquema de Vacunación**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `vacuna` | ❌ NO encriptado | 🟡 MEDIO | Puede revelar condiciones | NOM |
| `observaciones` | ❌ NO encriptado | 🔴 CRÍTICO | Notas médicas | NOM |
| `lote` | ❌ NO encriptado | 🟢 BAJO | Información administrativa | - |

**Recomendación:** Encriptar `observaciones` de vacunas.

---

## 🟠 CATEGORÍA 3: DATOS DE CONTACTO Y RED DE APOYO

### 📋 **Red de Apoyo**

| Campo | Estado Actual | Prioridad | Razón | Norma |
|-------|---------------|-----------|-------|-------|
| `numero_celular` | ✅ Encriptado | - | Contacto personal | LGPD |
| `email` | ✅ Encriptado | - | Contacto personal | LGPD |
| `direccion` | ✅ Encriptado | - | Ubicación física | LGPD |
| `nombre_contacto` | ❌ NO encriptado | 🟡 MEDIO | Dato personal (menos crítico) | LGPD |
| `parentesco` | ❌ NO encriptado | 🟢 BAJO | Menos crítico | - |
| `localidad` | ❌ NO encriptado | 🟡 MEDIO | Ubicación | LGPD |

**Estado:** ✅ Mayormente completo. Considerar encriptar `nombre_contacto` y `localidad`.

---

## 📝 DATOS QUE DEBEN OCULTARSE EN LOGS

### ✅ **Ya Implementado**

```javascript
const sensitiveKeys = [
  'password', 'token', 'secret', 'pin', 'curp',
  'fecha_nacimiento', 'direccion', 'telefono',
  'numero_celular', 'diagnostico', 'medicamento',
  'signos_vitales', 'presion_arterial', 'glucosa'
];
```

### ❌ **Faltan por Agregar**

```javascript
const sensitiveKeys = [
  // ... anteriores
  'email',                    // ❌ AGREGAR - Datos personales
  'colesterol',               // ❌ AGREGAR - Datos médicos
  'trigliceridos',            // ❌ AGREGAR - Datos médicos
  'peso', 'talla', 'imc',     // ❌ AGREGAR - Datos médicos
  'motivo', 'notas',          // ❌ AGREGAR - Información médica
  'observaciones',            // ❌ AGREGAR - Notas médicas
  'dosis', 'frecuencia',      // ❌ AGREGAR - Información médica
  'alergia', 'alergias',      // ❌ AGREGAR - Información médica
  'comorbilidad',             // ❌ AGREGAR - Información médica
  'vacuna', 'vacunas',        // ❌ AGREGAR - Información médica
  'nombre', 'apellido',       // ❌ AGREGAR - Datos personales (para logs)
  'fecha_deteccion'           // ❌ AGREGAR - Historial médico
];
```

---

## 🎯 PLAN DE IMPLEMENTACIÓN POR PRIORIDAD

### 🔴 **FASE 1: CRÍTICO (Implementar Inmediatamente)**

```javascript
const ENCRYPTED_FIELDS = {
  pacientes: [
    'curp',                    // ✅ Ya implementado
    'numero_celular',          // ✅ Ya implementado
    'direccion',               // ✅ Ya implementado
    'fecha_nacimiento',        // ❌ AGREGAR AHORA
    'email'                    // ❌ AGREGAR AHORA
  ],
  doctores: [
    'telefono',                // ✅ Ya implementado
    'email'                    // ❌ AGREGAR AHORA
  ],
  usuarios: [
    'email'                    // ❌ AGREGAR AHORA (requiere búsqueda por hash)
  ],
  signos_vitales: [
    'observaciones',           // ✅ Ya implementado
    'presion_sistolica',       // ❌ AGREGAR AHORA
    'presion_diastolica',      // ❌ AGREGAR AHORA
    'glucosa_mg_dl',           // ❌ AGREGAR AHORA
    'colesterol_mg_dl',        // ❌ AGREGAR AHORA
    'trigliceridos_mg_dl'      // ❌ AGREGAR AHORA
  ],
  citas: [
    'motivo',                  // ❌ AGREGAR AHORA
    'observaciones'            // ❌ AGREGAR AHORA
  ],
  planes_medicacion: [
    'observaciones'            // ❌ AGREGAR AHORA
  ],
  plan_detalle: [
    'observaciones'           // ❌ AGREGAR AHORA
  ],
  paciente_comorbilidad: [
    'observaciones'            // ❌ AGREGAR AHORA
  ],
  esquema_vacunacion: [
    'observaciones'           // ❌ AGREGAR AHORA
  ]
};
```

### 🟠 **FASE 2: ALTO (Esta Semana)**

```javascript
const ENCRYPTED_FIELDS = {
  // ... Fase 1
  pacientes: [
    // ... Fase 1
    'localidad'                // ❌ AGREGAR
  ],
  signos_vitales: [
    // ... Fase 1
    'peso_kg',                 // ❌ AGREGAR
    'talla_m',                 // ❌ AGREGAR
    'imc',                     // ❌ AGREGAR
    'medida_cintura_cm'        // ❌ AGREGAR
  ],
  plan_detalle: [
    // ... Fase 1
    'dosis',                   // ❌ AGREGAR
    'frecuencia',              // ❌ AGREGAR
    'horario',                 // ❌ AGREGAR
    'via_administracion'       // ❌ AGREGAR
  ],
  paciente_comorbilidad: [
    // ... Fase 1
    'fecha_deteccion'          // ❌ AGREGAR
  ],
  red_apoyo: [
    'numero_celular',          // ✅ Ya implementado
    'email',                   // ✅ Ya implementado
    'direccion',               // ✅ Ya implementado
    'nombre_contacto',         // ❌ AGREGAR
    'localidad'                // ❌ AGREGAR
  ]
};
```

### 🟡 **FASE 3: MEDIO (Próximas Semanas)**

```javascript
const ENCRYPTED_FIELDS = {
  // ... Fases anteriores
  esquema_vacunacion: [
    // ... Fase 1
    'vacuna'                   // ❌ AGREGAR (opcional)
  ],
  red_apoyo: [
    // ... Fase 2
    'parentesco'               // ❌ AGREGAR (opcional)
  ]
};
```

---

## 📊 RESUMEN POR MODELO

| Modelo | Campos Totales | Encriptados | Pendientes Críticos | Pendientes Altos |
|--------|----------------|-------------|---------------------|------------------|
| **Pacientes** | 12 | 3 | 2 | 1 |
| **Doctores** | 10 | 1 | 1 | 0 |
| **Usuarios** | 5 | 0 | 1 | 0 |
| **Signos Vitales** | 12 | 1 | 5 | 4 |
| **Diagnósticos** | 3 | 1 | 0 | 0 |
| **Citas** | 8 | 0 | 2 | 0 |
| **Planes Medicación** | 7 | 0 | 1 | 0 |
| **Plan Detalle** | 6 | 0 | 1 | 4 |
| **Comorbilidades** | 3 | 0 | 1 | 1 |
| **Vacunas** | 5 | 0 | 1 | 1 |
| **Red Apoyo** | 6 | 3 | 0 | 2 |

---

## ✅ RECOMENDACIONES FINALES

### 🔴 **CRÍTICO - Implementar AHORA:**

1. **Email** (pacientes, doctores, usuarios)
2. **Fecha de nacimiento** (pacientes)
3. **Signos vitales críticos** (presión, glucosa, colesterol, triglicéridos)
4. **Motivo y observaciones** (citas)
5. **Observaciones** (planes_medicacion, plan_detalle, comorbilidades, vacunas)

### 🟠 **ALTO - Implementar Esta Semana:**

6. **Signos vitales adicionales** (peso, talla, IMC, cintura)
7. **Detalles de medicación** (dosis, frecuencia, horario)
8. **Localidad** (pacientes, red_apoyo)

### 🟡 **MEDIO - Considerar:**

9. **Nombre de contacto** (red_apoyo)
10. **Vacuna** (esquema_vacunacion)

---

## 📝 NOTAS IMPORTANTES

1. **Email en usuarios:**
   - Encriptar email puede afectar el login
   - Considerar búsqueda por hash o mantener email sin encriptar pero hasheado para búsqueda

2. **Nombres:**
   - Considerar mantener sin encriptar si se usan para búsqueda
   - Ocultar en logs siempre

3. **Signos vitales numéricos:**
   - Encriptar valores numéricos puede complicar búsquedas y gráficos
   - Considerar encriptación selectiva o encriptar solo en BD, mantener desencriptados en memoria para procesamiento

4. **Búsqueda:**
   - Los campos encriptados no pueden usarse directamente en WHERE clauses
   - Necesitar funciones de búsqueda especiales o índices de hash

---

**Autor:** Senior Full Stack Developer  
**Fecha:** 2025-11-05



