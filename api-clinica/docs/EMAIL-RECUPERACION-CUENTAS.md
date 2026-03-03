# Email para recuperación de cuentas (opciones gratuitas)

El envío de emails de recuperación de contraseña (y notificaciones) soporta **dos proveedores gratuitos**. El backend usa el primero que esté configurado: **Resend** y, si no hay API key, **SMTP** (Nodemailer).

---

## Opción 1: Resend (recomendada)

- **Límites gratis:** 100 emails/día, 3.000 emails/mes.
- **Configuración:** solo una API key.
- **Dominio:** en plan gratis puedes enviar desde `onboarding@resend.dev`; si verificas un dominio, puedes usar `noreply@tudominio.com`.

### Pasos

1. Crear cuenta en [resend.com](https://resend.com).
2. En **API Keys** crear una clave y copiarla.
3. En tu `.env`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev
```

4. En producción, definir `FRONTEND_URL` para que el enlace de “Restablecer contraseña” apunte a tu app (ej. `https://tudominio.com`).

### Probar

```bash
npm run test:email -- tu-email@ejemplo.com
```

---

## Opción 2: SMTP (fallback)

Si no configuras `RESEND_API_KEY`, el servicio usará **Nodemailer** con SMTP. Puedes usar cualquiera de estos de forma gratuita:

| Proveedor   | Límite gratis (aprox.) | Configuración |
|------------|------------------------|----------------|
| **Brevo** (ex Sendinblue) | 300 emails/día        | Cuenta en brevo.com, SMTP: `smtp-relay.brevo.com:587` |
| **Gmail**  | 500/día (con “Contraseña de aplicación”) | Cuenta Google, activar 2FA, crear Contraseña de aplicación |
| **Outlook** | 300/día               | Cuenta Microsoft, SMTP: `smtp.office365.com:587` |

### Variables en `.env`

```env
EMAIL_FROM=Clínica <noreply@tudominio.com>
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=tu-email@ejemplo.com
SMTP_PASS=tu_contraseña_o_app_password
SMTP_SECURE=false
```

- **Gmail:** `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER` = tu Gmail, `SMTP_PASS` = [Contraseña de aplicación](https://myaccount.google.com/apppasswords) (no la contraseña normal).
- **Brevo:** en Brevo → SMTP & API → crear clave SMTP y usar ese usuario/contraseña.

---

## Flujo en la aplicación

1. **Solicitar recuperación:** el usuario ingresa su email en “¿Olvidaste tu contraseña?”.
2. **Backend:** `POST /api/auth/forgot-password` con `{ "email": "..." }`.
3. Se genera un token (válido 1 hora), se guarda en `password_reset_tokens` y se envía el email con el enlace.
4. **Restablecer:** el usuario abre el enlace (ej. `FRONTEND_URL/reset-password?token=...`) y envía la nueva contraseña con `POST /api/auth/reset-password`.

Si no hay ningún proveedor configurado (ni Resend ni SMTP), el token se crea igual pero el email no se envía y en logs aparecerá un aviso.

---

## Resumen de variables

| Variable        | Obligatoria | Descripción |
|----------------|------------|-------------|
| `RESEND_API_KEY` | No (si usas SMTP) | API key de Resend. |
| `EMAIL_FROM`     | No | Remitente (por defecto `onboarding@resend.dev` con Resend). |
| `FRONTEND_URL`   | Sí en producción | URL de la app web para el enlace de restablecer. |
| `SMTP_HOST`      | No (si usas Resend) | Servidor SMTP. |
| `SMTP_PORT`      | No | Puerto (por defecto 587). |
| `SMTP_USER`      | No | Usuario SMTP. |
| `SMTP_PASS`      | No | Contraseña o app password. |

Solo necesitas **una** de las dos opciones (Resend o SMTP) para que funcione el envío de emails de recuperación de cuentas.
