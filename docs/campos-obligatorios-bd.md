# 📋 CAMPOS OBLIGATORIOS EN LA BASE DE DATOS

## 🔐 **USUARIO** (Tabla: `usuarios`)
### Campos Obligatorios (NOT NULL):
- ✅ **email** - STRING(150) - Email único del usuario
- ✅ **password_hash** - STRING(255) - Hash de la contraseña
- ✅ **rol** - ENUM('Paciente', 'Doctor', 'Admin') - Rol del usuario
- ✅ **fecha_creacion** - DATE - Fecha de creación (auto-generada)
- ✅ **activo** - BOOLEAN - Estado activo (default: true)

### Campos Opcionales:
- ❌ ultimo_login - DATE
- ❌ id_usuario - INTEGER (PK, auto-increment)

---

## 👤 **PACIENTE** (Tabla: `pacientes`)
### Campos Obligatorios (NOT NULL):
- ✅ **nombre** - STRING(100) - Nombre del paciente
- ✅ **apellido_paterno** - STRING(100) - Apellido paterno
- ✅ **fecha_nacimiento** - DATEONLY - Fecha de nacimiento

### Campos Opcionales:
- ❌ id_paciente - INTEGER (PK, auto-increment)
- ❌ id_usuario - INTEGER - Referencia al usuario
- ❌ apellido_materno - STRING(100)
- ❌ curp - STRING(18) - CURP único
- ❌ institucion_salud - ENUM('IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro')
- ❌ sexo - ENUM('Hombre', 'Mujer')
- ❌ direccion - STRING(255)
- ❌ localidad - STRING(100)
- ❌ numero_celular - STRING(20)
- ❌ fecha_registro - DATE (auto-generada)
- ❌ id_modulo - INTEGER
- ❌ activo - BOOLEAN (default: true)

---

## 📅 **CITA** (Tabla: `citas`)
### Campos Obligatorios (NOT NULL):
- ✅ **id_paciente** - INTEGER - ID del paciente
- ✅ **fecha_cita** - DATE - Fecha de la cita

### Campos Opcionales:
- ❌ id_cita - INTEGER (PK, auto-increment)
- ❌ id_doctor - INTEGER - ID del doctor
- ❌ asistencia - BOOLEAN
- ❌ motivo - STRING(255)
- ❌ es_primera_consulta - BOOLEAN (default: false)
- ❌ observaciones - TEXT
- ❌ fecha_creacion - DATE (auto-generada)

---

## 💓 **SIGNOS VITALES** (Tabla: `signos_vitales`)
### Campos Obligatorios (NOT NULL):
- ✅ **id_paciente** - INTEGER - ID del paciente
- ✅ **registrado_por** - ENUM('paciente', 'doctor') - Quién registró

### Campos Opcionales:
- ❌ id_signo - INTEGER (PK, auto-increment)
- ❌ id_cita - INTEGER - ID de la cita
- ❌ fecha_medicion - DATE (auto-generada)
- ❌ peso_kg - DECIMAL(6,2)
- ❌ talla_m - DECIMAL(4,2)
- ❌ imc - DECIMAL(6,2)
- ❌ medida_cintura_cm - DECIMAL(6,2)
- ❌ presion_sistolica - SMALLINT
- ❌ presion_diastolica - SMALLINT
- ❌ glucosa_mg_dl - DECIMAL(6,2)
- ❌ colesterol_mg_dl - DECIMAL(6,2)
- ❌ trigliceridos_mg_dl - DECIMAL(6,2)
- ❌ observaciones - TEXT
- ❌ fecha_creacion - DATE (auto-generada)

---

## ✅ **PUNTO DE CHEQUEO** (Tabla: `puntos_chequeo`)
### Campos Obligatorios (NOT NULL):
- ✅ **id_paciente** - INTEGER - ID del paciente

### Campos Opcionales:
- ❌ id_chequeo - INTEGER (PK, auto-increment)
- ❌ id_cita - INTEGER - ID de la cita
- ❌ asistencia - BOOLEAN (default: false)
- ❌ motivo_no_asistencia - STRING(255)
- ❌ observaciones - TEXT
- ❌ fecha_registro - DATE (auto-generada)

---

## 👥 **RED DE APOYO** (Tabla: `red_apoyo`)
### Campos Obligatorios (NOT NULL):
- ✅ **id_paciente** - INTEGER - ID del paciente
- ✅ **nombre_contacto** - STRING(150) - Nombre del contacto

### Campos Opcionales:
- ❌ id_red_apoyo - INTEGER (PK, auto-increment)
- ❌ numero_celular - STRING(20)
- ❌ email - STRING(150)
- ❌ direccion - STRING(255)
- ❌ localidad - STRING(100)
- ❌ parentesco - STRING(100)
- ❌ fecha_creacion - DATE (auto-generada)

