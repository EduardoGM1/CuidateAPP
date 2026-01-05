# 🧪 Guía de Pruebas - Funcionalidades Implementadas

**Fecha:** 17 de noviembre de 2025  
**Funcionalidades a probar:**
1. Modo Offline en dispositivo físico
2. Rangos personalizados por comorbilidad
3. Sincronización offline con múltiples operaciones

---

## 📱 1. PROBAR FUNCIONALIDAD OFFLINE EN DISPOSITIVO FÍSICO

### **Preparación:**

1. **Instalar la app en dispositivo físico:**
   ```powershell
   cd ClinicaMovil
   npx react-native run-android
   ```

2. **Verificar que la app está conectada al backend:**
   - Abrir la app
   - Iniciar sesión como paciente
   - Verificar que los datos cargan correctamente

### **Prueba 1.1: Registrar Signos Vitales Offline**

**Pasos:**
1. **Activar modo avión en el dispositivo** (o desconectar WiFi/datos móviles)
2. **Abrir la app** (debe mostrar banner naranja "Sin conexión")
3. **Navegar a:** Inicio → Registrar Signos Vitales
4. **Completar el formulario:**
   - Peso: 75 kg
   - Talla: 1.70 m
   - Presión Sistólica: 120
   - Presión Diastólica: 80
   - Glucosa: 95 mg/dL
5. **Presionar "Guardar"**
6. **Verificar:**
   - ✅ Debe aparecer mensaje: "📱 Guardado Offline"
   - ✅ Mensaje: "Tus signos vitales se guardaron localmente. Se enviarán automáticamente cuando haya conexión a internet."
   - ✅ El banner debe mostrar: "1 operación pendiente"

**Resultado esperado:**
- ✅ Los datos se guardan localmente
- ✅ Se muestra mensaje de confirmación offline
- ✅ El indicador muestra operaciones pendientes

---

### **Prueba 1.2: Confirmar Medicamento Offline**

**Pasos:**
1. **Mantener modo avión activado**
2. **Navegar a:** Inicio → Mis Medicamentos
3. **Verificar que hay medicamentos registrados**
4. **Presionar "Tomé este medicamento"** en un medicamento pendiente
5. **Verificar:**
   - ✅ Debe aparecer mensaje: "Registrado: [Nombre] tomado. Se guardará cuando haya conexión"
   - ✅ El medicamento debe marcarse como "✅ Tomado" (actualización optimista)
   - ✅ El banner debe mostrar: "2 operaciones pendientes" (si ya había 1)

**Resultado esperado:**
- ✅ La toma se guarda en cola offline
- ✅ La UI se actualiza inmediatamente (optimista)
- ✅ El contador de operaciones pendientes aumenta

---

### **Prueba 1.3: Sincronización Automática al Reconectar**

**Pasos:**
1. **Con operaciones pendientes en la cola:**
   - Debe haber al menos 2 operaciones (signos vitales + medicamento)
2. **Desactivar modo avión** (reconectar WiFi/datos)
3. **Observar la app:**
   - ✅ El banner "Sin conexión" debe desaparecer
   - ✅ Debe aparecer brevemente "Sincronizando..." (si está implementado)
4. **Verificar en backend:**
   - Abrir base de datos o API
   - Verificar que los signos vitales se crearon
   - Verificar que la toma de medicamento se registró
5. **Recargar la app:**
   - Los datos deben aparecer correctamente

**Resultado esperado:**
- ✅ Las operaciones se sincronizan automáticamente
- ✅ Los datos aparecen en el backend
- ✅ No se pierden datos

---

## 🏥 2. VERIFICAR RANGOS PERSONALIZADOS CON COMORBILIDADES

### **Preparación:**

1. **Crear paciente de prueba con comorbilidades:**
   - Usar el script de base de datos o API
   - Asignar comorbilidades: Diabetes, Hipertensión, Obesidad

2. **Verificar comorbilidades en base de datos:**
   ```sql
   SELECT pc.*, c.nombre_comorbilidad 
   FROM paciente_comorbilidad pc
   JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
   WHERE pc.id_paciente = [ID_PACIENTE];
   ```

### **Prueba 2.1: Paciente con Diabetes - Glucosa**

**Datos de prueba:**
- **Paciente:** Con comorbilidad "Diabetes" o "Diabetes Mellitus"
- **Signos Vitales:**
  - Glucosa: 140 mg/dL (fuera de rango para diabéticos: 80-130)
  - Glucosa: 60 mg/dL (crítico para diabéticos: <60)

**Pasos:**
1. **Iniciar sesión como Admin/Doctor**
2. **Navegar a:** Detalle del Paciente (con diabetes)
3. **Agregar Signos Vitales:**
   - Glucosa: 140 mg/dL
4. **Verificar:**
   - ✅ Debe generar alerta MODERADA (no crítica)
   - ✅ Mensaje debe mencionar rango para diabéticos
   - ✅ Rango normal mostrado: 80-130 mg/dL (no 70-126)

**Prueba con valor crítico:**
1. **Agregar Signos Vitales:**
   - Glucosa: 60 mg/dL
