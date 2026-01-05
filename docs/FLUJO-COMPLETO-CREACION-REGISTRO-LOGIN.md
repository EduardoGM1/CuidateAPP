# 🔐 FLUJO COMPLETO: CREACIÓN, REGISTRO Y LOGIN DE PACIENTES

## 📋 TABLA DE CONTENIDOS

1. [Creación de Paciente (Admin)](#1-creación-de-paciente-admin)
2. [Registro/Autenticación (Primera Vez)](#2-registroautenticación-primera-vez)
3. [Login de Paciente](#3-login-de-paciente)
4. [Configuración de Biometría](#4-configuración-de-biometría)
5. [Diagramas de Flujo](#5-diagramas-de-flujo)

---

## 1. CREACIÓN DE PACIENTE (ADMIN)

### **Ubicación:** `ClinicaMovil/src/screens/admin/AgregarPaciente.js`

### **Flujo Paso a Paso:**

#### **Paso 1: Admin completa formulario**

El administrador llena un formulario de 4 pasos:

```
Paso 1: Configuración de PIN
├── PIN (4 dígitos)
├── Confirmación de PIN
└── Validaciones:
    ├── PIN debe tener exactamente 4 dígitos
    ├── PINs débiles rechazados (0000, 1111, 1234, etc.)
    └── PIN único (no usado por otro paciente)

Paso 2: Datos del Paciente
├── Nombre completo
├── Fecha de nacimiento
├── CURP
├── Institución de salud (IMSS, ISSSTE, etc.)
├── Sexo
├── Dirección y localidad
├── Número celular
└── Módulo asignado

Paso 3: Red de Apoyo
└── Contactos de emergencia (opcional)

Paso 4: Primera Consulta
└── Información inicial de consulta (opcional)
```

#### **Paso 2: Frontend envía datos**

```javascript
// ClinicaMovil/src/screens/admin/AgregarPaciente.js (línea 522-584)

const handleCreatePaciente = async () => {
  // 1. Validar todos los pasos
  const pinValid = validatePinData();
  const pacienteValid = validatePacienteData();
  // ...
  
  // 2. Generar device ID único
  const deviceId = `device_${Date.now()}_${Math.random()...}`;
  
  // 3. Preparar datos
  const pacienteData = {
    nombre: formData.nombre,
    apellido_paterno: formData.apellidoPaterno,
    fecha_nacimiento: formData.fechaNacimiento,
    curp: formData.curp,
    institucion_salud: formData.institucionSalud,
    sexo: formData.sexo,
    // ... más campos
    pin: formData.pin,           // ⚠️ PIN en texto plano (se hasheará en backend)
    device_id: deviceId          // 🔑 ID único del dispositivo
  };
  
  // 4. Llamar al endpoint
  const result = await createPacienteCompleto(pacienteData);
};
```

#### **Paso 3: Backend procesa la solicitud**

**Endpoint:** `POST /api/pacientes/completo`  
**Controlador:** `api-clinica/controllers/paciente.js:createPacienteCompleto`

```javascript
// api-clinica/controllers/paciente.js (línea 307-548)

export const createPacienteCompleto = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // 1️⃣ VALIDACIONES COMPLETAS
    // - Campos requeridos
    // - Formato CURP
    // - Fecha válida
    // - ENUMs válidos (sexo, institucion_salud)
    // - PIN formato (4 dígitos)
    // - PIN no débil
    // - PIN único (no usado por otro paciente)
    
    // 2️⃣ CREAR USUARIO BASE
    const email = `paciente_${Date.now()}@temp.com`;
    const password = Math.random().toString(36).slice(-8);
    const usuario = await Usuario.create({
      email,
      password_hash: bcrypt.hash(password, 10),
      rol: 'Paciente',
      activo: true
    }, { transaction });
    
    // 3️⃣ CREAR PERFIL DE PACIENTE
    const paciente = await Paciente.create({
      id_usuario: usuario.id_usuario,
      nombre,
      apellido_paterno,
      fecha_nacimiento,
      curp,
      // ... más campos
    }, { transaction });
    
    // 4️⃣ CREAR AUTENTICACIÓN PIN
    if (pin && device_id) {
      // a) Crear registro de autenticación
      const pacienteAuth = await PacienteAuth.create({
        id_paciente: paciente.id_paciente,
        device_id,
        device_type: 'mobile',
        is_primary_device: true,
        failed_attempts: 0,
        locked_until: null,
        activo: true
      }, { transaction });
      
      // b) Hash del PIN correctamente
      const pin_hash = await bcrypt.hash(pin, 10); // ⚠️ Solo el PIN, sin salt adicional
      const pin_salt = crypto.randomBytes(16).toString('hex'); // Guardado pero no usado en hash
      
      // c) Crear registro PIN
      await PacienteAuthPIN.create({
        id_auth: pacienteAuth.id_auth,
        pin_hash: pin_hash,
        pin_salt: pin_salt,
        activo: true
      }, { transaction });
    }
    
    await transaction.commit();
    
    // 5️⃣ RESPUESTA
    res.status(201).json({
      success: true,
      message: 'Paciente creado exitosamente con PIN',
      data: {
        id_paciente: paciente.id_paciente,
        nombre: paciente.nombre,
        // ...
      }
    });
    
  } catch (error) {
    await transaction.rollback();
    // Manejo de errores
  }
};
```

#### **Paso 4: Base de datos actualizada**

```
Tablas afectadas:
├── usuarios
│   └── Nuevo registro con rol 'Paciente'
├── pacientes
│   └── Nuevo perfil de paciente
├── paciente_auth
│   └── Registro de autenticación vinculado a dispositivo
└── paciente_auth_pin
    └── PIN hasheado (bcrypt)
```

#### **Paso 5: Respuesta al frontend**

```javascript
{
  success: true,
  message: 'Paciente creado exitosamente con PIN',
  data: {
    id_paciente: 105,
    id_usuario: 42,
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    // ...
  }
}
```

---

## 2. REGISTRO/AUTENTICACIÓN (PRIMERA VEZ)

### **⚠️ IMPORTANTE:** El registro inicial se hace automáticamente durante la creación del paciente.

Sin embargo, si un paciente necesita configurar su PIN después de ser creado (o reconfigurar), existe el endpoint:

### **Endpoint:** `POST /api/paciente-auth/setup-pin`  
**Controlador:** `api-clinica/controllers/pacienteAuth.js:setupPIN`

```javascript
// api-clinica/controllers/pacienteAuth.js

export const setupPIN = async (req, res) => {
  const { id_paciente, pin, device_id } = req.body;
  
  // 1. Validaciones
  // - PIN formato (4 dígitos)
  // - PIN no débil
  // - PIN único
  // - Paciente activo
  
  // 2. Buscar o crear PacienteAuth
  let authRecord = await PacienteAuth.findOne({
    where: { id_paciente, device_id, activo: true }
  });
  
  if (!authRecord) {
    authRecord = await PacienteAuth.create({
      id_paciente,
      device_id,
      device_type: 'mobile',
      is_primary_device: true,
      failed_attempts: 0,
      locked_until: null,
      activo: true
    });
  }
  
  // 3. Hash del PIN
  const pin_hash = await bcrypt.hash(pin, 10);
  const pin_salt = crypto.randomBytes(16).toString('hex');
  
  // 4. Crear o actualizar PIN
  await PacienteAuthPIN.upsert({
    id_auth: authRecord.id_auth,
    pin_hash,
    pin_salt,
    activo: true
  });
  
  // 5. Respuesta
  res.json({
    success: true,
    message: 'PIN configurado exitosamente'
  });
};
```

---

## 3. LOGIN DE PACIENTE

### **Ubicación Frontend:** `ClinicaMovil/src/screens/auth/LoginPIN.js`

### **Flujo Paso a Paso:**

#### **Paso 1: Paciente ingresa datos**

```
Pantalla: LoginPaciente.js
├── Paciente selecciona: "PIN de 4 números"
└── Navega a: LoginPIN.js

Pantalla: LoginPIN.js
├── Campo: ID de Paciente (ej: "1")
└── Campo: PIN (4 dígitos)
```

#### **Paso 2: Frontend valida y envía**

```javascript
// ClinicaMovil/src/screens/auth/LoginPIN.js (línea 61-128)

const handleLogin = async (pinToUse) => {
  // 1️⃣ Validaciones frontend
  const validation = validationService.validatePatientPINLogin(pacienteId, pinToUse);
  if (!validation.isValid) {
    // Mostrar error
    return;
  }
  
  // 2️⃣ Obtener device ID (almacenado localmente o generar)
  const deviceId = await storageService.getOrCreateDeviceId();
  
  // 3️⃣ Llamar al servicio
  const response = await pacienteAuthService.loginWithPIN(
    pacienteId,
    pinToUse,
    deviceId
  );
  
  // 4️⃣ Manejar respuesta
  const responseData = response.data || response;
  
  if (responseData.token && responseData.paciente) {
    // 5️⃣ Guardar en contexto de autenticación
    await login(
      responseData.paciente,
      'paciente',
      responseData.token
    );
    
    // 6️⃣ Navegación automática a interfaz de paciente
  }
};
```

#### **Paso 3: Backend valida credenciales**

**Endpoint:** `POST /api/paciente-auth/login-pin`  
**Controlador:** `api-clinica/controllers/pacienteAuth.js:loginWithPIN`

```javascript
// api-clinica/controllers/pacienteAuth.js

export const loginWithPIN = async (req, res) => {
  const { id_paciente, pin, device_id } = req.body;
  
  // 1️⃣ VALIDACIONES BÁSICAS
  if (!id_paciente || !pin || !device_id) {
    return res.status(400).json({
      success: false,
      error: 'Faltan campos requeridos'
    });
  }
  
  // 2️⃣ BUSCAR REGISTRO DE AUTENTICACIÓN
  // Intenta primero con device_id exacto
  let authRecord = await PacienteAuth.findOne({
    where: {
      id_paciente: parseInt(id_paciente),
      device_id,
      activo: true
    },
    include: [
      {
        model: PacienteAuthPIN,
        as: 'PacienteAuthPIN',
        where: { activo: true },
        required: true
      },
      {
        model: Paciente,
        as: 'paciente',
        required: true
      }
    ]
  });
  
  // Si no existe con device_id exacto, buscar cualquier registro activo
  if (!authRecord) {
    authRecord = await PacienteAuth.findOne({
      where: {
        id_paciente: parseInt(id_paciente),
        activo: true
      },
      include: [
        {
          model: PacienteAuthPIN,
          as: 'PacienteAuthPIN',
          where: { activo: true },
          required: true
        },
        {
          model: Paciente,
          as: 'paciente',
          required: true
        }
      ]
    });
    
    // Si existe, actualizar device_id
    if (authRecord) {
      // Verificar que no haya conflicto
      const existingDevice = await PacienteAuth.findOne({
        where: { device_id, activo: true }
      });
      
      if (!existingDevice || existingDevice.id_paciente === parseInt(id_paciente)) {
        await authRecord.update({ device_id });
      }
    }
  }
  
  // 3️⃣ VERIFICAR SI ESTÁ BLOQUEADO
  if (authRecord.locked_until && new Date() < authRecord.locked_until) {
    const minutesRemaining = Math.ceil(
      (authRecord.locked_until - new Date()) / (1000 * 60)
    );
    
    return res.status(423).json({
      success: false,
      error: 'Cuenta temporalmente bloqueada',
      minutes_remaining: minutesRemaining
    });
  }
  
  // 4️⃣ VERIFICAR PIN
  const pinRecord = authRecord.PacienteAuthPIN;
  const isValidPIN = await bcrypt.compare(pin, pinRecord.pin_hash);
  
  if (!isValidPIN) {
    // Incrementar intentos fallidos
    const failedAttempts = authRecord.failed_attempts + 1;
    const lockTime = failedAttempts >= 3 
      ? new Date(Date.now() + 15 * 60 * 1000) 
      : null;
    
    await authRecord.update({
      failed_attempts: failedAttempts,
      locked_until: lockTime
    });
    
    return res.status(401).json({
      success: false,
      error: 'PIN incorrecto',
      attempts_remaining: Math.max(0, 3 - failedAttempts),
      will_lock: failedAttempts >= 2
    });
  }
  
  // 5️⃣ LOGIN EXITOSO
  // Reset intentos fallidos
  await authRecord.update({
    failed_attempts: 0,
    locked_until: null,
    last_activity: new Date()
  });
  
  // 6️⃣ GENERAR TOKEN JWT
  const token = jwt.sign(
    {
      id: paciente.id_paciente,
      type: 'paciente',
      auth_method: 'pin',
      device_id
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  
  // 7️⃣ OBTENER DATOS COMPLETOS DEL PACIENTE
  const pacienteCompleto = await Paciente.findByPk(id_paciente, {
    attributes: [
      'id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno',
      'fecha_nacimiento', 'sexo', 'curp', 'direccion', 'localidad',
      'numero_celular', 'institucion_salud', 'activo'
    ]
  });
  
  // 8️⃣ RESPUESTA
  res.json({
    success: true,
    message: 'Login exitoso',
    token,
    paciente: {
      id: pacienteCompleto.id_paciente,
      id_paciente: pacienteCompleto.id_paciente,
      nombre: pacienteCompleto.nombre,
      apellido_paterno: pacienteCompleto.apellido_paterno,
      nombre_completo: `${pacienteCompleto.nombre} ${pacienteCompleto.apellido_paterno}`.trim(),
      // ... más campos
      auth_method: 'pin'
    },
    auth_method: 'pin'
  });
};
```

#### **Paso 4: Frontend recibe y procesa**

```javascript
// ClinicaMovil/src/context/AuthContext.js

const login = async (userData, userRole, token) => {
  // 1. Guardar token en almacenamiento seguro
  await AsyncStorage.setItem('auth_token', token);
  
  // 2. Normalizar datos del paciente
  const normalizedUserData = {
    ...userData,
    id: userData.id || userData.id_paciente,
    id_paciente: userData.id_paciente || userData.id
  };
  
  // 3. Actualizar estado global
  setUserData(normalizedUserData);
  setUserRole(userRole);
  setToken(token);
  setIsAuthenticated(true);
  
  // 4. Navegación automática según rol
  // - 'paciente' -> NavegacionPaciente
  // - 'doctor'/'admin' -> NavegacionProfesional
};
```

---

## 4. CONFIGURACIÓN DE BIOMETRÍA

### **Flujo después del login exitoso**

#### **Paso 1: Verificar disponibilidad**

```javascript
// ClinicaMovil/src/screens/auth/LoginPaciente.js

useEffect(() => {
  // Verificar si biometría está disponible
  checkBiometricAvailability();
  
  // Verificar si ya está configurada
  checkBiometricConfigured();
}, []);

const checkBiometricAvailability = async () => {
  const { available, biometryType } = await biometricService.isAvailable();
  setBiometricAvailable(available);
  setBiometricType(biometryType); // 'FaceID', 'TouchID', 'Biometrics'
};
```

#### **Paso 2: Configurar biometría (primera vez)**

```javascript
// ClinicaMovil/src/api/authService.js:biometricService

const handleBiometricSetup = async () => {
  // 1. Crear par de claves RSA en Keychain/Keystore
  const { publicKey, credentialId } = await biometricService.createKeys();
  
  // 2. Enviar clave pública al servidor
  const response = await pacienteAuthService.setupBiometric(
    pacienteId,
    deviceId,
    publicKey,
    credentialId,
    biometricType // 'fingerprint' o 'face'
  );
  
  // 3. Si éxito, biometría configurada
  // Ahora puede usar biometría para login
};
```

**Endpoint Backend:** `POST /api/paciente-auth/setup-biometric`

```javascript
// api-clinica/controllers/pacienteAuth.js:setupBiometric

export const setupBiometric = async (req, res) => {
  const { id_paciente, device_id, public_key, credential_id, biometric_type } = req.body;
  
  // 1. Validar formato PEM
  if (!public_key.includes('-----BEGIN PUBLIC KEY-----')) {
    return res.status(400).json({
      success: false,
      error: 'Formato de clave pública inválido'
    });
  }
  
  // 2. Validar tipo de biometría
  if (!['fingerprint', 'face', 'iris'].includes(biometric_type)) {
    return res.status(400).json({
      success: false,
      error: 'Tipo de biometría inválido'
    });
  }
  
  // 3. Buscar registro de autenticación (debe existir PacienteAuth)
  const authRecord = await PacienteAuth.findOne({
    where: { id_paciente, device_id, activo: true }
  });
  
  if (!authRecord) {
    return res.status(404).json({
      success: false,
      error: 'Configurar PIN primero'
    });
  }
  
  // 4. Crear o actualizar registro biométrico
  await PacienteAuthBiometric.upsert({
    id_auth: authRecord.id_auth,
    credential_id,
    public_key,
    biometric_type,
    activo: true
  });
  
  // 5. Generar challenge para validación
  const challenge = crypto.randomBytes(32).toString('base64');
  
  res.json({
    success: true,
    message: 'Biometría configurada exitosamente',
    challenge // Para validar que funciona
  });
};
```

#### **Paso 3: Login con biometría**

```javascript
// ClinicaMovil/src/screens/auth/LoginPaciente.js

const handleBiometricLogin = async () => {
  // 1. Generar challenge único
  const challenge = `${Date.now()}_${Math.random().toString(36)}`;
  
  // 2. Firmar challenge con biometría (clave privada en Keychain)
  const { signature, credentialId } = await biometricService.signChallenge(challenge);
  
  // 3. Enviar firma al servidor para validar
  const response = await pacienteAuthService.loginWithBiometric(
    pacienteId,
    deviceId,
    signature,
    challenge,
    credentialId
  );
  
  // 4. Si válida, obtener token y datos del paciente
  if (response.data.token && response.data.paciente) {
    await login(response.data.paciente, 'paciente', response.data.token);
  }
};
```

**Endpoint Backend:** `POST /api/paciente-auth/login-biometric`

```javascript
// api-clinica/controllers/pacienteAuth.js:loginWithBiometric

export const loginWithBiometric = async (req, res) => {
  const { id_paciente, device_id, signature, challenge, credential_id } = req.body;
  
  // 1. Buscar registro de autenticación con biometría
  const authRecord = await PacienteAuth.findOne({
    where: { id_paciente, device_id },
    include: [
      {
        model: PacienteAuthBiometric,
        as: 'PacienteAuthBiometric',
        where: { credential_id, activo: true },
        required: true
      }
    ]
  });
  
  // 2. Verificar firma RSA
  const biometricAuth = authRecord.PacienteAuthBiometric;
  const verify = crypto.createVerify('SHA256');
  verify.update(challenge, 'utf8');
  verify.end();
  const isValidSignature = verify.verify(biometricAuth.public_key, signature, 'base64');
  
  if (!isValidSignature) {
    // Incrementar intentos fallidos y bloquear si es necesario
    // ...
    return res.status(401).json({
      success: false,
      error: 'Autenticación biométrica fallida'
    });
  }
  
  // 3. Login exitoso
  // - Reset intentos fallidos
  // - Generar token JWT
  // - Retornar datos del paciente
  // ...
};
```

---

## 5. DIAGRAMAS DE FLUJO

### **Diagrama 1: Creación de Paciente**

```
┌─────────────┐
│ Admin llena │
│ formulario  │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ Frontend valida      │
│ - PIN formato        │
│ - Datos requeridos   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ POST /api/pacientes/ │
│ completo             │
│ {                    │
│   nombre, curp,      │
│   pin, device_id...  │
│ }                    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Backend valida       │
│ - Campos requeridos  │
│ - Formato CURP       │
│ - PIN único          │
│ - PIN no débil       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ TRANSACTION INICIA   │
└──────┬───────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│ Crear       │   │ Crear       │
│ Usuario     │   │ Paciente    │
└──────┬──────┘   └──────┬──────┘
       │                 │
       └────────┬────────┘
                │
                ▼
        ┌───────────────┐
        │ Crear         │
        │ PacienteAuth   │
        │ + PacienteAuth │
        │   PIN         │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ COMMIT        │
        │ TRANSACTION   │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Respuesta:    │
        │ success: true │
        │ id_paciente   │
        └───────────────┘
```

### **Diagrama 2: Login con PIN**

```
┌─────────────┐
│ Paciente    │
│ ingresa:    │
│ - ID        │
│ - PIN       │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ Frontend valida      │
│ - ID válido          │
│ - PIN 4 dígitos      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ POST /api/paciente-  │
│ auth/login-pin       │
│ {                    │
│   id_paciente,       │
│   pin,               │
│   device_id          │
│ }                    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Backend busca        │
│ PacienteAuth + PIN   │
└──────┬───────────────┘
       │
       ├───────────────┐
       │               │
       ▼               ▼
┌─────────────┐   ┌─────────────┐
│ ¿Bloqueado? │   │ ¿PIN válido?│
│ SI → 423    │   │ NO → 401    │
└─────────────┘   └──────┬──────┘
                         │
                         ▼ (SI)
                ┌────────────────┐
                │ Reset intentos │
                │ fallidos       │
                └────────┬───────┘
                         │
                         ▼
                ┌────────────────┐
                │ Generar JWT    │
                │ Token          │
                └────────┬───────┘
                         │
                         ▼
                ┌────────────────┐
                │ Retornar:      │
                │ - token        │
                │ - datos        │
                │   paciente     │
                └────────┬───────┘
                         │
                         ▼
                ┌────────────────┐
                │ Frontend guarda│
                │ token y navega │
                │ a interfaz     │
                └────────────────┘
```

### **Diagrama 3: Login con Biometría**

```
┌─────────────┐
│ Paciente    │
│ selecciona  │
│ biometría   │
└──────┬──────┘
       │
       ▼
┌──────────────────────┐
│ Frontend genera      │
│ challenge único      │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Dispositivo firma    │
│ challenge con clave  │
│ privada (Keychain)   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ POST /api/paciente-  │
│ auth/login-biometric │
│ {                    │
│   signature,         │
│   challenge,         │
│   credential_id      │
│ }                    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Backend verifica     │
│ firma RSA con        │
│ clave pública        │
└──────┬───────────────┘
       │
       ├───────────────┐
       │               │
       ▼               ▼
┌─────────────┐   ┌─────────────┐
│ ¿Válida?    │   │ NO → 401    │
│ NO          │   │ + incrementa │
│             │   │   intentos  │
└─────────────┘   └─────────────┘
       │
       ▼ (SI)
┌──────────────────────┐
│ Generar JWT Token    │
│ Retornar datos       │
└──────────────────────┘
```

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

### **1. PIN**
- ✅ Hash con bcrypt (10 rounds)
- ✅ Validación de unicidad
- ✅ Rechazo de PINs débiles
- ✅ Bloqueo después de 3 intentos fallidos
- ✅ Tiempo de bloqueo: 15 minutos

### **2. Biometría**
- ✅ Clave privada nunca sale del dispositivo
- ✅ Validación criptográfica RSA
- ✅ Challenge único por intento (previene replay)
- ✅ Verificación de firma en servidor

### **3. Tokens**
- ✅ JWT con expiración (8 horas)
- ✅ Almacenamiento seguro (AsyncStorage)
- ✅ Validación en cada request

### **4. Dispositivos**
- ✅ Device ID único vinculado a autenticación
- ✅ Permite cambio de dispositivo con PIN válido
- ✅ Registro de última actividad

---

## 📝 RESUMEN RÁPIDO

### **Crear Paciente:**
1. Admin completa formulario con PIN
2. Backend crea Usuario + Paciente + PacienteAuth + PacienteAuthPIN
3. PIN se hashea con bcrypt

### **Login con PIN:**
1. Paciente ingresa ID y PIN
2. Backend busca registro y compara hash
3. Si válido, genera token JWT
4. Frontend guarda token y navega

### **Configurar Biometría:**
1. Después del login, verificar disponibilidad
2. Generar claves RSA (privada en Keychain)
3. Enviar clave pública al servidor
4. Servidor guarda en PacienteAuthBiometric

### **Login con Biometría:**
1. Generar challenge único
2. Firmar con biometría (clave privada)
3. Enviar firma al servidor
4. Servidor verifica con clave pública
5. Si válida, generar token JWT

---

✅ **Flujo completo documentado y verificado**




