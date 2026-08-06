# 📚 Referencia Completa de la API - Clínica Médica

## 🎯 **INFORMACIÓN GENERAL**

- **Base URL**: `http://localhost:3000/api`
- **Versión**: 1.0.0
- **Formato**: JSON
- **Autenticación**: JWT Bearer Token
- **Rate Limiting**: 100 requests/minuto (general), 20 requests/minuto (escritura)

---

## 🔐 **AUTENTICACIÓN**

### **Headers Requeridos**

```http
Content-Type: application/json
Authorization: Bearer <jwt-token>
X-Device-ID: unique-device-id (para móviles)
X-Platform: android|ios|web (para móviles)
X-App-Version: 1.0.0 (para móviles)
```

### **Códigos de Respuesta**

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |

---

## 📱 **ENDPOINTS MÓVILES**

### **GET /api/mobile/config**
Obtiene la configuración de la aplicación móvil.

**Headers**: Ninguno requerido

**Respuesta**:
```json
{
  "api_version": "1.0.0",
  "min_app_version": "1.0.0",
  "features": {
    "biometric_auth": true,
    "push_notifications": true,
    "realtime_updates": true,
    "offline_sync": true,
    "dark_mode": true
  },
  "endpoints": {
    "websocket_url": "ws://localhost:3000",
    "api_base_url": "http://localhost:3000/api",
    "push_service_url": "http://localhost:3000/api/mobile/push"
  },
  "limits": {
    "max_file_size": "10MB",
    "max_requests_per_minute": 100,
    "token_expiry_hours": 2
  }
}
```

### **POST /api/mobile/login**
Login optimizado para dispositivos móviles.

**Headers**:
```http
Content-Type: application/json
X-Device-ID: unique-device-id
X-Platform: android|ios
X-App-Version: 1.0.0
```

**Body**:
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Respuesta**:
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 7200,
  "usuario": {
    "id": 1,
    "email": "usuario@example.com",
    "rol": "Paciente",
    "last_mobile_login": "2024-01-15T10:30:00Z"
  },
  "device_info": {
    "platform": "android",
    "client_type": "app",
    "device_id": "unique-device-id"
  }
}
```

### **POST /api/mobile/refresh-token**
Renueva el token de acceso usando el refresh token.

**Headers**:
```http
Content-Type: application/json
X-Device-ID: unique-device-id
```

**Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta**:
```json
{
  "message": "Token renovado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 7200
}
```

### **POST /api/mobile/device/register**
Registra un dispositivo para recibir notificaciones push.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
X-Device-ID: unique-device-id
```

**Body**:
```json
{
  "device_token": "fcm-or-apns-token",
  "platform": "android",
  "device_info": {
    "model": "iPhone 14",
    "os_version": "16.0",
    "app_version": "1.0.0"
  }
}
```

**Respuesta**:
```json
{
  "message": "Dispositivo registrado exitosamente",
  "success": true
}
```

### **GET /api/mobile/device/info**
Obtiene información de los dispositivos registrados.

**Headers**:
```http
Authorization: Bearer <token>
```

**Respuesta**:
```json
{
  "registered_devices": [
    {
      "platform": "android",
      "registered_at": "2024-01-15T10:30:00Z",
      "last_used": "2024-01-15T12:00:00Z",
      "active": true,
      "device_info": {
        "model": "Samsung Galaxy S21",
        "os_version": "Android 12"
      }
    }
  ],
  "total_devices": 1,
  "current_device": {
    "platform": "android",
    "device_id": "unique-device-id",
    "client_type": "app"
  }
}
```