2. **Verificar:**
   - ✅ Debe generar alerta CRÍTICA
   - ✅ Mensaje debe indicar urgencia médica

**Resultado esperado:**
- ✅ Rangos más estrictos para diabéticos
- ✅ Alertas apropiadas según rango personalizado

---

### **Prueba 2.2: Paciente con Hipertensión - Presión Arterial**

**Datos de prueba:**
- **Paciente:** Con comorbilidad "Hipertensión" o "Hipertensión Arterial"
- **Signos Vitales:**
  - Presión: 135/90 mmHg (fuera de rango para hipertensos: 90-130/60-85)
  - Presión: 160/100 mmHg (crítico)

**Pasos:**
1. **Agregar Signos Vitales:**
   - Presión Sistólica: 135 mmHg
   - Presión Diastólica: 90 mmHg
2. **Verificar:**
   - ✅ Debe generar alerta MODERADA
   - ✅ Rango normal mostrado: 90-130/60-85 mmHg (no 90-140/60-90)

**Resultado esperado:**
- ✅ Rangos más estrictos para hipertensos
- ✅ Alertas más sensibles

---

### **Prueba 2.3: Paciente con Obesidad - IMC**

**Datos de prueba:**
- **Paciente:** Con comorbilidad "Obesidad"
- **Signos Vitales:**
  - Peso: 100 kg
  - Talla: 1.70 m
  - IMC calculado: 34.6 (fuera de rango para obesos: 18.5-29.9)

**Pasos:**
1. **Agregar Signos Vitales:**
   - Peso: 100 kg
   - Talla: 1.70 m
2. **Verificar:**
   - ✅ IMC calculado: 34.6
   - ✅ Debe generar alerta (IMC > 29.9 para obesos)
   - ✅ Rango normal mostrado: 18.5-29.9 (no 18.5-24.9)

**Resultado esperado:**
- ✅ Rangos ajustados para pacientes obesos
- ✅ Alertas apropiadas

---

### **Prueba 2.4: Paciente sin Comorbilidades - Rangos Normales**

**Datos de prueba:**
- **Paciente:** Sin comorbilidades registradas
- **Signos Vitales:**
  - Glucosa: 140 mg/dL (fuera de rango normal: 70-126)

**Pasos:**
1. **Agregar Signos Vitales:**
   - Glucosa: 140 mg/dL
2. **Verificar:**
   - ✅ Debe usar rangos normales (70-126 mg/dL)
   - ✅ Alerta debe mencionar rango normal estándar

**Resultado esperado:**
- ✅ Pacientes sin comorbilidades usan rangos estándar
- ✅ No se aplican restricciones innecesarias

---

### **Prueba 2.5: Paciente con Múltiples Comorbilidades**

**Datos de prueba:**
- **Paciente:** Con "Diabetes" + "Hipertensión"
- **Signos Vitales:**
  - Glucosa: 140 mg/dL
  - Presión: 135/90 mmHg

**Pasos:**
1. **Agregar Signos Vitales completos**
2. **Verificar:**
   - ✅ Glucosa usa rango de diabetes (80-130)
   - ✅ Presión usa rango de hipertensión (90-130/60-85)
   - ✅ Ambas alertas se generan correctamente

**Resultado esperado:**
- ✅ Múltiples comorbilidades se combinan correctamente
- ✅ Cada signo vital usa su rango apropiado

---

## 🔄 3. VALIDAR SINCRONIZACIÓN OFFLINE CON MÚLTIPLES OPERACIONES

### **Preparación:**

1. **Asegurar que hay múltiples operaciones en cola:**
   - Al menos 3-5 operaciones diferentes

### **Prueba 3.1: Múltiples Signos Vitales Offline**

**Pasos:**
1. **Activar modo avión**
2. **Registrar 3 signos vitales diferentes:**
   - Registro 1: Peso 75kg, Talla 1.70m
   - Registro 2: Presión 120/80, Glucosa 95
   - Registro 3: Peso 76kg, Talla 1.70m
3. **Verificar cola:**
   - ✅ Banner debe mostrar: "3 operaciones pendientes"
4. **Reconectar internet**
5. **Verificar sincronización:**
   - ✅ Las 3 operaciones deben sincronizarse
   - ✅ Todas deben aparecer en backend
   - ✅ Banner debe desaparecer o mostrar "0 operaciones pendientes"

**Resultado esperado:**
- ✅ Múltiples operaciones se procesan en orden
- ✅ No se pierden datos
- ✅ Todas se sincronizan correctamente

---

### **Prueba 3.2: Mezcla de Operaciones (Signos Vitales + Medicamentos)**

**Pasos:**
1. **Activar modo avión**
2. **Realizar operaciones mixtas:**
   - Registrar signos vitales (1 operación)
   - Confirmar medicamento 1 (1 operación)
   - Confirmar medicamento 2 (1 operación)
   - Registrar signos vitales nuevamente (1 operación)
3. **Verificar:**
   - ✅ Banner muestra: "4 operaciones pendientes"
