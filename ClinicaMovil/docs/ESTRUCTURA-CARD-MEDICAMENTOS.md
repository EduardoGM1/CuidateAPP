# 💊 Estructura del Diseño - Card de Medicamentos

**Ubicación:** `ClinicaMovil/src/screens/admin/DetallePaciente.js`  
**Líneas:** 2567-2642

---

## 📐 ESTRUCTURA JERÁRQUICA

```
Card (styles.card)
└── Card.Content
    ├── Header (styles.cardHeader)
    │   ├── Title (styles.cardTitle)
    │   │   └── "💊 Medicamentos ({totalMedicamentos})"
    │   └── Actions (styles.cardActions)
    │       └── TouchableOpacity → "Opciones"
    │
    └── Content (condicional)
        ├── Si hay medicamentos:
        │   └── map(medicamentos) → listItem
        │       ├── Header (styles.listItemHeader)
        │       │   ├── Title (styles.listItemTitle)
        │       │   │   └── nombre_medicamento
        │       │   └── Chip (styles.statusChip)
        │       │       └── estado (Activo/Inactivo)
        │       │
        │       ├── Subtitle (styles.listItemSubtitle)
        │       │   └── doctor_nombre
        │       │
        │       ├── Grid (styles.medicationGrid)
        │       │   ├── Item (styles.medicationItem) - Dosis
        │       │   ├── Item (styles.medicationItem) - Frecuencia
        │       │   ├── Item (styles.medicationItem) - Horarios/Horario
        │       │   └── Item (styles.medicationItem) - Vía
        │       │
        │       └── Observaciones (styles.listItemDescription)
        │           └── observaciones (si existe)
        │
        └── Si NO hay medicamentos:
            └── Text (styles.noDataText)
                └── "No hay medicamentos registrados"
```

---

## 🎨 COMPONENTES Y ESTILOS

### **1. Card Principal**
```javascript
<Card style={styles.card}>
  <Card.Content>
```
- **Estilo:** `styles.card` (estilo compartido con otras cards)

### **2. Header de la Card**
```javascript
<View style={styles.cardHeader}>
  <Title style={styles.cardTitle}>
    💊 Medicamentos ({totalMedicamentos || medicamentos?.length || 0})
  </Title>
  <View style={styles.cardActions}>
    <TouchableOpacity onPress={() => modalManager.open('optionsMedicamentos')}>
      <Text style={styles.optionsText}>Opciones</Text>
    </TouchableOpacity>
  </View>
</View>
```

**Elementos:**
- **Título:** Muestra emoji 💊 + texto + contador de medicamentos
- **Botón Opciones:** Abre modal de opciones (agregar, ver todos, etc.)

### **3. Lista de Medicamentos**

#### **3.1. Item Individual (listItem)**
```javascript
<View key={`med-${medicamento.id_plan}-${medicamento.id_medicamento || medIndex}-${medIndex}`} 
      style={styles.listItem}>
```

**Key único:** Combina `id_plan`, `id_medicamento` e `medIndex` para evitar conflictos.

#### **3.2. Header del Item (listItemHeader)**
```javascript
<View style={styles.listItemHeader}>
  <Text style={styles.listItemTitle}>
    {medicamento.nombre_medicamento || 'Sin nombre'}
  </Text>
  <Chip 
    mode="outlined" 
    style={[
      styles.statusChip,
      medicamento.estado === 'Activo' ? styles.statusActive : styles.statusInactive
    ]}
  >
    {medicamento.estado}
  </Chip>
</View>
```

**Elementos:**
- **Nombre del medicamento:** Texto principal
- **Chip de estado:** 
  - Verde (`statusActive`) si está "Activo"
  - Rojo (`statusInactive`) si está "Inactivo"

#### **3.3. Subtitle (Doctor)**
```javascript
<Text style={styles.listItemSubtitle}>
  {medicamento.doctor_nombre || 'Sin doctor asignado'}
</Text>
```

#### **3.4. Grid de Información (medicationGrid)**
```javascript
<View style={styles.medicationGrid}>
  {/* Dosis */}
  {medicamento.dosis && (
    <View style={styles.medicationItem}>
      <Text style={styles.medicationLabel}>Dosis:</Text>
      <Text style={styles.medicationValue}>{medicamento.dosis}</Text>
    </View>
  )}
  
  {/* Frecuencia */}
  {medicamento.frecuencia && (
    <View style={styles.medicationItem}>
      <Text style={styles.medicationLabel}>Frecuencia:</Text>
      <Text style={styles.medicationValue}>{medicamento.frecuencia}</Text>
    </View>
  )}
  
  {/* Horarios (array) o Horario (string) */}
  {(medicamento.horarios && Array.isArray(medicamento.horarios) && medicamento.horarios.length > 0) ? (
    <View style={styles.medicationItem}>
      <Text style={styles.medicationLabel}>Horarios:</Text>
      <Text style={styles.medicationValue}>
        {medicamento.horarios.join(', ')}
      </Text>
    </View>
  ) : medicamento.horario ? (
    <View style={styles.medicationItem}>
      <Text style={styles.medicationLabel}>Horario:</Text>
      <Text style={styles.medicationValue}>{medicamento.horario}</Text>
    </View>
  ) : null}
  
  {/* Vía de administración */}
  {medicamento.via_administracion && (
    <View style={styles.medicationItem}>
      <Text style={styles.medicationLabel}>Vía:</Text>
      <Text style={styles.medicationValue}>{medicamento.via_administracion}</Text>
    </View>
  )}
</View>
```

