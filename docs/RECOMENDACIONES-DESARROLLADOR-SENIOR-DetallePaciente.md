# 🎯 RECOMENDACIONES SENIOR - Detalle del Paciente

**Análisis:** DetallePaciente.js (~3850 líneas, 30+ estados, 15+ modales)  
**Fecha:** 28/10/2025  
**Enfoque:** Frontend & Backend, UX/UI, Arquitectura, Rendimiento

---

## 📊 ANÁLISIS INICIAL

### **Problemas Identificados:**
1. ❌ Componente monolítico de 3850+ líneas
2. ❌ 30+ estados locales con useState
3. ❌ 15+ modales gestionados manualmente
4. ❌ Lógica de negocio mezclada con UI
5. ❌ Falta de búsqueda y filtros avanzados
6. ❌ No hay exportación de datos
7. ❌ Ausencia de timeline/historial cronológico
8. ❌ Sin comparación de datos temporales
9. ❌ No hay alertas o notificaciones visuales
10. ❌ Falta optimización de imágenes

---

## 🎯 RECOMENDACIONES ESTRUCTURALES

### **1. Aplicar Principio de Responsabilidad Única (SRP)**

#### **Problema Actual:**
```javascript
// 3850+ líneas en un solo archivo
// Mezcla: UI + Lógica + Validación + Estados + APIs
```

#### **Solución Propuesta:**

**A) Separar en Componentes por Sección:**
```
src/components/DetallePaciente/
├── sections/
│   ├── CitasSection.js         // Gestiona citas + modal
│   ├── SignosVitalesSection.js // Gestiona signos vitales + modal
│   ├── DiagnosticosSection.js  // Gestiona diagnósticos + modal
│   ├── MedicamentosSection.js  // Gestiona medicamentos + modal
│   ├── RedApoyoSection.js      // Gestiona red de apoyo + modal
│   └── VacunacionSection.js    // Gestiona vacunación + modal
├── modals/
│   ├── ModalBase.js            // Modal reutilizable (ya existe)
│   ├── AgregarCitaModal.js
│   ├── AgregarSignosVitalesModal.js
│   ├── AgregarDiagnosticoModal.js
│   └── AgregarMedicamentoModal.js
└── utils/
    ├── formHandlers.js         // Handlers de formularios
    ├── validators.js           // Validaciones específicas
    └── dataFormatters.js       // Formateo de datos
```

**Beneficios:**
- ✅ Código más mantenible
- ✅ Testeable por componente
- ✅ Reutilizable en otras pantallas
- ✅ Mejor performance con React.memo

---

### **2. Implementar Manejo de Estado Global con Context API**

#### **Problema Actual:**
```javascript
const [showOptionsCitas, setShowOptionsCitas] = useState(false);
const [showOptionsSignosVitales, setShowOptionsSignosVitales] = useState(false);
const [showOptionsDiagnosticos, setShowOptionsDiagnosticos] = useState(false);
const [showOptionsMedicamentos, setShowOptionsMedicamentos] = useState(false);
// ... 30+ estados más
```

#### **Solución Propuesta:**

```javascript
// src/context/DetallePacienteContext.js
export const DetallePacienteProvider = ({ children, pacienteId }) => {
  const [modals, setModals] = useState({
    citas: { show: false, mode: 'list' }, // 'list' | 'add' | 'edit'
    signosVitales: { show: false, mode: 'list' },
    diagnosticos: { show: false, mode: 'list' },
    medicamentos: { show: false, mode: 'list' },
    // ...
  });
  
  const [data, setData] = useState({
    citas: [],
    signosVitales: [],
    diagnosticos: [],
    medicamentos: [],
    // ...
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Funciones centralizadas
  const openModal = (type, mode = 'list') => {
    setModals(prev => ({ ...prev, [type]: { show: true, mode } }));
  };
  
  const closeModal = (type) => {
    setModals(prev => ({ ...prev, [type]: { show: false, mode: 'list' } }));
  };
  
  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [citas, signos, diag, med] = await Promise.all([
        fetchCitas(pacienteId),
        fetchSignosVitales(pacienteId),
        fetchDiagnosticos(pacienteId),
        fetchMedicamentos(pacienteId)
      ]);
      
      setData({ citas, signosVitales: signos, diagnosticos: diag, medicamentos: med });
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);
  
  return (
    <DetallePacienteContext.Provider value={{
      modals,
      data,
      loading,
      errors,
      openModal,
      closeModal,
      refreshAll,
      setData
    }}>
      {children}
    </DetallePacienteContext.Provider>
  );
};
```

