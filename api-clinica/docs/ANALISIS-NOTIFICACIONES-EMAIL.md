# Análisis: notificaciones por email

Estado de implementación de las notificaciones por email en la API (CuídateApp).

## Implementado

| Tipo | Descripción | Dónde se dispara |
|------|-------------|------------------|
| **Bienvenida** | Email al crear cuenta (registro o creación por admin) | `auth.js`: `register`, `createUsuario` |
| **Nuevo mensaje** | Aviso al destinatario del chat (doctor o paciente) | `mensajeChat.js`: al crear mensaje (POST /api/mensajes-chat), se envía al destinatario (por `Usuario.email`). Aplica tanto a mensajes enviados desde la **app web** como desde la **app móvil** (mismo endpoint). |
| **Nuevo paciente** | Aviso a quien creó el paciente y a lista opcional | `paciente.js`: `createPaciente`, `createPacienteCompleto`. Se envía a `req.user.email` y a `NOTIFY_NEW_PATIENT_EMAILS` (.env) |
| **Cita agendada** | Confirmación al paciente al crear cita | `cita.js`: `createCita` → email al `Usuario` del paciente |
| **Cita reprogramada** | Confirmación al paciente al reprogramar | `cita.js`: `reprogramarCita` → email al `Usuario` del paciente |
| **Alerta signos vitales** | Aviso a cada doctor asignado al paciente | `pacienteMedicalData.js`: al generar alertas en `createPacienteSignosVitales`, email al `Usuario` de cada doctor asignado |
| **Registro de signos vitales** | Aviso a cada doctor asignado al paciente | `pacienteMedicalData.js`: en cada registro en `createPacienteSignosVitales`, email al `Usuario` de cada doctor asignado (no solo cuando hay alerta) |

## Servicio de email

- **Archivo:** `api-clinica/services/emailService.js`
- **Métodos públicos:**  
  `sendWelcomeEmail`, `sendNewMessageNotification`, `sendPatientRegisteredNotification`,  
  `sendCitaConfirmationEmail`, `sendCitaReminderEmail`, `sendSignosVitalesAlertEmail`, `sendSignosVitalesRegistroEmail`
- **Helper interno:** `_sendGeneric(subject, text, to, tipo, datos)` — usa Resend o SMTP; no lanza si falla (notificaciones no críticas).

## Variable de entorno opcional

- **NOTIFY_NEW_PATIENT_EMAILS**: lista de emails separados por coma para recibir “nuevo paciente registrado” además del creador. Ejemplo: `admin@clinica.com,recepcion@clinica.com`

## Pendiente (opcional)

- **Recordatorio de cita 24 h antes:** un cron que liste citas del día siguiente y llame a `emailService.sendCitaReminderEmail` para cada paciente (email vía `Usuario` del paciente).

## Pruebas y diagnóstico

- **Script:** `api-clinica/scripts/test-notificaciones-email.js`
- **Uso:**
  - `npm run test:notificaciones` o `node scripts/test-notificaciones-email.js [email]`  
    → Envía las 7 notificaciones de prueba al email indicado (por defecto `eduardolalito99@hotmail.com`).
  - `node scripts/test-notificaciones-email.js --diagnostico [email]` (o `-d`)  
    → Comprueba en BD: Usuario con ese email, Doctor con ese `id_usuario`, y cuántos pacientes tiene asignados (útil para depurar por qué un doctor no recibe el email de “nuevo mensaje”).

## App móvil

Cuando un **paciente** envía un mensaje al doctor desde la app móvil (texto o audio), la app llama a `POST /api/mensajes-chat` igual que la web. El backend (`createMensaje` en `mensajeChat.js`) envía automáticamente:

- Notificación **push** al doctor (si tiene la app y token registrado).
- Email al doctor (si el `Usuario` del doctor tiene `email` en BD).

No hace falta ninguna lógica adicional en la app móvil: el envío de email lo hace siempre el servidor al crear el mensaje.

## Log de diagnóstico (nuevo mensaje)

En `controllers/mensajeChat.js`, antes de enviar el email de nuevo mensaje se registra en logs:

- `destinatarioIdUsuario`
- `emailTo` (enmascarado)
- `remitente`, `id_doctor`, `id_paciente`

Así se puede ver en los logs del API si el destinatario y el email se resuelven bien cuando un paciente escribe al doctor.
