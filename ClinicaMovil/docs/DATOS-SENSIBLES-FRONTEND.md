# 🔐 Datos Sensibles en Frontend - Guía de Ocultación

**Fecha:** 2025-11-05  
**Aplicación:** Frontend React Native

---

## 📋 DATOS QUE DEBEN OCULTARSE EN LOGS (Frontend)

### ✅ **Ya Implementado en `securityUtils.js`**

```javascript
const sensitiveKeys = [
  'password', 'token', 'secret', 'pin', 'curp',
  'fecha_nacimiento', 'direccion', 'telefono',
  'numero_celular', 'diagnostico', 'medicamento',
  'signos_vitales', 'presion_arterial', 'glucosa'
];
```

### ❌ **Faltan por Agregar**

```javascript
const sensitiveKeys = [
  // ... anteriores
  // Datos personales
  'email', 'localidad', 'nombre', 'apellido', 'nombre_contacto',
  
  // Datos médicos adicionales
  'colesterol', 'trigliceridos', 'peso', 'talla', 'imc', 'medida_cintura',
  'presion_sistolica', 'presion_diastolica', 'glucosa_mg_dl',
  'colesterol_mg_dl', 'trigliceridos_mg_dl',
  
  // Información médica
  'motivo', 'notas', 'observaciones', 'dosis', 'frecuencia', 'horario',
  'via_administracion', 'alergia', 'alergias', 'comorbilidad', 'comorbilidades',
  'vacuna', 'vacunas', 'fecha_deteccion'
];
```

---

## 🎯 RECOMENDACIONES PARA FRONTEND

### 1. **No Mostrar Datos Sensibles en Consola**
- ✅ Usar `Logger` con sanitización automática
- ✅ No usar `console.log` directamente con datos sensibles
- ✅ Verificar que `securityUtils.sanitizeForLogging` se aplica

### 2. **Ocultar Datos en UI (Opcional)**
- Considerar ocultar/mascarar datos sensibles en pantallas de debug
- Mostrar solo últimos 4 dígitos de teléfono: `***5678`
- Mostrar solo año de fecha de nacimiento: `1990`
- Mostrar solo iniciales de nombre: `J. P.`

### 3. **No Almacenar Datos Sensibles Localmente**
- ✅ Ya implementado: `EncryptedStorage` para tokens y datos de usuario
- ⚠️ Verificar que no se almacenen datos médicos en `AsyncStorage`

---

## 📝 ACTUALIZACIÓN REQUERIDA

Actualizar `ClinicaMovil/src/utils/securityUtils.js` para incluir todos los campos sensibles identificados.

---

**Autor:** Senior Full Stack Developer  
**Fecha:** 2025-11-05



