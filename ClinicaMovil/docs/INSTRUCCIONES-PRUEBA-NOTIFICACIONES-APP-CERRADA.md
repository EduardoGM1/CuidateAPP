# 🧪 Guía de Prueba: Notificaciones con App Cerrada

## 📋 Objetivo
Verificar que las notificaciones programadas funcionan correctamente incluso cuando la aplicación está completamente cerrada.

## ⚙️ Configuración Requerida

### Android
1. **Permisos de Notificaciones**
   - Asegúrate de que la app tenga permisos de notificaciones habilitados
   - Configuración → Apps → Clínica Móvil → Notificaciones → Permitir

2. **Optimización de Batería** (Importante)
   - Configuración → Apps → Clínica Móvil → Optimización de batería
   - Seleccionar "No optimizar"
   - Esto permite que las notificaciones funcionen en modo Doze

3. **Permisos de Alarma Exacta** (Android 12+)
   - Si el sistema lo solicita, otorgar permisos de alarma exacta
   - Configuración → Apps → Clínica Móvil → Permisos especiales → Alarma exacta

### iOS
1. **Permisos de Notificaciones**
   - Asegúrate de que la app tenga permisos de notificaciones habilitados
   - Configuración → Clínica Móvil → Notificaciones → Permitir notificaciones

## 🧪 Pasos para Probar

### Método 1: Usando el Panel de Pruebas

1. **Abrir la App**
   - Inicia sesión como paciente
   - Ve al dashboard principal

2. **Programar Notificación de Prueba**
   - En el panel de pruebas (🧪 Panel de Pruebas), toca el botón:
     - **"🧪 Probar con App Cerrada (2 min)"**
   - La app programará una notificación para 2 minutos

3. **Cerrar la App Completamente**
   - **IMPORTANTE**: Cierra la app completamente, no solo minimízala
   - En Android: Toca el botón de "Aplicaciones recientes" y desliza la app hacia arriba
   - En iOS: Desliza hacia arriba desde la parte inferior y cierra la app

4. **Esperar**
   - Espera 2 minutos (o el tiempo que programaste)
   - No abras la app durante este tiempo

5. **Verificar**
   - La notificación debería aparecer automáticamente en el tiempo programado
   - Si aparece, significa que funciona correctamente ✅
   - Si no aparece, revisa la configuración de permisos y optimización de batería

### Método 2: Prueba con Medicamentos Reales

1. **Programar Medicamentos**
   - Ejecuta el script: `node api-clinica/scripts/modificar-horarios-eduardo-especificos.js`
   - Esto configura medicamentos para 6:05 PM y 6:10 PM

2. **Abrir la App**
   - Inicia sesión como paciente Eduardo
   - Ve al dashboard principal
   - La app programará automáticamente las notificaciones

3. **Cerrar la App**
   - Cierra la app completamente

4. **Esperar al Horario**
   - Espera hasta 17:35 (30 min antes de 18:05) para el recordatorio
   - O hasta 18:05 para la notificación urgente

5. **Verificar**
   - Las notificaciones deberían aparecer automáticamente

## 🔍 Verificación de Notificaciones Programadas

### Desde la App
1. En el panel de pruebas, toca "Ver Notificaciones Programadas"
2. Verás todas las notificaciones programadas con sus fechas
3. Revisa en la consola del logger para más detalles

### Desde el Sistema
- **Android**: Configuración → Notificaciones → Historial de notificaciones
- **iOS**: No hay forma directa, pero puedes verificar en la app

## ⚠️ Problemas Comunes y Soluciones

### Problema: La notificación no aparece

**Solución 1: Verificar Permisos**
- Asegúrate de que los permisos de notificaciones estén habilitados
- Revisa que la optimización de batería esté desactivada

**Solución 2: Verificar Hora del Sistema**
- Asegúrate de que la hora del dispositivo esté correcta
- Las notificaciones programadas usan la hora del sistema

**Solución 3: Verificar Modo Doze (Android)**
- Si el dispositivo está en modo Doze profundo, las notificaciones pueden retrasarse
- Desactiva la optimización de batería para la app

**Solución 4: Verificar Permisos de Alarma Exacta**
- En Android 12+, otorga permisos de alarma exacta
- Configuración → Apps → Clínica Móvil → Permisos especiales

### Problema: La notificación aparece tarde

**Explicación:**
- En Android, el modo Doze puede retrasar notificaciones hasta 15 minutos
- Esto es normal y es una limitación del sistema operativo
- Con `allowWhileIdle: true`, el retraso debería ser mínimo

**Solución:**
- Desactiva la optimización de batería para la app
- Asegúrate de que `allowWhileIdle: true` esté configurado (ya está implementado)

## ✅ Checklist de Prueba

Antes de probar, verifica:

- [ ] Permisos de notificaciones habilitados
- [ ] Optimización de batería desactivada (Android)
- [ ] Permisos de alarma exacta otorgados (Android 12+)
- [ ] Hora del dispositivo correcta
- [ ] App completamente cerrada (no solo minimizada)
- [ ] Espera el tiempo completo programado

## 📊 Resultados Esperados

### ✅ Éxito
- La notificación aparece en el tiempo programado
- La notificación muestra el título y mensaje correctos
- La notificación aparece incluso con la app cerrada

### ❌ Falla
- La notificación no aparece en absoluto
- La notificación aparece muy tarde (>15 minutos de retraso)
- La notificación solo aparece cuando abres la app

## 🔧 Configuración Técnica

### Implementación Actual

```javascript
// Configuración para que funcione con app cerrada
{
  allowWhileIdle: true,  // Android: permite activación en modo Doze
  wakeUp: true,           // iOS: despierta dispositivo si está dormido
  importance: 'high',     // Android: importancia alta
  priority: 'high',       // Android: prioridad alta
}
```

### Permisos en AndroidManifest.xml

```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

## 📝 Notas Importantes

1. **Las notificaciones locales programadas son gestionadas por el sistema operativo**, no por la app
2. Una vez programadas, el sistema las ejecuta automáticamente
3. **No necesitas mantener la app abierta** para que funcionen
4. El sistema puede retrasar notificaciones en modo Doze, pero deberían aparecer eventualmente
5. En iOS, las notificaciones funcionan muy confiablemente cuando la app está cerrada

## 🎯 Próximos Pasos

Si las notificaciones funcionan correctamente:
- ✅ El sistema está configurado correctamente
- ✅ Los usuarios pueden recibir recordatorios de medicamentos y citas
- ✅ Las notificaciones funcionan incluso con la app cerrada

Si las notificaciones no funcionan:
- Revisa la configuración de permisos
- Verifica la optimización de batería
- Consulta los logs del sistema para más detalles


