# 📐 Estructura del Diseño - Dashboard Doctor

## 🎯 Visión General

El Dashboard del Doctor es una pantalla de scroll vertical que muestra información consolidada y métricas clave para el trabajo diario del médico.

---

## 📱 Arquitectura de Componentes

### Contenedor Principal
```javascript
<SafeAreaView style={styles.container}>
  <ScrollView style={styles.scrollView}>
    {/* Contenido */}
  </ScrollView>
</SafeAreaView>
```

**Características:**
- `SafeAreaView`: Respeta áreas seguras del dispositivo
- `ScrollView`: Permite scroll vertical infinito
- `RefreshControl`: Pull-to-refresh para actualizar datos
- Fondo: `#F5F5F5` (gris claro)

---

## 🏗️ Estructura de Secciones (Orden de Arriba a Abajo)

### 1. **Header (Cabecera)**
**Ubicación:** Líneas ~481-490

```javascript
<View style={styles.header}>
  <Text style={styles.headerTitle}>Dashboard Doctor</Text>
  <Text style={styles.headerSubtitle}>Bienvenido Dr. {email}</Text>
  <Text style={styles.headerDate}>{fecha_completa}</Text>
</View>
```

**Diseño:**
- **Color de fondo:** `#4CAF50` (verde)
- **Bordes redondeados:** Inferiores (20px)
- **Padding:** 20px
- **Tipografía:**
  - Título: 24px, bold, blanco
  - Subtítulo: 16px, `#E8F5E9` (verde claro)
  - Fecha: 14px, `#C8E6C9` (verde muy claro)

---

### 2. **Métricas Principales (Resumen del Día)**
**Ubicación:** Líneas ~492-517

```javascript
<View style={styles.metricsContainer}>
  <Text style={styles.sectionTitle}>Resumen del Día</Text>
  <View style={styles.metricsGrid}>
    {/* Cards de métricas */}
  </View>
</View>
```

**Layout:**
- **Grid:** 2 columnas (`flexDirection: 'row'`, `justifyContent: 'space-between'`)
- **Ancho de cards:** `(width - 50) / 2` (mitad del ancho menos padding)
- **Cards mostradas:**
  1. **Citas Hoy** (verde `#4CAF50`)
  2. **Mis Pacientes** (azul `#2196F3`)
  3. **Próxima Cita** (morado `#9C27B0`) - Condicional

**Diseño de Card de Métrica:**
```javascript
<Card style={[styles.metricCard, { borderLeftColor: color }]}>
  <Card.Content>
    <Text style={styles.metricValue}>{valor}</Text>      // 28px, bold
    <Text style={styles.metricTitle}>{titulo}</Text>     // 14px, semibold
    <Text style={styles.metricSubtitle}>{subtitulo}</Text> // 12px, gris
  </Card.Content>
</Card>
```

**Características:**
- **Borde izquierdo:** 4px de ancho, color según tipo
- **Elevación:** 3 (sombra)
- **Padding interno:** 15px

---

### 3. **Gestión de Pacientes**
**Ubicación:** Líneas ~519-553

```javascript
<View style={styles.pacientesContainer}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>👥 Mis Pacientes</Text>
    <TouchableOpacity style={styles.refreshButton}>🔄</TouchableOpacity>
  </View>
  {/* Lista de pacientes */}
</View>
```

**Layout:**
- **Header de sección:** Flex row, espacio entre título y botón refresh
- **Lista:** Máximo 5 pacientes (`slice(0, 5)`)
- **Estados:**
  - Loading: Spinner + texto
  - Error: Mensaje + botón reintentar
  - Vacío: Mensaje "No tienes pacientes asignados"
  - Con datos: Cards de pacientes

**Card de Paciente:**
```javascript
<Card style={styles.pacienteCard}>
  <Card.Content>
    <View style={styles.pacienteHeader}>
      <View style={styles.pacienteInfo}>
        <Text style={styles.pacienteNombre}>{nombre_completo}</Text>
        <Text style={styles.pacienteTelefono}>{telefono}</Text>
        <Text style={styles.pacienteEdad}>Edad: {edad} años</Text>
      </View>
      <View style={[styles.estadoBadge, { backgroundColor }]}>
        <Text style={styles.estadoText}>Activo/Inactivo</Text>
      </View>
    </View>
  </Card.Content>
</Card>
```

**Características:**
- **Elevación:** 2
- **Border radius:** 8px
- **Padding:** 16px
- **Badge de estado:** Verde (`#4CAF50`) o Rojo (`#F44336`)

