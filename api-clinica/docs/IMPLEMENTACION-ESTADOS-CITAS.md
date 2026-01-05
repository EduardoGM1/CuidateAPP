# 📋 Implementación: Estados de Citas y Reprogramación

## ✅ Implementación Completada

### 📅 Fecha: 2025-11-06

---

## 🎯 Funcionalidades Implementadas

### 1. **Estados de Citas**
- ✅ Campo `estado` ENUM en tabla `citas`
- ✅ Estados disponibles: `pendiente`, `atendida`, `no_asistida`, `reprogramada`, `cancelada`
- ✅ Endpoint para cambiar estado: `PUT /api/citas/:id/estado`

### 2. **Reprogramación por Doctores**
- ✅ Campos de reprogramación en tabla `citas`
- ✅ Endpoint para reprogramar: `PUT /api/citas/:id/reprogramar`
- ✅ Actualización automática de estado a `reprogramada`

### 3. **Solicitudes de Reprogramación por Pacientes**
- ✅ Nueva tabla `solicitudes_reprogramacion`
- ✅ Endpoint para solicitar: `POST /api/citas/:id/solicitar-reprogramacion`
- ✅ Endpoint para ver solicitudes: `GET /api/pacientes/:id/solicitudes-reprogramacion`
- ✅ Endpoint para cancelar: `DELETE /api/citas/:id/solicitud-reprogramacion/:solicitudId`

### 4. **Gestión de Solicitudes por Doctores**
- ✅ Endpoint para aprobar/rechazar: `PUT /api/citas/:id/solicitud-reprogramacion/:solicitudId`
- ✅ Actualización automática de cita al aprobar

---

## 📊 Cambios en Base de Datos

### Tabla `citas` (ALTER TABLE)
```sql
-- Nuevos campos agregados:
- estado ENUM('pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada') DEFAULT 'pendiente'
- fecha_reprogramada DATE NULL
- motivo_reprogramacion TEXT NULL
- solicitado_por ENUM('paciente', 'doctor', 'admin') NULL
- fecha_solicitud_reprogramacion DATETIME NULL
```

### Nueva Tabla `solicitudes_reprogramacion`
```sql
CREATE TABLE solicitudes_reprogramacion (
  id_solicitud INT PRIMARY KEY AUTO_INCREMENT,
  id_cita INT NOT NULL,
  id_paciente INT NOT NULL,
  motivo TEXT NOT NULL,
  fecha_solicitada DATE NULL,
  estado ENUM('pendiente', 'aprobada', 'rechazada', 'cancelada') DEFAULT 'pendiente',
  respuesta_doctor TEXT NULL,
  fecha_respuesta DATETIME NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  -- Foreign Keys e Índices
);
```

---

## 🔌 Endpoints Disponibles

### Para Doctores/Admin

#### 1. Cambiar Estado de Cita
```
PUT /api/citas/:id/estado
Body: {
  estado: 'atendida' | 'no_asistida' | 'pendiente' | 'reprogramada' | 'cancelada',
  observaciones?: string
}
```

#### 2. Reprogramar Cita Directamente
```
PUT /api/citas/:id/reprogramar
Body: {
  fecha_reprogramada: 'YYYY-MM-DD',
  motivo_reprogramacion?: string
}
```

#### 3. Responder Solicitud de Reprogramación
```
PUT /api/citas/:id/solicitud-reprogramacion/:solicitudId
Body: {
  accion: 'aprobar' | 'rechazar',
  respuesta_doctor?: string,
  fecha_reprogramada?: string
}
```

### Para Pacientes

#### 1. Solicitar Reprogramación
```
POST /api/citas/:id/solicitar-reprogramacion
Body: {
  motivo: string (requerido),
  fecha_solicitada?: 'YYYY-MM-DD' (opcional)
}
```

#### 2. Ver Mis Solicitudes
```
GET /api/pacientes/:id/solicitudes-reprogramacion?estado=pendiente
```

#### 3. Cancelar Solicitud Pendiente
```
DELETE /api/citas/:id/solicitud-reprogramacion/:solicitudId
```

---

## 🧪 Pruebas Automatizadas

### Ejecutar Pruebas
```bash
# Opción 1: Usando npm script
npm run test:citas-estados

# Opción 2: Directamente
node scripts/test-citas-estados-reprogramacion.js
```

### Pruebas Incluidas
1. ✅ Autenticación (Doctor y Paciente)
2. ✅ Cambio de estados (Doctor)
3. ✅ Reprogramación directa (Doctor)
4. ✅ Solicitud de reprogramación (Paciente)
5. ✅ Ver solicitudes (Paciente)
6. ✅ Aprobar/rechazar solicitud (Doctor)
7. ✅ Filtros por estado
8. ✅ Validación de permisos

---

## 📝 Migración de Base de Datos

### Ejecutar Migración
```bash
node scripts/alter-citas-estado-reprogramacion.js
```

O manualmente:
```bash
mysql -u usuario -p nombre_base_datos < migrations/alter-citas-estado-reprogramacion.sql
```

### Verificación Post-Migración
```sql
-- Verificar campos agregados
DESCRIBE citas;

-- Verificar nueva tabla
DESCRIBE solicitudes_reprogramacion;

-- Verificar datos migrados
SELECT estado, COUNT(*) FROM citas GROUP BY estado;
```

---

## 🔄 Compatibilidad hacia Atrás

- ✅ Campo `asistencia` (BOOLEAN) se mantiene para compatibilidad
- ✅ Función `determinarEstadoCita()` actualizada para usar `estado` si existe
- ✅ Código existente sigue funcionando sin cambios
- ✅ Datos existentes migrados automáticamente

---

## 📁 Archivos Modificados

### Modelos
- ✅ `api-clinica/models/Cita.js` - Agregados campos de estado y reprogramación
- ✅ `api-clinica/models/SolicitudReprogramacion.js` - Nuevo modelo
- ✅ `api-clinica/models/associations.js` - Relaciones agregadas

### Controladores
- ✅ `api-clinica/controllers/cita.js` - Nuevas funciones agregadas
- ✅ `api-clinica/controllers/pacienteMedicalData.js` - Actualizado para usar `estado`

### Rutas
- ✅ `api-clinica/routes/cita.js` - Nuevos endpoints agregados
- ✅ `api-clinica/routes/pacienteMedicalData.js` - Ruta para solicitudes

### Scripts
- ✅ `api-clinica/migrations/alter-citas-estado-reprogramacion.sql` - Migración SQL
- ✅ `api-clinica/scripts/alter-citas-estado-reprogramacion.js` - Script ejecutable
- ✅ `api-clinica/scripts/test-citas-estados-reprogramacion.js` - Pruebas automatizadas

---

## ⚠️ Notas Importantes

1. **Migración Requerida**: La migración debe ejecutarse antes de usar las nuevas funcionalidades
2. **Servidor**: El servidor debe estar corriendo para ejecutar las pruebas
3. **Credenciales**: Las pruebas requieren credenciales válidas de doctor y paciente
4. **Compatibilidad**: El código mantiene compatibilidad con el sistema anterior

---

## 🎉 Estado Final

✅ **Implementación Completa**
- Modelos actualizados
- Controladores implementados
- Rutas configuradas
- Migración SQL creada
- Pruebas automatizadas
- Documentación completa

**Listo para usar en producción** (después de ejecutar la migración)

