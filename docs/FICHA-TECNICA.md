# Ficha técnica de software – CuidateAPP

---

## 1. Información general

| Campo | Descripción |
|-------|-------------|
| **Nombre del proyecto** | CuidateAPP (Sistema de gestión clínica médica) |
| **Versión actual** | API: 1.0.0 · Web: 0.1.0 · Móvil: 0.0.1 |
| **Fecha de creación / actualización** | Documento: febrero 2026 · Proyecto en evolución continua |
| **Empresa u organización responsable** | Proyecto independiente / organización a definir |
| **Equipo de desarrollo** | Eduardo González Morelos (autor principal) |
| **Estado** | Producción / Mantenimiento (API y web desplegables; app móvil en uso) |
| **Repositorio** | https://github.com/EduardoGM1/CuidateAPP |

---

## 2. Descripción del proyecto

### Objetivo principal
Ofrecer un sistema integral de gestión clínica que permita a **doctores y administradores** gestionar pacientes, citas, diagnósticos, medicación y reportes desde una aplicación web, y a los **pacientes** consultar su información, citas y recordatorios desde una aplicación móvil (iOS/Android).

### Problema que resuelve
- Centralizar la información clínica (pacientes, citas, signos vitales, diagnósticos, planes de medicación, comorbilidades, red de apoyo, vacunación).
- Facilitar el seguimiento de pacientes crónicos (diabetes, obesidad, tuberculosis, etc.) y el registro de consultas.
- Generar reportes oficiales (FORMA Excel, Notas Médicas en PDF/HTML, expediente, estadísticas) para Secretaría de Salud / módulos de atención.
- Notificar a pacientes (recordatorios de citas, medicamentos) vía push y tiempo real.

### Público objetivo
- **Administradores**: gestión de usuarios, doctores, módulos, instituciones, auditoría.
- **Doctores**: dashboard, lista de pacientes asignados, citas, signos vitales, diagnósticos, medicación, reportes por paciente.
- **Pacientes**: consulta de su expediente, citas, medicación y recordatorios en app móvil.

### Alcance del sistema
- Backend (API REST + WebSockets), aplicación web para personal sanitario y aplicación móvil para pacientes.
- Módulos de atención (GAM), instituciones de salud, asignación paciente–doctor.
- Reportes: FORMA (Registro Mensual GAM), Notas Médicas (formato Secretaría de Salud), expediente en HTML, estadísticas, CSV.
- Despliegue en VPS (p. ej. Hostinger) con Nginx, PM2 y opcionalmente dominio y SSL.

---

## 3. Características principales

### Funcionalidades clave
- **Gestión de pacientes**: altas, edición, desactivación, filtros, detalle con historial (citas, signos vitales, diagnósticos, medicación, comorbilidades, red de apoyo, vacunación, salud bucal, detección tuberculosis, sesiones educativas).
- **Gestión de citas**: creación, reprogramación, estados, completar cita con signos vitales y diagnósticos.
- **Doctores**: CRUD, asignación/desasignación de pacientes, dashboard por doctor.
- **Signos vitales y antropometría**: registro por cita o monitoreo continuo (peso, talla, IMC, presión, glucosa, colesterol, triglicéridos, HbA1c, etc.).
- **Diagnósticos y planes de medicación**: vinculados a cita o paciente, con detalle de medicamento, dosis, frecuencia, vía.
- **Reportes**: FORMA en Excel (por mes/año), Notas Médicas en HTML/PDF, expediente completo en HTML, estadísticas en HTML, CSV (citas, signos vitales, diagnósticos).
- **Autenticación**: JWT (web y API), login con PIN y biometría para pacientes (app móvil), refresh token, control de sesión (redirección al caducar token en web).
- **Notificaciones**: push (FCM, APNs, HMS para Huawei), WebSockets para tiempo real; recordatorios de citas y medicación.
- **Sincronización offline** (app móvil) y soporte para múltiples dispositivos.