---

### 4. **Gráfico de Citas de la Semana**
**Ubicación:** Líneas ~555-560

```javascript
{chartData && chartData.length > 0 && (
  <View style={styles.chartsContainer}>
    {renderChartCard('Citas Últimos 7 Días', chartData)}
  </View>
)}
```

**Diseño:**
- **Condicional:** Solo se muestra si hay datos
- **Tipo:** Gráfico de barras verticales
- **Altura:** 120px
- **Colores:** Verde `#4CAF50` para las barras

**Estructura del Gráfico:**
```javascript
<Card style={styles.chartCard}>
  <Card.Content>
    <Title style={styles.chartTitle}>{titulo}</Title>
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((item, index) => (
          <View style={styles.barContainer}>
            <Text style={styles.barValue}>{valor}</Text>
            <View style={[styles.bar, { height: barHeight }]} />
            <Text style={styles.barLabel}>{dia}</Text>
          </View>
        ))}
      </View>
    </View>
  </Card.Content>
</Card>
```

---

### 5. **Citas de Hoy**
**Ubicación:** Líneas ~562-581

```javascript
<View style={styles.citasContainer}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>📅 Citas de Hoy</Text>
    <TouchableOpacity onPress={handleViewAllAppointments}>
      <Text style={styles.verTodasText}>Ver todas →</Text>
    </TouchableOpacity>
  </View>
  {/* Lista de citas */}
</View>
```

**Layout:**
- **Header:** Título + enlace "Ver todas"
- **Lista:** Máximo 5 citas (`slice(0, 5)`)
- **Estado vacío:** Card con mensaje

**Card de Cita:**
```javascript
<Card style={styles.citaCard}>
  <Card.Content>
    <View style={styles.citaHeader}>
      <View>
        <Text style={styles.citaFecha}>{fecha}</Text>
        <Text style={styles.citaHora}>{hora}</Text>
      </View>
      <View style={[styles.estadoBadge, { backgroundColor: estadoColor }]}>
        <Text style={styles.estadoText}>{estado}</Text>
      </View>
    </View>
    <Text style={styles.pacienteNombre}>{paciente}</Text>
    <Text style={styles.citaMotivo}>{motivo}</Text>
  </Card.Content>
</Card>
```

**Colores de Estado:**
- **Atendida/Completada:** Verde `#4CAF50`
- **Pendiente:** Naranja `#FF9800`
- **Cancelada:** Gris `#9E9E9E`
- **Otros:** Rojo `#F44336`

---

### 6. **Próximas Citas (Más allá de hoy)**
**Ubicación:** Líneas ~583-604

```javascript
{proximasCitas && proximasCitas.length > 0 && (
  <View style={styles.proximasCitasContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>📅 Próximas Citas</Text>
      <TouchableOpacity onPress={handleViewAllAppointments}>
        <Text style={styles.verTodasText}>Ver todas →</Text>
      </TouchableOpacity>
    </View>
    {/* Lista filtrada de citas futuras */}
  </View>
)}
```

**Características:**
- **Condicional:** Solo se muestra si hay citas futuras
- **Filtro:** Solo citas con fecha > hoy (23:59:59)
- **Límite:** Máximo 5 citas
- **Mismo diseño:** Igual que "Citas de Hoy"

---

### 7. **Alertas de Signos Vitales Críticos**
**Ubicación:** Líneas ~606-617

```javascript
{alertasSignosVitales && alertasSignosVitales.length > 0 && (
  <View style={styles.alertasContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>⚠️ Alertas de Signos Vitales</Text>
      <Chip style={styles.alertChip}>
        {alertasSignosVitales.length}
      </Chip>
    </View>
    {/* Lista de alertas */}
  </View>
)}
```

**Card de Alerta:**
```javascript
<Card style={[styles.alertaCard, { borderLeftColor: priorityColor }]}>
  <Card.Content>
    <View style={styles.alertaHeader}>
      <Text style={styles.alertaIcono}>⚠️</Text>
      <View style={styles.alertaInfo}>
        <Text style={styles.alertaPaciente}>{paciente}</Text>
        <Text style={styles.alertaTipo}>{tipo_alerta}</Text>
        <Text style={styles.alertaDetalle}>
          Glucosa: {glucosa} mg/dL
          Presión: {sistolica}/{diastolica} mmHg
        </Text>
      </View>
      <Text style={styles.alertaTiempo}>{fecha_medicion}</Text>
    </View>
  </Card.Content>
</Card>
```