4. **Reconectar internet**
5. **Verificar en backend:**
   - ✅ 2 registros de signos vitales creados
   - ✅ 2 tomas de medicamento registradas
   - ✅ Orden de creación correcto (timestamp)

**Resultado esperado:**
- ✅ Diferentes tipos de operaciones se sincronizan
- ✅ Orden cronológico se mantiene
- ✅ No hay conflictos entre tipos de operaciones

---

### **Prueba 3.3: Manejo de Errores en Sincronización**

**Pasos:**
1. **Crear operaciones offline:**
   - Al menos 2 operaciones en cola
2. **Reconectar con backend temporalmente caído:**
   - Detener servidor backend
   - Reconectar internet
3. **Verificar:**
   - ✅ Las operaciones permanecen en cola
   - ✅ Se intenta sincronizar periódicamente
4. **Reiniciar backend**
5. **Verificar:**
   - ✅ Las operaciones se sincronizan cuando el backend está disponible

**Resultado esperado:**
- ✅ Sistema maneja errores de red graciosamente
- ✅ Reintentos automáticos
- ✅ No se pierden datos

---

## 📊 VERIFICACIÓN EN BACKEND

### **Consultas SQL para Verificar:**

```sql
-- Verificar signos vitales creados offline
SELECT * FROM signos_vitales 
WHERE id_paciente = [ID_PACIENTE]
ORDER BY fecha_registro DESC
LIMIT 10;

-- Verificar tomas de medicamento
SELECT * FROM medicamento_toma
WHERE id_plan_medicacion IN (
  SELECT id_plan FROM planes_medicacion WHERE id_paciente = [ID_PACIENTE]
)
ORDER BY fecha_toma DESC
LIMIT 10;

-- Verificar comorbilidades del paciente
SELECT c.nombre_comorbilidad, pc.anos_diagnostico
FROM paciente_comorbilidad pc
JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE pc.id_paciente = [ID_PACIENTE];
```

---

## 🛠️ HERRAMIENTAS DE DEBUGGING

### **1. Ver Cola Offline en Desarrollo:**

Agregar en `ClinicaMovil/src/components/common/OfflineIndicator.js`:

```javascript
// Agregar botón de debug (solo en desarrollo)
{__DEV__ && (
  <TouchableOpacity onPress={() => {
    offlineService.getQueue().then(queue => {
      console.log('Cola offline:', JSON.stringify(queue, null, 2));
      Alert.alert('Cola Offline', JSON.stringify(queue, null, 2));
    });
  }}>
    <Text>🔍 Debug Cola</Text>
  </TouchableOpacity>
)}
```

### **2. Logs del Backend:**

Verificar logs en `api-clinica/logs/`:
- Buscar: "Rangos personalizados aplicados"
- Buscar: "Alertas enviadas"
- Buscar: "Toma de medicamento registrada"

### **3. Verificar Estado de Red:**

En la app, el banner `OfflineIndicator` muestra:
- Estado de conexión
- Número de operaciones pendientes

---

## ✅ CHECKLIST DE VERIFICACIÓN

### **Modo Offline:**
- [ ] Banner aparece cuando no hay conexión
- [ ] Operaciones se guardan localmente
- [ ] Mensaje de confirmación offline se muestra
- [ ] Contador de operaciones pendientes funciona
- [ ] Sincronización automática al reconectar
- [ ] Datos aparecen en backend después de sincronizar

### **Rangos Personalizados:**
- [ ] Paciente con diabetes usa rangos estrictos de glucosa
- [ ] Paciente con hipertensión usa rangos estrictos de presión
- [ ] Paciente con obesidad usa rangos ajustados de IMC
- [ ] Paciente sin comorbilidades usa rangos normales
- [ ] Múltiples comorbilidades se combinan correctamente
- [ ] Alertas se generan según rangos personalizados

### **Sincronización:**
- [ ] Múltiples operaciones se sincronizan en orden
- [ ] Diferentes tipos de operaciones se procesan correctamente
- [ ] Errores de red se manejan graciosamente
- [ ] No se pierden datos durante sincronización

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### **Problema: Banner offline no aparece**
- **Solución:** Verificar que `offlineService.initialize()` se llama en `App.tsx`
- **Verificar:** Estado de red se detecta correctamente

### **Problema: Operaciones no se sincronizan**
- **Solución:** Verificar que el backend está corriendo
- **Verificar:** Logs del backend para errores
- **Verificar:** Formato de datos en la cola offline

### **Problema: Rangos personalizados no se aplican**
- **Solución:** Verificar que el paciente tiene comorbilidades en BD
- **Verificar:** Nombres de comorbilidades coinciden (case-insensitive)
- **Verificar:** Logs del backend: "Rangos personalizados aplicados"

---

## 📝 NOTAS ADICIONALES

- **Backup creado:** `backup_antes_implementacion_critica_2025-11-17_06-57-35`
- **Tests:** 100/125 pasando (80%)
- **Estado:** Funcionalidades implementadas y listas para pruebas

---

**Última actualización:** 17 de noviembre de 2025



