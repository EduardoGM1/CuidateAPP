# 📋 INSTRUCCIONES DE IMPLEMENTACIÓN - MEJORAS DE SEGURIDAD

**Fecha:** 30 de Diciembre, 2025

---

## 🚀 PASOS PARA IMPLEMENTAR

### **Paso 1: Configurar Variables de Entorno**

Editar archivo `.env` en `api-clinica/`:

```env
# ============================================
# ENCRIPTACIÓN DE DATOS SENSIBLES
# ============================================
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
ENCRYPTION_KEY=<tu-clave-64-bytes-en-hex>
ENCRYPTION_SALT=clinica-medica-salt-2025

# ============================================
# REFRESH TOKENS
# ============================================
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_REFRESH_SECRET=<tu-secreto-refresh-token-64-bytes>
ACCESS_TOKEN_EXPIRES_IN=1h
REFRESH_TOKEN_EXPIRES_IN=7d

# ============================================
# ROTACIÓN DE SECRETOS
# ============================================
JWT_SECRET_ROTATION_DAYS=90
```

**Generar claves:**
```bash
cd api-clinica

# Generar ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generar JWT_REFRESH_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### **Paso 2: Crear Backup de Base de Datos**

**⚠️ IMPORTANTE:** Crear backup antes de ejecutar migraciones:

```bash
# Windows (PowerShell)
mysqldump -u root -p clinica_db > backup-antes-seguridad-$(Get-Date -Format "yyyyMMdd").sql

# Linux/Mac
mysqldump -u root -p clinica_db > backup-antes-seguridad-$(date +%Y%m%d).sql
```

---

### **Paso 3: Ejecutar Migraciones**

```bash
cd api-clinica

# 1. Crear tabla refresh_tokens
node scripts/ejecutar-migracion-refresh-tokens.js

# 2. Alterar tabla pacientes para encriptación
node scripts/ejecutar-migracion-encriptacion-pacientes.js
```

**Verificar migraciones:**
```sql
-- Verificar tabla refresh_tokens
DESCRIBE refresh_tokens;

-- Verificar cambios en pacientes
DESCRIBE pacientes;
```

---

### **Paso 4: Reiniciar Servidor**

```bash
cd api-clinica

# Detener servidor actual (Ctrl+C)
# Reiniciar servidor
npm run dev
```

---

## 🧪 PRUEBAS DE FUNCIONALIDAD

### **1. Probar Encriptación Automática**

```bash
# Crear paciente nuevo (los campos se encriptan automáticamente)
curl -X POST http://localhost:3000/api/pacientes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan",
    "apellido_paterno": "Pérez",
    "fecha_nacimiento": "1990-01-01",
    "curp": "PEPJ900101HDFRZN01",
    "numero_celular": "5551234567",
    "direccion": "Calle 123, Col. Centro",
    "estado": "Ciudad de México",
    "sexo": "Hombre"
  }'

# Consultar paciente (los campos se desencriptan automáticamente)
curl -X GET http://localhost:3000/api/pacientes/<id> \
  -H "Authorization: Bearer <token>"
```

**Verificar en base de datos:**
```sql
-- Los campos deben estar encriptados (formato JSON)
SELECT curp, numero_celular, direccion FROM pacientes WHERE id_paciente = <id>;
-- Debe mostrar: {"encrypted":"...","iv":"...","authTag":"..."}
```

---

### **2. Probar Refresh Tokens**

```bash
# 1. Login (obtener access token y refresh token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }'

# Respuesta esperada:
# {
#   "success": true,
#   "token": "<access-token>",
#   "refresh_token": "<refresh-token>",
#   "expires_in": "1h",
#   "refresh_token_expires_in": "7d"
# }

# 2. Renovar access token usando refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh-token>"
  }'

# 3. Cerrar sesión (revocar refresh token)
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh-token>"
  }'

# 4. Cerrar todas las sesiones
curl -X POST http://localhost:3000/api/auth/logout-all \
  -H "Authorization: Bearer <access-token>"
```

---

### **3. Verificar Cron Jobs**

Los cron jobs se ejecutan automáticamente:
- **Limpieza de tokens expirados:** Diariamente a las 2 AM
- **Rotación de secretos:** Semanalmente (domingos a las 3 AM)

Verificar logs:
```bash
# Ver logs del servidor
tail -f logs/combined.log | grep -i "cron\|token\|rotation"
```

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### **Error: "ENCRYPTION_KEY debe estar definida en producción"**

**Solución:**
```bash
# Agregar ENCRYPTION_KEY al archivo .env
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")" >> .env
```

---

### **Error: "Refresh token inválido o expirado"**

**Causas posibles:**
1. Refresh token ya fue usado (rotación)
2. Refresh token fue revocado
3. Refresh token expiró

**Solución:**
- Hacer login nuevamente para obtener nuevos tokens

---

### **Error: "Error encriptando datos sensibles"**

**Causas posibles:**
1. ENCRYPTION_KEY no está definida
2. ENCRYPTION_KEY es inválida

**Solución:**
```bash
# Verificar variable de entorno
node -e "console.log(process.env.ENCRYPTION_KEY ? 'OK' : 'FALTA')"

# Regenerar clave
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copiar resultado al .env
```

---

### **Datos existentes no se encriptan automáticamente**

**Solución:**
Los datos existentes se encriptarán cuando se actualicen. Para encriptar todos los datos existentes:

```javascript
// Crear script: api-clinica/scripts/encriptar-datos-existentes.js
import { Paciente } from './models/associations.js';

async function encriptarDatosExistentes() {
  const pacientes = await Paciente.findAll();
  
  for (const paciente of pacientes) {
    // Los hooks encriptarán automáticamente al guardar
    await paciente.save();
    console.log(`Paciente ${paciente.id_paciente} encriptado`);
  }
  
  console.log('✅ Todos los datos encriptados');
}

encriptarDatosExistentes();
```

---

## 📊 VERIFICACIÓN FINAL

### **Checklist de Implementación:**

- [ ] Variables de entorno configuradas
- [ ] Backup de base de datos creado
- [ ] Migración de refresh_tokens ejecutada
- [ ] Migración de encriptación ejecutada
- [ ] Servidor reiniciado
- [ ] Login funciona con refresh tokens
- [ ] Encriptación automática funciona
- [ ] Cron jobs configurados

---

## 📞 SOPORTE

Si encuentras problemas:

1. **Verificar logs:**
   ```bash
   tail -f logs/error.log
   ```

2. **Verificar variables de entorno:**
   ```bash
   node -e "console.log(process.env.ENCRYPTION_KEY ? 'OK' : 'FALTA')"
   ```

3. **Verificar conexión a base de datos:**
   ```bash
   mysql -u root -p -e "USE clinica_db; SHOW TABLES;"
   ```

---

**Última Actualización:** 30 de Diciembre, 2025

