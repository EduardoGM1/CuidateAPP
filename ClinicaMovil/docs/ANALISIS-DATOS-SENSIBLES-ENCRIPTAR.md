# 🔒 Análisis de Datos Sensibles a Encriptar/Ocultar

**Fecha:** 2025-11-05  
**Estado:** 📋 RECOMENDACIONES

---

## 📋 NORMAS APLICABLES

### Ley General de Protección de Datos Personales (LGPD)
- Protección de datos personales en posesión de sujetos obligados
- Datos sensibles requieren protección especial

### Normas Oficiales Mexicanas (NOM)
- **NOM-004-SSA3-2012**: Expediente Clínico
- **NOM-024-SSA3-2012**: Uso de Informática en Salud

### Datos Sensibles de Salud (PHI - Protected Health Information)
Según HIPAA y normas internacionales, los siguientes datos son sensibles:
- Identificadores únicos (CURP, RFC, etc.)
- Información de contacto (teléfonos, direcciones, emails)
- Fechas de nacimiento y edad
- Información médica (diagnósticos, medicamentos, alergias)
- Información de contacto de emergencia
- Información financiera relacionada con salud

---

## ✅ DATOS ACTUALMENTE ENCRIPTADOS

### Pacientes
- ✅ `curp` - Encriptado
- ✅ `numero_celular` - Encriptado
- ✅ `direccion` - Encriptado

### Doctores
- ✅ `telefono` - Encriptado

### Red de Apoyo
- ✅ `numero_celular` - Encriptado
- ✅ `email` - Encriptado
- ✅ `direccion` - Encriptado

---

## 🔴 DATOS QUE DEBERÍAN ENCRIPTARSE (CRÍTICO)

### 1. Pacientes - Datos Adicionales

#### 🔴 CRÍTICO - Identificadores Personales
- ❌ `fecha_nacimiento` - **ENCRIPTAR**
  - Razón: Identificador único combinado con otros datos
  - Impacto: Alto - Puede usarse para identificación
  - Norma: LGPD, NOM-004-SSA3-2012

- ❌ `email` (si existe en pacientes) - **ENCRIPTAR**
  - Razón: Identificador único y contacto personal
  - Impacto: Alto - Puede usarse para identificación y contacto no autorizado
  - Norma: LGPD

#### 🔴 CRÍTICO - Información de Contacto Adicional
- ❌ `telefono_fijo` (si existe) - **ENCRIPTAR**
  - Razón: Información de contacto personal
  - Impacto: Medio-Alto
  - Norma: LGPD

- ❌ `codigo_postal` - **CONSIDERAR ENCRIPTAR**
  - Razón: Puede combinarse con otros datos para identificación
  - Impacto: Medio
  - Norma: LGPD (depende del contexto)

### 2. Diagnósticos - Información Médica Sensible

#### 🔴 CRÍTICO - Información de Salud
- ❌ `descripcion` - **PARCIALMENTE ENCRIPTADO** (actualmente encriptado según middleware)
  - Razón: Contiene información médica sensible
  - Impacto: Alto - Información médica confidencial
  - Norma: NOM-004-SSA3-2012, LGPD

- ❌ `notas` (si existe) - **ENCRIPTAR**
  - Razón: Información médica adicional
  - Impacto: Alto
  - Norma: NOM-004-SSA3-2012

- ❌ `observaciones` (si existe) - **ENCRIPTAR**
  - Razón: Información médica adicional
  - Impacto: Alto
  - Norma: NOM-004-SSA3-2012

### 3. Signos Vitales - Información Médica

#### 🔴 CRÍTICO - Datos Médicos
- ❌ `observaciones` - **ENCRIPTAR** (actualmente encriptado según middleware)
  - Razón: Información médica sensible
  - Impacto: Alto
  - Norma: NOM-004-SSA3-2012

- ❌ `presion_arterial` (si se almacena como texto) - **CONSIDERAR ENCRIPTAR**
  - Razón: Información médica sensible
  - Impacto: Alto
  - Norma: NOM-004-SSA3-2012

- ❌ `temperatura`, `glucosa`, etc. - **CONSIDERAR ENCRIPTAR**
  - Razón: Información médica sensible
  - Impacto: Alto
  - Norma: NOM-004-SSA3-2012

### 4. Medicamentos - Información Médica

#### 🔴 CRÍTICO - Información de Tratamiento
- ❌ `nombre_medicamento` - **CONSIDERAR ENCRIPTAR**
  - Razón: Información médica que puede revelar condiciones de salud
  - Impacto: Medio-Alto
  - Norma: NOM-004-SSA3-2012