---

## 🔐 **AUTENTICACIÓN DE PACIENTE** (Tabla: `paciente_auth`)
### Campos Obligatorios (NOT NULL):
- ✅ **id_paciente** - INTEGER - ID del paciente
- ✅ **device_id** - STRING(128) - ID único del dispositivo
- ✅ **device_type** - ENUM('mobile', 'tablet', 'web') - Tipo de dispositivo
- ✅ **is_primary_device** - BOOLEAN - Dispositivo principal
- ✅ **failed_attempts** - SMALLINT - Intentos fallidos
- ✅ **created_at** - DATE - Fecha de creación
- ✅ **activo** - BOOLEAN - Estado activo

### Campos Opcionales:
- ❌ id_auth - INTEGER (PK, auto-increment)
- ❌ device_name - STRING(100)
- ❌ locked_until - DATE
- ❌ last_activity - DATE
- ❌ updated_at - DATE

---

## 🔢 **PIN DE AUTENTICACIÓN** (Tabla: `paciente_auth_pin`)
### Campos Obligatorios (NOT NULL):
- ✅ **id_auth** - INTEGER - ID de autenticación
- ✅ **pin_hash** - STRING(255) - Hash del PIN
- ✅ **pin_salt** - STRING(32) - Salt del PIN
- ✅ **created_at** - DATE - Fecha de creación
- ✅ **activo** - BOOLEAN - Estado activo

### Campos Opcionales:
- ❌ id_pin_auth - INTEGER (PK, auto-increment)
- ❌ expires_at - DATE - Fecha de expiración

---

## 📊 **RESUMEN DE VALIDACIONES PARA EL FORMULARIO**

### **PASO 1: PIN** ✅ OBLIGATORIO
- PIN de 4 dígitos
- Confirmación del PIN
- Device ID (generado automáticamente)

### **PASO 2: DATOS DEL PACIENTE** ✅ OBLIGATORIOS
- ✅ **nombre** - REQUERIDO
- ✅ **apellido_paterno** - REQUERIDO
- ✅ **fecha_nacimiento** - REQUERIDO
- ❌ apellido_materno - Opcional
- ❌ curp - Opcional
- ❌ institucion_salud - Opcional (ENUM válido)
- ❌ sexo - Opcional (ENUM válido)
- ❌ direccion - Opcional
- ❌ localidad - Opcional
- ❌ numero_celular - Opcional
- ❌ id_modulo - Opcional

### **PASO 3: RED DE APOYO** ✅ OBLIGATORIO
- ✅ **nombre_contacto** - REQUERIDO (al menos uno)
- ❌ numero_celular - Opcional
- ❌ email - Opcional
- ❌ direccion - Opcional
- ❌ localidad - Opcional
- ❌ parentesco - Opcional

### **PASO 4: PRIMERA CONSULTA** ✅ OBLIGATORIO
- ✅ **id_paciente** - REQUERIDO (se asigna automáticamente)
- ✅ **fecha_cita** - REQUERIDO
- ✅ **registrado_por** - REQUERIDO ('doctor')
- ❌ Todos los signos vitales - Opcionales
- ❌ Motivo de consulta - Opcional
- ❌ Diagnóstico - Opcional
- ❌ Observaciones - Opcional

---

## ⚠️ **VALIDACIONES IMPORTANTES**

### **ENUMs Válidos:**
- **institucion_salud**: 'IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'
- **sexo**: 'Hombre', 'Mujer'
- **rol**: 'Paciente', 'Doctor', 'Admin'
- **device_type**: 'mobile', 'tablet', 'web'
- **registrado_por**: 'paciente', 'doctor'

### **Límites de Caracteres:**
- **nombre**: máximo 100 caracteres
- **apellido_paterno**: máximo 100 caracteres
- **apellido_materno**: máximo 100 caracteres
- **curp**: exactamente 18 caracteres
- **direccion**: máximo 255 caracteres
- **numero_celular**: máximo 20 caracteres
- **email**: máximo 150 caracteres

### **Campos Únicos:**
- **email** (en usuarios)
- **curp** (en pacientes)
- **device_id** (por paciente)

---

## 🎯 **RECOMENDACIONES PARA EL FORMULARIO**

1. **Validar campos obligatorios** antes de enviar
2. **Usar ENUMs válidos** para institucion_salud y sexo
3. **Validar formato de CURP** (18 caracteres)
4. **Validar formato de email** si se proporciona
5. **Generar device_id único** para cada dispositivo
6. **Incluir al menos un contacto** en red de apoyo
7. **Asignar fecha actual** para primera consulta

