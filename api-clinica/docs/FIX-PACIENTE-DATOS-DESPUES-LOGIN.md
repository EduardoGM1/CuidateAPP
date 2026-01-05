# Fix: Datos del Paciente después del Login

## Problema Reportado

Después del login exitoso con el paciente Eduardo:
1. No se muestra información médica (historial, medicamentos, citas)
2. El dashboard sigue diciendo "Hola, Paciente" en lugar de "Hola, Eduardo"

## Cambios Realizados

### 1. LoginPIN.js - Manejo de Respuesta Mejorado

**Archivo:** `ClinicaMovil/src/screens/auth/LoginPIN.js`

**Cambios:**
- ✅ Manejo robusto de respuesta: ahora acepta tanto `responseData.paciente` como `responseData.user`
- ✅ Construcción de `nombre_completo` si no viene del backend
- ✅ Logs de debugging para verificar datos guardados
- ✅ Asegurar que `id` e `id_paciente` estén disponibles

**Código:**
```javascript
// El servicio mapea 'user' a 'paciente' para compatibilidad, pero también puede venir como 'user'
const pacienteInfo = responseData.paciente || responseData.user;

// Preparar datos del paciente para el contexto
const pacienteData = {
  ...pacienteInfo,
  id: pacienteInfo.id || pacienteInfo.id_paciente,
  id_paciente: pacienteInfo.id_paciente || pacienteInfo.id,
  nombre_completo: pacienteInfo.nombre_completo || 
                  `${pacienteInfo.nombre || ''} ${pacienteInfo.apellido_paterno || ''} ${pacienteInfo.apellido_materno || ''}`.trim()
};
```

### 2. usePacienteData.js - Obtención de pacienteId Mejorada

**Archivo:** `ClinicaMovil/src/hooks/usePacienteData.js`

**Cambios:**
- ✅ Obtención de `pacienteId` desde múltiples fuentes:
  - `paciente?.id_paciente`
  - `paciente?.id`
  - `userData?.id_paciente`
  - `userData?.id`
- ✅ Logs de debugging para identificar problemas
- ✅ Asegurar que `usePacienteMedicalData` reciba el `pacienteId` correcto

**Código:**
```javascript
// Priorizar id_paciente, luego id, luego obtener desde userData
const pacienteId = paciente?.id_paciente || paciente?.id || userData?.id_paciente || userData?.id;

// Log para debugging
useEffect(() => {
  if (pacienteId) {
    Logger.debug('usePacienteData: pacienteId disponible para datos médicos', {
      pacienteId,
      tienePaciente: !!paciente,
      tieneUserData: !!userData,
      // ... más detalles
    });
  }
}, [pacienteId, paciente, userData]);
```

### 3. InicioPaciente.js - Logs de Debugging

**Archivo:** `ClinicaMovil/src/screens/paciente/InicioPaciente.js`

**Cambios:**
- ✅ Logs de debugging para verificar qué datos están disponibles
- ✅ Verificar tanto `paciente` como `userData`

**Código:**
```javascript
useEffect(() => {
  Logger.debug('InicioPaciente: Datos del paciente', {
    tienePaciente: !!paciente,
    tieneUserData: !!userData,
    nombrePaciente,
    nombreCompleto,
    pacienteId: paciente?.id_paciente || paciente?.id,
    pacienteNombre: paciente?.nombre,
    userDataNombre: userData?.nombre,
    userDataNombreCompleto: userData?.nombre_completo
  });
}, [paciente, userData, nombrePaciente, nombreCompleto]);
```

## Verificación

### Datos del Backend

El backend retorna en el login:
```json
{
  "success": true,
  "token": "...",
  "user": {
    "id": 7,
    "id_paciente": 7,
    "nombre": "Eduardo",
    "apellido_paterno": "Gonzalez",
    "apellido_materno": "Gonzalez",
    "nombre_completo": "Eduardo Gonzalez Gonzalez",
    // ... más campos
  }
}
```

### Flujo Esperado

1. **Login exitoso:**
   - `authService.loginWithPIN()` retorna `{ token, paciente: user }`
   - `LoginPIN.js` extrae `pacienteInfo` de `responseData.paciente || responseData.user`
   - Guarda en contexto: `pacienteData` con `id`, `id_paciente`, `nombre_completo`

2. **InicioPaciente:**
   - `usePacienteData()` obtiene datos desde `userData` (del contexto)
   - Construye `nombreCompleto` desde `paciente` o `userData`
   - Muestra "Hola Eduardo" en lugar de "Hola Paciente"

3. **Datos Médicos:**
   - `usePacienteData()` obtiene `pacienteId` desde múltiples fuentes
   - Pasa `pacienteId` a `usePacienteMedicalData()`
   - Los hooks hacen peticiones a `/api/pacientes/${pacienteId}/citas`, etc.
   - Los endpoints requieren autenticación y `authorizePatientAccess` permite acceso

## Próximos Pasos para Debugging

Si el problema persiste, revisar logs en consola:

1. **Verificar datos guardados después del login:**
   - Buscar: `"Datos del paciente preparados para contexto"`
   - Verificar que `id`, `id_paciente`, `nombre_completo` estén presentes

2. **Verificar datos en InicioPaciente:**
   - Buscar: `"InicioPaciente: Datos del paciente"`
   - Verificar que `nombrePaciente` y `nombreCompleto` tengan valores

3. **Verificar pacienteId para datos médicos:**
   - Buscar: `"usePacienteData: pacienteId disponible para datos médicos"`
   - Verificar que `pacienteId` tenga un valor numérico

4. **Verificar errores en peticiones:**
   - Buscar errores de red o 401/403 en las peticiones de datos médicos
   - Verificar que el token esté presente en los headers

## Notas

- Los cambios mantienen **backward compatibility**
- Los logs de debugging ayudarán a identificar problemas específicos
- Si el problema es que `userData` no tiene los campos correctos, los logs mostrarán qué campos están disponibles