- ❌ `dosis`, `frecuencia` - **CONSIDERAR ENCRIPTAR**
  - Razón: Información médica sensible
  - Impacto: Medio
  - Norma: NOM-004-SSA3-2012

- ❌ `indicaciones` - **ENCRIPTAR**
  - Razón: Información médica que puede revelar condiciones
  - Impacto: Alto
  - Norma: NOM-004-SSA3-2012

### 5. Alergias - Información Médica Crítica

#### 🔴 CRÍTICO - Información de Salud
- ❌ `tipo_alergia` - **ENCRIPTAR**
  - Razón: Información médica crítica
  - Impacto: Alto - Puede ser información de vida o muerte
  - Norma: NOM-004-SSA3-2012

- ❌ `reaccion` - **ENCRIPTAR**
  - Razón: Información médica sensible
  - Impacto: Alto
  - Norma: NOM-004-SSA3-2012

- ❌ `severidad` - **CONSIDERAR ENCRIPTAR**
  - Razón: Información médica sensible
  - Impacto: Medio-Alto
  - Norma: NOM-004-SSA3-2012

### 6. Citas - Información de Contacto

#### 🟠 IMPORTANTE - Información de Contacto
- ❌ `motivo` - **CONSIDERAR ENCRIPTAR**
  - Razón: Puede revelar información médica
  - Impacto: Medio
  - Norma: NOM-004-SSA3-2012

- ❌ `notas` - **ENCRIPTAR**
  - Razón: Puede contener información médica sensible
  - Impacto: Alto
  - Norma: NOM-004-SSA3-2012

### 7. Doctores - Información Personal

#### 🟠 IMPORTANTE - Información de Contacto
- ❌ `email` - **ENCRIPTAR**
  - Razón: Información de contacto personal
  - Impacto: Medio
  - Norma: LGPD

- ❌ `direccion` (si existe) - **ENCRIPTAR**
  - Razón: Información personal
  - Impacto: Medio
  - Norma: LGPD

---

## 🔴 DATOS QUE DEBERÍAN OCULTARSE EN LOGS

### Información que NO debe aparecer en logs

#### 🔴 CRÍTICO - Nunca loggear
- ❌ Passwords / PINs
- ❌ Tokens de autenticación (completos)
- ❌ CURP (completo - solo últimos 4 dígitos)
- ❌ Números de teléfono completos
- ❌ Direcciones completas
- ❌ Fechas de nacimiento completas
- ❌ Emails completos (solo dominio)
- ❌ Diagnósticos completos
- ❌ Medicamentos con dosis
- ❌ Alergias con severidad

#### 🟠 IMPORTANTE - Loggear parcialmente
- ⚠️ Nombres: Solo iniciales (J. P.)
- ⚠️ CURP: Solo últimos 4 dígitos (****XXX01)
- ⚠️ Teléfono: Solo últimos 4 dígitos (****4567)
- ⚠️ Email: Solo dominio (@example.com)
- ⚠️ Dirección: Solo ciudad/estado
- ⚠️ Fecha de nacimiento: Solo año (1990)

---

## 📊 PRIORIDAD DE IMPLEMENTACIÓN

### FASE 1: CRÍTICO (Implementar AHORA) 🔴

1. **Fecha de nacimiento** - Encriptar
   - Impacto: Alto
   - Complejidad: Baja
   - Prioridad: 🔴 CRÍTICO

2. **Emails en pacientes** - Encriptar
   - Impacto: Alto
   - Complejidad: Baja
   - Prioridad: 🔴 CRÍTICO

3. **Notas y observaciones médicas** - Encriptar
   - Impacto: Alto
   - Complejidad: Media
   - Prioridad: 🔴 CRÍTICO

### FASE 2: ALTO (Esta semana) 🟠

4. **Alergias** - Encriptar
   - Impacto: Alto (vida o muerte)
   - Complejidad: Media
   - Prioridad: 🟠 ALTO

5. **Indicaciones de medicamentos** - Encriptar
   - Impacto: Alto
   - Complejidad: Media
   - Prioridad: 🟠 ALTO

6. **Mejorar sanitización de logs** - Ocultar datos sensibles
   - Impacto: Alto
   - Complejidad: Baja
   - Prioridad: 🟠 ALTO

### FASE 3: MEDIO (Próximas semanas) 🟡

