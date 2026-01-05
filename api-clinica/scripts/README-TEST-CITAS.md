# 🧪 Pruebas de Estados de Citas y Reprogramación

## 📋 Descripción

Script automatizado para probar todos los endpoints relacionados con:
- Cambio de estados de citas (pendiente, atendida, no_asistida, reprogramada, cancelada)
- Reprogramación de citas por doctores
- Solicitudes de reprogramación por pacientes
- Aprobación/rechazo de solicitudes por doctores

## 🚀 Ejecución

### Opción 1: Usando npm script
```bash
npm run test:citas-estados
```

### Opción 2: Directamente
```bash
node scripts/test-citas-estados-reprogramacion.js
```

## ⚙️ Configuración

### Variables de Entorno (opcional)

Puedes configurar credenciales en `.env`:

```env
TEST_DOCTOR_EMAIL=doctor@clinica.com
TEST_DOCTOR_PASSWORD=doctor123
TEST_ADMIN_EMAIL=admin@clinica.com
TEST_ADMIN_PASSWORD=admin123
TEST_PACIENTE_ID=7
TEST_PACIENTE_PIN=2020
API_BASE_URL=http://localhost:3000
```

### Credenciales por Defecto

Si no se configuran variables de entorno, el script usa:
- **Doctor**: `doctor@clinica.com` / `doctor123`
- **Admin**: `admin@clinica.com` / `admin123`
- **Paciente**: ID `7` / PIN `2020`

## ✅ Pruebas Incluidas

1. **Autenticación**
   - Login como Doctor/Admin
   - Login como Paciente

2. **Cambio de Estados (Doctor)**
   - Cambiar estado a "atendida"
   - Cambiar estado a "pendiente"
   - Cambiar estado a "no_asistida"

3. **Reprogramación Directa (Doctor)**
   - Reprogramar cita con nueva fecha

4. **Solicitudes de Reprogramación (Paciente)**
   - Crear solicitud de reprogramación
   - Ver solicitudes del paciente

5. **Gestión de Solicitudes (Doctor)**
   - Aprobar solicitud de reprogramación
   - Rechazar solicitud (opcional)

6. **Filtros**
   - Filtrar citas por estado

7. **Validación de Permisos**
   - Verificar que pacientes no pueden cambiar estados

## 📊 Resultados

El script muestra:
- ✅ Pruebas pasadas
- ❌ Pruebas fallidas
- 📊 Porcentaje de éxito
- 📝 Detalles de errores (si los hay)

## ⚠️ Requisitos Previos

1. **Servidor corriendo**: El servidor debe estar activo en `http://localhost:3000`
   ```bash
   cd api-clinica
   npm start
   ```

2. **Migración aplicada**: La migración de base de datos debe estar ejecutada
   ```bash
   node scripts/alter-citas-estado-reprogramacion.js
   ```

3. **Datos de prueba**: Debe existir al menos:
   - Un doctor o admin con credenciales válidas
   - Un paciente con ID y PIN válidos
   - Al menos una cita en el sistema (o el script la creará)

## 🔧 Solución de Problemas

### Error: "No se pudo conectar al servidor"
- Verifica que el servidor esté corriendo: `npm start`
- Verifica que el puerto sea el correcto (default: 3000)

### Error: "Login falló"
- Verifica las credenciales en `.env` o en `TEST_CREDENTIALS`
- Asegúrate de que el usuario exista en la base de datos

### Error: "Cita no encontrada"
- El script intentará crear una cita de prueba automáticamente
- Si falla, verifica que exista un doctor con ID 1 y un paciente válido

## 📝 Notas

- El script crea datos de prueba temporales (citas, solicitudes)
- Las pruebas son idempotentes: pueden ejecutarse múltiples veces
- Los datos de prueba se pueden limpiar manualmente después