**Beneficios:**
- ✅ Un solo lugar para manejar estado
- ✅ Menos re-renders innecesarios
- ✅ Lógica reutilizable
- ✅ Debugging más fácil

---

### **3. Implementar Modal Manager Pattern**

#### **Problema Actual:**
```javascript
// 15+ useState para modales
const [showAddCita, setShowAddCita] = useState(false);
const [showAddSignosVitales, setShowAddSignosVitales] = useState(false);
// ...
const [showOptionsCitas, setShowOptionsCitas] = useState(false);
// ... 15+ más
```

#### **Solución Propuesta:**

```javascript
// src/hooks/useModalManager.js
export const useModalManager = () => {
  const [modals, setModals] = useState({});
  
  const register = (name, initialState = false) => {
    if (!modals.hasOwnProperty(name)) {
      setModals(prev => ({ ...prev, [name]: initialState }));
    }
  };
  
  const open = useCallback((name, data = null) => {
    setModals(prev => ({
      ...prev,
      [name]: { show: true, data }
    }));
  }, []);
  
  const close = useCallback((name) => {
    setModals(prev => ({
      ...prev,
      [name]: { show: false, data: null }
    }));
  }, []);
  
  const toggle = useCallback((name) => {
    setModals(prev => ({
      ...prev,
      [name]: { ...prev[name], show: !prev[name]?.show }
    }));
  }, []);
  
  const isOpen = useCallback((name) => {
    return modals[name]?.show || false;
  }, [modals]);
  
  const getModalData = useCallback((name) => {
    return modals[name]?.data || null;
  }, [modals]);
  
  return { modals, open, close, toggle, isOpen, getModalData, register };
};

// Uso:
const { open, close, isOpen, register } = useModalManager();

// Registrar todos los modales
useEffect(() => {
  register('addCita');
  register('optionsCitas');
  register('addSignosVitales');
  // ... todos los modales
}, []);

// Usar:
<TouchableOpacity onPress={() => open('addCita')}>
  Agregar Cita
</TouchableOpacity>

<Modal visible={isOpen('addCita')}>
  {/* Modal content */}
</Modal>
```

**Beneficios:**
- ✅ Gestión centralizada de modales
- ✅ Menos código boilerplate
- ✅ Type-safe con TypeScript
- ✅ Fácil añadir nuevos modales

---

## 🎨 MEJORAS DE UX/UI

### **4. Implementar Navegación por Tabs/Pestañas**

#### **Problema Actual:**
```
ScrollView infinito con todas las secciones
User tiene que hacer scroll para llegar a "Red de Apoyo" (abajo)
```

#### **Solución Propuesta:**

```javascript
// Usar TabView de React Native
import { TabView, SceneMap } from 'react-native-tab-view';

const routes = [
  { key: 'overview', title: '📊 Resumen' },
  { key: 'citas', title: '📅 Citas' },
  { key: 'vitales', title: '🩺 Signos Vitales' },
  { key: 'diagnosticos', title: '🩹 Diagnósticos' },
  { key: 'medicamentos', title: '💊 Medicamentos' },
  { key: 'historial', title: '📋 Historial' },
];

const renderScene = SceneMap({
  overview: () => <OverviewTab paciente={paciente} />,
  citas: () => <CitasTab citas={citas} />,
  vitales: () => <SignosVitalesTab signos={signosVitales} />,
  diagnosticos: () => <DiagnosticosTab diagnosticos={diagnosticos} />,
  medicamentos: () => <MedicamentosTab medicamentos={medicamentos} />,
  historial: () => <HistorialTab allData={medicalData} />,
});

return (
  <TabView
    navigationState={{ index, routes }}
    renderScene={renderScene}
    onIndexChange={setIndex}
    initialLayout={{ width }}
  />
);
```

