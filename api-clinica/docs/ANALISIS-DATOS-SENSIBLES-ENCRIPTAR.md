# 🔐 Análisis de Datos Sensibles a Encriptar/Ocultar

**Fecha:** 2025-11-05  
**Estado:** Análisis Completo

---

## 📋 CATEGORÍAS DE DATOS SENSIBLES

Según normas LGPD y NOM para protección de datos de salud, los siguientes datos deben protegerse:

### 1. **Datos de Identificación Personal (PII)**
- CURP ✅ (ya encriptado)
- Número de teléfono/celular ✅ (ya encriptado)
- Email ❌ (NO encriptado - debería)
- Dirección ✅ (ya encriptado)
- Fecha de nacimiento ❌ (NO encriptado - debería)
- Código postal ❌ (NO encriptado - podría ser)

### 2. **Datos Médicos (PHI - Protected Health Information)**
- Diagnósticos ❌ (NO encriptado - debería)
- Signos vitales (valores específicos) ❌ (NO encriptado - debería)
- Medicamentos ❌ (NO encriptado - debería)
- Alergias ❌ (NO encriptado - debería)
- Comorbilidades ❌ (NO encriptado - debería)
- Observaciones médicas ❌ (NO encriptado - debería)
- Historial médico completo ❌ (NO encriptado - debería)

### 3. **Datos de Contactos de Emergencia/Red de Apoyo**
- Nombre del contacto ❌ (NO encriptado - podría ser)
- Teléfono del contacto ✅ (ya encriptado)
- Email del contacto ✅ (ya encriptado)
- Dirección del contacto ✅ (ya encriptado)
- Parentesco ❌ (NO encriptado - menos crítico)

### 4. **Datos de Doctores**
- Teléfono ✅ (ya encriptado)
- Email ❌ (NO encriptado - debería)
- Dirección ❌ (NO encriptado - podría ser)

---

## 📊 ESTADO ACTUAL DE ENCRIPTACIÓN

### ✅ **Ya Encriptados (Actual)**

```javascript
const ENCRYPTED_FIELDS = {
  pacientes: ['curp', 'numero_celular', 'direccion'],
  doctores: ['telefono'],
  red_apoyo: ['numero_celular', 'email', 'direccion'],
  diagnosticos: ['descripcion'],
  signos_vitales: ['observaciones']
};
```

### ❌ **Faltan por Encriptar (Recomendado)**

#### **Pacientes**
- `fecha_nacimiento` - ❌ **CRÍTICO** - Puede usarse para identificación
- `email` - ❌ **ALTO** - Datos personales
- `localidad` - ⚠️ **MEDIO** - Puede combinarse con otros datos para identificación
- `nombre` + `apellido_paterno` + `apellido_materno` - ⚠️ **MEDIO** - Datos personales (pero necesarios para búsqueda)
- `codigo_postal` - ⚠️ **BAJO** - Menos crítico

#### **Diagnósticos**
- `descripcion` - ✅ Ya encriptado
- Podría agregar: `fecha_registro` si se considera sensible

#### **Signos Vitales**
- `observaciones` - ✅ Ya encriptado
- `peso_kg` - ❌ **MEDIO** - Datos médicos sensibles
- `talla_m` - ❌ **MEDIO** - Datos médicos sensibles
- `imc` - ❌ **MEDIO** - Datos médicos sensibles
- `presion_sistolica` / `presion_diastolica` - ❌ **ALTO** - Datos médicos críticos
- `glucosa_mg_dl` - ❌ **ALTO** - Datos médicos críticos
- `colesterol_mg_dl` - ❌ **ALTO** - Datos médicos críticos
- `trigliceridos_mg_dl` - ❌ **ALTO** - Datos médicos críticos
- `medida_cintura_cm` - ❌ **MEDIO** - Datos médicos

#### **Medicamentos**
- `nombre_medicamento` - ❌ **MEDIO** - Puede revelar condiciones médicas
- `dosis` - ❌ **MEDIO** - Información médica
- `frecuencia` - ❌ **MEDIO** - Información médica
- `indicaciones` - ❌ **ALTO** - Información médica detallada

#### **Red de Apoyo**
- `nombre_contacto` - ⚠️ **BAJO** - Menos crítico, pero es dato personal
- `parentesco` - ⚠️ **BAJO** - Menos crítico

#### **Doctores**
- `email` - ❌ **ALTO** - Datos personales
- `telefono` - ✅ Ya encriptado
- `direccion` - ⚠️ **MEDIO** - Menos crítico que pacientes

#### **Citas**
- `motivo` - ❌ **ALTO** - Puede revelar información médica
- `notas` - ❌ **ALTO** - Información médica detallada

#### **Vacunas**
- `nombre_vacuna` - ❌ **MEDIO** - Puede revelar condiciones
- `fecha_aplicacion` - ⚠️ **BAJO** - Menos crítico

#### **Comorbilidades**
- `fecha_deteccion` - ⚠️ **MEDIO** - Puede revelar historial médico

---

## 🎯 RECOMENDACIONES POR PRIORIDAD

### 🔴 **CRÍTICO (Implementar Inmediatamente)**

1. **Fecha de nacimiento** (`pacientes.fecha_nacimiento`)
   - **Razón:** Puede usarse para identificación y es PII
   - **Norma:** LGPD, NOM

2. **Email** (`pacientes.email`, `doctores.email`, `usuarios.email`)
   - **Razón:** Datos personales identificables
   - **Norma:** LGPD

3. **Signos vitales críticos** (presión, glucosa, colesterol)
   - **Razón:** Datos médicos sensibles (PHI)
   - **Norma:** NOM-004-SSA3-2012

4. **Diagnósticos** (`diagnosticos.descripcion`)
   - **Razón:** Ya está encriptado ✅, pero verificar implementación

