# 🔐 FLUJO COMPLETO DE AUTENTICACIÓN - Sistema Clínica Móvil

## 📋 ÍNDICE
1. [Tipos de Usuarios](#tipos-de-usuarios)
2. [Arquitectura General](#arquitectura-general)
3. [Flujo de Pacientes](#flujo-de-pacientes)
4. [Flujo de Doctores/Administradores](#flujo-de-doctoresadministradores)
5. [Backend - Endpoints](#backend---endpoints)
6. [Almacenamiento y Persistencia](#almacenamiento-y-persistencia)
7. [Navegación Post-Login](#navegación-post-login)
8. [Seguridad y Validaciones](#seguridad-y-validaciones)

---

## 👥 TIPOS DE USUARIOS

### 1. **PACIENTE** (`Paciente` / `paciente`)
- **Características**: Usuarios rurales con bajo nivel tecnológico
- **Autenticación**: PIN de 4 dígitos + Opcional: Biometría
- **Interfaz**: Simplificada, accesible, con TTS y haptic feedback

### 2. **DOCTOR** (`Doctor` / `doctor`)
- **Características**: Personal médico con conocimiento técnico
- **Autenticación**: Email + Contraseña
- **Interfaz**: Completa, dashboards, tablas, gráficas

### 3. **ADMINISTRADOR** (`Admin` / `admin` / `administrador`)
- **Características**: Personal administrativo con acceso completo
- **Autenticación**: Email + Contraseña (mismo sistema que Doctor)
- **Interfaz**: Dashboard administrativo completo

---

## 🏗️ ARQUITECTURA GENERAL

```
App.tsx
  └── AuthProvider (Context)
      └── NavegacionPrincipal
          ├── Si NO autenticado → NavegacionAuth
          │   └── PantallaInicioSesion
          │       ├── LoginPaciente
          │       └── LoginDoctor
          └── Si autenticado → Determinar por Rol
              ├── Paciente → NavegacionPaciente
              └── Doctor/Admin → NavegacionProfesional
                  ├── Admin → DashboardAdmin
                  └── Doctor → DashboardDoctor
```

---

## 🔄 FLUJO DE PACIENTES

### **Paso 1: Pantalla Inicial**
**Archivo**: `PantallaInicioSesion.js`

1. Usuario abre la app
2. Ve dos opciones:
   - 👤 **Soy Paciente** → Navega a `LoginPaciente`
   - 🩺 **Soy Doctor/Administrador** → Navega a `LoginDoctor`

### **Paso 2: Selección de Método de Autenticación**
**Archivo**: `LoginPaciente.js`

El paciente puede elegir entre:
- **🔢 PIN de 4 números** (Principal)
- **👆 Huella dactilar** (Biometría - Touch ID)
- **👤 Reconocimiento facial** (Biometría - Face ID)

**Si elige PIN**:
```javascript
navigation.navigate('LoginPIN', { pacienteId: '1' })
```

### **Paso 3: Login con PIN**
**Archivo**: `LoginPIN.js`

**Flujo**:
1. **Input de PIN**:
   - Teclado numérico grande
   - Máximo 4 dígitos
   - Auto-submit al completar

2. **Validación Frontend**:
   ```javascript
   validationService.validatePatientPINLogin(pacienteId, pin)
   ```
   - Valida formato de PIN (4 dígitos)
   - Valida que `pacienteId` sea numérico

3. **Llamada al Backend**:
   ```javascript
   pacienteAuthService.loginWithPIN(pacienteId, pin, deviceId)
   ```
   - Endpoint: `POST /api/paciente-auth/login-pin`
   - Headers: `X-Device-ID`, `X-Platform`, `X-Client-Type`
   - Body: `{ id_paciente, pin, device_id }`

4. **Procesamiento Backend** (`pacienteAuth.js`):
   - ✅ Busca registro en `paciente_auth` por `id_paciente` + `device_id`
   - ✅ Verifica si está bloqueado (`locked_until`)
   - ✅ Verifica si cuenta está activa
   - ✅ Compara PIN con hash en `paciente_auth_pin`
   - ✅ Si falla: Incrementa `failed_attempts`, bloquea si >= 3 intentos
   - ✅ Si éxito: Resetea intentos, actualiza `last_activity`
   - ✅ Genera JWT token (expiración: 8 horas)
   - ✅ Retorna datos completos del paciente

5. **Respuesta Backend**:
   ```json
   {
     "success": true,
     "message": "Login exitoso",
     "token": "eyJhbGc...",
     "paciente": {
       "id": 1,
       "id_paciente": 1,
       "nombre": "Juan",
       "apellido_paterno": "Pérez",
       "nombre_completo": "Juan Pérez",
       // ... más datos
     }
   }
   ```

6. **Manejo en Frontend**:
   ```javascript
   await login(
     responseData.paciente,
     'paciente',
     responseData.token,
     responseData.refresh_token
   );
   ```

### **Paso 4: Almacenamiento y Estado**
**Archivo**: `AuthContext.js`

1. **Guardar en AsyncStorage**:
   - Token JWT
   - Datos del paciente
   - Rol (`paciente`)
   - Refresh token (si existe)

2. **Actualizar Context**:
   ```javascript
   dispatch({
     type: 'LOGIN_SUCCESS',
     payload: {
       user: pacienteData,
       userRole: 'paciente',
       token,
       refreshToken
     }
   });
   ```

3. **Verificación Automática**:
   - El contexto verifica al iniciar la app
   - Si encuentra token válido, auto-autentica

### **Paso 5: Navegación Post-Login**
**Archivo**: `NavegacionPrincipal.js` + `App.tsx`

**Lógica de Decisión**:
```javascript
if (isAuthenticated) {
  if (userRole === 'paciente') {
    return <NavegacionPaciente />
  } else {
    return <NavegacionProfesional />
  }
} else {
  return <NavegacionAuth />
}
```

**Navegación de Paciente** (`NavegacionPaciente.js`):
- Stack Navigator con pantallas:
  - `InicioPaciente` (Dashboard principal)
  - `RegistrarSignosVitales`
  - `MisCitas`
  - `MisMedicamentos`
  - `HistorialMedico`

---

## 🔄 FLUJO DE DOCTORES/ADMINISTRADORES

### **Paso 1: Pantalla Inicial**
Igual que pacientes, selecciona "🩺 Soy Doctor/Administrador"

### **Paso 2: Login con Credenciales**
**Archivo**: `LoginDoctor.js`

**Formulario**:
- **Email**: Campo de texto
- **Contraseña**: Campo con toggle para mostrar/ocultar
- **Recordar email**: Checkbox (opcional)

**Flujo**:
1. **Validación Frontend**:
   ```javascript
   validationService.validateDoctorLogin(email, password)
   ```
   - Valida formato de email
   - Valida que password no esté vacío

2. **Llamada al Backend**:
   ```javascript
   doctorAuthService.login(email, password)
   ```
   - Endpoint: `POST /api/auth/login`
   - Body: `{ email, password }`

3. **Procesamiento Backend** (`auth.js`):
   - ✅ Busca usuario en tabla `usuarios` por email
   - ✅ Verifica contraseña con bcrypt
   - ✅ Verifica que cuenta esté activa
   - ✅ Verifica rol (debe ser 'Doctor' o 'Admin')
   - ✅ Actualiza `ultimo_login`
   - ✅ Genera JWT token (expiración: 24 horas)
   - ✅ Retorna datos del usuario + rol

4. **Respuesta Backend**:
   ```json
   {
     "token": "eyJhbGc...",
     "usuario": {
       "id_usuario": 1,
       "email": "doctor@clinica.com",
       "rol": "Doctor", // o "Admin"
       // ... más datos
     }
   }
   ```

5. **Manejo en Frontend**:
   ```javascript
   await login(
     response.usuario,
     response.usuario.rol || 'doctor',
     response.token,
     response.refresh_token
   );
   ```

### **Paso 3: Almacenamiento**
Igual que pacientes, pero con datos de usuario y rol diferente.

### **Paso 4: Navegación Post-Login**
**Navegación Profesional** (`NavegacionProfesional.js`):

**Determinación de Dashboard**:
```javascript
const DashboardSelector = ({ navigation }) => {
  const { userRole } = useAuth();
  
  if (userRole === 'Admin' || userRole === 'admin') {
    return <DashboardAdmin />
  }
  
  return <DashboardDoctor />
};
```

**Estructura de Navegación**:
- **Bottom Tab Navigator** con tabs:
  - `Dashboard` (Admin o Doctor según rol)
  - `Citas`
  - `Pacientes` (solo si es Admin)
  - `Configuración`
  - `Perfil`

**Pantallas Adicionales** (Stack):
- `GestionAdmin` (gestión de pacientes/doctores)
- `DetallePaciente`
- `DetalleDoctor`
- `GestionVacunas`, `GestionMedicamentos`, etc. (solo Admin)

---

## 🔌 BACKEND - ENDPOINTS

### **Autenticación de Pacientes**

#### `POST /api/paciente-auth/login-pin`
**Body**:
```json
{
  "id_paciente": 1,
  "pin": "1234",
  "device_id": "device_unique_id"
}
```

**Respuesta Exitosa**:
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "eyJhbGc...",
  "paciente": {
    "id": 1,
    "id_paciente": 1,
    "nombre": "Juan",
    // ... datos completos
  }
}
```

**Errores**:
- `400`: Datos inválidos o PIN débil
- `401`: PIN incorrecto o no configurado
- `403`: Cuenta desactivada
- `423`: Cuenta bloqueada temporalmente
- `500`: Error del servidor

#### `POST /api/paciente-auth/login-biometric`
Similar a PIN pero con:
```json
{
  "id_paciente": 1,
  "device_id": "...",
  "signature": "...",
  "challenge": "...",
  "credential_id": "..."
}
```

### **Autenticación de Doctores/Admin**

#### `POST /api/auth/login`
**Body**:
```json
{
  "email": "doctor@clinica.com",
  "password": "password123"
}
```

**Respuesta Exitosa**:
```json
{
  "token": "eyJhbGc...",
  "usuario": {
    "id_usuario": 1,
    "email": "doctor@clinica.com",
    "rol": "Doctor" // o "Admin"
  }
}
```

**Errores**:
- `400`: Datos inválidos
- `401`: Credenciales incorrectas
- `403`: Cuenta desactivada o rol inválido
- `429`: Demasiados intentos
- `500`: Error del servidor

---

## 💾 ALMACENAMIENTO Y PERSISTENCIA

### **AsyncStorage Keys**

**Pacientes**:
- `@auth_token`: Token JWT
- `@user_data`: Datos del paciente (JSON)
- `@user_role`: `"paciente"`
- `@refresh_token`: Refresh token (si existe)
- `@device_id`: ID único del dispositivo

**Doctores/Admin**:
- `@auth_token`: Token JWT
- `@user_data`: Datos del usuario (JSON)
- `@user_role`: `"doctor"` o `"admin"`
- `@refresh_token`: Refresh token (si existe)
- `@remembered_email`: Email recordado (opcional)

### **Persistencia de Sesión**

El sistema verifica automáticamente al iniciar la app:
1. Lee token de AsyncStorage
2. Lee datos del usuario
3. Lee rol del usuario
4. Si todo existe → Auto-autentica
5. Si falta algo → Muestra pantalla de login

---

## 🧭 NAVEGACIÓN POST-LOGIN

### **Decision Tree**

```
Usuario Autenticado?
│
├─ NO → NavegacionAuth (PantallaInicioSesion)
│
└─ SÍ → Verificar Rol
    │
    ├─ userRole === 'paciente' → NavegacionPaciente
    │   └─ Stack Navigator:
    │       ├─ InicioPaciente
    │       ├─ RegistrarSignosVitales
    │       ├─ MisCitas
    │       ├─ MisMedicamentos
    │       └─ HistorialMedico
    │
    └─ userRole === 'doctor' || 'admin' → NavegacionProfesional
        └─ Bottom Tab Navigator:
            ├─ Dashboard (Admin o Doctor según rol)
            ├─ Citas
            ├─ Pacientes (solo Admin)
            ├─ Configuración
            └─ Perfil
```

### **Componentes Clave**

**`App.tsx`**:
```javascript
<AuthProvider>
  <NavegacionPrincipal />
</AuthProvider>
```

**`NavegacionPrincipal.js`**:
```javascript
const { isAuthenticated, userRole } = useAuth();

if (!isAuthenticated) {
  return <NavegacionAuth />
}

if (userRole === 'paciente') {
  return <NavegacionPaciente />
}

return <NavegacionProfesional />
```

---

## 🔒 SEGURIDAD Y VALIDACIONES

### **Frontend**

1. **Validación de Inputs**:
   - PIN: Exactamente 4 dígitos
   - Email: Formato válido
   - Password: No vacío, mínimo 6 caracteres (en backend)

2. **Manejo de Errores**:
   - Mensajes específicos por código de estado
   - Intentos fallidos mostrados al usuario
   - Bloqueo temporal visible

3. **Rate Limiting**:
   - Límite de intentos en frontend (3)
   - Backend también limita (rate limiting)

### **Backend**

1. **Validaciones**:
   - Email formato válido
   - Password hasheado con bcrypt
   - PIN validado contra hash
   - Device ID verificado

2. **Seguridad**:
   - Tokens JWT con expiración
   - Bloqueo después de 3 intentos fallidos
   - Rate limiting por IP/usuario
   - Validación de rol en cada request protegido

3. **Logging**:
   - Todos los intentos de login registrados
   - Errores logueados para auditoría
   - Actividad de usuarios rastreada

---

## 📊 DIAGRAMA DE FLUJO COMPLETO

```
┌─────────────────────────────────────┐
│   APP INICIA                       │
│   AuthProvider.checkAuthStatus()    │
└──────────────┬──────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ ¿Token en Storage?   │
    └──────────┬────────────┘
               │
      ┌────────┴────────┐
      │                 │
     SÍ                NO
      │                 │
      ▼                 ▼
┌──────────┐    ┌─────────────────┐
│Auto-Login│    │ PantallaInicio │
│          │    │     Sesión      │
└────┬─────┘    └────────┬────────┘
     │                   │
     │            ┌──────┴──────┐
     │            │              │
     │         Paciente      Doctor/Admin
     │            │              │
     │            ▼              ▼
     │      LoginPaciente   LoginDoctor
     │            │              │
     │            ▼              ▼
     │        LoginPIN      Email/Pass
     │            │              │
     │            ▼              ▼
     │      POST /api/    POST /api/
     │    paciente-auth/    auth/login
     │    login-pin              │
     │            │              │
     │            ▼              ▼
     │    Backend Valida    Backend Valida
     │            │              │
     │            ▼              ▼
     └────────────┴──────────────┘
                    │
                    ▼
           ┌────────────────┐
           │ login() en      │
           │ AuthContext     │
           └────────┬─────────┘
                    │
                    ▼
           ┌────────────────┐
           │ Guardar en     │
           │ AsyncStorage   │
           └────────┬────────┘
                    │
                    ▼
           ┌────────────────┐
           │ Actualizar     │
           │ Estado Global  │
           └────────┬────────┘
                    │
                    ▼
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   Paciente?              Doctor/Admin?
        │                       │
        ▼                       ▼
NavegacionPaciente    NavegacionProfesional
        │                       │
        │                       ▼
        │                  ¿Es Admin?
        │                       │
        │              ┌────────┴────────┐
        │              │                 │
        │            SÍ                NO
        │              │                 │
        │              ▼                 ▼
        │        DashboardAdmin    DashboardDoctor
        │
        ▼
  InicioPaciente
```

---

## 🔍 PUNTOS CLAVE

1. **Dos Sistemas de Auth Separados**:
   - Pacientes: PIN/Biometría (tablas `paciente_auth*`)
   - Doctores/Admin: Email/Password (tabla `usuarios`)

2. **Navegación Condicional**:
   - Basada en `userRole` del contexto
   - Automática después del login exitoso

3. **Persistencia**:
   - Tokens guardados en AsyncStorage
   - Auto-login en inicio de app si token válido

4. **Seguridad Multi-Capa**:
   - Validación frontend
   - Validación backend
   - Rate limiting
   - Bloqueo de cuentas
   - Tokens con expiración

5. **Diferenciación de Roles**:
   - Pacientes: Interfaz simplificada
   - Doctores: Dashboard médico
   - Admin: Dashboard administrativo completo

---

## 🧪 CASOS DE PRUEBA SUGERIDOS

1. ✅ Login paciente con PIN correcto
2. ✅ Login paciente con PIN incorrecto (3 intentos → bloqueo)
3. ✅ Login doctor con credenciales correctas
4. ✅ Login doctor con credenciales incorrectas
5. ✅ Auto-login al reiniciar app (si token válido)
6. ✅ Navegación correcta según rol
7. ✅ Bloqueo de acceso no autorizado (p. ej. Admin intenta acceder como Paciente)
8. ✅ Logout limpia todas las credenciales

---

**Última actualización**: 2025-11-03
**Versión del sistema**: 1.0.0




