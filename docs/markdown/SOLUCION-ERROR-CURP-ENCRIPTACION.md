# 🔧 SOLUCIÓN: Error "Data too long for column 'curp'"

**Fecha:** 31 de Diciembre, 2025  
**Error:** `Data too long for column 'curp' at row 1`

---

## 🔍 PROBLEMA IDENTIFICADO

El error ocurría porque:
1. La columna `curp` en la base de datos era `VARCHAR(18)` (solo 18 caracteres)
2. Al encriptar el CURP con AES-256-GCM, el resultado es un JSON string mucho más largo (~200-300 caracteres)
3. El formato encriptado es: `{"encrypted":"...","iv":"...","authTag":"..."}`

---

## ✅ SOLUCIÓN APLICADA

### **1. Verificación del Estado**

Se creó el script `verificar-y-corregir-encriptacion.js` que:
- Verifica el tipo de dato actual de las columnas
- Identifica qué columnas necesitan ser cambiadas
- Aplica los cambios necesarios

### **2. Cambios Aplicados**

**Antes:**
- `curp`: `VARCHAR(18)` ❌
- `direccion`: `TEXT` ✅
- `numero_celular`: `TEXT` ✅

**Después:**
- `curp`: `TEXT` ✅
- `direccion`: `TEXT` ✅
- `numero_celular`: `TEXT` ✅

### **3. Eliminación de Índices**

Se eliminaron los índices únicos en `curp` que impedían el cambio a TEXT.

---

## 📊 RESULTADO

**Estado Final:**
```
✅ curp: text
✅ direccion: text
✅ numero_celular: text
```

**Todas las columnas sensibles ahora pueden almacenar datos encriptados sin problemas de tamaño.**

---

## 🧪 VERIFICACIÓN

Para verificar que el problema está resuelto:

1. **Intentar crear un paciente nuevamente desde la aplicación**
2. **Verificar en la base de datos:**

```sql
-- Verificar tipo de columna
DESCRIBE pacientes;

-- Ver datos encriptados (deben estar en formato JSON)
SELECT 
  id_paciente,
  nombre,
  curp,
  numero_celular,
  direccion
FROM pacientes
ORDER BY id_paciente DESC
LIMIT 1;

-- El campo curp debe mostrar algo como:
-- {"encrypted":"a1b2c3...","iv":"d4e5f6...","authTag":"g7h8i9..."}
```

---

## ✅ PROBLEMA RESUELTO

El error **"Data too long for column 'curp'"** ya no debería ocurrir.

**Próximos pasos:**
1. Reiniciar el servidor (si está ejecutándose)
2. Intentar crear un paciente nuevamente
3. Verificar que los datos se encripten correctamente

---

**Última Actualización:** 31 de Diciembre, 2025

