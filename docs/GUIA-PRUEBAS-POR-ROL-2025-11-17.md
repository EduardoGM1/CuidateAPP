# 🧪 Guía de Pruebas por Rol de Usuario

**Fecha:** 17 de noviembre de 2025  
**Organización:** Pruebas divididas por interfaz (Admin/Doctor vs Paciente)

---

## 📊 ÍNDICE

1. [Pruebas para Admin/Doctor](#-pruebas-para-admindoctor)
2. [Pruebas para Pacientes](#-pruebas-para-pacientes)
3. [Pruebas Compartidas](#-pruebas-compartidas)

---

## 👨‍⚕️ PRUEBAS PARA ADMIN/DOCTOR

### **Interfaz:** Dashboard Admin / Dashboard Doctor / Detalle Paciente

---

### 🔴 **1. RANGOS PERSONALIZADOS POR COMORBILIDAD**

**Dónde probar:**
- `Dashboard Admin` → Gestión → Detalle Paciente
- `Dashboard Doctor` → Mis Pacientes → Detalle Paciente
- Pantalla: **Detalle Paciente** → Card "Signos Vitales" → Agregar Signos Vitales

---

#### **Prueba 1.1: Paciente con Diabetes - Glucosa**

**Preparación:**
1. **Iniciar sesión como Admin o Doctor**
2. **Navegar a:** Detalle del Paciente (que tenga comorbilidad "Diabetes")
3. **Verificar comorbilidades:** Debe aparecer "Diabetes" en la card de Comorbilidades

**Pasos:**
1. **Ir a la card "Signos Vitales"**
2. **Presionar "Agregar Signos Vitales"**
3. **Completar formulario:**
   - Peso: 75 kg
   - Talla: 1.70 m
   - Glucosa: **140 mg/dL** (fuera de rango para diabéticos: 80-130)
   - Presión Sistólica: 120 mmHg
   - Presión Diastólica: 80 mmHg
4. **Presionar "Guardar"**

**Resultado esperado:**
- ✅ Debe generar alerta **MODERADA** (no crítica)
- ✅ Mensaje debe mencionar rango para diabéticos
- ✅ Rango normal mostrado: **80-130 mg/dL** (no 70-126)
- ✅ En backend, verificar logs: "Rangos personalizados aplicados para Diabetes"

**Prueba con valor crítico:**
1. **Agregar Signos Vitales:**
   - Glucosa: **60 mg/dL** (crítico para diabéticos: <60)
2. **Verificar:**
   - ✅ Debe generar alerta **CRÍTICA**
   - ✅ Mensaje debe indicar urgencia médica
   - ✅ Notificación push debe enviarse

---

#### **Prueba 1.2: Paciente con Hipertensión - Presión Arterial**

**Preparación:**
1. **Paciente con comorbilidad "Hipertensión" o "Hipertensión Arterial"**

**Pasos:**
1. **Agregar Signos Vitales:**
   - Presión Sistólica: **135 mmHg** (fuera de rango para hipertensos: 90-130)
   - Presión Diastólica: **90 mmHg** (fuera de rango: 60-85)
   - Glucosa: 95 mg/dL
   - Peso: 75 kg
   - Talla: 1.70 m
2. **Presionar "Guardar"**

**Resultado esperado:**
- ✅ Debe generar alerta **MODERADA**
- ✅ Rango normal mostrado: **90-130/60-85 mmHg** (no 90-140/60-90)
- ✅ Alertas más sensibles que rangos normales

---

#### **Prueba 1.3: Paciente con Obesidad - IMC**

**Preparación:**
1. **Paciente con comorbilidad "Obesidad"**

**Pasos:**
1. **Agregar Signos Vitales:**
   - Peso: **100 kg**
   - Talla: **1.70 m**
   - IMC calculado automáticamente: **34.6** (fuera de rango para obesos: 18.5-29.9)
2. **Presionar "Guardar"**

**Resultado esperado:**
- ✅ IMC calculado: **34.6**
- ✅ Debe generar alerta (IMC > 29.9 para obesos)
- ✅ Rango normal mostrado: **18.5-29.9** (no 18.5-24.9)

---

#### **Prueba 1.4: Paciente sin Comorbilidades - Rangos Normales**

**Preparación:**
1. **Paciente SIN comorbilidades registradas**

**Pasos:**
1. **Agregar Signos Vitales:**
   - Glucosa: **140 mg/dL** (fuera de rango normal: 70-126)
2. **Presionar "Guardar"**

**Resultado esperado:**
- ✅ Debe usar rangos normales (70-126 mg/dL)
- ✅ Alerta debe mencionar rango normal estándar
- ✅ No se aplican restricciones innecesarias

---

#### **Prueba 1.5: Paciente con Múltiples Comorbilidades**

**Preparación:**
1. **Paciente con "Diabetes" + "Hipertensión"**

**Pasos:**
1. **Agregar Signos Vitales completos:**
   - Glucosa: **140 mg/dL**
   - Presión: **135/90 mmHg**
2. **Presionar "Guardar"**

**Resultado esperado:**
- ✅ Glucosa usa rango de diabetes (80-130)
- ✅ Presión usa rango de hipertensión (90-130/60-85)
- ✅ Ambas alertas se generan correctamente
- ✅ Múltiples comorbilidades se combinan correctamente

---

### 🔍 **2. VERIFICACIÓN EN BACKEND (Admin/Doctor)**

**Dónde verificar:**
- Logs del backend
- Base de datos directamente
- API endpoints

**Consultas SQL:**

```sql
-- Verificar comorbilidades del paciente
SELECT 
  p.id_paciente,
  p.nombre,
  p.apellido_paterno,
  GROUP_CONCAT(c.nombre_comorbilidad) as comorbilidades
FROM pacientes p
LEFT JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
LEFT JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE p.id_paciente = [ID_PACIENTE]
GROUP BY p.id_paciente;

-- Verificar signos vitales recientes con alertas
SELECT 
  sv.id_signo,
  p.nombre,
  sv.glucosa_mg_dl,
  sv.presion_sistolica,
  sv.presion_diastolica,
  sv.imc,
  sv.fecha_registro
FROM signos_vitales sv
JOIN pacientes p ON sv.id_paciente = p.id_paciente
WHERE sv.id_paciente = [ID_PACIENTE]
ORDER BY sv.fecha_registro DESC
LIMIT 10;
```

**Verificar logs del backend:**
- Buscar en `api-clinica/logs/`:
  - "Rangos personalizados aplicados"
  - "Alertas enviadas"
  - "Verificación de signos vitales"

---

## 👤 PRUEBAS PARA PACIENTES

### **Interfaz:** Inicio Paciente / Registrar Signos Vitales / Mis Medicamentos / Configuración

---

### 📱 **1. MODO OFFLINE - REGISTRAR SIGNOS VITALES**

**Dónde probar:**
- `Inicio Paciente` → **Registrar Signos Vitales**

---

#### **Prueba 1.1: Registrar Signos Vitales Offline**

**Preparación:**
1. **Iniciar sesión como Paciente**
2. **Abrir la app en dispositivo físico**
3. **Verificar conexión:** Debe estar conectado inicialmente

**Pasos:**
1. **Activar modo avión** en el dispositivo (o desconectar WiFi/datos móviles)
2. **Abrir la app** (debe mostrar banner naranja "📱 Sin conexión" en la parte superior)
3. **Navegar a:** Inicio → **Registrar Signos Vitales**
4. **Completar el formulario:**
   - Peso: 75 kg
   - Talla: 1.70 m
   - Presión Sistólica: 120
   - Presión Diastólica: 80
   - Glucosa: 95 mg/dL
5. **Presionar "Guardar"**

**Resultado esperado:**
- ✅ Debe aparecer mensaje: **"📱 Guardado Offline"**
- ✅ Mensaje: "Tus signos vitales se guardaron localmente. Se enviarán automáticamente cuando haya conexión a internet."
- ✅ El banner debe mostrar: **"1 operación pendiente"**
- ✅ Los datos se guardan localmente (no se pierden)

**Verificación adicional:**
- **Ir a Configuración** → Ver botón "🔍 Debug Offline" (solo en desarrollo)
- **Presionar el botón** → Debe mostrar:
  - Estado: ❌ Offline
  - Pendientes: 1
  - Detalles de la operación en cola

---

#### **Prueba 1.2: Múltiples Signos Vitales Offline**

**Pasos:**
1. **Mantener modo avión activado**
2. **Registrar 3 signos vitales diferentes:**
   - Registro 1: Peso 75kg, Talla 1.70m
   - Registro 2: Presión 120/80, Glucosa 95
   - Registro 3: Peso 76kg, Talla 1.70m
3. **Verificar cola:**
   - ✅ Banner debe mostrar: **"3 operaciones pendientes"**
   - ✅ Usar botón Debug para ver las 3 operaciones en cola

**Resultado esperado:**
- ✅ Múltiples operaciones se guardan en cola
- ✅ Contador se actualiza correctamente
- ✅ No se pierden datos

---

### 💊 **2. MODO OFFLINE - CONFIRMAR MEDICAMENTO**

**Dónde probar:**
- `Inicio Paciente` → **Mis Medicamentos**

---

#### **Prueba 2.1: Confirmar Medicamento Offline**

**Preparación:**
1. **Asegurar que el paciente tiene medicamentos registrados**
2. **Activar modo avión**

**Pasos:**
1. **Navegar a:** Inicio → **Mis Medicamentos**
2. **Verificar que hay medicamentos registrados**
3. **Presionar "Tomé este medicamento"** en un medicamento pendiente
4. **Verificar:**
   - ✅ Debe aparecer mensaje: **"Registrado: [Nombre] tomado. Se guardará cuando haya conexión"**
   - ✅ El medicamento debe marcarse como **"✅ Tomado"** (actualización optimista)
   - ✅ El banner debe mostrar: **"2 operaciones pendientes"** (si ya había 1)

**Resultado esperado:**
- ✅ La toma se guarda en cola offline
- ✅ La UI se actualiza inmediatamente (optimista)
- ✅ El contador de operaciones pendientes aumenta

---

#### **Prueba 2.2: Múltiples Medicamentos Offline**

**Pasos:**
1. **Mantener modo avión activado**
2. **Confirmar 2-3 medicamentos diferentes**
3. **Verificar:**
   - ✅ Banner muestra el total correcto de operaciones pendientes
   - ✅ Todos los medicamentos se marcan como tomados (UI optimista)
   - ✅ Debug muestra todas las operaciones en cola

---

### 🔄 **3. SINCRONIZACIÓN AUTOMÁTICA AL RECONECTAR**

**Dónde probar:**
- Cualquier pantalla de paciente (después de crear operaciones offline)

---

#### **Prueba 3.1: Sincronización de Signos Vitales**

**Preparación:**
1. **Tener al menos 2 operaciones en cola** (signos vitales + medicamento)

**Pasos:**
1. **Con operaciones pendientes en la cola:**
   - Debe haber al menos 2 operaciones
2. **Desactivar modo avión** (reconectar WiFi/datos)
3. **Observar la app:**
   - ✅ El banner "Sin conexión" debe **desaparecer**
   - ✅ Debe aparecer brevemente "Sincronizando..." (si está implementado)
4. **Esperar 5-10 segundos**
5. **Verificar en backend:**
   - Abrir base de datos o API
   - Verificar que los signos vitales se crearon
   - Verificar que la toma de medicamento se registró
6. **Recargar la app:**
   - Los datos deben aparecer correctamente

**Resultado esperado:**
- ✅ Las operaciones se sincronizan automáticamente
- ✅ Los datos aparecen en el backend
- ✅ No se pierden datos
- ✅ Banner desaparece o muestra "0 operaciones pendientes"

---

#### **Prueba 3.2: Mezcla de Operaciones (Signos Vitales + Medicamentos)**

**Pasos:**
1. **Activar modo avión**
2. **Realizar operaciones mixtas:**
   - Registrar signos vitales (1 operación)
   - Confirmar medicamento 1 (1 operación)
   - Confirmar medicamento 2 (1 operación)
   - Registrar signos vitales nuevamente (1 operación)
3. **Verificar:**
   - ✅ Banner muestra: **"4 operaciones pendientes"**
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

#### **Prueba 3.3: Manejo de Errores en Sincronización**

**Pasos:**
1. **Crear operaciones offline:**
   - Al menos 2 operaciones en cola
2. **Reconectar con backend temporalmente caído:**
   - Detener servidor backend
   - Reconectar internet
3. **Verificar:**
   - ✅ Las operaciones permanecen en cola
   - ✅ Se intenta sincronizar periódicamente
   - ✅ No se pierden datos
4. **Reiniciar backend**
5. **Verificar:**
   - ✅ Las operaciones se sincronizan cuando el backend está disponible

**Resultado esperado:**
- ✅ Sistema maneja errores de red graciosamente
- ✅ Reintentos automáticos
- ✅ No se pierden datos

---

### 🔊 **4. CONTROL DE VOLUMEN TTS**

**Dónde probar:**
- `Inicio Paciente` → **Configuración**

---

#### **Prueba 4.1: Cambiar Volumen de Voz**

**Pasos:**
1. **Navegar a:** Inicio → **Configuración**
2. **Ir a la sección "🔊 Texto a Voz"**
3. **Verificar que TTS está activado**
4. **En "Volumen de Voz", probar los 3 niveles:**
   - **Bajo (0.5):** Presionar y escuchar
   - **Medio (0.75):** Presionar y escuchar
   - **Alto (1.0):** Presionar y escuchar
5. **Verificar:**
   - ✅ El volumen cambia inmediatamente
   - ✅ La selección se guarda (marcada visualmente)
   - ✅ Al salir y volver a entrar, el volumen se mantiene

**Resultado esperado:**
- ✅ Volumen se aplica inmediatamente
- ✅ Persistencia correcta
- ✅ Diferencia audible entre niveles

---

#### **Prueba 4.2: Volumen en Diferentes Pantallas**

**Pasos:**
1. **Configurar volumen en "Alto"**
2. **Navegar a diferentes pantallas:**
   - Registrar Signos Vitales
   - Mis Medicamentos
   - Mis Citas
3. **Verificar:**
   - ✅ El volumen configurado se aplica en todas las pantallas
   - ✅ TTS usa el volumen establecido

**Resultado esperado:**
- ✅ Volumen se aplica globalmente
- ✅ Consistencia en toda la app

---

### 🔍 **5. HERRAMIENTAS DE DEBUG (Solo Desarrollo)**

**Dónde probar:**
- `Inicio Paciente` → **Configuración** → Botón "🔍 Debug Offline"

---

#### **Prueba 5.1: Ver Estado de Cola Offline**

**Pasos:**
1. **Crear algunas operaciones offline**
2. **Ir a Configuración**
3. **Desplazarse al final** (ver botón "🔍 Debug Offline")
4. **Presionar el botón**
5. **Verificar información mostrada:**
   - ✅ Estado de conexión (Online/Offline)
   - ✅ Total de operaciones
   - ✅ Pendientes
   - ✅ Completadas
   - ✅ Fallidas
   - ✅ Lista detallada de operaciones

**Resultado esperado:**
- ✅ Información completa y clara
- ✅ Útil para debugging

---

#### **Prueba 5.2: Limpiar Cola Offline**

**Pasos:**
1. **Con operaciones en cola**
2. **Presionar "🔍 Debug Offline"**
3. **Presionar "Limpiar Cola"**
4. **Confirmar**
5. **Verificar:**
   - ✅ Cola se limpia
   - ✅ Banner muestra "0 operaciones pendientes"
   - ✅ Operaciones no se sincronizan (se perdieron)

**Resultado esperado:**
- ✅ Limpieza funciona correctamente
- ✅ Solo usar en desarrollo/testing

---

## 🔄 PRUEBAS COMPARTIDAS

### **Funcionalidades que se prueban en ambas interfaces**

---

### 📊 **1. VERIFICACIÓN DE DATOS SINCRONIZADOS**

**Admin/Doctor:**
- Verificar que los signos vitales registrados offline por el paciente aparecen en Detalle Paciente

**Paciente:**
- Verificar que los signos vitales registrados offline aparecen en Historial Médico después de sincronizar

**Pasos:**
1. **Paciente:** Registrar signos vitales offline
2. **Paciente:** Reconectar y sincronizar
3. **Admin/Doctor:** Abrir Detalle Paciente → Verificar que aparecen los signos vitales
4. **Paciente:** Abrir Historial Médico → Verificar que aparecen los signos vitales

---

### 🔔 **2. NOTIFICACIONES DE ALERTAS**

**Admin/Doctor:**
- Recibir notificaciones cuando paciente tiene signos vitales críticos

**Paciente:**
- Recibir notificaciones cuando sus propios signos vitales están fuera de rango

**Pasos:**
1. **Admin/Doctor:** Agregar signos vitales críticos a paciente
2. **Verificar:**
   - ✅ Notificación push al paciente
   - ✅ Notificación push al doctor asignado
   - ✅ Notificación push a red de apoyo (si configurado)

---

## ✅ CHECKLIST DE VERIFICACIÓN POR ROL

### **👨‍⚕️ Admin/Doctor:**

- [ ] Rangos personalizados se aplican para pacientes con diabetes
- [ ] Rangos personalizados se aplican para pacientes con hipertensión
- [ ] Rangos personalizados se aplican para pacientes con obesidad
- [ ] Pacientes sin comorbilidades usan rangos normales
- [ ] Múltiples comorbilidades se combinan correctamente
- [ ] Alertas se generan según rangos personalizados
- [ ] Logs del backend muestran "Rangos personalizados aplicados"
- [ ] Datos sincronizados offline aparecen en Detalle Paciente

---

### **👤 Paciente:**

- [ ] Banner offline aparece cuando no hay conexión
- [ ] Signos vitales se guardan localmente offline
- [ ] Mensaje de confirmación offline se muestra
- [ ] Contador de operaciones pendientes funciona
- [ ] Medicamentos se confirman offline
- [ ] Sincronización automática al reconectar
- [ ] Datos aparecen después de sincronizar
- [ ] Control de volumen TTS funciona
- [ ] Volumen TTS persiste entre sesiones
- [ ] Botón Debug muestra información correcta (solo desarrollo)

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### **Para Admin/Doctor:**

**Problema: Rangos personalizados no se aplican**
- **Solución:** Verificar que el paciente tiene comorbilidades en BD
- **Verificar:** Nombres de comorbilidades coinciden (case-insensitive)
- **Verificar:** Logs del backend: "Rangos personalizados aplicados"

**Problema: Alertas no se generan**
- **Solución:** Verificar que `alertService.verificarSignosVitales()` se llama después de crear signo vital
- **Verificar:** Backend está corriendo y procesando alertas

---

### **Para Paciente:**

**Problema: Banner offline no aparece**
- **Solución:** Verificar que `offlineService.initialize()` se llama en `App.tsx`
- **Verificar:** Estado de red se detecta correctamente

**Problema: Operaciones no se sincronizan**
- **Solución:** Verificar que el backend está corriendo
- **Verificar:** Logs del backend para errores
- **Verificar:** Formato de datos en la cola offline (usar Debug)

**Problema: Volumen TTS no cambia**
- **Solución:** Verificar que TTS está activado
- **Verificar:** Reiniciar la app después de cambiar volumen
- **Verificar:** Configuración se guarda en AsyncStorage

---

## 📝 NOTAS ADICIONALES

- **Backup creado:** `backup_antes_implementacion_critica_2025-11-17_06-57-35`
- **Tests:** 100/125 pasando (80%)
- **Estado:** Funcionalidades implementadas y listas para pruebas

---

**Última actualización:** 17 de noviembre de 2025