**Colores de Prioridad:**
- **Crítico** (glucosa > 200 o presión > 160): Rojo `#F44336`
- **Alto:** Naranja `#FF9800`
- **Borde izquierdo:** 4px, color según prioridad

---

### 8. **Notificaciones Recientes**
**Ubicación:** Líneas ~619-673

```javascript
<View style={styles.notificacionesContainer}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>
      🔔 Notificaciones
      {contadorNoLeidas > 0 && (
        <Chip style={styles.badgeChip}>{contadorNoLeidas} no leídas</Chip>
      )}
    </Text>
    <TouchableOpacity onPress={() => navigation.navigate('HistorialNotificaciones')}>
      <Text style={styles.verTodasText}>Ver todas →</Text>
    </TouchableOpacity>
  </View>
  {/* Lista de notificaciones */}
</View>
```

**Card de Notificación:**
```javascript
<Card style={styles.notificacionCard}>
  <Card.Content>
    <View style={styles.notificacionHeader}>
      <Text style={styles.notificacionIcon}>
        {icono_segun_tipo} // 📋, 💬, ⚠️, 🔔
      </Text>
      <View style={styles.notificacionContent}>
        <Text style={styles.notificacionTitulo}>{titulo}</Text>
        <Text style={styles.notificacionMensaje}>{mensaje}</Text>
      </View>
      {estado === 'enviada' && (
        <View style={styles.unreadDot} /> // Punto rojo
      )}
    </View>
  </Card.Content>
</Card>
```

**Características:**
- **Límite:** Máximo 3 notificaciones (`slice(0, 3)`)
- **Iconos según tipo:**
  - `cita_actualizada` / `cita_reprogramada`: 📋
  - `nuevo_mensaje`: 💬
  - `alerta_signos_vitales`: ⚠️
  - Otros: 🔔
- **Indicador no leída:** Punto rojo (`#F44336`, 8x8px)

---

### 9. **Accesos Rápidos**
**Ubicación:** Líneas ~675-740

```javascript
<View style={styles.quickAccessContainer}>
  <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
  <View style={styles.quickAccessGrid}>
    {/* Botones de acceso rápido */}
  </View>
</View>
```

**Layout:**
- **Grid:** 2 columnas (`flexDirection: 'row'`, `flexWrap: 'wrap'`)
- **Ancho de botones:** `(width - 50) / 2`
- **Altura:** 80px
- **Espaciado:** 15px entre botones

**Botones Disponibles:**
1. **Ver Todas las Citas** 📅
   - Badge con contador de solicitudes pendientes (si > 0)
   - Color: Verde `#4CAF50`

2. **Gestionar Solicitudes** 📋 (Condicional - solo si hay solicitudes pendientes)
   - Badge con contador
   - Color: Verde `#4CAF50`

3. **Mis Pacientes** 👥
   - Color: Verde `#4CAF50`

4. **Reportes** 📊
   - Color: Verde `#4CAF50`

5. **Historial Médico** 📋
   - Color: Verde `#4CAF50`

**Diseño de Botón:**
```javascript
<TouchableOpacity style={[styles.quickAccessButton, styles.primaryButton]}>
  <View style={styles.quickAccessIconContainer}>
    <Text style={styles.quickAccessIcon}>{emoji}</Text>
    {badge && (
      <View style={styles.badgeSolicitudes}>
        <Text style={styles.badgeSolicitudesText}>{contador}</Text>
      </View>
    )}
  </View>
  <Text style={styles.quickAccessText}>{titulo}</Text>
  {subtitulo && (
    <Text style={styles.quickAccessSubtext}>{subtitulo}</Text>
  )}
</TouchableOpacity>
```

**Badge de Solicitudes:**
- **Posición:** Absoluta, top-right del icono
- **Color:** Naranja `#FF9800`
- **Borde:** Blanco, 2px
- **Tamaño:** Mínimo 20px de ancho, 20px de alto

---

## 🎨 Sistema de Colores

### Colores Principales
- **Verde Principal:** `#4CAF50` (Header, botones, métricas)
- **Azul:** `#2196F3` (Métricas, enlaces)
- **Morado:** `#9C27B0` (Próxima cita)
- **Naranja:** `#FF9800` (Estados pendientes, badges)
- **Rojo:** `#F44336` (Alertas críticas, errores)
- **Gris:** `#9E9E9E` (Estados cancelados)
- **Fondo:** `#F5F5F5` (Gris claro)