### **POST /api/mobile/notification/test**
Envía una notificación de prueba al dispositivo.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "message": "Mensaje de prueba",
  "type": "test"
}
```

**Respuesta**:
```json
{
  "message": "Notificación de prueba enviada",
  "success": true,
  "sent_to": 1,
  "results": [
    {
      "token": "fcm-token",
      "result": "success"
    }
  ]
}
```

### **GET /api/mobile/patient/dashboard**
Obtiene el dashboard específico para pacientes.

**Headers**:
```http
Authorization: Bearer <token>
```

**Respuesta**:
```json
{
  "dashboard": {
    "upcoming_appointments": [
      {
        "id": 1,
        "doctor_name": "Dr. García",
        "date": "2024-01-20",
        "time": "10:00",
        "type": "Consulta general"
      }
    ],
    "medication_reminders": [
      {
        "id": 1,
        "medication_name": "Paracetamol",
        "dosage": "500mg",
        "next_dose": "2024-01-15T14:00:00Z"
      }
    ],
    "recent_test_results": [
      {
        "id": 1,
        "test_type": "Análisis de sangre",
        "date": "2024-01-10",
        "status": "Disponible"
      }
    ],
    "notifications": [],
    "quick_actions": [
      {
        "id": "book_appointment",
        "title": "Agendar Cita",
        "icon": "calendar"
      },
      {
        "id": "view_results",
        "title": "Ver Resultados",
        "icon": "document"
      },
      {
        "id": "contact_doctor",
        "title": "Contactar Doctor",
        "icon": "message"
      },
      {
        "id": "emergency",
        "title": "Emergencia",
        "icon": "phone",
        "urgent": true
      }
    ]
  },
  "last_updated": "2024-01-15T12:00:00Z",
  "_mobile": {
    "optimized": true,
    "version": "1.0.0"
  }
}
```

### **GET /api/mobile/doctor/dashboard**
Obtiene el dashboard específico para doctores.

**Headers**:
```http
Authorization: Bearer <token>
```

**Respuesta**:
```json
{
  "dashboard": {
    "waiting_patients": [
      {
        "id": 1,
        "patient_name": "Juan Pérez",
        "appointment_time": "10:00",
        "reason": "Consulta general"
      }
    ],
    "today_appointments": [
      {
        "id": 1,
        "patient_name": "María García",
        "time": "09:00",
        "type": "Seguimiento"
      }
    ],
    "pending_reports": [
      {
        "id": 1,
        "patient_name": "Carlos López",
        "test_type": "Radiografía",
        "date": "2024-01-14"
      }
    ],
    "notifications": [],
    "quick_actions": [
      {
        "id": "view_patients",
        "title": "Ver Pacientes",
        "icon": "people"
      },
      {
        "id": "write_report",
        "title": "Escribir Reporte",
        "icon": "document"
      },
      {
        "id": "schedule",
        "title": "Horario",
        "icon": "calendar"
      },
      {
        "id": "emergency",
        "title": "Emergencia",
        "icon": "phone",
        "urgent": true
      }
    ]
  },
  "last_updated": "2024-01-15T12:00:00Z",
  "_mobile": {
    "optimized": true,
    "version": "1.0.0"
  }
}
```

### **POST /api/mobile/sync/offline**
Sincroniza datos cuando la app vuelve a estar online.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "last_sync": "2024-01-15T10:00:00Z",
  "data": [
    {
      "id": 1,
      "type": "appointment",
      "data": {
        "patient_id": 1,
        "doctor_id": 2,
        "date": "2024-01-20",
        "time": "10:00"
      }
    }
  ]
}
```

**Respuesta**:
```json
{
  "message": "Sincronización completada",
  "sync_result": {
    "sync_id": "sync_abc123",
    "timestamp": "2024-01-15T12:00:00Z",
    "conflicts": [],
    "updated_records": [
      {
        "id": 1,
        "type": "appointment",
        "status": "synced",
        "server_timestamp": "2024-01-15T12:00:00Z"
      }
    ],
    "deleted_records": []
  }
}
```

---

## 🔐 **ENDPOINTS DE AUTENTICACIÓN**

### **POST /api/auth/register**
Registro público: **solo** crea usuarios con rol `Paciente`. Solicitar `Doctor`/`Admin` responde **403**; un Admin debe usar `POST /api/auth/usuarios`.

**Body**:
```json
{
  "email": "usuario@example.com",
  "password": "SecurePass123"
}
```

