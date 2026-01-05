# 🔑 CREDENCIALES DE PRUEBA - CLÍNICA MÓVIL

## 📁 **ARCHIVOS DISPONIBLES:**
1. **`datosPrueba.sql`** - Archivo completo con 50+ pacientes y 30+ doctores
2. **`datosPrueba-AUTOINCREMENT.sql`** - Archivo simplificado con AUTO_INCREMENT (RECOMENDADO)

## 👨‍💼 ADMINISTRADOR PRINCIPAL
- **Email:** `admin@test.com`
- **Password:** `admin123`
- **Rol:** Admin
- **Acceso:** Dashboard administrativo completo, gestión de doctores y pacientes

## 👨‍⚕️ DOCTOR PRINCIPAL
- **Email:** `doctor@test.com`
- **Password:** `doctor123`
- **Rol:** Doctor
- **Nombre:** Dr. Test Principal
- **Especialidad:** Medicina Interna
- **Pacientes asignados:** 5+ pacientes con diversas condiciones

## 👥 PACIENTES DE PRUEBA
- **Total:** 5 pacientes (archivo simplificado) / 50+ pacientes (archivo completo)
- **PIN de acceso:** `1234` (para todos)
- **Biometría:** Configurada según tipo
- **Asignados:** Al Dr. Test Principal y otros doctores

## 📅 CITAS DE PRUEBA

### HOY (2024-10-11)
- **8:00 AM:** Control de diabetes - Urgente
- **8:30 AM:** Control de hipertensión
- **9:00 AM:** Control de artritis
- **9:30 AM:** Control de diabetes complicada
- **10:00 AM:** Control de depresión
- **14:00 PM:** Consulta pediátrica
- **14:30 PM:** Consulta ginecológica
- **15:00 PM:** Consulta ortopédica
- **15:30 PM:** Consulta dermatológica
- **16:00 PM:** Consulta oftalmológica

### MAÑANA (2024-10-12)
- **8:00 AM:** Consulta psiquiátrica
- **8:30 AM:** Consulta urológica
- **9:00 AM:** Consulta gastroenterológica
- **9:30 AM:** Consulta neumológica
- **10:00 AM:** Consulta reumatológica
- **14:00 PM:** Consulta hematológica
- **14:30 PM:** Consulta nefrológica
- **15:00 PM:** Consulta infectológica
- **15:30 PM:** Consulta geriátrica
- **16:00 PM:** Consulta medicina deportiva

### PASADO MAÑANA (2024-10-13)
- **8:00 AM:** Consulta medicina nuclear
- **8:30 AM:** Consulta radiología
- **9:00 AM:** Consulta anestesiología
- **9:30 AM:** Consulta cirugía general
- **10:00 AM:** Consulta cirugía plástica
- **14:00 PM:** Consulta neurocirugía
- **14:30 PM:** Consulta cirugía cardiovascular
- **15:00 PM:** Consulta cirugía pediátrica
- **15:30 PM:** Consulta cirugía oncológica
- **16:00 PM:** Consulta medicina de urgencias

## 🔧 INSTRUCCIONES DE USO

### 1. Cargar datos de prueba
```sql
-- Ejecutar el archivo datosPrueba.sql en MySQL
source C:\Users\eduar\Desktop\Backend\api-clinica\datosPrueba.sql;
```

### 2. Probar login de administrador
- Usar `admin@test.com` / `admin123`
- Acceder al dashboard administrativo
- Verificar gestión de doctores y pacientes

### 3. Probar login de doctor
- Usar `doctor@test.com` / `doctor123`
- Acceder al dashboard del doctor
- Verificar pacientes asignados y citas

### 4. Probar login de pacientes
- Usar ID de paciente (1-50) con PIN `1234`
- Probar autenticación biométrica
- Verificar citas y datos médicos

## 📊 DATOS DISPONIBLES

- **36 Usuarios:** 3 Admins + 33 Doctores
- **50+ Pacientes:** Con datos completos y realistas
- **100+ Asignaciones:** Doctor-Paciente distribuidas
- **50+ Citas:** Históricas + Hoy + Próximos 2 días
- **30+ Especialidades:** Médicas cubiertas
- **Datos completos:** Signos vitales, diagnósticos, medicamentos, etc.

## 🚀 FUNCIONALIDADES PARA PROBAR

1. **Dashboard Administrativo:** Métricas, gráficos, gestión
2. **Dashboard Doctor:** Pacientes asignados, citas, alertas
3. **Gestión de Doctores:** CRUD completo
4. **Gestión de Pacientes:** CRUD completo
5. **Sistema de Citas:** Programación y seguimiento
6. **Autenticación:** Login, PIN, biometría
7. **Notificaciones:** Push notifications
8. **Chat:** Mensajes entre doctor y paciente
9. **Reportes:** Estadísticas y análisis
10. **Perfiles:** Gestión de usuarios

---
**Nota:** Todas las contraseñas están hasheadas con bcrypt. Los datos son de prueba y no representan información real de pacientes.
