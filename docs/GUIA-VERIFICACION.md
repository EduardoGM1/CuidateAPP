# 🧪 Guía de Verificación de Funcionalidades

## 📋 Pre-requisitos

1. ✅ Aplicación compilada y ejecutándose
2. ✅ Backend funcionando
3. ✅ Usuario paciente con datos de prueba:
   - Al menos 1 medicamento con horario
   - Al menos 1 cita futura (dentro de 24h o 5h)
   - Al menos 1 registro de signos vitales

---

## 🔍 Verificación Paso a Paso

### 1️⃣ **Pantalla Principal (InicioPaciente)**

#### Pasos:
1. Inicia sesión como paciente
2. Observa la pantalla principal

#### ✅ Qué verificar:
- [ ] **Badge en "Mis Citas"**: Debe mostrar un número si hay citas próximas (dentro de 24h)
- [ ] **Badge en "Signos Vitales"**: Debe mostrar un badge si necesita registro
- [ ] **Badge en "Mis Medicamentos"**: Debe mostrar un badge si hay medicamento próximo (< 2h)
- [ ] **Indicador de Salud**: Debe aparecer un semáforo (verde/amarillo/rojo) si el estado no es normal
- [ ] **No hay errores en consola**: Revisa la consola de React Native

#### 📝 Logs esperados:
```
[DEBUG] Citas próximas calculadas
[DEBUG] useReminders: Actualizando recordatorios...
[DEBUG] useHealthStatus: Estado de salud actualizado
```

---

### 2️⃣ **Pantalla "Mis Citas"**

#### Pasos:
1. Toca el botón "📅 Mis Citas"
2. Observa la pantalla

#### ✅ Qué verificar:
- [ ] **Badge en el título**: Debe mostrar contador de citas próximas
- [ ] **Banner de Cita Muy Próxima**: Si hay cita en < 5h, debe aparecer banner ROJO con countdown
- [ ] **Banner de Recordatorio**: Si hay cita en < 24h (pero > 5h), debe aparecer banner AMARILLO
- [ ] **Countdown funciona**: El tiempo restante debe actualizarse
- [ ] **TTS funciona**: Al tocar el banner, debe hablar el recordatorio

#### 📝 Logs esperados:
```
[DEBUG] MisCitas: Cargando citas
[INFO] ✅ Citas del paciente obtenidas
[DEBUG] Citas próximas calculadas
```

#### 🧪 Test Manual:
1. Crea una cita para dentro de 4 horas (usa el panel de admin)
2. Recarga la pantalla de citas
3. Verifica que aparece el banner ROJO "🚨 Cita Muy Próxima"

---

### 3️⃣ **Pantalla "Mis Medicamentos"**

#### Pasos:
1. Toca el botón "💊 Mis Medicamentos"
2. Observa la pantalla

#### ✅ Qué verificar:
- [ ] **Banner de Próximo Medicamento**: Si hay medicamento en < 2h, debe aparecer banner
- [ ] **Color del banner**: 
  - AMARILLO si falta entre 30 min y 2 horas
  - ROJO si falta menos de 30 minutos
- [ ] **Barra de Progreso**: Debe aparecer si hay medicamentos, mostrando progreso del día
- [ ] **Countdown funciona**: El tiempo restante debe actualizarse cada minuto
- [ ] **TTS funciona**: Al tocar el banner, debe hablar el recordatorio

#### 📝 Logs esperados:
```
[DEBUG] MisMedicamentos: Cargando medicamentos
[INFO] ✅ Medicamentos cargados exitosamente
[DEBUG] useMedicationReminders: Actualizando recordatorios...
```

#### 🧪 Test Manual:
1. Asegúrate de tener un medicamento con horario en las próximas 2 horas
2. Verifica que aparece el banner
3. Observa que el countdown se actualiza cada minuto

---

### 4️⃣ **Indicador de Estado de Salud**

#### Pasos:
1. Navega a "📋 Mi Historia" o "💓 Signos Vitales"
2. Observa el indicador de salud

#### ✅ Qué verificar:
- [ ] **Semáforo Verde**: Si todos los signos vitales están normales
- [ ] **Semáforo Amarillo**: Si algún valor está fuera de rango pero no crítico
- [ ] **Semáforo Rojo**: Si algún valor está crítico
- [ ] **Etiqueta descriptiva**: Debe mostrar el motivo del estado

#### 📝 Rangos de Prueba:
- **Normal**: Presión 120/80, FC 75, Temp 36.5°C, SatO2 98%
- **Warning**: Presión 135/88, FC 105, Temp 37.5°C
- **Critical**: Presión 150/95, SatO2 88%, Glucosa 140

---

### 5️⃣ **Sistema de Notificaciones Locales**

#### Pasos:
1. Verifica permisos de notificaciones en Android
2. Configura medicamentos y citas próximas
3. Espera a que se programen las notificaciones

#### ✅ Qué verificar:
- [ ] **Permisos solicitados**: La app debe solicitar permisos de notificaciones
- [ ] **Notificaciones programadas**: No debe haber errores en consola
- [ ] **Notificación de medicamento**: Debe aparecer 30 min antes del horario
- [ ] **Notificación de cita**: Debe aparecer 24h y 5h antes de la cita

#### 📝 Logs esperados:
```
[INFO] Notificación programada
[DEBUG] useNotificationManager: Programando notificaciones...
```

