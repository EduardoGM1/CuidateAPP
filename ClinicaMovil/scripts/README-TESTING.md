# 🧪 Scripts de Pruebas de Integración Frontend->Backend

Este directorio contiene scripts para validar el envío de datos desde el frontend hacia el backend.

---

## 📋 Scripts Disponibles

### 1. `test-frontend-backend-integration.js`

**Descripción**: Pruebas de integración que validan el envío de datos desde el frontend hacia el backend, analizando cada campo de cada formulario.

**Ejecutar**:
```bash
cd ClinicaMovil
npm run test:integration
# o
node scripts/test-frontend-backend-integration.js
```

**Requisitos**:
- El servidor backend debe estar corriendo en `http://localhost:3000` (o configurar `API_URL`)
- Ajustar las siguientes constantes en el script según tu entorno:
  - `TEST_PACIENTE_ID`: ID de un paciente existente en la BD
  - `TEST_DOCTOR_ID`: ID de un doctor existente en la BD
  - `TEST_CREDENTIALS.doctor.email`: Email del doctor
  - `TEST_CREDENTIALS.doctor.password`: Contraseña del doctor

**Qué prueba**:
1. ✅ Formulario de Signos Vitales
   - Validación de campos enviados
   - Validación de que NO se envían campos que el backend crea
   - Validación de tipos de datos
   - Validación de campos requeridos

2. ✅ Formulario de Citas Médicas
   - Estructura de datos
   - Validaciones

3. ✅ Formulario de Diagnósticos
   - Campos requeridos
   - Tipos de datos

4. ✅ Formulario de Plan de Medicación
   - Estructura compleja (array de medicamentos)
   - Validaciones

5. ✅ Formulario de Red de Apoyo
   - Campos requeridos y opcionales
   - Validaciones

6. ✅ Formulario de Esquema de Vacunación
   - Campos requeridos y opcionales
   - Validaciones

**Salida esperada**:
```
🧪 PRUEBAS DE INTEGRACIÓN FRONTEND->BACKEND
============================================================
API Base URL: http://localhost:3000
Paciente ID: 7
Doctor ID: 2

🔐 Autenticando...
✅ Autenticación: Token obtenido correctamente

📊 FORMULARIO: SIGNOS VITALES
============================================================
...
✅ Pruebas pasadas: X
❌ Pruebas fallidas: Y
⚠️  Advertencias: Z
```

---

## 📚 Documentación Relacionada

- **Análisis completo de formularios**: Ver `docs/ANALISIS-FORMULARIOS-FRONTEND-BACKEND.md`
- **Pruebas unitarias existentes**: Ver `src/__tests__/`

---

## 🔧 Configuración

### Variables de Entorno

Puedes configurar la URL del API usando una variable de entorno:

```bash
# Windows (PowerShell)
$env:API_URL="http://192.168.1.65:3000"
npm run test:integration

# Windows (CMD)
set API_URL=http://192.168.1.65:3000
npm run test:integration

# Linux/Mac
export API_URL=http://192.168.1.65:3000
npm run test:integration
```

---

## ⚠️ Notas Importantes

1. **Datos de Prueba**: El script crea datos reales en la base de datos. Asegúrate de usar una base de datos de desarrollo.

2. **Autenticación**: El script intenta autenticarse como doctor. Si falla, algunas pruebas se ejecutarán sin autenticación y fallarán.

3. **IDs de Prueba**: Asegúrate de que `TEST_PACIENTE_ID` y `TEST_DOCTOR_ID` existan en tu base de datos.

---

**Última actualización**: 2025-11-05