**Beneficios:**
- ✅ Navegación rápida entre secciones
- ✅ Menos scroll
- ✅ Mejor organización visual
- ✅ Mejor UX en tablets

---

### **5. Agregar Búsqueda y Filtros Avanzados**

#### **Problema Actual:**
```
No hay búsqueda en citas/diagnósticos
No hay filtros por fecha/rango
No hay ordenamiento
```

#### **Solución Propuesta:**

```javascript
// src/components/FilterBar.js
export const FilterBar = ({ onFilter, filters }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [sortBy, setSortBy] = useState('recent');
  
  const handleSearch = (text) => {
    setSearchTerm(text);
    onFilter({ search: text, dateRange, sortBy });
  };
  
  return (
    <View style={styles.filterBar}>
      <TextInput
        placeholder="🔍 Buscar..."
        value={searchTerm}
        onChangeText={handleSearch}
      />
      <DateRangePicker
        onSelect={setDateRange}
      />
      <SortSelector
        value={sortBy}
        options={['recent', 'oldest', 'name']}
        onChange={setSortBy}
      />
    </View>
  );
};

// Uso en cada sección:
const [filteredCitas, setFilteredCitas] = useState(citas);

useEffect(() => {
  let filtered = [...citas];
  
  if (filters.search) {
    filtered = filtered.filter(c =>
      c.motivo?.toLowerCase().includes(filters.search.toLowerCase())
    );
  }
  
  if (filters.dateRange.from) {
    filtered = filtered.filter(c =>
      new Date(c.fecha_cita) >= filters.dateRange.from
    );
  }
  
  if (filters.sortBy === 'recent') {
    filtered.sort((a, b) => new Date(b.fecha_cita) - new Date(a.fecha_cita));
  }
  
  setFilteredCitas(filtered);
}, [citas, filters]);
```

---

### **6. Implementar Timeline/Historial Cronológico**

#### **Problema Actual:**
```
No hay vista unificada de TODO el historial del paciente
Difícil ver evolución temporal
```

#### **Solución Propuesta:**

```javascript
// src/components/Timeline.js
export const PatientTimeline = ({ allEvents }) => {
  const groupedEvents = useMemo(() => {
    // Agrupar por fecha y ordenar
    const grouped = allEvents.reduce((acc, event) => {
      const date = new Date(event.fecha_registro || event.fecha_cita).toDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(event);
      return acc;
    }, {});
    
    // Ordenar por fecha (más reciente primero)
    return Object.entries(grouped)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]));
  }, [allEvents]);
  
  return (
    <ScrollView>
      {groupedEvents.map(([date, events]) => (
        <View key={date} style={styles.timelineGroup}>
          <Text style={styles.timelineDate}>{date}</Text>
          {events.map(event => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

// Combinar todos los eventos:
const allEvents = useMemo(() => {
  return [
    ...citas.map(c => ({ ...c, type: 'cita', fecha: c.fecha_cita })),
    ...signosVitales.map(s => ({ ...s, type: 'signos_vitales', fecha: s.fecha_medicion })),
    ...diagnosticos.map(d => ({ ...d, type: 'diagnostico', fecha: d.fecha_registro })),
    ...medicamentos.map(m => ({ ...m, type: 'medicamento', fecha: m.fecha_inicio }))
  ];
}, [citas, signosVitales, diagnosticos, medicamentos]);
```

---

### **7. Agregar Comparación de Datos Temporales (Gráficas)**

#### **Problema Actual:**
```
No hay visualización de tendencias
No se ve evolución de peso/glucosa/presión
```

#### **Solución Propuesta:**