#### 🧪 Test Manual:
1. Crea un medicamento con horario en 35 minutos
2. Espera a que pase el tiempo
3. Verifica que aparece la notificación 30 minutos antes

---

## 🔧 Verificación Técnica (Consola)

### Verificar que no hay errores:
```javascript
// En la consola de React Native, busca:
- ❌ ReferenceError
- ❌ TypeError
- ❌ Cannot read property
- ❌ Property doesn't exist
```

### Verificar logs de recordatorios:
```javascript
// Debes ver logs como:
[DEBUG] Citas próximas calculadas
[DEBUG] useReminders: Actualizando recordatorios...
[INFO] Notificación programada
```

### Verificar que los hooks funcionan:
```javascript
// En la consola, puedes inspeccionar:
- useReminders está importado y funcionando
- useHealthStatus está calculando correctamente
- useNotificationManager está programando notificaciones
```

---

## 🐛 Problemas Comunes y Soluciones

### ❌ No aparecen badges en pantalla principal
**Solución:**
1. Verifica que hay datos (citas, medicamentos) en la base de datos
2. Verifica que los datos están en el rango correcto (24h para citas, 2h para medicamentos)
3. Revisa la consola para errores

### ❌ No aparecen banners de recordatorio
**Solución:**
1. Verifica que los datos cumplen los criterios (tiempo restante)
2. Verifica que los imports están correctos
3. Revisa los logs en consola

### ❌ Las notificaciones no aparecen
**Solución:**
1. Verifica permisos de Android en Configuración > Apps > Clínica Móvil > Notificaciones
2. Verifica que el permiso `SCHEDULE_EXACT_ALARM` está en el manifest
3. Revisa logs de `localNotificationService`

### ❌ El indicador de salud siempre muestra "normal"
**Solución:**
1. Verifica que hay signos vitales registrados
2. Verifica que los valores están fuera de rango para probar
3. Revisa los logs de `useHealthStatus`

---

## 📊 Datos de Prueba Recomendados

### Para probar recordatorios de citas:
```sql
-- Cita en 4 horas (banner ROJO)
INSERT INTO citas (id_paciente, fecha_cita, motivo, ...)
VALUES (7, DATE_ADD(NOW(), INTERVAL 4 HOUR), 'Consulta urgente', ...);

-- Cita en 20 horas (banner AMARILLO)
INSERT INTO citas (id_paciente, fecha_cita, motivo, ...)
VALUES (7, DATE_ADD(NOW(), INTERVAL 20 HOUR), 'Control', ...);
```

### Para probar recordatorios de medicamentos:
```sql
-- Medicamento en 1 hora (banner AMARILLO)
INSERT INTO plan_medicacion (id_paciente, ...)
VALUES (7, ...);
-- Con horario: DATE_ADD(NOW(), INTERVAL 1 HOUR)

-- Medicamento en 25 minutos (banner ROJO)
-- Con horario: DATE_ADD(NOW(), INTERVAL 25 MINUTE)
```

### Para probar indicador de salud:
```sql
-- Signos vitales normales
INSERT INTO signos_vitales (id_paciente, presion_sistolica, presion_diastolica, ...)
VALUES (7, 120, 80, 75, 36.5, 98, ...);

-- Signos vitales críticos
INSERT INTO signos_vitales (id_paciente, presion_sistolica, presion_diastolica, ...)
VALUES (7, 150, 95, 105, 38.5, 88, ...);
```

---

## ✅ Checklist Final

Antes de considerar que todo funciona:

- [ ] ✅ Badges aparecen en pantalla principal
- [ ] ✅ Banners de recordatorio funcionan en Mis Citas
- [ ] ✅ Banners de recordatorio funcionan en Mis Medicamentos
- [ ] ✅ Barra de progreso muestra datos correctos
- [ ] ✅ Indicador de salud funciona correctamente
- [ ] ✅ Notificaciones se programan sin errores
- [ ] ✅ Countdowns se actualizan en tiempo real
- [ ] ✅ TTS funciona al tocar banners
- [ ] ✅ No hay errores en consola
- [ ] ✅ La aplicación no se cierra inesperadamente

---

## 🎯 Pruebas de Rendimiento

### Verificar que no hay bucles infinitos:
- [ ] Los logs no se repiten constantemente
- [ ] La aplicación no se congela
- [ ] El consumo de batería es razonable

### Verificar que los datos se actualizan:
- [ ] Los recordatorios se actualizan cada minuto (medicamentos)
- [ ] Los recordatorios se actualizan cada 5 minutos (citas)
- [ ] El estado de salud se actualiza cuando cambian los signos vitales

---

## 📝 Notas Adicionales

1. **Permisos Android**: En Android 12+, el permiso `SCHEDULE_EXACT_ALARM` puede no estar disponible. El sistema usará alarmas aproximadas automáticamente.

2. **Tiempo de Actualización**: Los recordatorios se actualizan automáticamente, pero puede haber un pequeño retraso (1-5 minutos).

3. **Notificaciones**: Las notificaciones locales solo funcionan cuando la app está en segundo plano o cerrada. En primer plano, usa los banners.

4. **Estado de Salud**: Los umbrales pueden ajustarse en `useHealthStatus.js` según necesidades médicas específicas.

---

## 🚀 Siguiente Paso

Una vez verificadas todas las funcionalidades, puedes:
1. Ajustar los umbrales según necesidades
2. Personalizar los mensajes de los banners
3. Agregar más tipos de recordatorios
4. Implementar notificaciones push desde el backend



