# 📊 Análisis: Visualización de Solicitudes en Dashboard del Doctor

**Fecha:** 28/11/2025  
**Estado:** ✅ **IMPLEMENTADO** con algunas mejoras posibles

---

## ✅ Lo que SÍ está Implementado

### 1. Carga de Solicitudes Pendientes

**Ubicación:** `DashboardDoctor.js` líneas 76-88

```javascript
const loadSolicitudesPendientes = useCallback(async () => {
  try {
    setLoadingSolicitudes(true);
    const response = await gestionService.getAllSolicitudesReprogramacion('pendiente');
    if (response.success) {
      setSolicitudesPendientes(response.total || 0);
    }
  } catch (error) {
    Logger.error('DashboardDoctor: Error cargando solicitudes pendientes', error);
  } finally {
    setLoadingSolicitudes(false);
  }
}, []);
```

**✅ Funcionalidad:**
- Carga solicitudes pendientes al montar el componente
- Se ejecuta cuando `userData?.id_doctor` está disponible
- Maneja errores correctamente

### 2. Visualización en el Dashboard

**Ubicación:** `DashboardDoctor.js` líneas 644-676

#### A. Badge en Botón "Ver Todas las Citas"

```javascript
{solicitudesPendientes > 0 && (
  <View style={styles.badgeSolicitudes}>
    <Text style={styles.badgeSolicitudesText}>{solicitudesPendientes}</Text>
  </View>
)}
```

**✅ Funcionalidad:**
- Muestra badge naranja con el número de solicitudes
- Solo aparece si hay solicitudes pendientes
- Posicionado en la esquina superior derecha del ícono

#### B. Texto Informativo

```javascript
{solicitudesPendientes > 0 && (
  <Text style={styles.quickAccessSubtext}>
    {solicitudesPendientes} solicitud{solicitudesPendientes > 1 ? 'es' : ''} pendiente{solicitudesPendientes > 1 ? 's' : ''}
  </Text>
)}
```

**✅ Funcionalidad:**
- Muestra texto descriptivo debajo del botón
- Pluraliza correctamente ("1 solicitud" vs "2 solicitudes")
- Solo aparece si hay solicitudes pendientes

#### C. Botón "Gestionar Solicitudes"

```javascript
{solicitudesPendientes > 0 && (
  <TouchableOpacity 
    style={[styles.quickAccessButton, styles.primaryButton]}
    onPress={() => {
      Logger.navigation('DashboardDoctor', 'GestionSolicitudesReprogramacion');
      navigation.navigate('GestionSolicitudesReprogramacion');
    }}
  >
    <View style={styles.quickAccessIconContainer}>
      <Text style={styles.quickAccessIcon}>📋</Text>
      <View style={styles.badgeSolicitudes}>
        <Text style={styles.badgeSolicitudesText}>{solicitudesPendientes}</Text>
      </View>
    </View>
    <Text style={styles.quickAccessText}>Gestionar Solicitudes</Text>
    <Text style={styles.quickAccessSubtext}>Reprogramación de citas</Text>
  </TouchableOpacity>
)}
```

**✅ Funcionalidad:**
- Botón dedicado para gestionar solicitudes
- Badge con número de solicitudes
- Navegación a pantalla de gestión
- Solo aparece si hay solicitudes pendientes

### 3. Actualización en Tiempo Real (WebSocket)

**Ubicación:** `DashboardDoctor.js` líneas 144-151

```javascript
const unsubscribeSolicitudReprogramacion = subscribeToEvent('solicitud_reprogramacion', (data) => {
  if (data.id_doctor === userData.id_doctor) {
    Logger.info('DashboardDoctor: Solicitud de reprogramación recibida por WebSocket', data);
    // Recargar dashboard y solicitudes pendientes
    refreshDashboard();
    loadSolicitudesPendientes();
  }
});
```

**✅ Funcionalidad:**
- Escucha eventos WebSocket de nuevas solicitudes
- Filtra por doctor asignado
- Actualiza contador automáticamente
- Recarga dashboard completo

### 4. Refresh Manual

**Ubicación:** `DashboardDoctor.js` líneas 97-112

```javascript
const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await Promise.all([
      refreshDashboard(),
      refreshPacientes(),
      refreshNotificaciones(),
      loadSolicitudesPendientes()  // ✅ Incluido en refresh
    ]);
    Logger.info('DashboardDoctor: Datos refrescados exitosamente');
  } catch (error) {
    Logger.error('Error refrescando datos del dashboard', error);
  } finally {
    setRefreshing(false);
  }
}, [refreshDashboard, refreshPacientes, refreshNotificaciones, loadSolicitudesPendientes]);
```

