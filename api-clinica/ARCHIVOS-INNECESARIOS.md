# 🗑️ ARCHIVOS Y CARPETAS INNECESARIOS EN EL BACKEND

**Fecha de análisis:** 2025-11-26  
**Objetivo:** Identificar archivos y carpetas que no tienen funcionalidad en el proyecto

---

## ❌ CARPETAS COMPLETAS INNECESARIAS

### 1. **`coverage/`** - ⚠️ GENERADA POR TESTS
**Ubicación:** `api-clinica/coverage/`

**Contenido:**
- Reportes de cobertura de código generados por Jest
- Archivos HTML, JSON, XML de cobertura
- **Total:** ~59 archivos

**Razón para eliminar:**
- ✅ Archivos generados automáticamente por `npm test`
- ✅ Se regeneran cada vez que se ejecutan los tests
- ✅ No son necesarios en el repositorio (deberían estar en `.gitignore`)
- ✅ Ocupan espacio innecesario

**Acción:** ✅ **ELIMINAR** (se regeneran automáticamente)

---

### 2. **`backups/`** - ⚠️ BACKUPS ANTIGUOS
**Ubicación:** `api-clinica/backups/`

**Contenido:**
- `backup-bd-2025-11-12T15-59-36/` - Backup de BD antiguo
- `backup-multiples-horarios-2025-11-12_09-59-15/` - Backup vacío
- `backup-multiples-horarios-2025-11-12_09-59-35/` - Archivos .backup
- `backup-reprogramacion-mejoras-2025-11-13_10-45-41/` - Archivos .backup

**Razón para eliminar:**
- ✅ Backups antiguos (noviembre 2025)
- ✅ Ya no son relevantes para el proyecto actual
- ✅ Los backups deberían estar en un sistema externo, no en el código
- ✅ Ocupan espacio innecesario

**Acción:** ✅ **ELIMINAR** (mover a sistema de backup externo si es necesario)

---

### 3. **`logs/`** - ⚠️ LOGS ANTIGUOS
**Ubicación:** `api-clinica/logs/`

**Contenido:**
- `combined.log`, `combined1.log`, `combined2.log`
- `error.log`, `error1.log`

**Razón para limpiar:**
- ⚠️ Los logs deberían rotarse automáticamente
- ⚠️ Los archivos antiguos (`combined1.log`, `combined2.log`, `error1.log`) son innecesarios
- ✅ `combined.log` y `error.log` actuales pueden mantenerse (se regeneran)

**Acción:** ⚠️ **LIMPIAR archivos antiguos** (mantener solo los actuales o configurar rotación)

---

### 4. **`uploads/audio/`** - ⚠️ ARCHIVOS DE AUDIO DE PRUEBA
**Ubicación:** `api-clinica/uploads/audio/`

**Contenido:**
- 10 archivos `.m4a` (mensajes de voz de prueba)

**Razón para limpiar:**
- ⚠️ Archivos de prueba que no deberían estar en producción
- ⚠️ Ocupan espacio innecesario
- ✅ Los archivos reales se suben en producción

**Acción:** ⚠️ **LIMPIAR** (mantener solo si son necesarios para desarrollo)

---

## 📄 ARCHIVOS SQL INNECESARIOS

### 5. **Archivos SQL de Prueba/Datos**
**Ubicación:** `api-clinica/`

**Archivos:**
- ❌ `datosPrueba.sql` - Datos de prueba antiguos
- ❌ `datosPrueba-AUTOINCREMENT.sql` - Datos de prueba con autoincrement
- ❌ `paciente_auth.sql` - Script SQL antiguo (probablemente migrado)
- ❌ `tablas_completas.sql` - Script SQL antiguo (probablemente obsoleto)

**Razón para eliminar:**
- ✅ Datos de prueba no deberían estar en producción
- ✅ Scripts SQL antiguos probablemente ya fueron ejecutados
- ✅ Las migraciones están en `migrations/`

**Acción:** ✅ **ELIMINAR** (o mover a carpeta de documentación histórica)

---

## 📝 ARCHIVOS DE CONFIGURACIÓN INNECESARIOS

### 6. **`token.txt`** - ⚠️ TOKEN EXPUESTO
**Ubicación:** `api-clinica/token.txt`

**Razón para eliminar:**
- 🔴 **SEGURIDAD:** Tokens no deberían estar en archivos de texto
- 🔴 Deberían estar en variables de entorno (`.env`)
- 🔴 Riesgo de seguridad si se sube al repositorio

**Acción:** 🔴 **ELIMINAR INMEDIATAMENTE** (mover token a `.env`)

---

## 📚 ARCHIVOS DE DOCUMENTACIÓN OBSOLETOS

### 7. **`IMPLEMENTACION-COMPLETA-HORARIOS.md`** - ⚠️ DOCUMENTACIÓN OBSOLETA
**Ubicación:** `api-clinica/IMPLEMENTACION-COMPLETA-HORARIOS.md`

**Razón para revisar:**
- ⚠️ Puede ser documentación histórica
- ⚠️ Si ya está implementado, puede ser innecesario

**Acción:** ⚠️ **REVISAR** (mover a `docs/` si es histórico, eliminar si es obsoleto)

---

## 🧪 ARCHIVOS DE TEST/SCRIPTS INNECESARIOS

