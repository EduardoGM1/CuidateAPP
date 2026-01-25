# Solución: Errores Intermitentes en Cards de Última Cita y Monitoreo Continuo

## Problema Identificado

Los cards de "Última Cita Registrada" y "Monitoreo Continuo" en la pantalla de Detalle del Paciente presentaban errores intermitentes al solicitar datos del servidor. A veces fallaba uno, a veces el otro, sin un patrón claro.

## Causas Raíz Identificadas

### 1. **Falta de Retry Automático**
- Si una request fallaba por problemas de red temporales, no se reintentaba
- Errores de timeout o conexión causaban fallos inmediatos

### 2. **Race Conditions**
- Múltiples hooks haciendo requests simultáneos sin coordinación
- Requests antiguos podían sobrescribir datos de requests nuevos
- No había cancelación de requests pendientes cuando cambiaba el pacienteId

### 3. **Manejo de Errores Básico**
- Errores no se mostraban de forma clara al usuario
- No había opción de reintentar manualmente
- Mensajes de error genéricos sin contexto

### 4. **Falta de Timeout Específico**
- Aunque había timeout en el cliente axios, no había timeout por request
- Requests podían quedar colgados indefinidamente

### 5. **Validación de Datos Insuficiente**
- No se validaba que los datos recibidos fueran válidos antes de establecer el estado
- Datos corruptos o mal formateados causaban errores en renderizado

## Soluciones Implementadas

### 1. Sistema de Retry Automático (`requestWithRetry.js`)

**Nuevo archivo**: `ClinicaMovil/src/utils/requestWithRetry.js`

**Características**:
- ✅ Retry automático con backoff exponencial (1s, 2s, 4s)
- ✅ Hasta 3 reintentos por defecto
- ✅ Timeout específico por request (10s para citas, 15s para signos vitales)
- ✅ Detección inteligente de errores retryables:
  - Errores de red (ECONNABORTED, ETIMEDOUT, ENOTFOUND, ECONNREFUSED)
  - Códigos HTTP retryables (408, 429, 500, 502, 503, 504)
- ✅ Soporte para AbortController para cancelar requests

**Uso**:
```javascript
const response = await requestWithRetry(
  async (signal) => {
    return await gestionService.getPacienteCitas(pacienteId, options);
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
    abortController: abortControllerRef.current
  }
);
```

### 2. Prevención de Race Conditions

**Cambios en `usePacienteMedicalData.js`**:
- ✅ AbortController por hook para cancelar requests pendientes
- ✅ Cancelación automática cuando cambia `pacienteId`
- ✅ Cleanup en `useEffect` para cancelar requests al desmontar
- ✅ Validación de cancelación antes de establecer estado

**Implementación**:
```javascript
// AbortController para cancelar requests pendientes
const abortControllerRef = useRef(null);

const fetchCitas = useCallback(async () => {
  // Cancelar request anterior si existe
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Crear nuevo AbortController para este request
  abortControllerRef.current = new AbortController();
  
  // ... hacer request con abortController
  
  // Verificar si fue cancelado antes de establecer estado
  if (abortControllerRef.current?.signal.aborted) {
    return;
  }
}, [pacienteId, ...]);

// Cleanup
useEffect(() => {
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, [pacienteId]);
```

### 3. Validación de Datos Mejorada

**Validaciones agregadas**:
- ✅ Verificación de que los datos sean arrays antes de establecer estado
- ✅ Validación de estructura de respuesta
- ✅ Manejo de respuestas mal formateadas
- ✅ Errores descriptivos cuando los datos son inválidos

**Ejemplo**:
```javascript
// Validar y normalizar datos
const citasData = Array.isArray(response.data) 
  ? response.data 
  : (response.data?.data || []);

// Validar que los datos sean válidos
if (!Array.isArray(citasData)) {
  throw new Error('Datos de citas inválidos: no es un array');
}
```

### 4. Manejo de Errores Mejorado en Componentes

**Cambios en `ProximaCitaCard.js`**:
- ✅ Mensaje de error más descriptivo
- ✅ Botón de "Reintentar" para refresh manual
- ✅ Uso del método `refresh` del hook

**Cambios en `MonitoreoContinuoSection.js`**:
- ✅ Mensaje de error más descriptivo
- ✅ Botón de "Reintentar" para refresh manual
- ✅ Mejor visualización del estado de error

