# 🧪 INSTRUCCIONES PARA PROBAR ENCRIPTACIÓN

**Fecha:** 31 de Diciembre, 2025

---

## ✅ PROBLEMA RESUELTO

El error **"Data too long for column 'curp'"** ha sido solucionado:
- ✅ Columna `curp` cambiada de `VARCHAR(18)` a `TEXT`
- ✅ Todas las columnas sensibles ahora son `TEXT`
- ✅ Sistema de encriptación listo para funcionar

---

## 🚀 PASOS PARA PROBAR

### **Paso 1: Iniciar Servidor**

Abre una terminal y ejecuta:

```bash
cd api-clinica
npm run dev
```

**Espera a ver:**
```
✅ HTTP Server running on http://0.0.0.0:3000
```

---

### **Paso 2: Ejecutar Prueba Automática**

Abre **otra terminal** y ejecuta:

```bash
cd api-clinica
node scripts/test-crear-paciente-encriptacion.js
```

**El script:**
- ✅ Se autenticará como doctor (doctor@clinica.com)
- ✅ Creará un paciente con datos sensibles
- ✅ Verificará que los datos se encripten automáticamente
- ✅ Consultará el paciente y verificará desencriptación automática

---

### **Paso 3: Verificar en Base de Datos (Opcional)**

```sql
-- Conectar a MySQL
mysql -u root -p clinica_db

-- Ver el último paciente creado
SELECT 
  id_paciente,
  nombre,
  apellido_paterno,
  curp,
  numero_celular,
  direccion
FROM pacientes
ORDER BY id_paciente DESC
LIMIT 1;

-- Los campos curp, numero_celular, direccion deben mostrar:
-- {"encrypted":"a1b2c3...","iv":"d4e5f6...","authTag":"g7h8i9..."}
```

---

## 📋 PRUEBA MANUAL DESDE LA APLICACIÓN

1. **Iniciar servidor backend**
2. **Abrir aplicación móvil/frontend**
3. **Iniciar sesión como doctor** (doctor@clinica.com / Doctor123!)
4. **Crear un nuevo paciente** con:
   - CURP: `GOLM850520MDFNPR01`
   - Teléfono: `5559876543`
   - Dirección: `Av. Principal 456, Col. Centro`
5. **Verificar que se crea sin errores**

---

## ✅ RESULTADOS ESPERADOS

### **Al Crear Paciente:**
- ✅ No debe aparecer error "Data too long"
- ✅ Paciente se crea exitosamente
- ✅ Datos sensibles se encriptan automáticamente

### **Al Consultar Paciente:**
- ✅ CURP se muestra desencriptado (18 caracteres)
- ✅ Teléfono se muestra desencriptado
- ✅ Dirección se muestra desencriptada

### **En Base de Datos:**
- ✅ Campos `curp`, `numero_celular`, `direccion` están encriptados (formato JSON)
- ✅ Campos tienen tipo `TEXT` (no VARCHAR)

---

## 🔍 VERIFICACIÓN RÁPIDA

### **Verificar Tipo de Columnas:**

```sql
DESCRIBE pacientes;
-- curp debe ser: text
-- direccion debe ser: text
-- numero_celular debe ser: text
```

### **Verificar Datos Encriptados:**

```sql
SELECT 
  id_paciente,
  nombre,
  LEFT(curp, 50) as curp_preview,
  LEFT(numero_celular, 50) as telefono_preview,
  LEFT(direccion, 50) as direccion_preview
FROM pacientes
ORDER BY id_paciente DESC
LIMIT 1;

-- Debe mostrar algo como:
-- curp_preview: {"encrypted":"a1b2c3d4e5f6...","iv":"...
-- telefono_preview: {"encrypted":"g7h8i9j0k1l2...","iv":"...
-- direccion_preview: {"encrypted":"m3n4o5p6q7r8...","iv":"...
```

---

## ⚠️ SI AÚN HAY PROBLEMAS

### **Error: "Data too long for column 'curp'"**

**Solución:**
```bash
cd api-clinica
node scripts/verificar-y-corregir-encriptacion.js
```

Este script verificará y corregirá automáticamente cualquier problema.

---

## 📊 RESUMEN

**Estado Actual:**
- ✅ Migraciones ejecutadas
- ✅ Columnas cambiadas a TEXT
- ✅ Sistema de encriptación implementado
- ✅ Script de prueba creado

**Siguiente Paso:**
1. Iniciar servidor
2. Ejecutar prueba automática
3. Verificar que todo funciona

---

**Última Actualización:** 31 de Diciembre, 2025