### 8. **Scripts de Prueba/Verificación Antiguos**
**Ubicación:** `api-clinica/scripts/`

**Scripts potencialmente innecesarios:**
- Scripts con nombres como `test-*`, `verificar-*`, `probar-*` que ya no se usan
- Scripts de migración que ya se ejecutaron
- Scripts de limpieza que ya se ejecutaron

**Ejemplos:**
- `test-login-eduardo.js` - Test específico de un usuario
- `test-login-eduardo-pin2020.js` - Test específico
- `verificar-paciente-105.js` - Verificación específica
- `limpiar-pin-duplicado-2020.js` - Limpieza ya ejecutada
- `resetear-todo-paciente-104.js` - Reset específico

**Razón para revisar:**
- ⚠️ Scripts de una sola vez que ya se ejecutaron
- ⚠️ Scripts de prueba específicos que no son reutilizables
- ⚠️ Ocupan espacio y pueden confundir

**Acción:** ⚠️ **REVISAR Y ELIMINAR** scripts que ya no se necesitan

---

## 🔧 ARCHIVOS DE CONTROLADORES/ROUTES DUPLICADOS

### 9. **`doctor-simple.js`** - ✅ CONTROLADOR NO USADO
**Ubicación:** `api-clinica/controllers/doctor-simple.js`

**Verificación:**
- ❌ NO se importa en `index.js`
- ✅ Solo se usa en `routes/doctor-test.js` (que también es innecesario)
- ⚠️ Parece ser una versión simplificada de `doctor.js`
- ⚠️ Código obsoleto

**Acción:** ✅ **ELIMINAR** (no se usa en producción)

---

### 10. **`doctor-test.js`** - ✅ RUTA DE TEST NO USADA
**Ubicación:** `api-clinica/routes/doctor-test.js`

**Verificación:**
- ❌ NO se importa en `index.js`
- ❌ NO se registra en las rutas de la aplicación
- 🔴 Ruta de test que no debería estar en producción
- 🔴 Puede ser un riesgo de seguridad

**Acción:** ✅ **ELIMINAR INMEDIATAMENTE** (no se usa y es riesgo de seguridad)

---

## 📊 RESUMEN POR PRIORIDAD

### 🔴 **ALTA PRIORIDAD - ELIMINAR INMEDIATAMENTE:**
1. ✅ `token.txt` - **RIESGO DE SEGURIDAD**
2. ✅ `coverage/` - Archivos generados
3. ✅ `backups/` - Backups antiguos
4. ✅ `routes/doctor-test.js` - Ruta de test en producción

### ⚠️ **MEDIA PRIORIDAD - REVISAR Y ELIMINAR:**
5. ⚠️ `datosPrueba.sql`, `datosPrueba-AUTOINCREMENT.sql` - Datos de prueba
6. ⚠️ `paciente_auth.sql`, `tablas_completas.sql` - Scripts SQL antiguos
7. ⚠️ `logs/combined1.log`, `logs/combined2.log`, `logs/error1.log` - Logs antiguos
8. ⚠️ `uploads/audio/*.m4a` - Archivos de prueba
9. ⚠️ Scripts en `scripts/` que ya no se usan (test-*, verificar-*, probar-*)

### 📝 **BAJA PRIORIDAD - REVISAR:**
10. 📝 `IMPLEMENTACION-COMPLETA-HORARIOS.md` - Documentación histórica
11. 📝 `controllers/doctor-simple.js` - ✅ **ELIMINAR** (solo usado por doctor-test.js que también se elimina)
12. 📝 Scripts de reorganización (`reorganize-project.js`, etc.) - Ya ejecutados (se pueden eliminar)

---

## 📋 COMANDOS PARA LIMPIAR

```powershell
# Eliminar coverage (se regenera)
Remove-Item -Recurse -Force "api-clinica\coverage"

# Eliminar backups antiguos
Remove-Item -Recurse -Force "api-clinica\backups"

# Eliminar token.txt (RIESGO DE SEGURIDAD)
Remove-Item -Force "api-clinica\token.txt"

# Eliminar ruta y controlador de test
Remove-Item -Force "api-clinica\routes\doctor-test.js"
Remove-Item -Force "api-clinica\controllers\doctor-simple.js"

# Eliminar archivos SQL de prueba
Remove-Item -Force "api-clinica\datosPrueba.sql"
Remove-Item -Force "api-clinica\datosPrueba-AUTOINCREMENT.sql"
Remove-Item -Force "api-clinica\paciente_auth.sql"
Remove-Item -Force "api-clinica\tablas_completas.sql"

# Limpiar logs antiguos
Remove-Item -Force "api-clinica\logs\combined1.log"
Remove-Item -Force "api-clinica\logs\combined2.log"
Remove-Item -Force "api-clinica\logs\error1.log"

# Limpiar archivos de audio de prueba
Remove-Item -Recurse -Force "api-clinica\uploads\audio"
```

---

## ⚠️ IMPORTANTE

**ANTES DE ELIMINAR:**
1. ✅ Verificar que `token.txt` no contenga tokens activos (mover a `.env`)
2. ✅ Hacer backup de `backups/` si contiene información importante
3. ✅ Verificar que los scripts no se usen en CI/CD
4. ✅ Actualizar `.gitignore` para evitar que se vuelvan a agregar

---

**Última actualización:** 2025-11-26

