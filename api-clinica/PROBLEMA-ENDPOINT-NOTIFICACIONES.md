# 🔍 Problema con el Endpoint `/api/notificaciones`

## ❌ Problema Detectado

Al intentar acceder a `/api/notificaciones`, el servidor retorna **404 (Not Found)**.

## 🔎 Análisis

### Rutas Actuales

Las rutas de notificaciones están registradas bajo `/api/doctores`, no bajo `/api/notificaciones`:

**En `index.js` (línea 273):**
```javascript
app.use("/api/doctores", notificacionRoutes); // ✅ Notificaciones de doctores
```

**Rutas disponibles en `notificacionRoutes.js`:**
- ✅ `GET /api/doctores/:id/notificaciones` - Obtener notificaciones de un doctor
- ✅ `GET /api/doctores/:id/notificaciones/contador` - Contador de notificaciones no leídas
- ✅ `PUT /api/doctores/:id/notificaciones/:notificacionId/leida` - Marcar como leída
- ✅ `PUT /api/doctores/:id/notificaciones/mensaje/:pacienteId/leida` - Marcar mensaje como leído
- ✅ `PUT /api/doctores/:id/notificaciones/:notificacionId/archivar` - Archivar notificación

### ❌ Ruta que NO existe:
- ❌ `GET /api/notificaciones` - **No existe**

## 🎯 Solución

### Opción 1: Usar la ruta correcta (Recomendado)

Las notificaciones requieren el ID del doctor en la URL. Para el doctor con ID 1:

```bash
# Obtener notificaciones del doctor
GET /api/doctores/1/notificaciones

# Obtener contador de notificaciones
GET /api/doctores/1/notificaciones/contador
```

### Opción 2: Crear endpoint genérico `/api/notificaciones`

Si se necesita un endpoint genérico que funcione sin el ID del doctor (usando el token de autenticación), se puede crear una nueva ruta.

## 📋 Implementación de Opción 2 (Si se requiere)

### 1. Modificar `notificacionRoutes.js`

Agregar una ruta que obtenga el ID del doctor desde el token:

```javascript
/**
 * @route GET /api/notificaciones
 * @desc Obtener notificaciones del doctor autenticado
 * @access Doctor (propio) o Admin
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id_usuario || req.user?.id;
    const userRole = req.user?.rol;

    // Si es Admin, retornar error (necesita especificar doctor)
    if (userRole === 'Admin' || userRole === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Los administradores deben especificar el ID del doctor: /api/doctores/:id/notificaciones'
      });
    }

    // Si es Doctor, obtener su ID
    if (userRole === 'Doctor' || userRole === 'doctor') {
      const doctor = await Doctor.findOne({
        where: { id_usuario: userId },
        attributes: ['id_doctor']
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }

      // Redirigir a la ruta específica del doctor
      req.params.id = doctor.id_doctor.toString();
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Acceso denegado'
    });
  } catch (error) {
    logger.error('Error obteniendo ID de doctor para notificaciones', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}, validateDoctorNotificationsAccess, getNotificacionesDoctor);
```

### 2. Registrar la ruta en `index.js`

Agregar una ruta adicional:

```javascript
// Opción A: Mantener ambas rutas
app.use("/api/doctores", notificacionRoutes); // Rutas específicas con ID
app.use("/api/notificaciones", notificacionRoutes); // Ruta genérica (solo para doctores autenticados)

// Opción B: Crear un router separado para la ruta genérica
import notificacionGenRoutes from "./routes/notificacionGenRoutes.js";
app.use("/api/notificaciones", notificacionGenRoutes);
```

## ✅ Recomendación

**Usar la Opción 1** (ruta actual) porque:
1. ✅ Es más explícita y clara
2. ✅ Permite a los administradores acceder a notificaciones de cualquier doctor
3. ✅ Ya está implementada y funcionando
4. ✅ Sigue el patrón RESTful estándar

**Solo implementar la Opción 2 si:**
- El frontend necesita un endpoint genérico sin especificar el ID
- Se quiere simplificar las llamadas desde la aplicación móvil

## 📝 Ejemplo de Uso Correcto

```javascript
// Con autenticación (token en header)
const token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const doctorId = 1; // ID del doctor autenticado

// Obtener notificaciones
fetch('http://localhost:3000/api/doctores/1/notificaciones', {
  headers: {
    'Authorization': token,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));

// Obtener contador
fetch('http://localhost:3000/api/doctores/1/notificaciones/contador', {
  headers: {
    'Authorization': token,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => console.log(data));
```

## 🔧 Corrección en Pruebas

Actualizar las pruebas para usar la ruta correcta:

```powershell
# ❌ Incorrecto
GET /api/notificaciones

# ✅ Correcto
GET /api/doctores/1/notificaciones
```

---

**Estado:** ✅ **No es un error, es el diseño actual del API**

Las notificaciones están correctamente implementadas, solo que la ruta es diferente a la esperada en las pruebas.