### Módulos del sistema
| Módulo | Descripción |
|--------|-------------|
| **api-clinica** | API REST (Node.js + Express), autenticación, reportes, WebSockets, notificaciones push |
| **cuidate-web** | SPA (React + Vite) para Admin/Doctor: login, dashboard, pacientes, citas, doctores, reportes, configuración |
| **ClinicaMovil** | App React Native (iOS/Android) para pacientes: login PIN/biometría, dashboard, citas, expediente, notificaciones |

### Integraciones con otros sistemas
- **Firebase Cloud Messaging (FCM)**: notificaciones push Android.
- **Apple Push Notification Service (APNs)**: notificaciones push iOS.
- **HMS Push Kit** (opcional): notificaciones en dispositivos Huawei sin GMS.
- **Resend** (opcional): envío de correos (p. ej. recuperación de contraseña).
- **Socket.IO**: tiempo real (eventos push, recordatorios, heartbeat).

### Tipo de aplicación
- **API REST**: backend Node.js (api-clinica).
- **Web**: SPA React (cuidate-web) – navegador.
- **Móvil**: React Native (ClinicaMovil) – iOS y Android.

---

## 4. Arquitectura y tecnología

### Lenguajes de programación
- **JavaScript (ES módulos)** en backend y frontend.
- **JSX** en React (web y React Native).

### Frameworks y librerías utilizados
| Capa | Tecnología |
|------|------------|
| **Backend** | Node.js, Express 5.x |
| **ORM / BD** | Sequelize 6.x, mysql2 |
| **Web** | React 18, Vite 5, React Router 6, Ant Design 6, TanStack Query, Zustand, Recharts, ExcelJS |
| **Móvil** | React Native 0.83, React Navigation 7, Redux Toolkit, React Native Paper, Firebase Messaging, Socket.IO client |

### Base de datos
- **Motor**: MySQL (compatible MariaDB).
- **Acceso**: Sequelize (dialecto `mysql`), pool configurable (producción: max 20, min 5; desarrollo: max 10, min 0).
- **SSL**: opcional vía `DB_SSL` y `dialectOptions`.

### Arquitectura
- **Cliente–servidor**: clientes (web y móvil) consumen API REST y, en su caso, WebSockets.
- **API monolítica** con rutas por dominio (auth, pacientes, doctores, citas, reportes, móvil, etc.).
- **Frontend**: SPA con estado global (Zustand en web; Redux en móvil) y caché de datos (React Query en web).

### Servicios externos o APIs
- Firebase (FCM), APNs, Resend (email), opcionalmente SMTP.
- Cliente HTTP: Axios en API, web y móvil.

---

## 5. Requisitos técnicos

### Requisitos mínimos de hardware (servidor API)
| Recurso | Mínimo recomendado |
|---------|---------------------|
| **CPU** | 1 vCPU |
| **RAM** | 1 GB (2 GB recomendado en producción) |
| **Espacio en disco** | 5 GB para app + logs + BD |

### Requisitos de software (servidor)
| Componente | Versión / Notas |
|------------|------------------|
| **Sistema operativo** | Ubuntu 22.04 LTS (recomendado en deploy) |
| **Node.js** | 18.x o 20.x (LTS) |
| **MySQL** | 8.x (o MariaDB equivalente) |
| **Nginx** | Para reverse proxy y servir estáticos (cuidate-web) |
| **PM2** | Para ejecutar api-clinica en producción |

### Requisitos cliente (navegador – cuidate-web)
| Componente | Detalle |
|------------|---------|
| **Navegador** | Chrome, Firefox, Edge, Safari (versiones recientes con soporte ES6+) |
| **Resolución** | Diseño adaptable; escritorio recomendado para uso administrativo |

### Requisitos cliente (app móvil)
| Componente | Detalle |
|------------|---------|
| **Android** | 6.0+ (API 23+) |
| **iOS** | Versión soportada por React Native 0.83 |

---

## 6. Seguridad