7. **Nombres de medicamentos** - Considerar encriptar
   - Impacto: Medio
   - Complejidad: Media
   - Prioridad: 🟡 MEDIO

8. **Motivos de citas** - Considerar encriptar
   - Impacto: Medio
   - Complejidad: Media
   - Prioridad: 🟡 MEDIO

---

## 🎯 RECOMENDACIONES ESPECÍFICAS

### 1. Encriptación de Fecha de Nacimiento 🔴

**Razón:** 
- Identificador único cuando se combina con otros datos
- Requerido por LGPD para datos de identificación

**Implementación:**
```javascript
// En autoEncryption.js
pacientes: ['curp', 'numero_celular', 'direccion', 'fecha_nacimiento']
```

### 2. Encriptación de Emails 🔴

**Razón:**
- Identificador único
- Información de contacto personal
- Requerido por LGPD

**Implementación:**
```javascript
// En autoEncryption.js
pacientes: [..., 'email'],
doctores: ['telefono', 'email']
```

### 3. Encriptación de Información Médica 🔴

**Razón:**
- Información médica confidencial
- Requerido por NOM-004-SSA3-2012

**Implementación:**
```javascript
// En autoEncryption.js
diagnosticos: ['descripcion', 'notas', 'observaciones'],
signos_vitales: ['observaciones', 'notas'],
alergias: ['tipo_alergia', 'reaccion', 'severidad'],
medicamentos: ['indicaciones', 'notas']
```

### 4. Mejora de Sanitización en Logs 🔴

**Razón:**
- Prevenir exposición de datos sensibles en logs
- Cumplimiento LGPD

**Implementación:**
```javascript
// En logger.js - mejorar _sanitizeData
// Ocultar:
- CURP completo (solo últimos 4 dígitos)
- Teléfonos completos (solo últimos 4 dígitos)
- Emails completos (solo dominio)
- Fechas de nacimiento (solo año)
- Direcciones completas (solo ciudad)
```

---

## 📋 RESUMEN DE CAMPOS A ENCRIPTAR

### Pacientes (Agregar)
- `fecha_nacimiento` - 🔴 CRÍTICO
- `email` - 🔴 CRÍTICO
- `telefono_fijo` - 🟠 ALTO (si existe)
- `codigo_postal` - 🟡 MEDIO (considerar)

### Diagnósticos (Agregar)
- `notas` - 🔴 CRÍTICO
- `observaciones` - 🔴 CRÍTICO

### Signos Vitales (Agregar)
- `notas` - 🔴 CRÍTICO
- `presion_arterial` (si texto) - 🟠 ALTO
- `temperatura`, `glucosa` (si texto) - 🟠 ALTO

### Medicamentos (Agregar)
- `indicaciones` - 🔴 CRÍTICO
- `notas` - 🔴 CRÍTICO
- `nombre_medicamento` - 🟡 MEDIO (considerar)
- `dosis`, `frecuencia` - 🟡 MEDIO (considerar)

### Alergias (Agregar)
- `tipo_alergia` - 🔴 CRÍTICO
- `reaccion` - 🔴 CRÍTICO
- `severidad` - 🟠 ALTO

### Citas (Agregar)
- `notas` - 🔴 CRÍTICO
- `motivo` - 🟡 MEDIO (considerar)

### Doctores (Agregar)
- `email` - 🟠 ALTO
- `direccion` - 🟠 ALTO (si existe)

---

## ✅ CONCLUSIÓN

### Campos que DEBEN encriptarse (Crítico):
1. ✅ `fecha_nacimiento` - Identificador único
2. ✅ `email` - Identificador único y contacto
3. ✅ `notas` / `observaciones` - Información médica sensible
4. ✅ `alergias` - Información crítica de salud
5. ✅ `indicaciones` de medicamentos - Información médica

### Campos a CONSIDERAR encriptar:
1. ⚠️ `nombre_medicamento` - Puede revelar condiciones
2. ⚠️ `motivo` de citas - Puede revelar información médica
3. ⚠️ `codigo_postal` - Depende del contexto

### Mejoras en Logs (Crítico):
1. ✅ Ocultar CURP completo (solo últimos 4)
2. ✅ Ocultar teléfonos completos (solo últimos 4)
3. ✅ Ocultar emails completos (solo dominio)
4. ✅ Ocultar fechas de nacimiento completas (solo año)
5. ✅ Ocultar direcciones completas (solo ciudad)

---

**Autor:** Senior Full Stack Developer  
**Fecha:** 2025-11-05



