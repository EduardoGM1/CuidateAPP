# 📱 GUÍA DE AUTENTICACIÓN PARA PACIENTES

## 🎯 SOLUCIÓN IMPLEMENTADA

Sistema de autenticación simplificado para pacientes con:
- ✅ **PIN de 4 dígitos** (fácil de recordar)
- ✅ **Autenticación biométrica** (huella/rostro)
- ✅ **Seguridad robusta** (bloqueos, rate limiting)
- ✅ **Compatibilidad móvil** (WebAuthn/APIs nativas)

## 🛠️ ARQUITECTURA

```
App Móvil → API Backend → Base de Datos
    ↓
WebAuthn/Biometric APIs
(Touch ID, Face ID, Fingerprint)
```

## 📋 ENDPOINTS IMPLEMENTADOS

### **1. Configurar PIN** 
```
POST /api/paciente-auth/setup-pin
```
**Body:**
```json
{
  "id_paciente": 123,
  "pin": "1234",
  "device_id": "device_unique_id_here"
}
```

### **2. Login con PIN**
```
POST /api/paciente-auth/login-pin
```
**Body:**
```json
{
  "id_paciente": 123,
  "pin": "1234",
  "device_id": "device_unique_id_here"
}
```

### **3. Configurar Biometría**
```
POST /api/paciente-auth/setup-biometric
```
**Body:**
```json
{
  "id_paciente": 123,
  "device_id": "device_unique_id_here",
  "public_key": "biometric_public_key",
  "credential_id": "credential_identifier"
}
```

### **4. Login con Biometría**
```
POST /api/paciente-auth/login-biometric
```
**Body:**
```json
{
  "id_paciente": 123,
  "device_id": "device_unique_id_here",
  "signature": "biometric_signature",
  "challenge": "server_challenge"
}
```

## 🔒 CARACTERÍSTICAS DE SEGURIDAD

### **Protecciones Implementadas:**
- ✅ **Rate Limiting**: 5 intentos por 15 minutos
- ✅ **Bloqueo automático**: 3 intentos fallidos = 15 min bloqueado
- ✅ **PINs seguros**: No permite 0000, 1234, etc.
- ✅ **Vinculación de dispositivo**: Un dispositivo por paciente
- ✅ **Tokens con expiración**: 8 horas (optimizado para móvil)
- ✅ **Validación biométrica**: WebAuthn/FIDO2

### **Flujo de Seguridad:**
```
1. Paciente configura PIN (una vez)
2. Opcionalmente configura biometría
3. Login rápido con PIN o biometría
4. Token JWT válido por 8 horas
5. Renovación automática en background
```

## 📱 IMPLEMENTACIÓN FRONTEND

### **JavaScript/React Native:**

```javascript
// 1. Configurar PIN
const setupPIN = async (pacienteId, pin) => {
  const deviceId = await getDeviceId(); // UUID único del dispositivo
  
  const response = await fetch('/api/paciente-auth/setup-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_paciente: pacienteId,
      pin: pin,
      device_id: deviceId
    })
  });
  
  return response.json();
};

// 2. Login con PIN
const loginWithPIN = async (pacienteId, pin) => {
  const deviceId = await getDeviceId();
  
  const response = await fetch('/api/paciente-auth/login-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_paciente: pacienteId,
      pin: pin,
      device_id: deviceId
    })
  });
  
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('patient_token', data.token);
  }
  return data;
};

// 3. Configurar biometría (WebAuthn)
const setupBiometric = async (pacienteId) => {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometría no soportada');
  }
  
  const deviceId = await getDeviceId();
  
  // Crear credencial biométrica
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: new Uint8Array(32),
      rp: { name: "Clínica App" },
      user: {
        id: new TextEncoder().encode(pacienteId.toString()),
        name: `paciente_${pacienteId}`,
        displayName: "Paciente"
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required"
      }
    }
  });
  
  const response = await fetch('/api/paciente-auth/setup-biometric', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_paciente: pacienteId,
      device_id: deviceId,
      public_key: arrayBufferToBase64(credential.response.publicKey),
      credential_id: arrayBufferToBase64(credential.rawId)
    })
  });
  
  return response.json();
};

// 4. Login con biometría
const loginWithBiometric = async (pacienteId) => {
  const deviceId = await getDeviceId();
  const challenge = generateChallenge();
  
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: new TextEncoder().encode(challenge),
      userVerification: "required"
    }
  });
  
  const response = await fetch('/api/paciente-auth/login-biometric', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_paciente: pacienteId,
      device_id: deviceId,
      signature: arrayBufferToBase64(assertion.response.signature),
      challenge: challenge
    })
  });
  
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('patient_token', data.token);
  }
  return data;
};
```

### **React Native (iOS/Android):**

```javascript
import TouchID from 'react-native-touch-id';
import FingerprintScanner from 'react-native-fingerprint-scanner';

// Verificar soporte biométrico
const checkBiometricSupport = async () => {
  try {
    const biometryType = await TouchID.isSupported();
    return biometryType; // 'FaceID', 'TouchID', 'Fingerprint'
  } catch (error) {
    return false;
  }
};

// Login con biometría nativa
const authenticateWithBiometric = async () => {
  try {
    await TouchID.authenticate('Acceder a tu cuenta médica', {
      title: 'Autenticación Biométrica',
      subtitle: 'Usa tu huella o rostro para acceder',
      description: 'Coloca tu dedo en el sensor o mira a la cámara',
      fallbackLabel: 'Usar PIN',
      cancelLabel: 'Cancelar'
    });
    
    return true;
  } catch (error) {
    return false;
  }
};
```

## 🔄 FLUJO DE USUARIO

### **Primera vez (Configuración):**
```
1. Paciente ingresa ID/CURP
2. Doctor/Admin valida identidad
3. Paciente configura PIN de 4 dígitos
4. Opcionalmente configura biometría
5. ✅ Listo para usar
```

### **Uso diario:**
```
1. Abrir app
2. Seleccionar método:
   - PIN: Ingresar 4 dígitos
   - Biometría: Huella/rostro
3. ✅ Acceso inmediato
```

## 📊 VENTAJAS DE LA SOLUCIÓN

### **Para Pacientes:**
- 🚀 **Acceso rápido**: 2-3 segundos
- 🧠 **Fácil de recordar**: Solo 4 dígitos
- 📱 **Familiar**: Como desbloquear el teléfono
- 🔒 **Seguro**: Biometría + PIN

### **Para la Clínica:**
- 👥 **Mayor adopción**: Interfaz simple
- 🔐 **Seguridad médica**: Cumple estándares
- 📊 **Menos soporte**: Autoservicio
- 💰 **Costo-efectivo**: Sin hardware adicional

## 🚀 PRÓXIMOS PASOS

1. **Ejecutar SQL**: `paciente_auth.sql`
2. **Configurar frontend**: Implementar WebAuthn
3. **Testing**: Probar en dispositivos reales
4. **Capacitación**: Entrenar al personal médico
5. **Rollout gradual**: Implementar por fases

## 📱 COMPATIBILIDAD

- ✅ **iOS**: Touch ID, Face ID
- ✅ **Android**: Fingerprint, Face Unlock
- ✅ **Web**: WebAuthn (Chrome, Safari, Firefox)
- ✅ **PWA**: Progressive Web Apps

La solución está **lista para implementar** y proporciona la experiencia de usuario más simple posible manteniendo la seguridad médica requerida.