### Colores de Estado
- **Activo/Completada:** `#4CAF50` (Verde)
- **Pendiente:** `#FF9800` (Naranja)
- **Cancelada:** `#9E9E9E` (Gris)
- **Inactivo/Error:** `#F44336` (Rojo)

---

## 📐 Espaciado y Dimensiones

### Padding General
- **Contenedores:** 20px
- **Cards:** 15-16px interno
- **Header:** 20px

### Espaciado entre Elementos
- **Cards:** 10-15px de margen inferior
- **Secciones:** Padding top 0 (excepto primera)
- **Grid items:** `(width - 50) / 2` (mitad menos padding)

### Tipografía
- **Títulos de sección:** 18px, bold
- **Títulos de cards:** 16px, semibold
- **Valores de métricas:** 28px, bold
- **Texto normal:** 14px
- **Texto secundario:** 12px
- **Texto pequeño:** 10-11px

---

## 🔄 Funcionalidades Interactivas

### Pull-to-Refresh
- **Ubicación:** ScrollView completo
- **Color:** `#1976D2` (azul)
- **Acción:** Refresca todos los datos (dashboard, pacientes, notificaciones, solicitudes)

### Navegación
- **Pacientes:** → `DetallePaciente`
- **Citas:** → `VerTodasCitas`
- **Solicitudes:** → `GestionSolicitudesReprogramacion`
- **Pacientes (lista):** → `ListaPacientesDoctor`
- **Reportes:** → `ReportesDoctor`
- **Historial:** → `HistorialMedicoDoctor`
- **Notificaciones:** → `HistorialNotificaciones`

### WebSocket (Actualizaciones en Tiempo Real)
- **Eventos suscritos:**
  - `cita_creada`
  - `cita_actualizada`
  - `solicitud_reprogramacion`
  - `signos_vitales_registrados`
  - `alerta_signos_vitales_critica`
  - `alerta_signos_vitales_moderada`
  - `notificacion_doctor`
  - `patient_assigned`
  - `patient_unassigned`

---

## 📊 Estructura de Datos

### Hooks Utilizados
1. **`useDoctorDashboard()`**
   - Métricas, citas de hoy, próximas citas, gráficos, alertas

2. **`usePacientes('activos', 'recent')`**
   - Lista de pacientes asignados al doctor

3. **`useNotificacionesDoctor(id_doctor, { limit: 5 })`**
   - Notificaciones recientes y contador de no leídas

4. **`useWebSocket()`**
   - Suscripciones a eventos en tiempo real

### Estados Locales
- `solicitudesPendientes`: Contador de solicitudes
- `loadingSolicitudes`: Estado de carga
- `refreshing`: Estado de pull-to-refresh

---

## 🎯 Características de Diseño

### Responsive
- **Ancho dinámico:** Usa `Dimensions.get('window').width`
- **Grid adaptativo:** 2 columnas que se ajustan al ancho
- **SafeAreaView:** Respeta áreas seguras (notch, etc.)

### Accesibilidad
- **TouchableOpacity:** Feedback táctil (`activeOpacity: 0.7`)
- **Text legible:** Tamaños mínimos de 12px
- **Contraste:** Colores con buen contraste (WCAG)

### Performance
- **Memoización:** `useMemo` para cálculos
- **Lazy loading:** Datos cargados bajo demanda
- **Cache:** Hooks con sistema de caché
- **Límites:** Máximo 5 items por lista (excepto notificaciones: 3)

---

## 📝 Resumen de Estilos Clave

```javascript
// Contenedores principales
container: { flex: 1, backgroundColor: '#F5F5F5' }
header: { padding: 20, backgroundColor: '#4CAF50', borderBottomLeftRadius: 20 }

// Grids
metricsGrid: { flexDirection: 'row', justifyContent: 'space-between' }
quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }

// Cards
metricCard: { width: (width - 50) / 2, elevation: 3, borderLeftWidth: 4 }
citaCard: { marginBottom: 10, elevation: 2 }
pacienteCard: { marginBottom: 12, elevation: 2, borderRadius: 8 }

// Badges
estadoBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }
badgeSolicitudes: { position: 'absolute', backgroundColor: '#FF9800', borderRadius: 10 }

// Tipografía
sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' }
metricValue: { fontSize: 28, fontWeight: 'bold', color: '#333' }
```

---

**Fecha de análisis:** 2025-11-16  
**Autor:** Senior Developer

