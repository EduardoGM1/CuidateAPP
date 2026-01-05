# 🔧 PROBLEMA: Login con ID de Paciente Hardcodeado

## 🐛 Problema Identificado

El frontend está intentando hacer login con `id_paciente: 1`, pero ese paciente **no existe** en la base de datos.

### Error:
```
error: Paciente no encontrado o inactivo
hasTransaction: false
pacienteExists: false
userId: 1
userType: Paciente
```

## 📊 Estado Actual de la Base de Datos

### Pacientes Existentes:
- **ID: 3** - Beatriz Jiménez Sánchez
  - CURP: SGDU031024MDFIII53
  - Teléfono: 742-3635140
  - PIN: 7975
  - Device ID: `device_1762199597892_cj3getv59`
  
- **ID: 4** - José García Díaz
  - CURP: PAQP870506MDFSNZ78
  - Teléfono: 837-9221533
  - PIN: 5678
  - Device ID: `device_1762199764141_moqzmakja`

### ❌ Paciente ID 1: NO EXISTE

## 🔍 Causa Raíz

### Archivo: `ClinicaMovil/src/screens/auth/LoginPaciente.js`
**Línea 23:**
```javascript
const [pacienteId, setPacienteId] = useState('1'); // TODO: Obtener ID real del paciente
```

### Archivo: `ClinicaMovil/src/screens/auth/LoginPIN.js`
**Línea 22:**
```javascript
const { pacienteId } = route?.params || { pacienteId: '1' }; // Valor por defecto
```

**Problema**: El ID está hardcodeado a `'1'`, que no existe en la base de datos.

## ✅ Solución Aplicada

### Cambios Realizados:

1. **`LoginPaciente.js`**:
   - Cambiado valor por defecto de `'1'` a `'3'` (Beatriz)
   - Añadido soporte para recibir `pacienteId` desde parámetros de navegación
   - Comentario explicando que necesita implementación completa

2. **`LoginPIN.js`**:
   - Cambiado valor por defecto de `'1'` a `'3'` (Beatriz)
   - Comentario explicando que necesita implementación completa

## 💡 Solución Temporal vs. Solución Definitiva

### ✅ Solución Temporal (Aplicada):
- Cambiar el ID hardcodeado a `'3'` para que funcione con Beatriz
- Esto permite probar el login mientras se implementa la solución correcta

### 🎯 Solución Definitiva (Pendiente):
El frontend necesita una de estas opciones:

1. **Pantalla de selección de paciente**:
   - Listar pacientes disponibles
   - Permitir seleccionar uno antes de login

2. **Búsqueda por identificador**:
   - Permitir buscar por CURP
   - Permitir buscar por número de teléfono
   - Mostrar resultados y seleccionar

3. **QR Code o código único**:
   - Generar un código único por paciente
   - Escanear código para identificar al paciente

4. **Login sin ID previo**:
   - Usar solo PIN (verificar unicidad)
   - Usar solo biometría (identificar por device_id y credencial)

## 🧪 Pruebas Ahora Posibles

Con el cambio aplicado, puedes probar login con:

### Beatriz (ID 3):
```json
{
  "id_paciente": 3,
  "pin": "7975",
  "device_id": "device_1762199597892_cj3getv59"
}
```

### José (ID 4):
```json
{
  "id_paciente": 4,
  "pin": "5678",
  "device_id": "device_1762199764141_moqzmakja"
}
```

## 📝 Notas

- El cambio es temporal y solo para pruebas
- La solución definitiva requiere implementar selección/búsqueda de pacientes
- El sistema debería funcionar ahora con el ID 3 (Beatriz) como default

---

**Fecha**: 2025-11-03  
**Status**: ✅ Solución temporal aplicada - Solución definitiva pendiente