```javascript
// Instalar: react-native-chart-kit o victory-native
import { LineChart } from 'react-native-chart-kit';

export const EvolucionSignosVitales = ({ signosVitales }) => {
  const data = useMemo(() => {
    const chartData = {
      labels: signosVitales.map(s => new Date(s.fecha_medicion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })),
      datasets: [
        {
          data: signosVitales.map(s => parseFloat(s.peso_kg) || 0),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: signosVitales.map(s => parseFloat(s.glucosa_mg_dl) || 0),
          color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
    return chartData;
  }, [signosVitales]);
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>📈 Evolución de Signos Vitales</Text>
      <LineChart
        data={data}
        width={Dimensions.get('window').width - 32}
        height={220}
        chartConfig={chartConfig}
        bezier // Curva suave
        style={styles.chart}
      />
      <View style={styles.legend}>
        <LegendItem color="#2196F3" label="Peso (kg)" />
        <LegendItem color="#FF9800" label="Glucosa (mg/dl)" />
      </View>
    </View>
  );
};
```

---

## 🚀 MEJORAS DE PERFORMANCE

### **8. Implementar Virtualized Lists**

#### **Problema Actual:**
```javascript
// Renderiza TODO el historial en un ScrollView
<ScrollView>
  {allCitas.map(cita => <CitaItem key={cita.id} cita={cita} />)}
</ScrollView>
```

#### **Solución Propuesta:**

```javascript
import { FlatList } from 'react-native';

// Para listas grandes, usar FlatList
<FlatList
  data={allCitas}
  renderItem={({ item }) => <CitaItem cita={item} />}
  keyExtractor={(item) => item.id_cita.toString()}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={10}
  removeClippedSubviews
  onEndReached={() => loadMoreCitas()} // Paginación
  onEndReachedThreshold={0.5}
  ListEmptyComponent={<EmptyState />}
  ListFooterComponent={<LoadingIndicator />}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={refreshCitas} />
  }
/>
```

---

### **9. Implementar Lazy Loading de Imágenes**

```javascript
import FastImage from 'react-native-fast-image';

// En lugar de Image, usar FastImage
<FastImage
  source={{ uri: imageUrl }}
  style={styles.image}
  resizeMode={FastImage.resizeMode.cover}
  priority={FastImage.priority.high}
/>
```

---

### **10. Implementar Optimistic Updates**

```javascript
const handleSaveCita = async () => {
  // 1. Actualizar UI inmediatamente (optimistic)
  const newCita = { ...formDataCita, id: Date.now() };
  setCitas(prev => [newCita, ...prev]);
  
  try {
    // 2. Hacer request real
    await gestionService.createCita(pacienteId, formDataCita);
  } catch (error) {
    // 3. Revertir si falla
    setCitas(prev => prev.filter(c => c.id !== newCita.id));
    Alert.alert('Error', 'No se pudo guardar la cita');
  }
};
```

---

## 📱 MEJORAS DE ACCESIBILIDAD

### **11. Agregar Soporte para Screen Readers**

```javascript
import { AccessibilityInfo } from 'react-native';

// Para cada elemento interactivo:
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Agregar nueva cita"
  accessibilityHint="Abre el formulario para agregar una nueva cita al paciente"
  accessibilityRole="button"
  onPress={handleAddCita}
>
  <Text>➕ Agregar Cita</Text>
</TouchableOpacity>
```

---

### **12. Agregar Indicadores Visuales de Estado**

```javascript
// Badge de estado en cada card
<Card style={styles.card}>
  <View style={styles.cardHeader}>
    <Title>🩺 Signos Vitales</Title>
    <StatusBadge 
      status={lastSignosVitales?.status} // 'normal', 'warning', 'critical'
      lastUpdate={lastSignosVitales?.fecha_registro}
    />
  </View>
</Card>

// Toast notifications para acciones
import Toast from 'react-native-toast-message';

const handleSaveDiagnostico = async () => {
  try {
    await saveDiagnostico();
    Toast.show({
      type: 'success',
      text1: 'Diagnóstico guardado',
      text2: 'El diagnóstico ha sido registrado exitosamente',
      position: 'bottom'
    });
  } catch (error) {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'No se pudo guardar el diagnóstico',
      position: 'bottom'
    });
  }
};
```

---

## 🔒 MEJORAS DE SEGURIDAD

### **13. Implementar Permisos por Rol**

