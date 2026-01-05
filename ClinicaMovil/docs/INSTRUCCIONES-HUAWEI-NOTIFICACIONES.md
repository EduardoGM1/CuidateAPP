# 📱 Configuración Específica para Huawei Nova Y90

## ⚠️ IMPORTANTE: Huawei/EMUI tiene configuraciones muy restrictivas

Huawei tiene un sistema muy agresivo de gestión de batería que puede impedir que las notificaciones funcionen con la app cerrada. Sigue estos pasos **EXACTAMENTE**:

## 🔧 Pasos Obligatorios para Huawei

### 1. **Desactivar Optimización de Batería** (CRÍTICO)

**Método 1: Desde Configuración**
1. Ve a **Ajustes** → **Aplicaciones** → **Aplicaciones**
2. Busca **Clínica Móvil**
3. Toca en **Batería**
4. Selecciona **"No optimizar"** o **"Gestionar manualmente"**
5. Activa **"Activación del sistema"**
6. Activa **"Activación automática"**
7. Desactiva **"Cerrar cuando se bloquee la pantalla"**

**Método 2: Desde Administrador del Teléfono**
1. Abre **Administrador del teléfono** (Phone Manager)
2. Ve a **Gestor de batería**
3. Toca **Aplicaciones protegidas**
4. Busca **Clínica Móvil** y **ACTÍVALA** (marca el switch)
5. Esto evita que el sistema cierre la app

### 2. **Agregar a Aplicaciones Protegidas** (MUY IMPORTANTE)

1. Abre **Administrador del teléfono**
2. Ve a **Gestor de batería**
3. Toca **Aplicaciones protegidas**
4. Busca **Clínica Móvil**
5. **ACTIVA el switch** (debe estar en verde/azul)

### 3. **Configurar Notificaciones**

1. Ve a **Ajustes** → **Aplicaciones** → **Aplicaciones**
2. Busca **Clínica Móvil**
3. Toca en **Notificaciones**
4. Activa **"Permitir notificaciones"**
5. Activa **"Mostrar en pantalla bloqueada"**
6. Activa **"Sonido"** y **"Vibración"**
7. Activa **"Importancia alta"** o **"Urgente"**

### 4. **Activar Datos en Segundo Plano**

1. Mantén presionado el ícono de **Clínica Móvil** en la pantalla de inicio
2. Toca en **Información de la aplicación** (ícono "i")
3. Toca en **Datos móviles y Wi-Fi**
4. Activa **"Datos en segundo plano"**
5. Activa **"Permitir uso de datos en segundo plano"**

### 5. **Desactivar Pausa de Actividad**

1. Mantén presionado el ícono de **Clínica Móvil** en la pantalla de inicio
2. Toca en **Información de la aplicación** (ícono "i")
3. Busca **"Pausar actividad de la aplicación si no se usa"**
4. **DESACTÍVALA** (debe estar apagada)

### 6. **Configurar Permisos de Inicio Automático** (EMUI)

1. Ve a **Ajustes** → **Aplicaciones** → **Inicio automático**
2. Busca **Clínica Móvil**
3. **ACTIVA el switch** para permitir inicio automático

### 7. **Configurar Permisos de Alarma Exacta** (Android 12+)

1. Ve a **Ajustes** → **Aplicaciones** → **Permisos especiales**
2. Toca en **Alarma exacta**
3. Busca **Clínica Móvil**
4. **ACTIVA el permiso**

### 8. **Desactivar Aviso de Alto Consumo**

1. Ve a **Ajustes** → **Aplicaciones** → **Aplicaciones**
2. Busca **Clínica Móvil**
3. Toca en **Batería**
4. Desactiva **"Aviso de alto consumo de energía"**

## 🧪 Probar las Notificaciones

Después de realizar TODOS los pasos anteriores:

1. **Abre la app**
2. Ve al panel de pruebas (🧪 Panel de Pruebas)
3. Toca **"🧪 Probar con App Cerrada (15 seg)"**
4. **Cierra la app COMPLETAMENTE**:
   - Toca el botón de aplicaciones recientes
   - Desliza la app hacia arriba para cerrarla
5. **Espera 15 segundos**
6. La notificación debería aparecer

## ✅ Verificación

Si después de todos estos pasos aún no funciona:

1. **Reinicia el dispositivo** (importante después de cambiar configuraciones)
2. **Vuelve a abrir la app** una vez después del reinicio
3. **Programa una nueva notificación de prueba**
4. **Cierra la app completamente**
5. **Espera**

## 🔍 Solución de Problemas Adicionales

### Si aún no funciona:

**Opción 1: Usar Modo de Desarrollo**
- En el panel de pruebas, verifica que el modo de prueba esté activado
- Las notificaciones en modo prueba se activan más rápido

**Opción 2: Verificar Hora del Sistema**
- Asegúrate de que la hora del dispositivo esté correcta
- Las notificaciones programadas usan la hora del sistema

**Opción 3: Verificar Versión de EMUI**
- Algunas versiones de EMUI tienen restricciones adicionales
- Verifica que tengas la última actualización del sistema

## 📝 Notas Específicas para Huawei

- **Huawei es muy agresivo** con la gestión de batería
- Puede ser necesario configurar **TODOS** los pasos anteriores
- Algunos modelos de Huawei requieren configuraciones adicionales
- **Reinicia el dispositivo** después de cambiar configuraciones

## 🎯 Resumen de Configuraciones Críticas

Para que funcione en Huawei, necesitas:

1. ✅ Desactivar optimización de batería
2. ✅ Agregar a aplicaciones protegidas
3. ✅ Activar inicio automático
4. ✅ Permitir datos en segundo plano
5. ✅ Desactivar pausa de actividad
6. ✅ Configurar notificaciones (importancia alta)
7. ✅ Permitir alarma exacta (Android 12+)
8. ✅ Reiniciar el dispositivo

## ⚠️ Limitaciones Conocidas de Huawei

- Huawei puede seguir retrasando notificaciones incluso con todas las configuraciones
- El modo Doze de Huawei es más agresivo que en otros Android
- Algunas notificaciones pueden tener un retraso de 1-2 minutos
- Las notificaciones programadas pueden no ser 100% exactas en tiempo

## 💡 Alternativa: Notificaciones Push

Si las notificaciones locales no funcionan de forma confiable en Huawei, considera:
- Usar notificaciones push desde el servidor (FCM)
- Las notificaciones push funcionan mejor en Huawei que las locales programadas