**Campos mostrados (condicionales):**
1. **Dosis** - Si existe
2. **Frecuencia** - Si existe
3. **Horarios/Horario** - Prioriza array `horarios`, luego `horario` string
4. **Vía de administración** - Si existe

**Nota:** Todos los campos son opcionales (solo se muestran si tienen valor).

#### **3.5. Observaciones**
```javascript
{medicamento.observaciones && (
  <Text style={styles.listItemDescription}>
    📝 {medicamento.observaciones}
  </Text>
)}
```

---

## 🎨 ESTILOS APLICADOS

### **Estilos de la Card**
```javascript
card: {
  // Estilo compartido con otras cards
  marginBottom: 16,
  elevation: 2,
  borderRadius: 8,
}
```

### **Estilos del Header**
```javascript
cardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
}

cardTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#333',
}

cardActions: {
  flexDirection: 'row',
  gap: 8,
}

optionsText: {
  color: '#2196F3',
  fontSize: 14,
  fontWeight: '600',
}
```

### **Estilos del Item**
```javascript
listItem: {
  backgroundColor: '#f9f9f9',
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: '#e0e0e0',
}

listItemHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
}

listItemTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#333',
  flex: 1,
}

listItemSubtitle: {
  fontSize: 13,
  color: '#666',
  marginBottom: 8,
}

listItemDescription: {
  fontSize: 14,
  color: '#555',
  marginTop: 8,
  fontStyle: 'italic',
}
```

### **Estilos del Grid de Medicamentos**
```javascript
medicationGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: 8,
}

medicationItem: {
  width: '33%',  // 3 columnas
  marginBottom: 8,
}

medicationLabel: {
  fontSize: 12,
  color: '#666',
  fontWeight: '600',
}

medicationValue: {
  fontSize: 14,
  color: '#333',
}
```

### **Estilos del Chip de Estado**
```javascript
statusChip: {
  height: 28,
}

statusActive: {
  backgroundColor: '#E8F5E8',
  borderColor: '#4CAF50',
}

statusInactive: {
  backgroundColor: '#FFEBEE',
  borderColor: '#F44336',
}
```

---

## 📊 DISEÑO VISUAL

### **Layout del Grid:**
```
┌─────────────────────────────────────────┐
│ 💊 Medicamentos (3)          [Opciones] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Paracetamol 500mg    [Activo]       │ │
│ │ Dr. Juan Pérez                      │ │
│ │ ┌─────────┬─────────┬─────────┐   │ │
│ │ │ Dosis:  │Frecuencia│ Horario:│   │ │
│ │ │ 500mg   │ Cada 8h  │ 08:00   │   │ │
│ │ └─────────┴─────────┴─────────┘   │ │
│ │ ┌─────────┐                        │ │
│ │ │ Vía:    │                        │ │
│ │ │ Oral    │                        │ │
│ │ └─────────┘                        │ │
│ │ 📝 Tomar con alimentos             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Ibuprofeno 400mg   [Inactivo]       │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### **Distribución del Grid:**
- **3 columnas** por fila (`width: '33%'`)
- **FlexWrap:** Los items se envuelven automáticamente
- **Espaciado:** `marginBottom: 8` entre items

---

## 🔄 FLUJO DE DATOS

### **Origen de los datos:**
```javascript
const { medicamentos } = useMedicalData(pacienteId, {
  signosVitales: { limit: 1 },
  diagnosticos: { limit: 5 },
  medicamentos: { limit: 5 },  // ← Límite de 5 medicamentos
  // ...
});
```

### **Cálculo del total:**
```javascript
const totalMedicamentos = useMemo(() => {
  return medicamentos?.length || 0;
}, [medicamentos]);
```

### **Estructura del objeto medicamento:**
```javascript
{
  id_plan: number,
  id_medicamento: number,
  nombre_medicamento: string,
  estado: 'Activo' | 'Inactivo',
  doctor_nombre: string,
  dosis: string,
  frecuencia: string,
  horario: string,           // String único (legacy)
  horarios: string[],        // Array de horarios (nuevo)
  via_administracion: string,
  observaciones: string
}
```

---

## ⚙️ FUNCIONALIDADES

### **1. Botón "Opciones"**
- Abre modal con opciones:
  - Agregar medicamento
  - Ver historial completo
  - (Otras opciones según configuración)

### **2. Renderizado Condicional**
- Solo muestra campos que tienen valor
- Maneja tanto `horario` (string) como `horarios` (array)
- Muestra mensaje si no hay medicamentos

### **3. Estados Visuales**
- **Activo:** Chip verde
- **Inactivo:** Chip rojo

---

## 📝 NOTAS IMPORTANTES

1. **Compatibilidad:** Soporta tanto `horario` (legacy) como `horarios` (nuevo formato)
2. **Límite:** Muestra máximo 5 medicamentos en la vista principal
3. **Key único:** Usa combinación de IDs para evitar conflictos en el renderizado
4. **Responsive:** El grid se adapta automáticamente con `flexWrap`
5. **Accesibilidad:** Todos los textos tienen estilos consistentes y legibles

---

## 🔗 RELACIONES

- **Modal de Opciones:** `optionsMedicamentos`
- **Modal de Agregar:** `addMedicamentos`
- **Modal de Historial:** `showAllMedicamentos`
- **Hook de datos:** `useMedicalData`
- **Servicio:** `gestionService.createPacienteMedicamento()`

