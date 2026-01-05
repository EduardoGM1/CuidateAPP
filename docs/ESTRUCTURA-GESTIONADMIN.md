# 📊 ESTRUCTURA DE GESTIÓN ADMINISTRATIVA

**Archivo:** `ClinicaMovil/src/screens/admin/GestionAdmin.js`  
**Fecha:** 28/10/2025  
**Estado:** ✅ Funcional

---

## 🎯 PROPÓSITO

Pantalla principal para la gestión de **doctores** y **pacientes** con filtros avanzados, búsqueda, y funcionalidades CRUD completas.

---

## 🏗️ ARQUITECTURA

### **1. Estructura General**

```
GestionAdmin
├── Header (Título + Subtítulo dinámico)
├── Tabs (Doctores / Pacientes)
├── Search Bar (Búsqueda en tiempo real)
├── Buttons Container (Filtros + Agregar)
├── Content (Lista con ScrollView + RefreshControl)
└── Modal de Filtros
```

### **2. Estado (State Management)**

#### **Estados Locales:**
```javascript
const [activeTab, setActiveTab] = useState('doctores');
const [searchQuery, setSearchQuery] = useState('');
const [filteredDoctores, setFilteredDoctores] = useState([]);
const [filteredPacientes, setFilteredPacientes] = useState([]);
const [refreshing, setRefreshing] = useState(false);
const [doctorFilter, setDoctorFilter] = useState('activos');
const [pacienteFilter, setPacienteFilter] = useState('activos');
const [comorbilidadFilter, setComorbilidadFilter] = useState('todas');
const [dateFilter, setDateFilter] = useState('recent');
const [showFiltersModal, setShowFiltersModal] = useState(false);
```

#### **Hooks de Datos:**
```javascript
const { doctores, loading, error, refresh } = useDoctores(doctorFilter, dateFilter);
const { pacientes, loading, error, refresh } = usePacientes(pacienteFilter, dateFilter, comorbilidadFilter);
```

#### **Hooks de Tiempo Real:**
```javascript
const { isConnected } = useWebSocket();
const realtimePacientes = useRealtimeList('patients', pacientes || []);
const realtimeDoctores = useRealtimeList('doctors', doctores || []);
```

---

## 🔍 FUNCIONALIDADES

### **1. Tabs (Pestañas)**

**Doctores Tab:**
- Muestra lista de doctores
- Filtros: `activos`, `inactivos`, `todos`
- Contador de doctores
- Vista simplificada con cards

**Pacientes Tab:**
- Muestra lista de pacientes
- Filtros: `activos`, `inactivos`, `todos`
- Filtro adicional por comorbilidad (12 opciones)
- Contador de pacientes
- Vista detallada con cards

---

### **2. Búsqueda**

**Funcionalidades:**
- Búsqueda en tiempo real
- Sanitización de inputs (previene XSS)
- Filtrado por múltiples campos

**Doctores:**
```javascript
- nombre
- apellido (paterno + materno)
- especialidad (grado_estudio)
- modulo
- email
- institucion_hospitalaria
```

**Pacientes:**
```javascript
- nombre
- apellido
- email
- doctor_asignado
```

---

### **3. Filtros**

#### **Modal de Filtros:**
- Se abre con botón "🔧 FILTROS"
- Muestra opciones según tab activo
- Aplicación automática de filtros

#### **Filtros Disponibles:**

**Para Doctores:**
1. **Estado:** `activos`, `inactivos`, `todos`
2. **Orden:** `recent` (más recientes), `oldest` (más antiguos)

**Para Pacientes:**
1. **Estado:** `activos`, `inactivos`, `todos`
2. **Comorbilidad:** 12 opciones (todas, diabetes, hipertensión, etc.)
3. **Orden:** `recent`, `oldest`

**Comorbilidades Disponibles:**
```javascript
- todas
- Diabetes
- Hipertensión
- Obesidad
- Dislipidemia
- Enfermedad renal crónica
- EPOC
- Enfermedad cardiovascular
- Tuberculosis
- Asma
- Tabaquismo
- SÍNDROME METABÓLICO
```

---

### **4. Acciones CRUD**

#### **Botón "Agregar":**
- Dinámico según tab activo
- Navegación a:
  - `AgregarDoctor` (si tab = doctores)
  - `AgregarPaciente` (si tab = pacientes)

#### **Acciones en Cards:**
- **Doctores:**
  - Toggle estado (activar/desactivar)
  - Ver detalles
  - Editar

- **Pacientes:**
  - Toggle estado (activar/desactivar)
  - Ver detalles
  - Editar

---

### **5. Tiempo Real**

**WebSocket Integration:**
- Monitoreo de cambios en tiempo real
- Sincronización automática con backend
- Actualización sin refresh manual

**Hooks:**
- `useWebSocket()` → Conexión con servidor
- `useRealtimeList()` → Lista sincronizada

