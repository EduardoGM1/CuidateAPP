# 📋 Análisis: Cambio de "Citas Recientes" a "Próxima Cita"

## 🎯 Objetivo
Cambiar el card de "Citas Recientes" a "Próxima Cita" en la pantalla `DetallePaciente.js`.

---

## 📊 Estado Actual

### Ubicación del Código
- **Archivo:** `ClinicaMovil/src/screens/admin/DetallePaciente.js`
- **Línea del título:** ~3074
- **Línea de lógica:** ~685-687

### Implementación Actual

#### 1. Título del Card
```javascript
<Title style={styles.cardTitle}>📅 Citas Recientes ({totalCitas})</Title>
```

#### 2. Lógica de Datos
```javascript
// Línea ~685-687
const citasMostrar = useMemo(() => {
  return citas?.slice(0, 1) || [];
}, [citas]);
```

#### 3. Fuente de Datos
- **Hook:** `usePacienteMedicalData(pacienteId, { limit: 5, autoFetch: true })`
- **Ordenamiento:** `sort: 'DESC'` (más recientes primero)
- **Límite:** 5 citas cargadas, pero solo se muestra 1
- **Total:** `totalCitas` muestra el total de todas las citas del paciente

#### 4. Renderizado
- Muestra la cita más reciente (pasada o futura)
- Muestra contador total de citas: `({totalCitas})`
- Permite ver todas las citas mediante modal "Opciones"

---

## 🔄 Cambios Necesarios

### 1. Cambio de Título
**Antes:**
```javascript
<Title style={styles.cardTitle}>📅 Citas Recientes ({totalCitas})</Title>
```

**Después:**
```javascript
<Title style={styles.cardTitle}>📅 Próxima Cita</Title>
```

**Razón:** 
- Ya no mostramos múltiples citas, solo la próxima
- El contador total no es relevante para "próxima cita"
- Simplifica la interfaz

---

### 2. Cambio de Lógica de Filtrado

**Antes:**
```javascript
const citasMostrar = useMemo(() => {
  return citas?.slice(0, 1) || [];
}, [citas]);
```

**Después:**
```javascript
const proximaCita = useMemo(() => {
  if (!citas || citas.length === 0) {
    return null;
  }
  
  const ahora = new Date();
  
  // Filtrar solo citas futuras (fecha_cita > ahora)
  const citasFuturas = citas.filter(cita => {
    const fechaCita = new Date(cita.fecha_cita);
    return fechaCita > ahora;
  });
  
  if (citasFuturas.length === 0) {
    return null; // No hay citas futuras
  }
  
  // Ordenar por fecha ascendente (más cercana primero)
  citasFuturas.sort((a, b) => {
    const fechaA = new Date(a.fecha_cita);
    const fechaB = new Date(b.fecha_cita);
    return fechaA - fechaB;
  });
  
  // Retornar la más cercana
  return citasFuturas[0];
}, [citas]);
```

**Razón:**
- Necesitamos mostrar solo citas futuras
- Ordenar por fecha ascendente para obtener la más cercana
- Manejar el caso cuando no hay citas futuras

---

### 3. Cambio en el Renderizado

**Antes:**
```javascript
{citasMostrar && citasMostrar.length > 0 ? (
  citasMostrar.map((cita, citaIndex) => (
    // ... renderizado de cita
  ))
) : (
  <Text style={styles.emptyText}>No hay citas registradas</Text>
)}
```

**Después:**
```javascript
{proximaCita ? (
  <TouchableOpacity
    style={styles.listItem}
    onPress={() => handleOpenCitaDetalle(proximaCita.id_cita)}
    activeOpacity={0.7}
  >
    {/* ... mismo renderizado de cita */}
  </TouchableOpacity>
) : (
  <View style={styles.emptyState}>
    <Text style={styles.emptyText}>No hay citas programadas</Text>
    <Text style={styles.emptySubtext}>
      Las próximas citas aparecerán aquí
    </Text>
  </View>
)}
```

**Razón:**
- Ya no necesitamos `.map()` porque solo hay 1 cita
- Mensaje más específico cuando no hay citas futuras
- Mejor UX con mensaje descriptivo

---

### 4. Consideraciones Adicionales

#### A. Carga de Datos
- **Actual:** Carga 5 citas con `sort: 'DESC'`
- **Recomendación:** Mantener la misma carga, pero filtrar en el frontend
- **Alternativa:** Cambiar a `sort: 'ASC'` y aumentar el límite si es necesario

#### B. Estado Vacío
- Mostrar mensaje claro cuando no hay citas futuras
- Opcional: Agregar botón para crear nueva cita

#### C. Actualización en Tiempo Real
- El hook ya maneja refresh automático
- No se requieren cambios adicionales

#### D. Modal "Opciones"
- Mantener funcionalidad de "Ver todas las citas"
- El modal ya muestra todas las citas (pasadas y futuras)

---

## 📝 Resumen de Cambios

### Archivos a Modificar
1. **`ClinicaMovil/src/screens/admin/DetallePaciente.js`**
   - Línea ~685-687: Cambiar lógica de `citasMostrar` a `proximaCita`
   - Línea ~3074: Cambiar título del card
   - Línea ~3081-3121: Actualizar renderizado condicional

### Cambios Específicos
1. ✅ Cambiar título: "Citas Recientes" → "Próxima Cita"
2. ✅ Remover contador `({totalCitas})`
3. ✅ Filtrar citas futuras
4. ✅ Ordenar por fecha ascendente
5. ✅ Mostrar solo la cita más cercana
6. ✅ Mejorar mensaje de estado vacío

### Impacto
- **Bajo:** Cambio localizado en un solo componente
- **Sin breaking changes:** No afecta otras funcionalidades
- **Mejora UX:** Información más relevante y clara

---

## ✅ Checklist de Implementación

- [ ] Cambiar título del card
- [ ] Implementar lógica de filtrado de citas futuras
- [ ] Actualizar renderizado condicional
- [ ] Mejorar mensaje de estado vacío
- [ ] Probar con paciente sin citas futuras
- [ ] Probar con paciente con múltiples citas futuras
- [ ] Verificar que el modal "Opciones" sigue funcionando
- [ ] Verificar que el detalle de cita sigue funcionando

---

**Fecha de análisis:** 2025-11-16  
**Autor:** Senior Developer

