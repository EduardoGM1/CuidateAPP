# 🔐 SOLUCIÓN DE AUTENTICACIÓN PARA PACIENTES - ARQUITECTURA MEJORADA

## 📋 RESUMEN EJECUTIVO

**Problema Actual:**
- La autenticación biométrica está simulada, no usa APIs nativas del teléfono
- Falta una librería real de biometría en React Native
- El flujo puede ser más simple y seguro

**Solución Propuesta:**
- ✅ Integración con `react-native-biometrics` (APIs nativas Android/iOS)
- ✅ Autenticación basada en claves asimétricas (más seguro que WebAuthn complejo)
- ✅ Flujo simplificado para pacientes rurales
- ✅ Fallback automático PIN → Biometría → PIN de emergencia

---

## 🏗️ ARQUITECTURA PROPUESTA

### **1. CAPA DE PRESENTACIÓN (Frontend)**

```
LoginPaciente
    ├── Opción 1: PIN (4 dígitos)
    │   └── LoginPIN → pacienteAuthService.loginPIN()
    │
    ├── Opción 2: Biometría (Automático si está configurado)
    │   └── BiometricService.authenticate()
    │       ├── Detecta tipo disponible (Face ID / Touch ID / Fingerprint)
    │       ├── Usa clave privada del dispositivo (Keychain/Keystore)
    │       └── Firma challenge del servidor
    │
    └── Fallback: PIN siempre disponible
```

### **2. CAPA DE SERVICIO (Frontend)**

#### **BiometricService** (NUEVO)
```javascript
// Características:
- Detecta si el dispositivo tiene biometría
- Detecta tipo: Face ID / Touch ID / Fingerprint
- Genera par de claves RSA en Keychain/Keystore (seguro)
- Firma challenge del servidor con clave privada
- No almacena datos biométricos (solo claves)
```

#### **PacienteAuthService** (MEJORADO)
```javascript
// Funcionalidades actuales + mejoras:
- setupPIN() → Ya funciona ✅
- loginPIN() → Ya funciona ✅
- setupBiometric() → Simplificar (solo clave pública)
- loginBiometric() → Validar firma RSA (más simple que WebAuthn)
```

### **3. CAPA BACKEND (Simplificada)**

#### **Modelo de Datos** (YA EXISTE ✅)
```sql
paciente_auth
  ├── id_auth (PK)
  ├── id_paciente (FK)
  ├── device_id (unique)
  └── failed_attempts, locked_until

paciente_auth_pin
  ├── id_pin_auth (PK)
  ├── id_auth (FK)
  └── pin_hash (bcrypt)

paciente_auth_biometric  ← MEJORAR
  ├── id_biometric_auth (PK)
  ├── id_auth (FK)
  ├── public_key (RSA public key en PEM) ← Cambiar de TEXT a TEXT
  ├── credential_id (UUID del dispositivo)
  ├── biometric_type ('face', 'fingerprint', 'iris')
  └── last_used
```

#### **Controlador** (SIMPLIFICAR)
```javascript
// Eliminar WebAuthn complejo
// Usar validación RSA simple:

setupBiometric():
  1. Recibe public_key (PEM) del dispositivo
  2. Genera credential_id único
  3. Almacena en BD
  4. Retorna challenge para probar

loginBiometric():
  1. Recibe signature (firma RSA del challenge)
  2. Valida con public_key almacenada
  3. Verifica que el challenge no haya sido usado (cache Redis)
  4. Genera JWT token
```

---

## 📦 DEPENDENCIAS NUEVAS

### **Frontend:**
```json
{
  "react-native-biometrics": "^3.0.1"
}
```

### **Backend:**
```json
{
  "crypto": "^1.0.1",  // Ya viene con Node.js
  "node-forge": "^1.3.1"  // Opcional: para RSA si crypto no es suficiente
}
```

---

## 🔄 FLUJO COMPLETO

### **FLUJO 1: Configuración Inicial (Primera vez)**

```
1. Paciente abre app por primera vez
   ↓
2. Se le pide configurar PIN (obligatorio)
   ├── Ingresa PIN de 4 dígitos
   ├── Confirma PIN
   └── Backend: setupPIN() → Hash bcrypt → Almacena
   ↓
3. Opcional: Configurar biometría
   ├── App detecta si tiene biometría disponible
   ├── Muestra: "¿Quieres usar tu huella/cara para iniciar sesión?"
   ├── Usuario acepta
   ├── BiometricService.createKeys()
   │   └── Genera par RSA en Keychain/Keystore
   ├── BiometricService.getPublicKey()
   │   └── Obtiene clave pública
   ├── Backend: setupBiometric()
   │   ├── Recibe public_key
   │   ├── Genera credential_id
   │   └── Almacena en BD
   └── ¡Listo! Biometría configurada
```

### **FLUJO 2: Login Normal (Diario)**

```
1. Usuario abre app
   ↓
2. App detecta si tiene biometría configurada
   ├── SÍ → Muestra botón grande de biometría + PIN (fallback)
   └── NO → Solo muestra PIN
   ↓
3. Usuario elige método:
   
   OPCIÓN A: Biometría
   ├── Usuario toca botón de biometría
   ├── Sistema operativo muestra diálogo nativo
   │   └── Face ID / Touch ID / Fingerprint
   ├── Usuario autentica con biometría
   ├── BiometricService.signChallenge(challenge)
   │   └── Firma challenge con clave privada (Keychain)
   ├── Backend: loginBiometric()
   │   ├── Valida signature con public_key
   │   ├── Verifica challenge (no usado antes)
   │   └── Genera JWT token
   └── ✅ Login exitoso
   
   OPCIÓN B: PIN (fallback)
   ├── Usuario ingresa PIN de 4 dígitos
   ├── Backend: loginPIN()
   │   ├── Valida PIN con bcrypt
   │   └── Genera JWT token
   └── ✅ Login exitoso
```