### 🟠 **ALTO (Implementar Pronto)**

5. **Motivo de citas** (`citas.motivo`)
   - **Razón:** Puede revelar información médica

6. **Notas médicas** (`citas.notas`, `diagnosticos.descripcion`)
   - **Razón:** Información médica detallada

7. **Medicamentos** (`plan_medicacion`, `plan_detalle`)
   - **Razón:** Puede revelar condiciones médicas

### 🟡 **MEDIO (Considerar)**

8. **Valores de signos vitales** (peso, talla, IMC)
   - **Razón:** Datos médicos, pero menos críticos que presión/glucosa

9. **Localidad** (`pacientes.localidad`)
   - **Razón:** Puede combinarse con otros datos

10. **Nombre de contacto** (`red_apoyo.nombre_contacto`)
    - **Razón:** Datos personales, pero menos crítico

### 🟢 **BAJO (Opcional)**

11. **Código postal**
12. **Parentesco**
13. **Fecha de aplicación de vacunas**

---

## 📝 PROPUESTA DE IMPLEMENTACIÓN

### Fase 1: Crítico (Inmediato)

```javascript
const ENCRYPTED_FIELDS = {
  pacientes: [
    'curp',                    // ✅ Ya implementado
    'numero_celular',          // ✅ Ya implementado
    'direccion',               // ✅ Ya implementado
    'fecha_nacimiento',        // ❌ AGREGAR
    'email',                   // ❌ AGREGAR
    'localidad'                // ❌ AGREGAR (opcional)
  ],
  doctores: [
    'telefono',                // ✅ Ya implementado
    'email'                    // ❌ AGREGAR
  ],
  usuarios: [
    'email'                    // ❌ AGREGAR
  ],
  // ... resto
};
```

### Fase 2: Alto (Esta semana)

```javascript
const ENCRYPTED_FIELDS = {
  // ... anteriores
  signos_vitales: [
    'observaciones',           // ✅ Ya implementado
    'presion_sistolica',       // ❌ AGREGAR
    'presion_diastolica',      // ❌ AGREGAR
    'glucosa_mg_dl',           // ❌ AGREGAR
    'colesterol_mg_dl',        // ❌ AGREGAR
    'trigliceridos_mg_dl'      // ❌ AGREGAR
  ],
  citas: [
    'motivo',                  // ❌ AGREGAR
    'notas'                    // ❌ AGREGAR (si existe)
  ],
  plan_medicacion: [
    'nombre_medicamento',      // ❌ AGREGAR
    'indicaciones'             // ❌ AGREGAR
  ],
  plan_detalle: [
    'dosis',                   // ❌ AGREGAR
    'frecuencia'               // ❌ AGREGAR
  ]
};
```

### Fase 3: Medio (Próximas semanas)

```javascript
const ENCRYPTED_FIELDS = {
  // ... anteriores
  signos_vitales: [
    // ... anteriores
    'peso_kg',                 // ❌ AGREGAR
    'talla_m',                 // ❌ AGREGAR
    'imc',                     // ❌ AGREGAR
    'medida_cintura_cm'        // ❌ AGREGAR
  ],
  red_apoyo: [
    'numero_celular',          // ✅ Ya implementado
    'email',                   // ✅ Ya implementado
    'direccion',               // ✅ Ya implementado
    'nombre_contacto'          // ❌ AGREGAR (opcional)
  ]
};
```

---

## 🔍 DATOS QUE DEBEN OCULTARSE EN LOGS

### Ya Implementado ✅

```javascript
const sensitiveKeys = [
  'password', 'token', 'secret', 'pin', 'curp',
  'fecha_nacimiento', 'direccion', 'telefono',
  'numero_celular', 'diagnostico', 'medicamento',
  'signos_vitales', 'presion_arterial', 'glucosa'
];
```

### Agregar ❌

```javascript
const sensitiveKeys = [
  // ... anteriores
  'email',                    // ❌ AGREGAR
  'colesterol',               // ❌ AGREGAR
  'trigliceridos',            // ❌ AGREGAR
  'peso', 'talla', 'imc',     // ❌ AGREGAR
  'motivo', 'notas',          // ❌ AGREGAR
  'alergia', 'alergias',      // ❌ AGREGAR
  'comorbilidad',             // ❌ AGREGAR
  'vacuna', 'vacunas'         // ❌ AGREGAR
];
```

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Total Campos | Encriptados | Pendientes | Prioridad |
|-----------|--------------|-------------|------------|-----------|
| **Pacientes** | 12 | 3 | 2-3 | 🔴 CRÍTICO |
| **Signos Vitales** | 12 | 1 | 8-10 | 🔴 CRÍTICO |
| **Diagnósticos** | 3 | 1 | 0-1 | ✅ OK |
| **Medicamentos** | 8+ | 0 | 6-8 | 🟠 ALTO |
| **Citas** | 8+ | 0 | 2-3 | 🟠 ALTO |
| **Red Apoyo** | 6 | 3 | 1 | 🟡 MEDIO |
| **Doctores** | 10+ | 1 | 1 | 🟠 ALTO |
| **Usuarios** | 5+ | 0 | 1 | 🟠 ALTO |

---

## ✅ CONCLUSIÓN

**Campos críticos que faltan por encriptar:**
1. 🔴 `fecha_nacimiento` (Pacientes)
2. 🔴 `email` (Pacientes, Doctores, Usuarios)
3. 🔴 Signos vitales críticos (presión, glucosa, colesterol)
4. 🟠 Motivo de citas
5. 🟠 Medicamentos

**Implementación recomendada:** Fase 1 (Crítico) primero, luego Fase 2 (Alto).

---

**Autor:** Senior Full Stack Developer  
**Fecha:** 2025-11-05



