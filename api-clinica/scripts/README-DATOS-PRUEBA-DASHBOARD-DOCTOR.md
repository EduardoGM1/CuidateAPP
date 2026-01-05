# 📋 Script de Datos de Prueba - Dashboard Doctor

## 🎯 Propósito

Este script crea datos de prueba completos para verificar las nuevas funcionalidades del dashboard del doctor:

- ✅ Lista de Pacientes
- ✅ Reportes y Estadísticas
- ✅ Historial Médico Consolidado
- ✅ Gestión de Solicitudes de Reprogramación

---

## 🚀 Cómo Ejecutar

### Opción 1: Desde la raíz del proyecto backend

```bash
cd api-clinica
node scripts/crear-datos-prueba-dashboard-doctor.js
```

### Opción 2: Desde el directorio api-clinica

```bash
node scripts/crear-datos-prueba-dashboard-doctor.js
```

---

## 📊 Datos que Crea

### 1. Doctor de Prueba
- **Email:** `doctor.prueba@clinica.com`
- **Password:** `Doctor123!`
- **Nombre:** Dr. Prueba Dashboard Test

### 2. Pacientes (6 pacientes)
- Ana Martínez García
- Carlos Rodríguez López
- María Hernández Sánchez
- José González Pérez
- Laura Torres Ramírez
- Roberto Morales Castro

Cada paciente incluye:
- ✅ Asignación al doctor
- ✅ Citas (hoy, futuras, pasadas)
- ✅ Signos vitales (algunos con valores fuera de rango para alertas)
- ✅ Diagnósticos
- ✅ Planes de medicación con medicamentos
- ✅ Red de apoyo (contactos de emergencia)
- ✅ Esquema de vacunación
- ✅ Comorbilidades
- ✅ Solicitudes de reprogramación (pendientes, aprobadas, rechazadas)

---

## ✅ Verificación en la App

### 1. Iniciar Sesión
- Email: `doctor.prueba@clinica.com`
- Password: `Doctor123!`

### 2. Verificar Funcionalidades

#### 📱 Lista de Pacientes
- Debe mostrar 6 pacientes
- Probar búsqueda por nombre
- Probar filtros (activos, inactivos, todos)
- Probar ordenamiento (recientes, antiguos)
- Navegar a detalle de paciente

#### 📊 Reportes
- Debe mostrar estadísticas:
  - Pacientes asignados: 6
  - Citas hoy: varias
  - Tasa de pacientes activos
- Debe mostrar gráfico de citas últimos 7 días

#### 📋 Historial Médico
- Debe mostrar historial consolidado de todos los pacientes
- Probar filtros por tipo de dato
- Probar filtros por paciente
- Probar búsqueda

#### 📋 Gestionar Solicitudes
- Debe mostrar solicitudes pendientes
- Probar aprobar solicitud (con nueva fecha)
- Probar rechazar solicitud
- Verificar filtros por estado

---

## 🔄 Re-ejecutar el Script

El script es **idempotente**:
- Si el doctor ya existe, lo usa
- Si los pacientes ya existen (por CURP), los usa
- Evita duplicados usando `findOrCreate`

Puedes ejecutarlo múltiples veces sin problemas.

---

## 🗑️ Limpiar Datos de Prueba

Si necesitas limpiar los datos de prueba:

```sql
-- Eliminar solicitudes de reprogramación del doctor
DELETE FROM solicitudes_reprogramacion 
WHERE id_cita IN (
  SELECT id_cita FROM citas 
  WHERE id_doctor = (SELECT id_doctor FROM doctores WHERE nombre = 'Dr. Prueba')
);

-- Eliminar citas del doctor
DELETE FROM citas 
WHERE id_doctor = (SELECT id_doctor FROM doctores WHERE nombre = 'Dr. Prueba');

-- Eliminar asignaciones doctor-paciente
DELETE FROM doctor_paciente 
WHERE id_doctor = (SELECT id_doctor FROM doctores WHERE nombre = 'Dr. Prueba');

-- Eliminar pacientes (si solo fueron creados para pruebas)
-- CUIDADO: Solo si no tienen datos importantes
```

---

## ⚠️ Notas Importantes

1. **Medicamentos:** El script requiere que existan medicamentos en la base de datos. Si no hay, algunas funcionalidades pueden no funcionar completamente.

2. **Módulos:** El script crea un módulo si no existe ninguno.

3. **Comorbilidades:** El script asigna comorbilidades aleatorias a los pacientes.

4. **Signos Vitales con Alertas:** Algunos pacientes tendrán signos vitales fuera de rango para probar las alertas en el dashboard.

---

## 📝 Logs

El script muestra logs detallados de:
- ✅ Doctores creados/usados
- ✅ Pacientes creados/asignados
- ✅ Citas creadas
- ✅ Solicitudes de reprogramación creadas
- ✅ Resumen final con credenciales

---

## 🐛 Solución de Problemas

### Error: "No hay módulos disponibles"
- El script crea un módulo automáticamente, pero si falla, crea uno manualmente desde la interfaz.

### Error: "No hay medicamentos disponibles"
- Crea algunos medicamentos desde la interfaz de administración antes de ejecutar el script.

### Error de conexión a la base de datos
- Verifica que el servidor de base de datos esté corriendo
- Verifica las variables de entorno en `.env`

---

## ✅ Checklist de Verificación

Después de ejecutar el script, verifica:

- [ ] Doctor creado con email `doctor.prueba@clinica.com`
- [ ] 6 pacientes asignados al doctor
- [ ] Citas de hoy visibles en el dashboard
- [ ] Solicitudes de reprogramación pendientes
- [ ] Signos vitales con alertas (valores fuera de rango)
- [ ] Historial médico con datos de múltiples pacientes
- [ ] Reportes con estadísticas

---

**Fecha de creación:** 2025-11-16  
**Autor:** Senior Developer

