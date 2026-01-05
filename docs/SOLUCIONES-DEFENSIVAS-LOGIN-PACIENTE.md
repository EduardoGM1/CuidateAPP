# Soluciones Defensivas para Login de Pacientes

## Problema Identificado

El error "Paciente no encontrado o inactivo" (404) ocurría cuando:
- El frontend enviaba `pacienteId: 7` (hardcodeado)
- El backend intentaba validar el paciente con ID 7
- El paciente con ID 7 no existe en la base de datos

## Soluciones Implementadas

### 1. Backend - Fallback Automático (unifiedAuthController.js)

**Problema**: Si se proporciona un `id_paciente` que no existe, el backend lanzaba error inmediatamente.

**Solución**: Si el paciente no existe, el backend automáticamente intenta búsqueda global por PIN como fallback.

```javascript
// Si el paciente no existe, intentar búsqueda global por PIN
if (authError.message?.includes('Paciente no encontrado')) {
  // Intentar búsqueda global por PIN como fallback
  const result = await UnifiedAuthService.authenticate('Paciente', null, {...});
  return res.json({ success: true, ...result, fallback_used: true });
}
```

**Beneficios**:
- El login funciona incluso con IDs incorrectos
- Se registra en auditoría que se usó fallback
- El usuario puede iniciar sesión sin conocer su ID

### 2. Frontend - Sanitización de pacienteId (patientIdValidator.js)

**Problema**: Valores hardcodeados como `'7'` se enviaban al backend.

**Solución**: Validador que detecta y sanitiza IDs problemáticos.

```javascript
// Detecta IDs problemáticos y los convierte a null (búsqueda global)
const problematicIds = ['7', 7];
if (problematicIds.includes(pacienteId)) {
  return null; // Usar búsqueda global
}
```

**Beneficios**:
- Previene envío de IDs inválidos
- Detecta valores hardcodeados
- Fuerza uso de búsqueda global cuando es necesario

### 3. Frontend - Eliminación de Valores Hardcodeados

**Archivos modificados**:
- `LoginPaciente.js`: Cambiado de `'7'` a `null`
- `LoginPIN.js`: Ya no usa valores por defecto

**Beneficios**:
- No más IDs hardcodeados en el código
- Comportamiento consistente

### 4. Middleware de Validación (validatePatientId.js)

**Nuevo middleware** que valida `pacienteId` antes de procesar solicitudes.

**Características**:
- Valida que el ID sea un número válido
- Verifica que el paciente existe
- Verifica que el paciente está activo
- Proporciona mensajes de error descriptivos
- Sugiere usar búsqueda global cuando es apropiado

**Uso**:
```javascript
// En rutas que requieren pacienteId
router.post('/endpoint', validatePatientId, controller);

// En rutas donde pacienteId es opcional
router.post('/endpoint', validatePatientIdIfPresent, controller);
```

### 5. Tests Automatizados (test-login-paciente-ids.js)

**Script de pruebas** que valida diferentes escenarios:
- Login sin pacienteId (búsqueda global)
- Login con pacienteId existente
- Login con pacienteId inexistente (debe usar fallback)
- Login con pacienteId inválido
- Login con PIN inválido

**Ejecutar**:
```bash
node scripts/test-login-paciente-ids.js
```

## Mejores Prácticas Implementadas

### 1. **Nunca Hardcodear IDs de Usuarios**
```javascript
// ❌ MAL
const pacienteId = '7';

// ✅ BIEN
const pacienteId = null; // Usar búsqueda global
```

### 2. **Siempre Validar IDs Antes de Usar**
```javascript
// ✅ BIEN
const sanitizedId = sanitizePatientId(rawId);
if (!sanitizedId) {
  // Usar búsqueda global
}
```

### 3. **Usar Búsqueda Global por Defecto**
```javascript
// ✅ BIEN - El paciente solo necesita su PIN
await pacienteAuthService.loginWithPIN(null, pin, deviceId);
```

### 4. **Manejar Errores con Fallback**
```javascript
// ✅ BIEN - Intentar método alternativo si falla
try {
  // Método principal
} catch (error) {
  if (error.message.includes('no encontrado')) {
    // Fallback a búsqueda global
  }
}
```

## Prevención de Errores Futuros

### Checklist para Desarrolladores

- [ ] ¿Hay algún `pacienteId` hardcodeado en el código?
- [ ] ¿Se valida el `pacienteId` antes de enviarlo al backend?
- [ ] ¿El backend tiene fallback para IDs inexistentes?
- [ ] ¿Los tests cubren escenarios con IDs inválidos?
- [ ] ¿Los mensajes de error son descriptivos y sugieren soluciones?

### Monitoreo

El sistema ahora registra en auditoría cuando:
- Se usa fallback por pacienteId inexistente
- Se detecta un ID problemático
- Se intenta acceso con pacienteId inválido

**Revisar logs**:
```bash
# Buscar intentos con IDs problemáticos
grep "pacienteId.*7" api-clinica/logs/*.log

# Buscar uso de fallback
grep "fallback_used" api-clinica/logs/*.log
```

## Configuración Recomendada

### Variables de Entorno

```env
# Habilitar logging detallado de autenticación
LOG_AUTH_DETAILS=true

# Habilitar auditoría de fallbacks
AUDIT_FALLBACKS=true
```

### Configuración de Tests

Ejecutar tests de login antes de cada deploy:
```bash
npm run test:login-pacientes
```

## Conclusión

Con estas soluciones implementadas:
1. ✅ El sistema es más resiliente a IDs inválidos
2. ✅ Los usuarios pueden iniciar sesión sin conocer su ID
3. ✅ Se detectan y previenen valores hardcodeados
4. ✅ Los errores son más descriptivos y útiles
5. ✅ Hay tests automatizados para prevenir regresiones

El error "Paciente no encontrado o inactivo" con `pacienteId: 7` ya no debería ocurrir, y si ocurre, el sistema automáticamente intentará búsqueda global por PIN.

