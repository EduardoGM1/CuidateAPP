# Flujo de Datos del Modal de Desglose

## ✅ Confirmación: Los datos son REALES y provienen de la Base de Datos

El modal de desglose muestra **datos reales extraídos directamente desde la base de datos** del paciente. A continuación se detalla el flujo completo:

---

## 📊 Flujo Completo de Datos

### 1. **Base de Datos** (PostgreSQL)
```
Tabla: signos_vitales
- Contiene todos los registros de signos vitales del paciente
- Incluye: presión arterial, glucosa, peso, IMC, temperatura, frecuencia cardíaca, saturación de oxígeno
- Campos de fecha: fecha_medicion, fecha_registro, fecha_creacion
```

### 2. **API Backend** (Node.js/Express)
```
Endpoint: GET /api/pacientes/:id/signos-vitales
- Controlador: pacienteMedicalData.js → getPacienteSignosVitales()
- Consulta la base de datos usando Sequelize ORM
- Retorna todos los signos vitales del paciente con paginación
- Soporta filtros: limit, offset, sort (ASC/DESC)
```

### 3. **Servicio Frontend** (gestionService.js)
```javascript
// Método: getAllPacienteSignosVitales()
// Ubicación: ClinicaMovil/src/api/gestionService.js

async getAllPacienteSignosVitales(pacienteId, options = {}) {
  // Hace paginación automática para obtener TODOS los registros
  // No solo los primeros 10, sino todos los históricos
  // Parámetros:
  //   - sort: 'ASC' (cronológico) o 'DESC' (más recientes primero)
  //   - batchSize: 500 (registros por lote)
  
  // Retorna: Array completo de signos vitales desde la BD
}
```

### 4. **Pantalla de Gráficos** (GraficosEvolucion.js)
```javascript
// Ubicación: ClinicaMovil/src/screens/admin/GraficosEvolucion.js

const cargarSignosVitales = async () => {
  // Llama al servicio para obtener TODOS los signos vitales
  const response = await gestionService.getAllPacienteSignosVitales(pacienteId, { 
    sort: 'ASC' // Orden cronológico para evolución
  });
  
  // Los datos se pasan directamente al componente de gráfico
  setSignosVitales(signos);
};
```

### 5. **Componente de Gráfico** (MonthlyVitalSignsBarChart.js)
```javascript
// Ubicación: ClinicaMovil/src/components/charts/MonthlyVitalSignsBarChart.js

// Recibe los datos reales como prop
const MonthlyVitalSignsBarChart = ({ signosVitales = [], loading = false }) => {
  
  // Agrupa los signos vitales por mes
  const mesesAgrupados = agruparPorMes(signosVitales);
  
  // Cuando se presiona una barra:
  const handleBarPress = (datum) => {
    const mesData = datosGrafico.find(d => d.x === datum.datum.x);
    // mesData contiene:
    //   - mes: "January 2026"
    //   - signosVitales: Array con TODOS los signos vitales de ese mes (datos reales)
    //   - totalMediciones: Cantidad real de registros
    //   - score: Score calculado basado en los valores reales
    setMesSeleccionado(mesData);
  };
};
```

### 6. **Modal de Desglose** (renderDesgloseMes)
```javascript
// Dentro del mismo componente MonthlyVitalSignsBarChart.js

const renderDesgloseMes = () => {
  const { mes, signosVitales: signosMes, totalMediciones, score } = mesSeleccionado;
  
  // signosMes es un array con los signos vitales REALES de ese mes
  // Cada elemento contiene:
  //   - presion_sistolica, presion_diastolica
  //   - glucosa_mg_dl
  //   - peso_kg
  //   - imc
  //   - temperatura
  //   - frecuencia_cardiaca
  //   - saturacion_oxigeno
  //   - fecha_medicion (fecha real del registro)
  
  // Se ordenan cronológicamente y se muestran en el modal
  const registrosOrdenados = [...signosMes]
    .map(signo => ({
      ...signo, // Todos los datos reales del registro
      fechaFormateada: formatearFechaHora(signo.fecha_medicion)
    }))
    .sort((a, b) => b.fechaOrdenamiento - a.fechaOrdenamiento);
  
  // Se renderizan en el modal con los valores reales
  return (
    <Modal>
      {registrosOrdenados.map((signo) => (
        <View>
          <Text>Registro del {fechaHora.fecha} {fechaHora.hora}</Text>
          {renderValoresSignosVitales(signo)} {/* Muestra valores REALES */}
        </View>
      ))}
    </Modal>
  );
};
```

---

## 🔍 Verificación de Datos Reales

### Campos que se muestran en el modal (todos reales de BD):

1. **Presión Arterial**: `presion_sistolica` / `presion_diastolica` (mmHg)
2. **Glucosa**: `glucosa_mg_dl` (mg/dL)
3. **Peso**: `peso_kg` (kg)
4. **IMC**: `imc` (kg/m²)
5. **Temperatura**: `temperatura` (°C)
6. **Frecuencia Cardíaca**: `frecuencia_cardiaca` (bpm)
7. **Saturación de Oxígeno**: `saturacion_oxigeno` (%)
8. **Fecha y Hora**: `fecha_medicion` / `fecha_registro` / `fecha_creacion`

### Origen de cada dato:

- ✅ **Base de datos PostgreSQL**: Tabla `signos_vitales`
- ✅ **Sin datos simulados**: Todo proviene de registros reales
- ✅ **Sin transformaciones**: Los valores se muestran tal como están en BD
- ✅ **Incluye todos los tipos**: Monitoreo continuo + Signos vitales de consultas

---

## 📝 Notas Importantes

1. **Paginación Automática**: El servicio `getAllPacienteSignosVitales()` hace múltiples requests automáticos para obtener TODOS los registros históricos, no solo los primeros 10.

2. **Agrupación por Mes**: Los datos se agrupan por mes usando la fecha real del registro (`fecha_medicion`, `fecha_registro`, o `fecha_creacion`).

3. **Ordenamiento Cronológico**: Los registros dentro de cada mes se ordenan por fecha y hora (más reciente primero en el modal).

4. **Validación de Datos**: Solo se muestran registros con fechas válidas y al menos un valor de signo vital.

5. **Score de Salud**: Se calcula en tiempo real basado en los valores reales de los signos vitales del mes.

---

## ✅ Conclusión

**SÍ, los datos mostrados en el modal del desglose son 100% reales y provienen directamente de la base de datos.** 

No hay datos simulados, mockeados o de prueba. Cada valor mostrado corresponde a un registro real almacenado en la tabla `signos_vitales` de la base de datos PostgreSQL.
