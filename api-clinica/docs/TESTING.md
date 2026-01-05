# 🧪 Guía de Pruebas - API Clínica

## ✅ Estado del Sistema

### Configuración Completada
- ✅ Servidor Express configurado
- ✅ Base de datos Sequelize configurada
- ✅ Autenticación JWT implementada
- ✅ Middlewares de seguridad (CORS, Helmet)
- ✅ Validaciones con express-validator
- ✅ Modelos sincronizados con tablas.sql
- ✅ Asociaciones entre modelos configuradas

### Modelos Implementados
- ✅ Usuario (autenticación)
- ✅ Modulo
- ✅ Paciente
- ✅ Doctor
- ✅ Cita (citas_medicas)
- ✅ Comorbilidad
- ✅ Medicamento
- ✅ Diagnostico
- ✅ PlanMedicacion
- ✅ PlanDetalle
- ✅ SignoVital (signos_vitales)
- ✅ RedApoyo (red_apoyo)
- ✅ MensajeChat (mensajes_chat)
- ✅ EsquemaVacunacion
- ✅ PacienteComorbilidad
- ✅ DoctorPaciente
- ✅ PuntoChequeo

## 🚀 Cómo Ejecutar

### Iniciar Servidor
```bash
npm run dev
```

### Ejecutar Pruebas
```bash
npm test
```

### Probar Configuración
```bash
node test-server.js
```

## 📋 Rutas Disponibles

### Autenticación
- `POST /api/auth/register` - Registro de usuarios
- `POST /api/auth/login` - Login de usuarios

### Pacientes
- `GET /api/pacientes` - Listar pacientes
- `GET /api/pacientes/:id` - Obtener paciente
- `POST /api/pacientes` - Crear paciente
- `PUT /api/pacientes/:id` - Actualizar paciente
- `DELETE /api/pacientes/:id` - Eliminar paciente

### Doctores
- `GET /api/doctores` - Listar doctores
- `GET /api/doctores/:id` - Obtener doctor
- `POST /api/doctores` - Crear doctor
- `PUT /api/doctores/:id` - Actualizar doctor
- `DELETE /api/doctores/:id` - Eliminar doctor

### Citas Médicas
- `GET /api/citas` - Listar citas
- `GET /api/citas/:id` - Obtener cita
- `GET /api/citas/paciente/:pacienteId` - Citas por paciente
- `GET /api/citas/doctor/:doctorId` - Citas por doctor
- `POST /api/citas` - Crear cita
- `PUT /api/citas/:id` - Actualizar cita
- `DELETE /api/citas/:id` - Eliminar cita

### Catálogos (Solo Admin)
- `GET /api/comorbilidades` - Listar comorbilidades
- `POST /api/comorbilidades` - Crear comorbilidad
- `GET /api/medicamentos` - Listar medicamentos
- `POST /api/medicamentos` - Crear medicamento

### Signos Vitales
- `GET /api/signos-vitales` - Listar signos vitales
- `GET /api/signos-vitales/paciente/:pacienteId` - Por paciente
- `POST /api/signos-vitales` - Registrar signos vitales

### Diagnósticos
- `GET /api/diagnosticos` - Listar diagnósticos
- `GET /api/diagnosticos/paciente/:pacienteId` - Por paciente
- `POST /api/diagnosticos` - Crear diagnóstico

### Planes de Medicación
- `GET /api/planes-medicacion` - Listar planes
- `GET /api/planes-medicacion/diagnostico/:diagnosticoId` - Por diagnóstico
- `POST /api/planes-medicacion` - Crear plan

### Red de Apoyo
- `GET /api/red-apoyo/paciente/:pacienteId` - Red de apoyo por paciente
- `GET /api/red-apoyo/emergencia/:pacienteId` - Contactos de emergencia
- `POST /api/red-apoyo` - Agregar contacto

### Mensajería
- `GET /api/mensajes/conversacion/:usuario1Id/:usuario2Id` - Conversación
- `GET /api/mensajes/recibidos/:usuarioId` - Mensajes recibidos
- `POST /api/mensajes` - Enviar mensaje
- `PATCH /api/mensajes/:id/leido` - Marcar como leído

## 🔐 Autenticación

### Registro de Usuario
```json
POST /api/auth/register
{
  "email": "doctor@clinica.com",
  "password": "Doctor123",
  "rol": "Doctor"
}
```

### Login
```json
POST /api/auth/login
{
  "email": "doctor@clinica.com",
  "password": "Doctor123"
}
```

### Usar Token
```
Authorization: Bearer tu_token_aqui
```

## 🧪 Pruebas Implementadas

### Pruebas Unitarias
- ✅ Sistema de pruebas configurado
- ✅ Validaciones básicas
- ✅ Lógica de negocio
- ✅ Cálculos médicos (IMC)
- ✅ Validaciones de datos

### Cobertura de Pruebas
```bash
npm run test
```

## 📊 Datos de Prueba

### Usuario Admin
```json
{
  "email": "admin@clinica.com",
  "password": "Admin123",
  "rol": "Admin"
}
```

### Usuario Doctor
```json
{
  "email": "doctor@clinica.com",
  "password": "Doctor123",
  "rol": "Doctor"
}
```

### Paciente
```json
{
  "nombre": "Juan",
  "apellido_paterno": "Pérez",
  "apellido_materno": "García",
  "fecha_nacimiento": "1990-05-15",
  "curp": "PEGJ900515HDFRRN09",
  "institucion_salud": "IMSS",
  "sexo": "Hombre"
}
```

## 🔧 Configuración de Base de Datos

Asegúrate de tener configurado tu archivo `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=clinica_db
DB_PORT=3306
JWT_SECRET=tu_jwt_secret_muy_seguro
PORT=3000
```

## ✨ Características Implementadas

- 🔐 Autenticación JWT completa
- 👥 Autorización por roles (Admin, Doctor, Paciente)
- 📝 Validaciones exhaustivas
- 🏥 Gestión completa de expedientes médicos
- 💬 Sistema de mensajería
- 📊 Signos vitales con cálculos médicos
- 💊 Planes de medicación detallados
- 🩺 Historial de citas y diagnósticos
- 👨‍👩‍👧‍👦 Red de apoyo familiar
- 💉 Esquema de vacunación

## 🚨 Próximos Pasos

1. Configurar base de datos MySQL
2. Ejecutar migraciones con `tablas.sql`
3. Probar endpoints con Postman
4. Implementar más pruebas de integración
5. Añadir documentación con Swagger
6. Configurar CI/CD
7. Implementar logging avanzado
8. Añadir rate limiting
9. Configurar HTTPS en producción