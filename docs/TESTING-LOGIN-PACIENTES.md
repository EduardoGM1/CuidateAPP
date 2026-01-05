# 🧪 GUÍA COMPLETA DE TESTING - Login y Registro de Pacientes

## 📋 ÍNDICE
1. [Scripts Automatizados](#scripts-automatizados)
2. [Testing Manual - Backend](#testing-manual---backend)
3. [Testing Manual - Frontend](#testing-manual---frontend)
4. [Casos de Prueba](#casos-de-prueba)
5. [Verificación de Endpoints](#verificación-de-endpoints)
6. [Checklist de Validación](#checklist-de-validación)

---

## 🤖 SCRIPTS AUTOMATIZADOS

### **Script 1: Pruebas de Autenticación**
**Archivo**: `api-clinica/scripts/test-paciente-auth.js`

**Ejecutar**:
```bash
cd api-clinica
node scripts/test-paciente-auth.js
```

**Qué prueba**:
- ✅ Setup PIN (creación de registros)
- ✅ Login con PIN correcto
- ✅ Login con PIN incorrecto
- ✅ Bloqueo de cuenta (3 intentos)
- ✅ Validaciones (formato, PINs débiles)
- ✅ Relaciones de base de datos
- ✅ Flujo completo de login
- ✅ Generación y validación de tokens JWT

**Salida esperada**:
```
✅ Pruebas pasadas: 34
❌ Pruebas fallidas: 0
📊 Total: 34
```

**Resultado Real**: ✅ **34/34 pruebas pasaron exitosamente**

### **Script 2: Pruebas de Endpoints HTTP**
**Archivo**: `api-clinica/scripts/test-endpoints-auth.js`

**Ejecutar** (con servidor corriendo):
```bash
# Terminal 1: Iniciar servidor
cd api-clinica
npm start

# Terminal 2: Ejecutar pruebas
cd api-clinica
node scripts/test-endpoints-auth.js
```

**Requisitos**:
- Servidor backend debe estar corriendo
- Ajustar `testPacienteId` y `testPIN` en el script según tus datos

**Qué prueba**:
- ✅ Setup PIN via HTTP POST
- ✅ Login con PIN correcto via HTTP POST
- ✅ Login con PIN incorrecto (rechazo)
- ✅ Validaciones (formato inválido, PINs débiles)
- ✅ Bloqueo de cuenta después de 3 intentos

---

## 🔧 TESTING MANUAL - BACKEND

### **Paso 1: Verificar que el paciente existe**

**SQL Directo**:
```sql
SELECT id_paciente, nombre, apellido_paterno, activo 
FROM pacientes 
WHERE nombre LIKE '%Test%' OR id_paciente = 1;
```

**O usando script**:
```bash
cd api-clinica
node -e "
import('./config/db.js').then(async ({ default: sequelize }) => {
  const { Paciente } = await import('./models/associations.js');
  const paciente = await Paciente.findByPk(1);
  console.log(paciente ? JSON.stringify(paciente.dataValues, null, 2) : 'Paciente no encontrado');
  await sequelize.close();
});
"
```

### **Paso 2: Setup PIN (Configurar PIN)**

**Request**:
```bash
curl -X POST http://localhost:3000/api/paciente-auth/setup-pin \
  -H "Content-Type: application/json" \
  -d '{
    "id_paciente": 1,
    "pin": "5678",
    "device_id": "test_device_12345"
  }'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "message": "PIN configurado exitosamente",
  "data": {
    "id_paciente": 1,
    "auth_id": 1,
    "pin_id": 1
  }
}
```

**Verificar en BD**:
```sql
SELECT pa.*, pap.id_pin_auth, pap.activo as pin_activo
FROM paciente_auth pa
LEFT JOIN paciente_auth_pin pap ON pa.id_auth = pap.id_auth
WHERE pa.id_paciente = 1;
```

### **Paso 3: Login con PIN Correcto**

**Request**:
```bash
curl -X POST http://localhost:3000/api/paciente-auth/login-pin \
  -H "Content-Type: application/json" \
  -d '{
    "id_paciente": 1,
    "pin": "5678",
    "device_id": "test_device_12345"
  }'
```

**Respuesta esperada**:
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "paciente": {
    "id": 1,
    "id_paciente": 1,
    "nombre": "Juan",
    "apellido_paterno": "Pérez",
    "nombre_completo": "Juan Pérez",
    ...
  },
  "auth_method": "pin"
}
```

**Verificar**:
- ✅ Token es válido (copiar y decodificar en jwt.io)
- ✅ Datos del paciente están completos
- ✅ `failed_attempts` se reseteó a 0
- ✅ `last_activity` se actualizó

### **Paso 4: Login con PIN Incorrecto**

**Request** (con PIN incorrecto):
```bash
curl -X POST http://localhost:3000/api/paciente-auth/login-pin \
  -H "Content-Type: application/json" \
  -d '{
    "id_paciente": 1,
    "pin": "9999",
    "device_id": "test_device_12345"
  }'
```

**Respuesta esperada**:
```json
{
  "success": false,
  "error": "PIN incorrecto",
  "attempts_remaining": 2
}
```

**Repetir 3 veces** para probar bloqueo:
```bash
# Intento 1
curl -X POST http://localhost:3000/api/paciente-auth/login-pin \
  -H "Content-Type: application/json" \
  -d '{"id_paciente": 1, "pin": "9999", "device_id": "test_device_12345"}'

# Intento 2
curl -X POST http://localhost:3000/api/paciente-auth/login-pin \
  -H "Content-Type: application/json" \
  -d '{"id_paciente": 1, "pin": "9999", "device_id": "test_device_12345"}'

# Intento 3 (debe bloquear)
curl -X POST http://localhost:3000/api/paciente-auth/login-pin \
  -H "Content-Type: application/json" \
  -d '{"id_paciente": 1, "pin": "9999", "device_id": "test_device_12345"}'
```

**Respuesta después de 3 intentos**:
```json
{
  "success": false,
  "error": "PIN incorrecto",
  "attempts_remaining": 0
}
```

**4to intento** (debe estar bloqueado):
```json
{
  "success": false,
  "error": "Cuenta temporalmente bloqueada",
  "locked_until": "2025-11-03T05:35:00.000Z",
  "minutes_remaining": 15
}
```

### **Paso 5: Verificar Validaciones**

**PIN con formato inválido**:
```bash
curl -X POST http://localhost:3000/api/paciente-auth/setup-pin \
  -H "Content-Type: application/json" \
  -d '{
    "id_paciente": 1,
    "pin": "123",
    "device_id": "test_device_12345"
  }'
```

**Respuesta esperada**:
```json
{
  "success": false,
  "error": "El PIN debe tener exactamente 4 dígitos"
}
```

**PIN débil**:
```bash
curl -X POST http://localhost:3000/api/paciente-auth/setup-pin \
  -H "Content-Type: application/json" \
  -d '{
    "id_paciente": 1,
    "pin": "1234",
    "device_id": "test_device_12345"
  }'
```

**Respuesta esperada**:
```json
{
  "success": false,
  "error": "El PIN es demasiado débil. Elige un PIN más seguro"
}
```

---

## 📱 TESTING MANUAL - FRONTEND

### **Prerequisitos**
1. Backend corriendo en `http://localhost:3000`
2. App móvil compilada y ejecutándose
3. Paciente con PIN configurado en la base de datos

### **Paso 1: Acceso a Login de Paciente**

1. Abre la app
2. Deberías ver "PantallaInicioSesion"
3. Presiona "👤 Soy Paciente"
4. Deberías ver "LoginPaciente" con 3 opciones

### **Paso 2: Login con PIN**

1. Presiona "🔢 PIN de 4 números"
2. Deberías ver "LoginPIN"
3. Ingresa el PIN (ej: `5678`)
4. El PIN debe aparecer como puntos (• • • •)
5. Al completar 4 dígitos, debe iniciar login automáticamente

**Comportamiento esperado**:
- ✅ Vibración al presionar cada número
- ✅ Loading indicator mientras verifica
- ✅ Si exitoso: Navega a `InicioPaciente`
- ✅ Si falla: Muestra alerta con mensaje de error

### **Paso 3: Validación de Errores**

**Caso 1: PIN incorrecto**
1. Ingresa PIN incorrecto (ej: `9999`)
2. Deberías ver alerta: "PIN incorrecto. Intentos restantes: 2"
3. Repetir hasta 3 intentos

**Caso 2: Cuenta bloqueada**
1. Después de 3 intentos fallidos
2. Al intentar de nuevo, deberías ver: "Cuenta bloqueada temporalmente. Espera 15 minutos"

**Caso 3: Sin conexión**
1. Desconectar internet
2. Intentar login
3. Deberías ver: "No se pudo conectar con el servidor"

### **Paso 4: Verificar Persistencia**

1. Haz login exitoso
2. Cierra completamente la app
3. Abre la app nuevamente
4. **Debe hacer auto-login** y llevarte directamente a `InicioPaciente`

**Verificar en logs**:
```
INFO Verificando estado de autenticación
SUCCESS Usuario autenticado encontrado { userRole: 'paciente', userId: 1 }
```

---

## 📝 CASOS DE PRUEBA

### **Caso 1: Setup PIN Nuevo**
- ✅ Paciente existe y está activo
- ✅ PIN tiene formato válido (4 dígitos)
- ✅ PIN no es débil (0000, 1234, etc.)
- ✅ Device ID es único
- ✅ Se crea registro en `paciente_auth`
- ✅ Se crea registro en `paciente_auth_pin`
- ✅ PIN está hasheado con bcrypt

### **Caso 2: Login Exitoso**
- ✅ PIN correcto
- ✅ Device ID coincide
- ✅ Cuenta no está bloqueada
- ✅ Cuenta está activa
- ✅ Token JWT generado
- ✅ Token contiene datos correctos (id, type, device_id)
- ✅ `failed_attempts` reseteado a 0
- ✅ `last_activity` actualizado
- ✅ Datos del paciente retornados completos

### **Caso 3: PIN Incorrecto**
- ✅ PIN incorrecto rechazado
- ✅ `failed_attempts` incrementado
- ✅ Mensaje incluye `attempts_remaining`
- ✅ Después de 3 intentos, cuenta bloqueada
- ✅ `locked_until` establecido (15 minutos)

### **Caso 4: Cuenta Bloqueada**
- ✅ Intento de login cuando `locked_until` > ahora
- ✅ Retorna error 423
- ✅ Incluye `minutes_remaining`
- ✅ No incrementa `failed_attempts`

### **Caso 5: Device ID Incorrecto**
- ✅ Device ID no coincide con registro
- ✅ Retorna error 401: "Credenciales inválidas"
- ✅ No revela que el paciente existe

### **Caso 6: Paciente Inactivo**
- ✅ Paciente con `activo = false`
- ✅ Setup PIN rechazado (error 403)
- ✅ Login rechazado si auth está inactivo

### **Caso 7: PIN No Configurado**
- ✅ Intento de login sin PIN configurado
- ✅ Retorna error 401: "PIN no configurado"

### **Caso 8: Validaciones**
- ✅ PIN con < 4 dígitos → Error 400
- ✅ PIN con > 4 dígitos → Error 400
- ✅ PIN con letras → Error 400
- ✅ PIN débil (0000, 1234) → Error 400
- ✅ `id_paciente` faltante → Error 400
- ✅ `device_id` faltante → Error 400

---

## 🌐 VERIFICACIÓN DE ENDPOINTS

### **Endpoint: Setup PIN**

**URL**: `POST /api/paciente-auth/setup-pin`

**Validar**:
```javascript
// Test con Postman o similar
POST http://localhost:3000/api/paciente-auth/setup-pin
Headers: { "Content-Type": "application/json" }
Body: {
  "id_paciente": 1,
  "pin": "5678",
  "device_id": "test_device_unique"
}
```

**Verificaciones**:
- ✅ Status: 200 o 201
- ✅ Response tiene `success: true`
- ✅ Response incluye `auth_id` y `pin_id`
- ✅ En BD: Registro creado en `paciente_auth`
- ✅ En BD: Registro creado en `paciente_auth_pin`

### **Endpoint: Login PIN**

**URL**: `POST /api/paciente-auth/login-pin`

**Validar**:
```javascript
POST http://localhost:3000/api/paciente-auth/login-pin
Headers: { "Content-Type": "application/json" }
Body: {
  "id_paciente": 1,
  "pin": "5678",
  "device_id": "test_device_unique"
}
```

**Verificaciones**:
- ✅ Status: 200 (si exitoso) o 401/423 (si falla)
- ✅ Response tiene `token` (si exitoso)
- ✅ Response tiene `paciente` con datos completos
- ✅ Token es JWT válido
- ✅ Token puede decodificarse con `JWT_SECRET`

---

## ✅ CHECKLIST DE VALIDACIÓN

### **Backend**
- [ ] Script de pruebas automatizado pasa todas las pruebas
- [ ] Setup PIN funciona con datos válidos
- [ ] Setup PIN rechaza PINs débiles
- [ ] Setup PIN rechaza formato inválido
- [ ] Login con PIN correcto retorna token
- [ ] Login con PIN incorrecto incrementa intentos
- [ ] Bloqueo funciona después de 3 intentos
- [ ] Cuenta bloqueada no permite login
- [ ] Device ID incorrecto rechazado
- [ ] Paciente inactivo rechazado
- [ ] Token JWT válido y contiene datos correctos
- [ ] Relaciones de BD funcionan (includes)

### **Frontend**
- [ ] Pantalla de selección muestra ambas opciones
- [ ] Navegación a LoginPaciente funciona
- [ ] Teclado numérico muestra correctamente
- [ ] PIN se oculta visualmente (puntos)
- [ ] Auto-submit al completar 4 dígitos
- [ ] Loading indicator durante login
- [ ] Navegación a InicioPaciente después de login exitoso
- [ ] Alertas de error se muestran correctamente
- [ ] Intentos restantes se muestran
- [ ] Mensaje de cuenta bloqueada correcto
- [ ] Auto-login funciona al reiniciar app
- [ ] Logout limpia credenciales

### **Integración**
- [ ] Backend responde correctamente a requests del frontend
- [ ] Tokens se guardan en AsyncStorage
- [ ] Context se actualiza correctamente
- [ ] Navegación condicional funciona (Paciente vs Doctor)
- [ ] Errores de red se manejan correctamente
- [ ] Timeout de requests funciona

### **Seguridad**
- [ ] PINs están hasheados (nunca en texto plano)
- [ ] Tokens tienen expiración
- [ ] Rate limiting funciona (si está habilitado)
- [ ] Device ID verificado
- [ ] Intentos fallidos limitados
- [ ] Bloqueo temporal funciona

---

## 🐛 DEBUGGING

### **Problema: Login falla siempre**

**Verificar**:
1. ¿El paciente existe?
   ```sql
   SELECT * FROM pacientes WHERE id_paciente = 1;
   ```

2. ¿Hay registro en paciente_auth?
   ```sql
   SELECT * FROM paciente_auth WHERE id_paciente = 1;
   ```

3. ¿Hay PIN configurado?
   ```sql
   SELECT pap.* FROM paciente_auth pa
   JOIN paciente_auth_pin pap ON pa.id_auth = pap.id_auth
   WHERE pa.id_paciente = 1;
   ```

4. ¿El PIN está activo?
   ```sql
   SELECT pap.activo FROM paciente_auth_pin pap
   JOIN paciente_auth pa ON pap.id_auth = pa.id_auth
   WHERE pa.id_paciente = 1;
   ```

5. ¿Device ID coincide?
   ```sql
   SELECT device_id FROM paciente_auth WHERE id_paciente = 1;
   ```

### **Problema: Token no válido**

**Verificar**:
1. ¿JWT_SECRET está configurado?
   ```bash
   echo $JWT_SECRET  # o revisar .env
   ```

2. ¿El token se puede decodificar?
   - Copiar token de la respuesta
   - Ir a jwt.io
   - Pegar token y secret
   - Verificar que decodifica correctamente

### **Problema: Auto-login no funciona**

**Verificar**:
1. ¿Token está en AsyncStorage?
   ```javascript
   // En React Native Debugger
   AsyncStorage.getItem('@auth_token').then(console.log);
   ```

2. ¿Datos del usuario están guardados?
   ```javascript
   AsyncStorage.getItem('@user_data').then(console.log);
   ```

3. ¿Rol está guardado?
   ```javascript
   AsyncStorage.getItem('@user_role').then(console.log);
   ```

---

## 📊 MÉTRICAS DE ÉXITO

### **Tasa de Éxito**
- ✅ Login exitoso: > 95%
- ✅ Tiempo de respuesta: < 500ms
- ✅ Errores de validación: 100% detectados
- ✅ Bloqueo automático: Funciona en 100% de casos

### **Cobertura de Pruebas**
- ✅ Unit tests: > 80%
- ✅ Integration tests: > 70%
- ✅ End-to-end tests: Casos críticos cubiertos

---

**Última actualización**: 2025-11-03
**Versión**: 1.0.0