**✅ Funcionalidad:**
- Pull-to-refresh actualiza solicitudes
- Incluido en el refresh general del dashboard

---

## 📊 Resumen de Visualización

### Cuando NO hay solicitudes pendientes:
- ❌ No se muestra badge en "Ver Todas las Citas"
- ❌ No se muestra texto informativo
- ❌ No se muestra botón "Gestionar Solicitudes"

### Cuando SÍ hay solicitudes pendientes:
- ✅ Badge naranja con número en "Ver Todas las Citas"
- ✅ Texto: "X solicitud(es) pendiente(s)"
- ✅ Botón "Gestionar Solicitudes" con badge
- ✅ Actualización automática vía WebSocket
- ✅ Actualización manual vía pull-to-refresh

---

## ⚠️ Posibles Mejoras

### 1. Mostrar Botón Siempre (Opcional)

**Problema actual:** El botón "Gestionar Solicitudes" solo aparece si hay solicitudes pendientes.

**Mejora sugerida:**
```javascript
// Mostrar siempre el botón, pero deshabilitado si no hay solicitudes
<TouchableOpacity 
  style={[
    styles.quickAccessButton, 
    styles.primaryButton,
    solicitudesPendientes === 0 && styles.disabledButton
  ]}
  disabled={solicitudesPendientes === 0}
  onPress={() => {
    navigation.navigate('GestionSolicitudesReprogramacion');
  }}
>
  {/* ... */}
  {solicitudesPendientes === 0 && (
    <Text style={styles.quickAccessSubtext}>No hay solicitudes</Text>
  )}
</TouchableOpacity>
```

**Ventajas:**
- El doctor siempre sabe que existe la funcionalidad
- Puede acceder aunque no haya solicitudes (para ver historial)

### 2. Mostrar Alertas Visuales (Opcional)

**Mejora sugerida:**
```javascript
// Mostrar alerta visual cuando llega nueva solicitud
const unsubscribeSolicitudReprogramacion = subscribeToEvent('solicitud_reprogramacion', (data) => {
  if (data.id_doctor === userData.id_doctor) {
    // Mostrar alerta visual
    Alert.alert(
      '📅 Nueva Solicitud de Reprogramación',
      `${data.paciente_nombre} solicitó reprogramar su cita`,
      [
        { text: 'Ver Más Tarde', style: 'cancel' },
        { 
          text: 'Ver Ahora', 
          onPress: () => navigation.navigate('GestionSolicitudesReprogramacion')
        }
      ]
    );
    loadSolicitudesPendientes();
  }
});
```

**Ventajas:**
- Notificación más visible
- Acceso directo desde la alerta

### 3. Verificar Respuesta del Backend

**Posible problema:** El servicio retorna `response.total`, pero el backend podría retornar `response.data.total`.

**Verificación necesaria:**
```javascript
// En getAllSolicitudesReprogramacion
return {
  success: true,
  data: response.data?.data?.solicitudes || response.data?.solicitudes || [],
  total: response.data?.data?.total || response.data?.total || 0  // ✅ Ya está así
};
```

**Estado:** ✅ Ya está correctamente implementado (línea 1129)

---

## ✅ Conclusión

### Estado Actual: ✅ **FUNCIONAL**

El doctor **SÍ puede ver las solicitudes desde el dashboard**:

1. ✅ **Contador visible:** Badge naranja con número
2. ✅ **Texto informativo:** Indica cuántas solicitudes hay
3. ✅ **Botón de acceso:** Navegación directa a gestión
4. ✅ **Actualización automática:** WebSocket en tiempo real
5. ✅ **Actualización manual:** Pull-to-refresh

### Comportamiento:

- **Sin solicitudes:** No se muestra nada (interfaz limpia)
- **Con solicitudes:** Se muestra badge, texto y botón dedicado

### Mejoras Opcionales:

1. Mostrar botón siempre (aunque esté deshabilitado)
2. Agregar alerta visual cuando llega nueva solicitud
3. Agregar sonido/haptic feedback (ya existe en otras partes)

---

## 🧪 Cómo Probar

1. **Crear solicitud desde paciente:**
   - Paciente solicita reprogramación
   - Verificar que aparece en dashboard del doctor

2. **Verificar actualización:**
   - Abrir dashboard del doctor
   - Crear nueva solicitud desde otro dispositivo
   - Verificar que el contador se actualiza automáticamente

3. **Verificar navegación:**
   - Presionar botón "Gestionar Solicitudes"
   - Verificar que navega correctamente

4. **Verificar refresh:**
   - Hacer pull-to-refresh en dashboard
   - Verificar que el contador se actualiza

---

**Última actualización:** 28/11/2025