---

## 🔒 SEGURIDAD

### **Ventajas de esta solución:**

1. **Biometría nativa:**
   - Usa APIs oficiales del sistema operativo
   - Los datos biométricos NUNCA salen del dispositivo
   - Validación por hardware (Secure Enclave)

2. **Criptografía asimétrica:**
   - Clave privada: Solo en Keychain/Keystore (hardware seguro)
   - Clave pública: Almacenada en backend
   - Firma RSA: Imposible falsificar sin clave privada

3. **Protecciones existentes:**
   - ✅ Rate limiting
   - ✅ Bloqueo por intentos fallidos
   - ✅ Validación de PINs débiles
   - ✅ Tokens JWT con expiración

4. **Nuevas protecciones:**
   - ✅ Challenge nonce (evita replay attacks)
   - ✅ Validación de firma RSA (más seguro que hash)
   - ✅ Verificación de dispositivo (device_id + credential_id)

---

## 📝 CAMBIOS EN CÓDIGO

### **1. Instalar dependencias:**

```bash
cd ClinicaMovil
npm install react-native-biometrics
cd ios && pod install && cd ..
```

### **2. Nuevo servicio: `BiometricService.js`**

```javascript
import ReactNativeBiometrics from 'react-native-biometrics';

class BiometricService {
  // Detectar si biometría está disponible
  async isAvailable() { }
  
  // Detectar tipo de biometría
  async getBiometricType() { }
  
  // Crear par de claves RSA
  async createKeys() { }
  
  // Obtener clave pública
  async getPublicKey() { }
  
  // Autenticar y firmar challenge
  async signChallenge(challenge) { }
  
  // Eliminar claves (si usuario desactiva biometría)
  async deleteKeys() { }
}
```

### **3. Mejorar `LoginPaciente.js`**

```javascript
// Detectar biometría al cargar
useEffect(() => {
  checkBiometricAvailability();
}, []);

// Mostrar opciones dinámicamente:
// - Si tiene biometría → Botón grande biométrico + PIN pequeño
// - Si no tiene → Solo PIN grande
```

### **4. Simplificar Backend**

```javascript
// Cambiar de WebAuthn complejo a RSA simple:

setupBiometric():
  // Eliminar: credential_id complejo, counter, aaguid
  // Agregar: Solo public_key (PEM) y credential_id (UUID simple)

loginBiometric():
  // Eliminar: Verificación WebAuthn compleja
  // Agregar: Validación RSA simple con crypto.verify()
```

---

## ✅ VENTAJAS DE ESTA SOLUCIÓN

1. **✅ Usa APIs nativas:** Face ID, Touch ID, Fingerprint reales
2. **✅ Más simple:** Elimina complejidad de WebAuthn
3. **✅ Más seguro:** Claves en hardware seguro (Keychain/Keystore)
4. **✅ Mejor UX:** Diálogos nativos del sistema operativo
5. **✅ Mantiene compatibilidad:** PIN siempre disponible
6. **✅ Menos dependencias:** Solo `react-native-biometrics`

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### **Fase 1: Instalación y Configuración** (30 min)
- [ ] Instalar `react-native-biometrics`
- [ ] Configurar permisos Android/iOS
- [ ] Crear servicio base

### **Fase 2: Implementación Frontend** (2-3 horas)
- [ ] Crear `BiometricService.js`
- [ ] Actualizar `LoginPaciente.js`
- [ ] Agregar detección automática
- [ ] Mejorar UX con feedback visual

### **Fase 3: Simplificar Backend** (1-2 horas)
- [ ] Simplificar `setupBiometric()`
- [ ] Simplificar `loginBiometric()`
- [ ] Agregar validación RSA
- [ ] Agregar cache de challenges (Redis opcional)

### **Fase 4: Testing** (1-2 horas)
- [ ] Probar en Android con Fingerprint
- [ ] Probar en iOS con Face ID
- [ ] Probar fallback a PIN
- [ ] Probar seguridad (intentos fallidos)

---

## 📱 COMPATIBILIDAD

| Dispositivo | Biometría Disponible | Soporte |
|-------------|---------------------|---------|
| Android 6.0+ | Fingerprint | ✅ |
| Android 9.0+ | Face Recognition | ✅ |
| iOS 11.0+ | Touch ID | ✅ |
| iOS 13.0+ | Face ID | ✅ |

**Nota:** Si el dispositivo no tiene biometría, solo se muestra PIN.

---

## ❓ PREGUNTAS FRECUENTES

**Q: ¿Los datos biométricos se almacenan en el servidor?**
R: **NO**. Los datos biométricos nunca salen del dispositivo. Solo se almacena la clave pública RSA.

**Q: ¿Qué pasa si el usuario cambia de teléfono?**
R: Debe configurar biometría nuevamente. El backend permite múltiples dispositivos por paciente.

**Q: ¿Es más seguro que PIN?**
R: SÍ. La clave privada está protegida por hardware (Secure Enclave) y nunca se puede extraer.

**Q: ¿Puede funcionar sin internet?**
R: NO. Se necesita validar el challenge con el servidor. Pero el PIN sí puede funcionar offline (con cache de token).

---

## 🎯 CONCLUSIÓN

Esta solución:
- ✅ **Usa biometría REAL del dispositivo** (no simulación)
- ✅ **Más simple** que WebAuthn completo
- ✅ **Más seguro** que solo PIN
- ✅ **Mejor UX** para pacientes rurales
- ✅ **Mantiene compatibilidad** con PIN como fallback

**¿Procedemos con la implementación?**