```javascript
// src/hooks/usePermissions.js
export const usePermissions = () => {
  const { userRole } = useAuth();
  
  const canEdit = useCallback(() => {
    return userRole === 'Admin';
  }, [userRole]);
  
  const canDelete = useCallback(() => {
    return userRole === 'Admin';
  }, [userRole]);
  
  const canViewSensitiveData = useCallback(() => {
    return userRole === 'Admin' || userRole === 'Doctor';
  }, [userRole]);
  
  return { canEdit, canDelete, canViewSensitiveData };
};

// Uso:
const { canEdit, canDelete } = usePermissions();

{canEdit() && (
  <Button onPress={handleEdit}>Editar</Button>
)}

{canDelete() && (
  <Button onPress={handleDelete}>Eliminar</Button>
)}
```

---

## 📊 SISTEMA DE ALERTAS

### **14. Implementar Sistema de Alertas Inteligentes**

```javascript
// src/services/alertSystem.js
export const usePatientAlerts = (paciente, signosVitales) => {
  const alerts = useMemo(() => {
    const activeAlerts = [];
    
    // Verificar signos vitales fuera de rango
    signosVitales.forEach(signo => {
      if (signo.presion_sistolica > 140) {
        activeAlerts.push({
          type: 'critical',
          message: 'Presión arterial alta',
          severity: 'high',
          action: 'Revisar inmediatamente'
        });
      }
      
      if (signo.glucosa_mg_dl > 180) {
        activeAlerts.push({
          type: 'warning',
          message: 'Glucosa elevada',
          severity: 'medium',
          action: 'Verificar tratamiento'
        });
      }
    });
    
    // Verificar citas próximas
    const citasProximas = citas.filter(c => {
      const dias = daysUntil(new Date(c.fecha_cita));
      return dias <= 3 && dias >= 0;
    });
    
    citasProximas.forEach(cita => {
      activeAlerts.push({
        type: 'info',
        message: `Cita próxima en ${daysUntil(new Date(cita.fecha_cita))} días`,
        severity: 'low'
      });
    });
    
    return activeAlerts;
  }, [signosVitales, citas]);
  
  return alerts;
};

// Mostrar alertas en la UI
const alerts = usePatientAlerts(paciente, signosVitales);

{alerts.length > 0 && (
  <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />
)}
```

---

## 💾 EXPORTACIÓN DE DATOS

### **15. Agregar Exportación a PDF/Excel**

```javascript
// Instalar: react-native-fs, jspdf
import RNFS from 'react-native-fs';
import jsPDF from 'jspdf';

export const exportPatientReport = async (paciente, allData) => {
  const doc = new jsPDF();
  
  // Encabezado
  doc.setFontSize(18);
  doc.text(`Reporte de Paciente: ${paciente.nombre}`, 20, 20);
  
  // Datos generales
  doc.setFontSize(12);
  doc.text(`CURP: ${paciente.curp}`, 20, 30);
  doc.text(`Edad: ${paciente.edad} años`, 20, 40);
  
  // Signos vitales
  doc.text('Signos Vitales:', 20, 60);
  signosVitales.forEach((signo, index) => {
    doc.text(`${signo.fecha_medicion}: ${signo.peso_kg} kg`, 30, 70 + index * 10);
  });
  
  // Guardar PDF
  const pdfPath = `${RNFS.DocumentDirectoryPath}/reporte_${paciente.id_paciente}.pdf`;
  const pdfString = doc.output('arraybuffer');
  await RNFS.writeFile(pdfPath, Buffer.from(pdfString), 'base64');
  
  // Compartir
  Share.open({
    url: `file://${pdfPath}`,
    type: 'application/pdf'
  });
};
```

---

## 🔄 MEJORAS BACKEND

### **16. Implementar GraphQL para Queries Flexibles**

```javascript
// En lugar de múltiples endpoints REST:
// GET /api/pacientes/:id/citas
// GET /api/pacientes/:id/signos-vitales
// GET /api/pacientes/:id/diagnosticos
// GET /api/pacientes/:id/medicamentos