---

### **6. Pull to Refresh**

**Funcionalidad:**
- Deslizar hacia abajo para refrescar
- Loading spinner durante refresh
- Sincronización automática de datos

---

## 📱 UI COMPONENTS

### **Header:**
```
┌─────────────────────────────┐
│  Gestión Administrativa     │
│  Gestión de Doctores        │
└─────────────────────────────┘
```

### **Tabs:**
```
┌──────────┬──────────────────┐
│ 👨‍⚕️      │ 👥                │
│ Doctores │ Pacientes       │
│  (10)    │  (25)           │
└──────────┴──────────────────┘
```

### **Search Bar:**
```
┌─────────────────────────────┐
│ 🔍 Buscar doctores...       │
└─────────────────────────────┘
```

### **Buttons:**
```
┌──────────────┬──────────────┐
│ 🔧 FILTROS   │ + Agregar     │
│              │ Doctor        │
└──────────────┴──────────────┘
```

---

## 🎨 ESTILOS (IMSS BIENESTAR)

**Colores Principales:**
- `COLORES.PRIMARIO` → Azul IMSS
- `COLORES.BLANCO` → Fondo de cards
- `COLORES.FONDO` → Fondo de pantalla
- `COLORES.TEXTO_SECUNDARIO` → Texto secundario

**Componentes Styled:**
- Cards con elevación
- Tabs con bordes redondeados
- Botones con IMSS color palette
- Modal deslizable desde abajo

---

## 📊 FLUJO DE DATOS

### **1. Carga Inicial:**
```
Component Mount
    ↓
useEffect (validación de rol)
    ↓
useDoctores() / usePacientes()
    ↓
API Call
    ↓
Establecer datos en estado
    ↓
Filtrar datos locales
    ↓
Renderizar cards
```

### **2. Cambio de Filtro:**
```
Usuario cambia filtro
    ↓
useEffect detecta cambio
    ↓
refreshDoctores() / refreshPacientes()
    ↓
API Call con nuevos parámetros
    ↓
Actualizar datos
    ↓
Re-filtrar y re-renderizar
```

### **3. Búsqueda:**
```
Usuario escribe en search bar
    ↓
setSearchQuery()
    ↓
useEffect detecta cambio
    ↓
Filtrar datos locales
    ↓
setFilteredDoctores() / setFilteredPacientes()
    ↓
Re-renderizar cards
```

---

## 🔐 SEGURIDAD

### **1. Validación de Rol:**
```javascript
useEffect(() => {
  if (!['Admin', 'admin', 'administrador'].includes(userRole)) {
    navigation.navigate('MainTabs', { screen: 'Dashboard' });
  }
}, [userRole]);
```

### **2. Sanitización de Inputs:**
```javascript
const sanitizeSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  return query.trim().replace(/[<>]/g, '');
};
```

### **3. Validación de Datos:**
- Verificación de estructura de objetos
- Fallbacks para datos faltantes
- Validación de IDs antes de navegación

---

## ⚡ PERFORMANCE

### **1. Optimizaciones:**
- Memoization de datos filtrados
- Uso de `useCallback` en handlers
- Lazy loading con paginación backend
- Cache de datos con `AsyncStorage`

### **2. Time Real:**
- WebSocket eficiente
- Actualización selectiva
- Detección de cambios mínimos

---

## 🐛 GESTIÓN DE ERRORES

### **Estados:**
- **Loading:** Spinner + texto
- **Error:** Card roja con mensaje
- **Empty:** Card gris con mensaje

### **Manejo:**
```javascript
{(doctoresError || pacientesError) && (
  <Card style={styles.errorCard}>
    <Card.Content>
      <Text style={styles.errorText}>
        Error al cargar los datos. Desliza hacia abajo para intentar nuevamente.
      </Text>
    </Card.Content>
  </Card>
)}
```

---

## 📝 LOGS

### **Logs Implementados:**
- Info: Cambios de filtros, navegación, refresh
- Debug: Estructura de datos, IDs
- Error: Errores de carga, validación
- Warning: Acceso no autorizado

---

## 🎯 CONCLUSIONES

**Fortalezas:**
- ✅ CRUD completo para doctores y pacientes
- ✅ Filtros avanzados con múltiples opciones
- ✅ Búsqueda en tiempo real
- ✅ Tiempo real con WebSocket
- ✅ Validación de seguridad
- ✅ Manejo robusto de errores
- ✅ UI moderna con IMSS colores

**Funcional:**
- ✅ Sistema de tabs
- ✅ Filtros por estado, comorbilidad, fecha
- ✅ Búsqueda inteligente
- ✅ Refresh manual
- ✅ Toggle de estado
- ✅ Navegación a detalles
- ✅ Modal de filtros

---

**Autor:** Senior Developer  
**Revisión:** Completa y funcional  
**Estado:** ✅ Production Ready












