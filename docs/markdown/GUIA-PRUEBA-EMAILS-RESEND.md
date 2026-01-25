# 📧 Guía: Prueba de Envío de Emails con Resend

**Fecha:** 2025-01-01

---

## 📋 Resumen

Esta guía explica cómo probar que el servicio de envío de emails con Resend funciona correctamente.

---

## 🔧 Configuración Requerida

### 1. Variables de Entorno

Asegúrate de tener configuradas estas variables en tu archivo `.env`:

```env
# API Key de Resend (obligatoria)
RESEND_API_KEY=re_tu_api_key_aqui

# Email remitente (opcional, por defecto usa onboarding@resend.dev)
EMAIL_FROM=tu-email@tudominio.com

# URL del frontend (para links en emails)
FRONTEND_URL=http://localhost:3000
# O
APP_URL=http://localhost:3000
```

### 2. Obtener API Key de Resend

1. Ve a https://resend.com
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** en el dashboard
4. Crea una nueva API key
5. Copia la key y agrégala a tu `.env`

---

## 🧪 Métodos de Prueba

### Método 1: Script de Prueba Simple (Recomendado)

Prueba el envío de un email de prueba básico:

```bash
# Desde la raíz del proyecto
cd api-clinica

# Ejecutar script de prueba
node scripts/test-resend-email.js tu-email@ejemplo.com

# O usando npm
npm run test:email -- tu-email@ejemplo.com
```

**Qué hace:**
- ✅ Verifica que `RESEND_API_KEY` esté configurada
- ✅ Envía un email de prueba HTML
- ✅ Muestra el resultado (éxito o error)
- ✅ Proporciona soluciones para errores comunes

**Salida esperada:**
```
📧 ============================================
PRUEBA DE ENVÍO DE EMAIL CON RESEND
============================================

✅ Configuración encontrada:
   API Key: re_1234567...abcd
   Email From: onboarding@resend.dev
   Email Destino: tu-email@ejemplo.com

📤 Enviando email de prueba...

✅ Email enviado exitosamente!

📧 Detalles del envío:
   Email ID: abc123...
   Destinatario: tu-email@ejemplo.com
   Asunto: Prueba de Email - Clínica
   Fecha: 01/01/2025, 12:00:00
```

---

### Método 2: Prueba de Email de Recuperación de Contraseña

Prueba el flujo completo de recuperación de contraseña:

```bash
# Ejecutar script de prueba de recuperación
node scripts/test-email-password-reset.js doctor@ejemplo.com

# O usando npm
npm run test:email:reset -- doctor@ejemplo.com
```

**Qué hace:**
- ✅ Usa el servicio real de email (`emailService.js`)
- ✅ Genera un token de recuperación simulado
- ✅ Envía el email con el template HTML real
- ✅ Muestra la URL de recuperación generada

**Salida esperada:**
```
📧 ============================================
PRUEBA DE EMAIL DE RECUPERACIÓN DE CONTRASEÑA
============================================

📬 Email destino: doctor@ejemplo.com

🔑 Token generado (primeros 30 caracteres): abc123def456...
🔗 URL de recuperación: http://localhost:3000/reset-password?token=abc123...

📤 Enviando email de recuperación de contraseña...

✅ Email enviado exitosamente!
```

---

### Método 3: Prueba desde la API (Flujo Real)

Prueba el flujo completo usando el endpoint real:

```bash
# 1. Iniciar el servidor
npm start

# 2. En otra terminal, hacer request a forgot-password
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "doctor@ejemplo.com"}'
```

**Qué hace:**
- ✅ Usa el endpoint real `/api/auth/forgot-password`
- ✅ Crea un token real en la base de datos
- ✅ Envía el email usando el servicio
- ✅ Registra el evento en auditoría

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Si el email existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña."
}
```

---

## 🔍 Verificación

### 1. Revisar Bandeja de Entrada

- ✅ Revisa tu bandeja de entrada
- ✅ Revisa la carpeta de **Spam/Correo no deseado**
- ✅ Verifica que el email llegó correctamente

### 2. Verificar Contenido del Email

El email debe contener:
- ✅ Asunto correcto
- ✅ HTML renderizado correctamente
- ✅ Link de recuperación funcional
- ✅ Información de seguridad (expiración, advertencias)

### 3. Verificar Logs

Revisa los logs del servidor para confirmar:
- ✅ Email enviado exitosamente
- ✅ Email ID de Resend
- ✅ Sin errores

---

## ❌ Errores Comunes y Soluciones

### Error: "invalid_from_address"

**Causa:** El email remitente no está verificado en Resend.

**Solución:**
1. Ve a https://resend.com/domains
2. Verifica tu dominio, O
3. Usa el email de prueba: `onboarding@resend.dev` (solo para desarrollo)

**Configuración:**
```env
EMAIL_FROM=onboarding@resend.dev
```

---

### Error: "invalid_api_key"

**Causa:** La API key no es válida o no está configurada.

**Solución:**
1. Verifica que `RESEND_API_KEY` esté en `.env`
2. Verifica que la key sea correcta (sin espacios)
3. Obtén una nueva key en https://resend.com/api-keys

**Configuración:**
```env
RESEND_API_KEY=re_tu_api_key_aqui
```

---

### Error: "rate_limit_exceeded"

**Causa:** Has excedido el límite de envíos del plan gratuito.

**Solución:**
1. Espera unos minutos
2. O actualiza tu plan en Resend
3. El plan gratuito permite 100 emails/día

---

### Error: "Resend no está configurado"

**Causa:** `RESEND_API_KEY` no está en `.env`.

**Solución:**
1. Agrega `RESEND_API_KEY` a tu `.env`
2. Reinicia el servidor

---

## 📊 Verificación de Estado

### Verificar Configuración

```bash
# Verificar que las variables estén configuradas
node -e "require('dotenv').config(); console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Configurada' : '❌ No configurada');"
```

### Verificar Instalación de Resend

```bash
# Verificar que Resend esté instalado
npm list resend
```

---

## 🎯 Checklist de Prueba

- [ ] `RESEND_API_KEY` configurada en `.env`
- [ ] `EMAIL_FROM` configurado (o usando default)
- [ ] Resend instalado (`npm install resend`)
- [ ] Script de prueba ejecutado exitosamente
- [ ] Email recibido en bandeja de entrada
- [ ] HTML renderizado correctamente
- [ ] Links funcionan correctamente
- [ ] Logs muestran éxito

---

## 📝 Notas Importantes

1. **Plan Gratuito de Resend:**
   - 100 emails/día
   - Solo emails de prueba (`onboarding@resend.dev`)
   - Para producción, verifica tu dominio

2. **Desarrollo vs Producción:**
   - En desarrollo, los emails se loguean en consola
   - En producción, se envían realmente
   - Siempre verifica en desarrollo antes de producción

3. **Seguridad:**
   - Nunca commitees tu `RESEND_API_KEY` al repositorio
   - Usa `.env` y agrégalo a `.gitignore`
   - Rota las keys periódicamente

---

## 🔗 Referencias

- **Resend Dashboard:** https://resend.com
- **Resend Docs:** https://resend.com/docs
- **API Keys:** https://resend.com/api-keys
- **Domains:** https://resend.com/domains

---

**Documento generado:** 2025-01-01