### Tipo de autenticación
- **Web / API (Admin y Doctor)**: usuario y contraseña; JWT (access token) en header `Authorization: Bearer <token>`.
- **Pacientes (app móvil)**: login por **CURP + PIN de 4 dígitos** o **autenticación biométrica**; JWT con `id_paciente` y rol Paciente.
- **Refresh token** para renovar sesión sin volver a introducir contraseña (endpoints móviles).

### Control de accesos
- **Roles**: Admin, Doctor, Paciente.
- **Middleware**: `authenticateToken` (verificación JWT) y `authorizeRoles(...roles)` en rutas.
- **Reportes** (`/api/reportes/*`): solo **Admin** y **Doctor**.
- **Paciente**: solo puede acceder a sus propios datos (p. ej. `authorizePatientAccess` o validación por `id_paciente` en rutas que lo permiten).

### Encriptación
- **Datos sensibles en reposo**: campos PII y clínicos sensibles encriptados en BD con **AES-256-GCM** (IV único por valor, auth tag, clave derivada con scrypt). Referencias normativas: NOM-004-SSA3-2012, HIPAA §164.514.
- **Modelos con campos encriptados**: Paciente (fecha_nacimiento, CURP, dirección, teléfono, etc.), SignoVital (observaciones y campos numéricos sensibles), Diagnostico (descripcion), Cita (motivo, observaciones), RedApoyo, PlanMedicacion, PlanDetalle, PacienteComorbilidad, EsquemaVacunacion.
- **Hooks Sequelize**: `beforeCreate` / `beforeUpdate` encriptan; `afterFind` desencripta al leer. En reportes se usa desencriptación explícita (`decryptForReport`) para mostrar texto en HTML/CSV sin alterar lo almacenado.
- **Contraseñas**: hash con **bcrypt/bcryptjs**; no se almacenan en claro.
- **Variables de entorno**: `ENCRYPTION_KEY` (y opcionalmente `ENCRYPTION_SALT`) para encriptación; `JWT_SECRET` y `JWT_REFRESH_SECRET` para tokens.

### Copias de seguridad
- Script de respaldo de base de datos: `scripts/database/backup-system.js` (`npm run backup:db`).
- Configuración de backup opcional vía variables (p. ej. `BACKUP_ENCRYPTION`).
- En despliegue VPS se recomienda programar backups periódicos (cron) de MySQL y, si aplica, de archivos de configuración y logs.

---

## 7. Rendimiento

### Capacidad de usuarios simultáneos
- **API**: limitada por pool de conexiones MySQL (p. ej. max 20 en producción), número de instancias PM2 y recursos de la VPS.
- **Rate limiting**: límites por ruta (búsquedas, escritura, login, etc.) para evitar abuso y garantizar estabilidad.
- **Pruebas de carga**: Artillery para tests de carga, estrés y picos (`perf:load`, `perf:stress`, `perf:spike`).

### Tiempo de respuesta promedio
- Depende del entorno (red, BD, carga). La API está optimizada con compresión, pool de conexiones y consultas con includes controlados; se recomienda medir en entorno real o con Artillery.

### Escalabilidad
- **Vertical**: más CPU/RAM en la VPS y ajuste de pool Sequelize y workers PM2.
- **Horizontal**: posibilidad de varias instancias de api-clinica detrás de un balanceador (considerar sesiones WebSocket y estado si se usa Socket.IO).
- **Base de datos**: índices en tablas críticas (pacientes, citas, signos vitales, etc.); migraciones y auditorías de seguridad/rendimiento disponibles en scripts.

---

## Resumen en una frase
**CuidateAPP** es un sistema de gestión clínica (API Node.js, web React para Admin/Doctor y app React Native para pacientes) que centraliza pacientes, citas, signos vitales, diagnósticos y medicación, genera reportes oficiales (FORMA, Notas Médicas, expediente), utiliza encriptación AES-256-GCM para datos sensibles y control de acceso por roles (Admin, Doctor, Paciente), con notificaciones push y tiempo real.

---

*Documento generado a partir del estado del proyecto CuidateAPP (repo: EduardoGM1/CuidateAPP).*
