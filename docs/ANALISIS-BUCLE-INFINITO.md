# Análisis del Bucle Infinito en "Mis Citas"

## Problema
Al entrar a "Mis Citas" (o cualquier apartado similar), los datos se cargan en bucle infinito sin parar.

## Causas Identificadas

### 1. **MisCitas.js - Problema Principal**

**Ubicación:** `ClinicaMovil/src/screens/paciente/MisCitas.js`

**Problema:**
```javascript
useFocusEffect(
  useCallback(() => {
    loadCitas();
    // ...
  }, [paciente, speak])  // ❌ PROBLEMA: 'paciente' es un objeto que cambia en cada render
);

const loadCitas = async () => {  // ❌ No está memoizado
  // ...
};
```

**¿Por qué causa bucle?**
- `paciente` es un objeto que se recrea en cada render del hook `usePacienteData`
- Cada vez que `paciente` cambia (aunque sea una nueva referencia al mismo objeto), `useFocusEffect` se ejecuta
- `loadCitas` no está memoizado, por lo que se recrea en cada render
- `useFocusEffect` llama a `loadCitas()` → esto puede causar un re-render → `paciente` cambia → `useFocusEffect` se ejecuta de nuevo → **BUCLE INFINITO**

### 2. **usePacienteData.js - Dependencias Circulares**

**Ubicación:** `ClinicaMovil/src/hooks/usePacienteData.js`

**Problema:**
```javascript
const fetchPacienteData = useCallback(async () => {
  // ...
  setPaciente(pacienteNormalizado);  // ❌ Actualiza 'paciente'
  // ...
}, [userData, userRole, paciente, initializeFromUserData]);  // ❌ 'paciente' en dependencias

useEffect(() => {
  if (autoFetch) {
    fetchPacienteData();  // Se ejecuta cuando cambia fetchPacienteData
  }
}, [autoFetch, fetchPacienteData]);  // ❌ fetchPacienteData cambia cuando 'paciente' cambia
```

**¿Por qué causa bucle?**
- `fetchPacienteData` tiene `paciente` en sus dependencias
- Cuando `fetchPacienteData` se ejecuta, actualiza `paciente` con `setPaciente()`
- Esto causa que `fetchPacienteData` se recree (porque `paciente` cambió)
- `useEffect` detecta que `fetchPacienteData` cambió y lo ejecuta de nuevo → **BUCLE INFINITO**

### 3. **usePacienteMedicalData.js - cacheKey en Dependencias**

**Ubicación:** `ClinicaMovil/src/hooks/usePacienteMedicalData.js`

**Problema:**
```javascript
const cacheKey = `citas_${pacienteId}_${limit}_${offset}_${sort}`;  // Se recalcula en cada render

const fetchCitas = useCallback(async () => {
  // ...
}, [pacienteId, limit, offset, sort, cacheKey]);  // ❌ cacheKey en dependencias

useEffect(() => {
  if (autoFetch) {
    fetchCitas();
  }
}, [fetchCitas, autoFetch]);  // ❌ fetchCitas cambia cuando cacheKey cambia
```

**¿Por qué causa bucle?**
- `cacheKey` se recalcula en cada render (aunque el valor sea el mismo)
- Si `cacheKey` cambia (nueva referencia de string), `fetchCitas` se recrea
- `useEffect` detecta que `fetchCitas` cambió y lo ejecuta → **BUCLE INFINITO**

### 4. **usePacienteData.js - Sincronización de Paciente**

**Problema adicional:**
```javascript
useEffect(() => {
  if (userData && userRole) {
    const pacienteFromUserData = initializeFromUserData();
    if (pacienteFromUserData && (!paciente || paciente.id_paciente !== pacienteFromUserData.id_paciente)) {
      setPaciente(pacienteFromUserData);  // Actualiza paciente
    }
  }
}, [userData, userRole, paciente, initializeFromUserData]);  // ❌ 'paciente' en dependencias
```

**¿Por qué causa bucle?**
- Este `useEffect` tiene `paciente` en sus dependencias
- Cuando actualiza `paciente` con `setPaciente()`, el efecto se vuelve a ejecutar
- Si `initializeFromUserData()` siempre retorna un objeto nuevo (aunque con los mismos datos), el efecto se ejecuta infinitamente

## Soluciones Recomendadas

### Solución 1: Memoizar `loadCitas` y usar solo `id_paciente` en dependencias

```javascript
const loadCitas = useCallback(async () => {
  // ...
}, [paciente?.id_paciente]);  // ✅ Solo el ID, no el objeto completo

useFocusEffect(
  useCallback(() => {
    if (paciente?.id_paciente) {
      loadCitas();
    }
  }, [paciente?.id_paciente, loadCitas, speak])  // ✅ Solo el ID
);
```

### Solución 2: Remover `paciente` de dependencias de `fetchPacienteData`

```javascript
const fetchPacienteData = useCallback(async () => {
  // ...
  // Usar setPaciente con función de actualización para evitar dependencias
  setPaciente(prevPaciente => {
    if (prevPaciente?.id_paciente === pacienteNormalizado.id_paciente) {
      return prevPaciente;  // No actualizar si es el mismo
    }
    return pacienteNormalizado;
  });
}, [userData, userRole, initializeFromUserData]);  // ✅ Sin 'paciente'
```

### Solución 3: Generar `cacheKey` dentro de la función o usar `useMemo`

```javascript
const fetchCitas = useCallback(async () => {
  const currentCacheKey = `citas_${pacienteId}_${limit}_${offset}_${sort}`;  // ✅ Dentro de la función
  // ...
}, [pacienteId, limit, offset, sort]);  // ✅ Sin cacheKey
```

### Solución 4: Comparar IDs en lugar de objetos completos

```javascript
useEffect(() => {
  if (userData && userRole) {
    const pacienteFromUserData = initializeFromUserData();
    const userDataId = pacienteFromUserData?.id_paciente;
    const currentId = paciente?.id_paciente;
    
    // ✅ Solo actualizar si el ID cambió realmente
    if (pacienteFromUserData && userDataId && userDataId !== currentId) {
      setPaciente(pacienteFromUserData);
    }
  }
}, [userData?.id_paciente, userData?.id, userRole, paciente?.id_paciente, initializeFromUserData]);  // ✅ Solo IDs
```

## Resumen

El bucle infinito se debe a:
1. **Dependencias de objetos completos** en lugar de valores primitivos (IDs)
2. **Funciones no memoizadas** que se recrean en cada render
3. **Referencias de strings/cacheKeys** que cambian aunque el valor sea el mismo
4. **Actualizaciones de estado que causan que las dependencias cambien**, creando un ciclo

La solución general es: **usar solo valores primitivos (IDs) en dependencias y comparar antes de actualizar estados**.



