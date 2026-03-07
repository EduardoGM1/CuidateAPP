# Análisis: Sonido y vibración al mostrar notificación push

Objetivo: que cuando llegue una notificación push, el teléfono reproduzca sonido y/o active vibración (o alarma) de forma fiable, aprovechando lo ya implementado.

---

## 1. Qué hay implementado hoy

### 1.1 Canales de notificación (Android)

En **`localNotificationService.js`** existen dos canales:

| Canal ID                    | Uso              | Sonido   | Vibración |
|----------------------------|------------------|----------|-----------|
| `clinica-movil-reminders`  | Recordatorios, push general | `default` | sí        |
| `clinica-movil-alerts`     | Alertas de salud críticas   | **`alarm`** | sí        |

- Ambos se crean con `playSound: true`, `vibrate: true`, `importance: 4`.
- Las alertas críticas usan **`showCriticalAlert()`**, que ya usa el canal `clinica-movil-alerts` y **`soundName: 'alarm'`** (sonido tipo alarma).

### 1.2 Push en primer plano (app abierta)

En **`pushTokenService.js`** (listener `onMessage`):

- Se muestra la notificación con **`localNotificationService.showNotification()`**.
- Se pasan **`soundName: 'default'`, `playSound: true`, `vibrate: true`** y `channelId: 'clinica-movil-reminders'`.
- Es decir, ya se pide sonido y vibración para push en foreground.

### 1.3 Push en segundo plano / app cerrada (Android)

- El **servidor** (API) envía el mensaje FCM con:
  - `android.notification.sound: 'default'`
  - `android.notification.channel_id: 'clinica-movil-reminders'`
  - `android.priority: 'high'`
- **Android/FCM** es quien muestra la notificación usando ese canal.
- El canal `clinica-movil-reminders` se crea en la app (al arrancar/configurar) con sonido y vibración; si el canal existe y está bien configurado, el sistema **debería** reproducir sonido y vibrar.
- **`CustomFirebaseMessagingService.kt`** solo reenvía el mensaje a JS; **no** construye la notificación en segundo plano; la construye el SDK de FCM a partir del payload.

### 1.4 Servidor (API)

En **`api-clinica/services/pushNotificationService.js`** (`sendFCMNotification`):

- Ya se envía `sound: 'default'` y `channel_id: 'clinica-movil-reminders'`.
- No se envían `defaultSound`, `defaultVibrateTimings` ni patrones de vibración explícitos.

### 1.5 Otras piezas relacionadas

- **Alertas in-app**: `alertService.js` usa `localNotificationService` (alertas y críticas con `alarm`).
- **Firebase (app)**: `firebase.json` tiene `messaging_android_notification_channel_id: "clinica-movil-reminders"` (coherente con el servidor).
- **Sonido in-app**: `audioFeedbackService`, `audioService`, TTS; no afectan al sonido de la notificación del sistema.

---

## 2. Por qué a veces no suena o no vibra

Posibles causas con lo actual:

1. **Canal creado sin sonido/vibración en algún dispositivo**  
   Si en algún flujo el canal se crea con opciones distintas o hay error al crear, el canal puede quedar sin sonido.

2. **Payload FCM incompleto**  
   En Android 8+ el sonido/vibración del canal se respetan, pero indicar en el payload `defaultSound: true` y `defaultVibrateTimings: true` refuerza el comportamiento esperado.

3. **Configuración del usuario**  
   Si el usuario ha silenciado el canal “Recordatorios” o el dispositivo está en “No molestar”, el sistema no reproducirá sonido (comportamiento estándar).

4. **Tipo de notificación**  
   Todas las push se envían al canal “recordatorios” con sonido `default`. Para alertas importantes (p. ej. signos vitales) podría usarse el canal **alertas** (`clinica-movil-alerts`) con sonido **alarma**, que ya existe en la app.

---

## 3. Mejor solución (sin cambiar flujos a fondo)

Objetivo: maximizar que el teléfono **reproduzca sonido y vibre** cuando llegue una push, respetando lo ya implementado (canales, alertas, API).

### 3.1 Servidor (API) – FCM payload Android

En **`pushNotificationService.js`**, dentro de `android.notification`:

- Añadir **`defaultSound: true`** para usar el sonido por defecto del sistema cuando el canal lo permita.
- Añadir **`defaultVibrateTimings: true`** para usar el patrón de vibración por defecto.
- Opcional: para notificaciones que quieras más “urgentes” (p. ej. alertas de signos vitales), enviar **`channel_id: 'clinica-movil-alerts'`** en lugar de `clinica-movil-reminders`, para que usen el canal que ya tiene **sonido tipo alarma** en la app.

Ventaja: un solo cambio en el backend; todos los clientes se benefician sin actualizar la app.

### 3.2 App – Canales (localNotificationService.js)

- Asegurar que al crear **`clinica-movil-reminders`** y **`clinica-movil-alerts`** se usen siempre `playSound: true`, `vibrate: true` y, en alerts, `soundName: 'alarm'` (ya está así; solo verificar que no haya ramas que creen el canal con otras opciones).
- Opcional: en el canal de recordatorios, si la librería lo permite, usar un patrón de vibración más largo (p. ej. `[0, 200, 100, 200]`) para hacer la vibración más visible sin cambiar de canal.

### 3.3 App – Foreground (pushTokenService.js)

- Ya se pasa `playSound: true`, `vibrate: true` y `channelId: 'clinica-movil-reminders'`.
- Opcional: para notificaciones que el backend marque como “alerta” (p. ej. por `type` o un flag), usar **`channelId: 'clinica-movil-alerts'`** y **`soundName: 'alarm'`** al llamar a `showNotification`, para alinear con el canal de alertas y el sonido tipo alarma.

### 3.4 App – Nativo Android (opcional, solo si hace falta)

- **CustomFirebaseMessagingService.kt** hoy no construye la notificación en background; FCM lo hace con el payload. No es necesario tocar Kotlin para sonido/vibración si el payload y los canales están bien.
- Solo si en ciertos dispositivos/versiones el sonido no se respeta, se podría valorar construir la notificación manualmente en `onMessageReceived` con `NotificationCompat`, usando el mismo `channel_id` y estableciendo sonido y vibración explícitos (redundante con el payload pero más control).

---

## 4. Resumen recomendado

| Dónde              | Qué hacer                                                                 | Prioridad |
|--------------------|---------------------------------------------------------------------------|-----------|
| **API (FCM payload)** | Añadir `defaultSound: true` y `defaultVibrateTimings: true` en `android.notification`. Para alertas (ej. signos vitales), usar `channel_id: 'clinica-movil-alerts'`. | Alta      |
| **App (foreground)** | Mantener `playSound`/`vibrate`; opcionalmente usar canal `clinica-movil-alerts` + `soundName: 'alarm'` para notificaciones tipo alerta. | Media     |
| **App (canales)**  | Verificar que ambos canales se creen siempre con sonido y vibración; opcional: patrón de vibración más largo en recordatorios. | Media     |
| **Nativo Android** | Solo si sigue fallando en algunos dispositivos: construir notificación en Kotlin con sonido/vibración explícitos. | Baja      |

Con esto se consigue que, cuando una notificación push se muestre, el teléfono use el sonido y la vibración del sistema (o la “alarma” en alertas) de forma coherente con la configuración actual de canales y alertas, sin duplicar lógica y manteniendo una sola fuente de verdad para “alertas” (canal + sonido alarma) y “recordatorios” (canal + sonido default).
