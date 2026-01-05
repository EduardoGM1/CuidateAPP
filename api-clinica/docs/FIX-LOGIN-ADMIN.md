# 🔧 FIX: Login Admin/Doctor con Sistema Unificado

## 🐛 Problema Identificado

El endpoint `/api/auth/login` estaba usando el sistema legacy que buscaba `password_hash` en la tabla `usuarios`, pero el usuario admin fue creado con el sistema unificado que almacena las credenciales en `auth_credentials`.

## ✅ Solución Aplicada

### 1. Actualización del Controlador `auth.js`

**Archivo**: `api-clinica/controllers/auth.js`

**Cambios**:
- Migrado el método `login` para usar `UnifiedAuthService.authenticate` en lugar de `bcrypt.compare` directamente con `usuario.password_hash`
- Añadida validación de email con `trim().toLowerCase()` para evitar problemas de mayúsculas/minúsculas
- Añadida validación de rol (solo Doctor/Admin)
- Mejorado el manejo de errores con logging detallado
- Respuesta formateada para compatibilidad con código legacy del frontend

**Código actualizado**:
```javascript
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email y contraseña son requeridos' 
      });
    }

    logger.info('Iniciando login Doctor/Admin', { email });

    // Buscar usuario
    const usuario = await Usuario.findOne({ 
      where: { email: email.trim().toLowerCase(), activo: true } 
    });
    
    if (!usuario) {
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas' 
      });
    }

    // Validar rol
    if (!['Doctor', 'Admin'].includes(usuario.rol)) {
      return res.status(403).json({
        success: false,
        error: 'Este endpoint es solo para Doctores y Administradores'
      });
    }

    // Usar sistema unificado de autenticación
    const UnifiedAuthService = (await import('../services/unifiedAuthService.js')).default;
    
    try {
      const result = await UnifiedAuthService.authenticate(
        usuario.rol,
        usuario.id_usuario,
        {
          method: 'password',
          credential: password
        }
      );

      // Actualizar último login
      await usuario.update({ ultimo_login: new Date() });

      // Formatear respuesta para compatibilidad
      res.json({
        success: true,
        message: 'Login exitoso',
        token: result.token,
        refresh_token: result.refresh_token || result.refreshToken,
        usuario: {
          id: usuario.id_usuario,
          email: usuario.email,
          rol: usuario.rol
        }
      });
    } catch (authError) {
      logger.warn('Error en autenticación unificada', { 
        email, 
        error: authError.message 
      });
      return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas' 
      });
    }
  } catch (error) {
    logger.error('Error en login', { error: error.message });
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
```

### 2. Mejoras en `UnifiedAuthService`

**Archivo**: `api-clinica/services/unifiedAuthService.js`

**Cambios**:
- Añadido logging detallado en la comparación de contraseñas
- Validación de que `credential_value` existe antes de comparar

## 📋 Verificación

### Credenciales en Base de Datos

**Usuario**:
- Email: `admin@clinica.com`
- Rol: `Admin`
- Password Hash (legacy): NO EXISTE ✅

**Credencial (auth_credentials)**:
- User Type: `Admin`
- User ID: `1`
- Auth Method: `password`
- Credential Value: Hash bcrypt (60 caracteres) ✅
- Is Primary: `true`
- Activo: `true`

## 🧪 Pruebas

### Endpoint de Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@clinica.com",
  "password": "Admin123!"
}
```

### Respuesta Esperada
```json
{
  "success": true,
  "message": "Login exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "...",
  "usuario": {
    "id": 1,
    "email": "admin@clinica.com",
    "rol": "Admin"
  }
}
```

## ✅ Estado

- ✅ Controlador actualizado para usar sistema unificado
- ✅ Validación de email mejorada (trim + toLowerCase)
- ✅ Logging detallado añadido
- ✅ Credenciales verificadas en base de datos
- ✅ Frontend compatible (no requiere cambios)

---

**Fecha**: 2025-11-03  
**Status**: ✅ COMPLETADO