**Respuesta**:
```json
{
  "message": "Usuario registrado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id_usuario": 1,
    "email": "usuario@example.com",
    "rol": "Paciente",
    "activo": true
  },
  "next_step": "Usuario listo para usar"
}
```

### **POST /api/auth/login**
Inicia sesión en el sistema.

**Body**:
```json
{
  "email": "usuario@example.com",
  "password": "SecurePass123"
}
```

**Respuesta**:
```json
{
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id_usuario": 1,
    "email": "usuario@example.com",
    "rol": "Paciente",
    "activo": true
  }
}
```

### **GET /api/auth/usuarios**
Lista todos los usuarios (solo Admin).

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Elementos por página (default: 10)
- `search` (opcional): Búsqueda por email o rol

**Respuesta**:
```json
{
  "usuarios": [
    {
      "id_usuario": 1,
      "email": "usuario@example.com",
      "rol": "Paciente",
      "activo": true,
      "fecha_creacion": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 1,
    "items_per_page": 10
  }
}
```

---

## 👥 **ENDPOINTS DE PACIENTES**

### **GET /api/pacientes**
Lista todos los pacientes.

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página
- `search` (opcional): Búsqueda por nombre o CURP

**Respuesta**:
```json
{
  "pacientes": [
    {
      "id_paciente": 1,
      "nombre": "Juan",
      "apellido_paterno": "Pérez",
      "apellido_materno": "García",
      "fecha_nacimiento": "1990-05-15",
      "curp": "PEGJ900515HDFRRN01",
      "sexo": "M",
      "numero_celular": "5551234567",
      "institucion_salud": "IMSS",
      "direccion": "Calle 123, Col. Centro",
      "localidad": "Ciudad de México",
      "fecha_registro": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 1,
    "items_per_page": 10
  }
}
```

### **POST /api/pacientes**
Crea un nuevo paciente.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "nombre": "Juan",
  "apellido_paterno": "Pérez",
  "apellido_materno": "García",
  "fecha_nacimiento": "1990-05-15",
  "curp": "PEGJ900515HDFRRN01",
  "sexo": "M",
  "numero_celular": "5551234567",
  "institucion_salud": "IMSS",
  "direccion": "Calle 123, Col. Centro",
  "localidad": "Ciudad de México"
}
```

**Respuesta**:
```json
{
  "message": "Paciente creado exitosamente",
  "paciente": {
    "id_paciente": 1,
    "nombre": "Juan",
    "apellido_paterno": "Pérez",
    "apellido_materno": "García",
    "fecha_nacimiento": "1990-05-15",
    "curp": "PEGJ900515HDFRRN01",
    "sexo": "M",
    "numero_celular": "5551234567",
    "institucion_salud": "IMSS",
    "direccion": "Calle 123, Col. Centro",
    "localidad": "Ciudad de México",
    "fecha_registro": "2024-01-15T10:00:00Z"
  }
}
```

### **GET /api/pacientes/:id**
Obtiene un paciente específico.

**Headers**:
```http
Authorization: Bearer <token>
```

**Respuesta**:
```json
{
  "paciente": {
    "id_paciente": 1,
    "nombre": "Juan",
    "apellido_paterno": "Pérez",
    "apellido_materno": "García",
    "fecha_nacimiento": "1990-05-15",
    "curp": "PEGJ900515HDFRRN01",
    "sexo": "M",
    "numero_celular": "5551234567",
    "institucion_salud": "IMSS",
    "direccion": "Calle 123, Col. Centro",
    "localidad": "Ciudad de México",
    "fecha_registro": "2024-01-15T10:00:00Z"
  }
}
```

### **PUT /api/pacientes/:id**
Actualiza un paciente existente.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "nombre": "Juan Carlos",
  "numero_celular": "5559876543"
}
```

**Respuesta**:
```json
{
  "message": "Paciente actualizado exitosamente",
  "paciente": {
    "id_paciente": 1,
    "nombre": "Juan Carlos",
    "apellido_paterno": "Pérez",
    "apellido_materno": "García",
    "fecha_nacimiento": "1990-05-15",
    "curp": "PEGJ900515HDFRRN01",
    "sexo": "M",
    "numero_celular": "5559876543",
    "institucion_salud": "IMSS",
    "direccion": "Calle 123, Col. Centro",
    "localidad": "Ciudad de México",
    "fecha_registro": "2024-01-15T10:00:00Z"
  }
}
```

