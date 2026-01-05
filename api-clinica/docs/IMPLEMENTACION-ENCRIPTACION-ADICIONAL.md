# 🔐 Implementación de Encriptación Adicional - Guía de Implementación

**Fecha:** 2025-11-05  
**Prioridad:** 🔴 CRÍTICO

---

## 🎯 OBJETIVO

Extender la encriptación automática a datos sensibles adicionales según normas LGPD y NOM.

---

## 📋 CAMBIOS REQUERIDOS

### 1. Actualizar `autoDecryption.js`

**Archivo:** `api-clinica/middlewares/autoDecryption.js`

**Cambio:**

```javascript
// ANTES
const ENCRYPTED_FIELDS = {
  pacientes: ['curp', 'numero_celular', 'direccion'],
  doctores: ['telefono'],
  red_apoyo: ['numero_celular', 'email', 'direccion'],
  diagnosticos: ['descripcion'],
  signos_vitales: ['observaciones']
};

// DESPUÉS (Fase 1 - Crítico)
const ENCRYPTED_FIELDS = {
  pacientes: [
    'curp',                    // ✅ Ya implementado
    'numero_celular',          // ✅ Ya implementado
    'direccion',               // ✅ Ya implementado
    'fecha_nacimiento',        // ❌ AGREGAR
    'email'                    // ❌ AGREGAR (si existe)
  ],
  doctores: [
    'telefono',                // ✅ Ya implementado
    'email'                    // ❌ AGREGAR (si existe)
  ],
  usuarios: [
    'email'                    // ❌ AGREGAR (requiere búsqueda por hash)
  ],
  red_apoyo: [
    'numero_celular',          // ✅ Ya implementado
    'email',                   // ✅ Ya implementado
    'direccion'                // ✅ Ya implementado
  ],
  diagnosticos: [
    'descripcion'              // ✅ Ya implementado
  ],
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
    'observaciones'            // ❌ AGREGAR
  ],
  planes_medicacion: [
    'observaciones'            // ❌ AGREGAR
  ],
  plan_detalle: [
    'observaciones'            // ❌ AGREGAR
  ],
  paciente_comorbilidad: [
    'observaciones'            // ❌ AGREGAR
  ],
  esquema_vacunacion: [
    'observaciones'            // ❌ AGREGAR
  ]
};
```

---

## 🔧 PASOS DE IMPLEMENTACIÓN

### Paso 1: Actualizar Middleware de Encriptación

1. Abrir `api-clinica/middlewares/autoDecryption.js`
2. Actualizar `ENCRYPTED_FIELDS` con los campos adicionales
3. Verificar que los middlewares `autoEncryptRequest` y `autoDecryptResponse` se aplican a todas las rutas necesarias

### Paso 2: Verificar Rutas

Verificar que las rutas usan los middlewares:

```javascript
// Ejemplo: api-clinica/routes/paciente.js
router.post('/', 
  autoEncryptRequest('pacientes'),    // ✅ Verificar
  createPaciente,
  autoDecryptResponse('pacientes')     // ✅ Verificar
);
```

### Paso 3: Actualizar Sanitización en Logs

Actualizar `ClinicaMovil/src/utils/securityUtils.js` y `ClinicaMovil/src/services/logger.js` para incluir los nuevos campos sensibles.

### Paso 4: Probar Encriptación

Ejecutar pruebas de inserción para verificar que los nuevos campos se encriptan correctamente.

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### 1. Email en Usuarios

**Problema:** Encriptar email puede afectar el login (búsqueda por email).

**Soluciones:**
- Opción A: Mantener email sin encriptar pero hasheado para búsqueda
- Opción B: Crear índice de hash del email para búsqueda
- Opción C: No encriptar email en usuarios (solo en pacientes/doctores)

**Recomendación:** Opción C (no encriptar email en usuarios si se usa para login).

### 2. Signos Vitales Numéricos

**Problema:** Encriptar valores numéricos puede complicar búsquedas y gráficos.

**Soluciones:**
- Opción A: Encriptar solo en BD, mantener desencriptados en memoria
- Opción B: Usar rangos encriptados para búsquedas
- Opción C: Encriptar solo valores críticos (presión, glucosa)

**Recomendación:** Opción A o C.

### 3. Búsquedas

**Problema:** Campos encriptados no pueden usarse directamente en WHERE clauses.

**Soluciones:**
- Usar funciones de desencriptación en queries
- Crear índices de hash para búsqueda
- Mantener algunos campos sin encriptar para búsqueda (ej: nombres)

---

## 📊 IMPACTO ESTIMADO

### Campos a Agregar (Fase 1 - Crítico):
- **Pacientes:** +2 campos (fecha_nacimiento, email)
- **Doctores:** +1 campo (email)
- **Usuarios:** +1 campo (email - opcional)
- **Signos Vitales:** +5 campos (presiones, glucosa, colesterol, triglicéridos)
- **Citas:** +2 campos (motivo, observaciones)
- **Planes Medicación:** +1 campo (observaciones)
- **Plan Detalle:** +1 campo (observaciones)
- **Comorbilidades:** +1 campo (observaciones)
- **Vacunas:** +1 campo (observaciones)

**Total:** ~15 campos adicionales a encriptar

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Actualizar `ENCRYPTED_FIELDS` en `autoDecryption.js`
- [ ] Verificar que todas las rutas usan los middlewares
- [ ] Actualizar sanitización en logs (frontend y backend)
- [ ] Probar inserción de datos con nuevos campos
- [ ] Verificar desencriptación en respuestas
- [ ] Verificar encriptación en base de datos
- [ ] Documentar cambios

---

**Autor:** Senior Full Stack Developer  
**Fecha:** 2025-11-05