// Usar GraphQL:
query {
  paciente(id: 123) {
    nombre
    edad
    comorbilidades
    citas(limit: 10) { fecha_cita, motivo }
    signosVitales(limit: 5) { peso_kg, fecha_medicion }
    diagnosticos { descripcion, fecha_registro }
    medicamentos { nombre, dosis }
  }
}
```

**Beneficios:**
- ✅ Una sola query para todos los datos
- ✅ Solo traer campos necesarios
- ✅ Mejor performance
- ✅ Type-safe con TypeScript

---

### **17. Implementar Caching con Redis**

```javascript
// api-clinica/services/cacheService.js
export const getPacienteDetailsCached = async (pacienteId) => {
  const cacheKey = `paciente:${pacienteId}:details`;
  
  // Intentar obtener de cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Si no hay cache, buscar en BD
  const paciente = await Paciente.findById(pacienteId, {
    include: [
      { model: Doctor },
      { model: Comorbilidad },
      { model: Cita },
      { model: SignoVital },
      { model: Diagnostico },
      { model: Medicamento }
    ]
  });
  
  // Guardar en cache por 5 minutos
  await redis.setex(cacheKey, 300, JSON.stringify(paciente));
  
  return paciente;
};
```

---

### **18. Implementar Paginación con Cursor**

```javascript
// En lugar de limit/offset, usar cursor-based pagination
export const getCitas = async (req, res) => {
  const { cursor, limit = 10 } = req.query;
  const pacienteId = req.params.id;
  
  const whereClause = {
    id_paciente: pacienteId
  };
  
  if (cursor) {
    whereClause.id_cita = { [Op.lt]: cursor }; // Cursor
  }
  
  const citas = await Cita.findAll({
    where: whereClause,
    limit,
    order: [['id_cita', 'DESC']],
    include: [{ model: Doctor }]
  });
  
  const nextCursor = citas.length > 0 ? citas[citas.length - 1].id_cita : null;
  
  res.json({
    data: citas,
    nextCursor,
    hasMore: citas.length === limit
  });
};
```

---

## 🎯 RESUMEN DE PRIORIDADES

### **Alta Prioridad (Implementar Primero):**

1. ✅ **Separar en componentes** (Reduce complejidad 80%)
2. ✅ **Modal Manager Pattern** (Reduce código 50%)
3. ✅ **Timeline/Historial unificado** (Mejora UX significativamente)
4. ✅ **Sistema de alertas** (Critial para healthcare)
5. ✅ **Exportación de datos** (Regulatorio en healthcare)

### **Media Prioridad:**

6. ⚠️ **Búsqueda y filtros** (Mejora UX)
7. ⚠️ **Paginación con cursor** (Mejora performance)
8. ⚠️ **Optimistic updates** (Mejora percepción de velocidad)

### **Baja Prioridad (Nice to Have):**

9. ⭕ **Gráficas de evolución** (Visualización de tendencias)
10. ⭕ **Navegación por tabs** (Organización alternativa)
11. ⭕ **GraphQL** (Queries flexibles)
12. ⭕ **Redis caching** (Performance a escala)

---

## 📝 PLAN DE IMPLEMENTACIÓN

### **Fase 1: Refactorización (1-2 semanas)**
- Separar componente en secciones
- Implementar Modal Manager
- Implementar Context API para estado

### **Fase 2: Features Core (1-2 semanas)**
- Timeline/Historial unificado
- Sistema de alertas
- Búsqueda y filtros

### **Fase 3: Optimización (1 semana)**
- Virtualized Lists
- Paginación con cursor
- Optimistic updates

### **Fase 4: Advanced (2-3 semanas)**
- Gráficas de evolución
- Exportación PDF/Excel
- Accesibilidad completa

---

**Estimación Total:** 5-8 semanas  
**ROI:** Alto - Mejora mantenibilidad, UX, y performance  
**Prioridad:** 🔥 Alta - Refactorizar este componente es crítico

---

**Autor:** Senior Full-Stack Developer  
**Fecha:** 28/10/2025  
**Experiencia:** 10+ años en React/Node.js, Healthcare Apps