### **DELETE /api/pacientes/:id**
Elimina un paciente (solo Admin).

**Headers**:
```http
Authorization: Bearer <token>
```

**Respuesta**:
```json
{
  "message": "Paciente eliminado exitosamente"
}
```

---

## 👨‍⚕️ **ENDPOINTS DE DOCTORES**

### **GET /api/doctores**
Lista todos los doctores.

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página
- `search` (opcional): Búsqueda por nombre

**Respuesta**:
```json
{
  "doctores": [
    {
      "id_doctor": 1,
      "nombre": "Dr. Carlos",
      "apellido_paterno": "García",
      "apellido_materno": "López",
      "telefono": "5551234567",
      "institucion_hospitalaria": "Hospital General",
      "grado_estudio": "Especialidad en Cardiología",
      "anos_servicio": 10,
      "fecha_registro": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 1,
    "items_per_page": 10
  }
}
```

### **POST /api/doctores**
Crea un nuevo doctor (solo Admin).

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "nombre": "Dr. Carlos",
  "apellido_paterno": "García",
  "apellido_materno": "López",
  "telefono": "5551234567",
  "institucion_hospitalaria": "Hospital General",
  "grado_estudio": "Especialidad en Cardiología",
  "anos_servicio": 10,
  "id_modulo": 1
}
```

**Respuesta**:
```json
{
  "message": "Doctor creado exitosamente",
  "doctor": {
    "id_doctor": 1,
    "nombre": "Dr. Carlos",
    "apellido_paterno": "García",
    "apellido_materno": "López",
    "telefono": "5551234567",
    "institucion_hospitalaria": "Hospital General",
    "grado_estudio": "Especialidad en Cardiología",
    "anos_servicio": 10,
    "fecha_registro": "2024-01-15T10:00:00Z"
  }
}
```

---

## 📅 **ENDPOINTS DE CITAS**

### **GET /api/citas**
Lista todas las citas.

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página
- `fecha` (opcional): Filtrar por fecha (YYYY-MM-DD)
- `doctor_id` (opcional): Filtrar por doctor
- `paciente_id` (opcional): Filtrar por paciente

**Respuesta**:
```json
{
  "citas": [
    {
      "id_cita": 1,
      "paciente_id": 1,
      "doctor_id": 2,
      "fecha": "2024-01-20",
      "hora": "10:00:00",
      "tipo_cita": "Consulta general",
      "estado": "Programada",
      "notas": "Primera consulta",
      "fecha_creacion": "2024-01-15T10:00:00Z",
      "paciente": {
        "nombre": "Juan",
        "apellido_paterno": "Pérez"
      },
      "doctor": {
        "nombre": "Dr. Carlos",
        "apellido_paterno": "García"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 1,
    "items_per_page": 10
  }
}
```

### **POST /api/citas**
Crea una nueva cita.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "paciente_id": 1,
  "doctor_id": 2,
  "fecha": "2024-01-20",
  "hora": "10:00:00",
  "tipo_cita": "Consulta general",
  "notas": "Primera consulta"
}
```

**Respuesta**:
```json
{
  "message": "Cita creada exitosamente",
  "cita": {
    "id_cita": 1,
    "paciente_id": 1,
    "doctor_id": 2,
    "fecha": "2024-01-20",
    "hora": "10:00:00",
    "tipo_cita": "Consulta general",
    "estado": "Programada",
    "notas": "Primera consulta",
    "fecha_creacion": "2024-01-15T10:00:00Z"
  }
}
```

---

## 🩺 **ENDPOINTS DE SIGNOS VITALES**

### **GET /api/signos-vitales**
Lista los signos vitales.

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
- `paciente_id` (opcional): Filtrar por paciente
- `fecha` (opcional): Filtrar por fecha

**Respuesta**:
```json
{
  "signos_vitales": [
    {
      "id_signo_vital": 1,
      "paciente_id": 1,
      "presion_arterial_sistolica": 120,
      "presion_arterial_diastolica": 80,
      "temperatura": 36.5,
      "peso": 70.5,
      "altura": 175,
      "frecuencia_cardiaca": 72,
      "saturacion_oxigeno": 98,
      "fecha_registro": "2024-01-15T10:00:00Z",
      "paciente": {
        "nombre": "Juan",
        "apellido_paterno": "Pérez"
      }
    }
  ]
}
```

### **POST /api/signos-vitales**
Registra nuevos signos vitales.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "paciente_id": 1,
  "presion_arterial_sistolica": 120,
  "presion_arterial_diastolica": 80,
  "temperatura": 36.5,
  "peso": 70.5,
  "altura": 175,
  "frecuencia_cardiaca": 72,
  "saturacion_oxigeno": 98
}
```

**Respuesta**:
```json
{
  "message": "Signos vitales registrados exitosamente",
  "signo_vital": {
    "id_signo_vital": 1,
    "paciente_id": 1,
    "presion_arterial_sistolica": 120,
    "presion_arterial_diastolica": 80,
    "temperatura": 36.5,
    "peso": 70.5,
    "altura": 175,
    "frecuencia_cardiaca": 72,
    "saturacion_oxigeno": 98,
    "fecha_registro": "2024-01-15T10:00:00Z"
  }
}
```

---

## 🔬 **ENDPOINTS DE DIAGNÓSTICOS**

### **GET /api/diagnosticos**
Lista los diagnósticos.

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
- `paciente_id` (opcional): Filtrar por paciente
- `doctor_id` (opcional): Filtrar por doctor

**Respuesta**:
```json
{
  "diagnosticos": [
    {
      "id_diagnostico": 1,
      "paciente_id": 1,
      "doctor_id": 2,
      "diagnostico": "Hipertensión arterial",
      "tratamiento": "Control de presión arterial",
      "medicamentos": "Losartán 50mg diario",
      "fecha_diagnostico": "2024-01-15T10:00:00Z",
      "paciente": {
        "nombre": "Juan",
        "apellido_paterno": "Pérez"
      },
      "doctor": {
        "nombre": "Dr. Carlos",
        "apellido_paterno": "García"
      }
    }
  ]
}
```

### **POST /api/diagnosticos**
Crea un nuevo diagnóstico.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "paciente_id": 1,
  "doctor_id": 2,
  "diagnostico": "Hipertensión arterial",
  "tratamiento": "Control de presión arterial",
  "medicamentos": "Losartán 50mg diario"
}
```

**Respuesta**:
```json
{
  "message": "Diagnóstico creado exitosamente",
  "diagnostico": {
    "id_diagnostico": 1,
    "paciente_id": 1,
    "doctor_id": 2,
    "diagnostico": "Hipertensión arterial",
    "tratamiento": "Control de presión arterial",
    "medicamentos": "Losartán 50mg diario",
    "fecha_diagnostico": "2024-01-15T10:00:00Z"
  }
}
```

---

## 💊 **ENDPOINTS DE MEDICAMENTOS**

### **GET /api/medicamentos**
Lista todos los medicamentos.

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (opcional): Número de página
- `limit` (opcional): Elementos por página
- `search` (opcional): Búsqueda por nombre

**Respuesta**:
```json
{
  "medicamentos": [
    {
      "id_medicamento": 1,
      "nombre": "Paracetamol",
      "presentacion": "Tabletas 500mg",
      "dosis": "500mg",
      "descripcion": "Analgésico y antipirético",
      "fecha_registro": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_items": 1,
    "items_per_page": 10
  }
}
```

### **POST /api/medicamentos**
Crea un nuevo medicamento.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "nombre": "Paracetamol",
  "presentacion": "Tabletas 500mg",
  "dosis": "500mg",
  "descripcion": "Analgésico y antipirético"
}
```

**Respuesta**:
```json
{
  "message": "Medicamento creado exitosamente",
  "medicamento": {
    "id_medicamento": 1,
    "nombre": "Paracetamol",
    "presentacion": "Tabletas 500mg",
    "dosis": "500mg",
    "descripcion": "Analgésico y antipirético",
    "fecha_registro": "2024-01-15T10:00:00Z"
  }
}
```

---

## 💉 **ENDPOINTS DE PLANES DE MEDICACIÓN**

### **GET /api/planes-medicacion**
Lista los planes de medicación.

**Headers**:
```http
Authorization: Bearer <token>
```

**Query Parameters**:
- `paciente_id` (opcional): Filtrar por paciente

**Respuesta**:
```json
{
  "planes_medicacion": [
    {
      "id_plan": 1,
      "paciente_id": 1,
      "medicamento_id": 1,
      "dosis": "500mg",
      "frecuencia": "Cada 8 horas",
      "duracion": "7 días",
      "instrucciones": "Tomar con alimentos",
      "fecha_inicio": "2024-01-15T10:00:00Z",
      "fecha_fin": "2024-01-22T10:00:00Z",
      "paciente": {
        "nombre": "Juan",
        "apellido_paterno": "Pérez"
      },
      "medicamento": {
        "nombre": "Paracetamol",
        "presentacion": "Tabletas 500mg"
      }
    }
  ]
}
```

### **POST /api/planes-medicacion**
Crea un nuevo plan de medicación.

**Headers**:
```http
Content-Type: application/json
Authorization: Bearer <token>
```

**Body**:
```json
{
  "paciente_id": 1,
  "medicamento_id": 1,
  "dosis": "500mg",
  "frecuencia": "Cada 8 horas",
  "duracion": "7 días",
  "instrucciones": "Tomar con alimentos"
}
```

**Respuesta**:
```json
{
  "message": "Plan de medicación creado exitosamente",
  "plan_medicacion": {
    "id_plan": 1,
    "paciente_id": 1,
    "medicamento_id": 1,
    "dosis": "500mg",
    "frecuencia": "Cada 8 horas",
    "duracion": "7 días",
    "instrucciones": "Tomar con alimentos",
    "fecha_inicio": "2024-01-15T10:00:00Z",
    "fecha_fin": "2024-01-22T10:00:00Z"
  }
}
```

---

## 🔐 **AUTENTICACIÓN DE PACIENTES (auth-unified)**

> **Legacy:** `/api/paciente-auth/*` responde **410 Gone**. Usar siempre `/api/auth-unified/*`.
> Guía: [PATIENT-AUTH-GUIDE.md](PATIENT-AUTH-GUIDE.md) · Seguridad: [SECURITY-AUTH.md](SECURITY-AUTH.md)

### **POST /api/auth-unified/login-paciente**
Login con PIN (4 dígitos) o biometría.

**Body (PIN, recomendado)**:
```json
{
  "pin": "1234",
  "device_id": "opcional"
}
```

**Body (PIN + id_paciente, compatibilidad)**:
```json
{
  "id_paciente": 1,
  "pin": "1234",
  "device_id": "opcional"
}
```

**Respuesta** (forma típica):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "user": {
    "id": 1,
    "id_paciente": 1,
    "nombre": "Juan",
    "rol": "Paciente"
  }
}
```

### **POST /api/auth-unified/setup-pin**
Configura PIN (disponible según entorno; en producción suele requerir flujo controlado).

### **POST /api/auth-unified/setup-biometric**
Configura credencial biométrica del dispositivo.

### **PUT /api/auth-unified/admin/reset-patient-pin**
Admin/Doctor restablece PIN de un paciente (JWT requerido).

---

## ⚡ **WEBSOCKETS**

### **Conexión**
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token',
    device_id: 'unique-device-id'
  }
});
```

### **Eventos del Cliente al Servidor**

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `ping` | Heartbeat | Ninguno |
| `app_background` | App en segundo plano | Ninguno |
| `app_foreground` | App en primer plano | Ninguno |
| `sync_status_request` | Solicitar estado de sync | Ninguno |
| `request_upcoming_appointments` | Solicitar citas próximas | Ninguno |
| `request_medication_reminders` | Solicitar recordatorios | Ninguno |
| `request_waiting_patients` | Solicitar pacientes en espera | Ninguno |

### **Eventos del Servidor al Cliente**

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `pong` | Respuesta heartbeat | `{ timestamp }` |
| `push_notification` | Notificación push | `{ title, message, data }` |
| `appointment_reminder` | Recordatorio de cita | `{ appointment_id, doctor_name, time }` |
| `medication_reminder` | Recordatorio de medicamento | `{ medication_id, name, dosage }` |
| `test_result` | Resultado de examen | `{ test_id, type, status }` |
| `emergency_alert` | Alerta médica | `{ alert_id, severity, message }` |
| `sync_status` | Estado de sincronización | `{ last_sync, pending_changes }` |
| `upcoming_appointments` | Citas próximas | `[{ id, doctor_name, time }]` |
| `medication_reminders` | Recordatorios de medicamentos | `[{ id, name, dosage }]` |
| `waiting_patients` | Pacientes en espera | `[{ id, name, appointment_time }]` |

---

## 🚨 **CÓDIGOS DE ERROR**

### **Errores de Validación (400)**
```json
{
  "error": "Datos de validación incorrectos",
  "details": [
    {
      "field": "email",
      "message": "Email inválido"
    }
  ]
}
```

### **Errores de Autenticación (401)**
```json
{
  "error": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

### **Errores de Autorización (403)**
```json
{
  "error": "No tienes permisos para esta acción",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

### **Errores de Recurso No Encontrado (404)**
```json
{
  "error": "Paciente no encontrado",
  "code": "PATIENT_NOT_FOUND"
}
```

### **Errores de Rate Limiting (429)**
```json
{
  "error": "Demasiadas solicitudes",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 60
}
```

### **Errores del Servidor (500)**
```json
{
  "error": "Error interno del servidor",
  "code": "INTERNAL_SERVER_ERROR",
  "request_id": "req_abc123"
}
```

---

## 📊 **PAGINACIÓN**

Todos los endpoints que devuelven listas soportan paginación:

**Query Parameters**:
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10, max: 100)

**Respuesta**:
```json
{
  "data": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 50,
    "items_per_page": 10,
    "has_next": true,
    "has_prev": false
  }
}
```

---

## 🔍 **BÚSQUEDA Y FILTROS**

### **Parámetros de Búsqueda Comunes**
- `search`: Búsqueda de texto libre
- `fecha`: Filtrar por fecha (YYYY-MM-DD)
- `fecha_desde`: Fecha de inicio
- `fecha_hasta`: Fecha de fin
- `estado`: Filtrar por estado
- `rol`: Filtrar por rol de usuario

### **Ejemplo de Búsqueda**
```http
GET /api/pacientes?search=Juan&fecha_desde=2024-01-01&fecha_hasta=2024-01-31&page=1&limit=20
```

---

## 📱 **HEADERS ESPECÍFICOS PARA MÓVILES**

```http
Content-Type: application/json
Authorization: Bearer <jwt-token>
X-Device-ID: unique-device-id
X-Platform: android|ios|web
X-App-Version: 1.0.0
X-Push-Token: fcm-or-apns-token
X-Client-Type: app|web|mobile
X-Device-Info: {"model":"iPhone 14","os":"iOS 16.0"}
```

---

## 🔒 **SEGURIDAD**

### **Rate Limiting**
- **General**: 100 requests/minuto
- **Escritura**: 20 requests/minuto
- **Login**: 5 intentos/minuto
- **Registro**: 3 intentos/minuto

### **Validación de Datos**
- Todos los inputs son validados y sanitizados
- Protección contra inyección SQL
- Validación de tipos de datos
- Límites de tamaño de payload

### **Autenticación**
- JWT tokens con expiración
- Refresh tokens para renovación automática
- Validación de device_id para móviles
- Logout automático en tokens inválidos

---

**¡Esta es la referencia completa de la API! 🚀**