**Ejemplo**:
```javascript
if (error) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>⚠️ Error al cargar citas</Text>
      <Text style={styles.errorSubtext}>
        {error.message || 'Intenta refrescar la pantalla'}
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => {
          if (refresh && typeof refresh === 'function') {
            refresh();
          }
        }}
      >
        <Text style={styles.retryButtonText}>🔄 Reintentar</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 5. Errores Más Descriptivos

**Mejoras**:
- ✅ Extracción de mensaje de error del response
- ✅ Inclusión de código de estado HTTP
- ✅ Preservación del error original para debugging
- ✅ Mensajes más claros para el usuario

**Ejemplo**:
```javascript
catch (err) {
  // Crear error más descriptivo
  const errorMessage = err.response?.data?.message || err.message || 'Error al obtener citas';
  const enhancedError = new Error(errorMessage);
  enhancedError.originalError = err;
  enhancedError.status = err.response?.status;
  
  setError(enhancedError);
}
```

## Archivos Modificados

### Nuevos Archivos
1. **`ClinicaMovil/src/utils/requestWithRetry.js`**
   - Sistema completo de retry con backoff exponencial
   - Manejo de timeouts
   - Soporte para AbortController

### Archivos Modificados
1. **`ClinicaMovil/src/hooks/usePacienteMedicalData.js`**
   - ✅ Agregado `useRef` para AbortController
   - ✅ Implementado retry en `usePacienteCitas`
   - ✅ Implementado retry en `usePacienteSignosVitales`
   - ✅ Validación de datos mejorada
   - ✅ Cleanup de AbortControllers
   - ✅ Manejo de errores mejorado

2. **`ClinicaMovil/src/components/DetallePaciente/ProximaCitaCard.js`**
   - ✅ Manejo de errores mejorado
   - ✅ Botón de reintentar
   - ✅ Uso del método `refresh` del hook

3. **`ClinicaMovil/src/components/DetallePaciente/MonitoreoContinuoSection.js`**
   - ✅ Manejo de errores mejorado
   - ✅ Botón de reintentar
   - ✅ Mejor visualización de errores

## Flujo de Request Mejorado

### Antes
```
Request → Error → Mostrar error → Fin
```

### Ahora
```
Request → Error → Verificar si es retryable
  ↓
  Sí → Esperar delay → Reintentar (hasta 3 veces)
  ↓
  No → Mostrar error con botón de reintentar
  ↓
  Usuario presiona "Reintentar" → Nuevo request
```

## Beneficios

1. **Resiliencia**: Los requests se reintentan automáticamente ante errores temporales
2. **Mejor UX**: Mensajes de error claros con opción de reintentar
3. **Sin Race Conditions**: Requests antiguos se cancelan automáticamente
4. **Datos Válidos**: Validación asegura que solo se establezcan datos válidos
5. **Debugging**: Errores más descriptivos facilitan la identificación de problemas

## Configuración de Retry

### Para Citas
- **Max Retries**: 3
- **Retry Delay**: 1000ms (1 segundo)
- **Backoff**: Exponencial (1s, 2s, 4s)
- **Timeout**: 10000ms (10 segundos)

### Para Signos Vitales
- **Max Retries**: 3
- **Retry Delay**: 1000ms (1 segundo)
- **Backoff**: Exponencial (1s, 2s, 4s)
- **Timeout**: 10000ms (10 segundos) o 15000ms (15 segundos) para `getAll`

## Errores Retryables

### Errores de Red
- `ECONNABORTED` - Request abortado (timeout)
- `ETIMEDOUT` - Timeout de conexión
- `ENOTFOUND` - DNS no resuelto
- `ECONNREFUSED` - Conexión rechazada
- `Network Error` - Error de red genérico
- `ERR_NETWORK` - Error de red de Axios

### Códigos HTTP Retryables
- `408` - Request Timeout
- `429` - Too Many Requests
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable
- `504` - Gateway Timeout

## Pruebas Recomendadas

1. **Probar con conexión lenta**: Verificar que los retries funcionen
2. **Probar con conexión intermitente**: Verificar que se recupere automáticamente
3. **Probar cambio rápido de pacientes**: Verificar que no haya race conditions
4. **Probar con servidor caído**: Verificar que se muestre error claro con opción de reintentar
5. **Probar con datos inválidos**: Verificar que se manejen correctamente

## Estado
✅ **IMPLEMENTADO**: 
- Sistema de retry automático
- Prevención de race conditions
- Validación de datos
- Manejo de errores mejorado
- Botones de reintentar en componentes

Los cards de "Última Cita" y "Monitoreo Continuo" ahora deberían funcionar de forma más confiable y resiliente ante errores de red temporales.
