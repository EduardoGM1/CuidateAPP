# 🔐 Recomendaciones de Seguridad - Usuarios de Prueba

## ⚠️ Problema Identificado

Se detectó que aún existe el usuario doctor con credenciales de prueba:
- **Email:** `Doctor@clinica.com` o `doctor@clinica.com`
- **Password:** `Doctor123!`

Esta es una **vulnerabilidad de seguridad crítica** porque:
1. ✅ La contraseña es débil y predecible
2. ✅ Es un usuario de prueba conocido públicamente
3. ✅ Puede ser explotado por atacantes
4. ✅ No cumple con estándares de seguridad para producción

---

## 🛠️ Solución Implementada

Se creó un script de seguridad que:

### 1. **Verificación Automática**
- Detecta usuarios con contraseñas débiles conocidas
- Lista todos los usuarios vulnerables
- Identifica específicamente el usuario doctor

### 2. **Actualización Automática**
- Genera una contraseña segura aleatoria (16 caracteres)
- Actualiza automáticamente la contraseña del usuario doctor
- Registra la acción en los logs de seguridad

### 3. **Contraseñas Débiles Detectadas**
El script verifica contra esta lista:
- `Doctor123!`
- `Admin123!`
- `doctor123`
- `admin123`
- `Doctor123`
- `Admin123`
- `password`
- `123456`
- `12345678`
- `qwerty`
- `abc123`

---

## 📋 Cómo Usar el Script

### Opción 1: Usando NPM
```bash
cd api-clinica
npm run security:check-passwords
```

### Opción 2: Ejecución Directa
```bash
cd api-clinica
node scripts/verificar-y-actualizar-contrasenas-debiles.js
```

---

## ✅ Qué Hace el Script

1. **Conecta a la base de datos**
2. **Obtiene todos los usuarios activos**
3. **Verifica cada contraseña** contra la lista de contraseñas débiles
4. **Identifica usuarios vulnerables**
5. **Actualiza automáticamente** la contraseña del doctor
6. **Genera una nueva contraseña segura** (16 caracteres con mayúsculas, minúsculas, números y símbolos)
7. **Muestra las nuevas credenciales** en la consola
8. **Registra la acción** en los logs

---

## 📝 Ejemplo de Salida

```
🔍 Verificando usuarios con contraseñas débiles...

📊 Total de usuarios activos: 12

⚠️  Se encontraron 1 usuario(s) con contraseñas débiles:

   1. doctor@clinica.com (Doctor)
      Contraseña débil detectada: Doctor123!

🔴 USUARIO DOCTOR CON CONTRASEÑA DÉBIL DETECTADO

   Email: doctor@clinica.com
   Rol: Doctor
   Contraseña actual: Doctor123!

🔐 Generando nueva contraseña segura...
   Nueva contraseña: K#m9$pL2@vN4!xQ7

🔄 Actualizando contraseña del doctor...
✅ Contraseña actualizada exitosamente

📝 CREDENCIALES ACTUALIZADAS:
   Email: doctor@clinica.com
   Nueva Password: K#m9$pL2@vN4!xQ7

⚠️  IMPORTANTE: Guarda esta contraseña de forma segura.
```

---

## 🔒 Mejores Prácticas de Seguridad

### 1. **Contraseñas Fuertes**
- ✅ Mínimo 12 caracteres (recomendado 16+)
- ✅ Combinación de mayúsculas, minúsculas, números y símbolos
- ✅ No usar palabras del diccionario
- ✅ No usar información personal
- ✅ Única para cada cuenta

### 2. **Usuarios de Prueba**
- ❌ **NO** usar usuarios de prueba en producción
- ❌ **NO** usar contraseñas conocidas o débiles
- ✅ Eliminar usuarios de prueba antes de producción
- ✅ Usar gestores de contraseñas para desarrollo

### 3. **Gestión de Credenciales**
- ✅ Usar un gestor de contraseñas (1Password, LastPass, Bitwarden)
- ✅ Rotar contraseñas periódicamente
- ✅ No compartir contraseñas por email o chat
- ✅ Usar autenticación de dos factores (2FA) cuando sea posible

### 4. **Monitoreo y Auditoría**
- ✅ Ejecutar este script regularmente
- ✅ Revisar logs de seguridad
- ✅ Monitorear intentos de acceso fallidos
- ✅ Implementar alertas de seguridad

---

## 🚨 Acciones Inmediatas Recomendadas

1. **Ejecutar el script ahora:**
   ```bash
   npm run security:check-passwords
   ```

2. **Guardar la nueva contraseña de forma segura:**
   - Usar un gestor de contraseñas
   - No compartir por email o chat
   - Documentar en un lugar seguro (si es necesario)

3. **Actualizar credenciales en:**
   - Variables de entorno (si se usan)
   - Documentación interna
   - Scripts de prueba
   - Configuraciones de desarrollo

4. **Revisar otros usuarios:**
   - Verificar si hay más usuarios con contraseñas débiles
   - Actualizar contraseñas de administradores
   - Implementar política de contraseñas fuertes

5. **Eliminar usuarios de prueba en producción:**
   - Si estás en producción, eliminar usuarios de prueba
   - Crear usuarios reales con contraseñas seguras
   - Documentar el proceso de creación de usuarios

---

## 📊 Monitoreo Continuo

### Ejecutar Regularmente
- **Desarrollo:** Antes de cada deploy
- **Producción:** Mensualmente o después de cambios de seguridad
- **Después de incidentes:** Inmediatamente después de detectar vulnerabilidades

### Integrar en CI/CD
```yaml
# Ejemplo para GitHub Actions
- name: Check Weak Passwords
  run: npm run security:check-passwords
```

---

## 🔐 Contraseñas Seguras Generadas

El script genera contraseñas con estas características:
- **Longitud:** 16 caracteres
- **Mayúsculas:** A-Z
- **Minúsculas:** a-z
- **Números:** 0-9
- **Símbolos:** !@#$%^&*()_+-=[]{}|;:,.<>?
- **Aleatoriedad:** Caracteres mezclados aleatoriamente

**Ejemplo de contraseña generada:**
```
K#m9$pL2@vN4!xQ7
```

---

## 📞 Soporte

Si encuentras problemas o necesitas ayuda:
1. Revisa los logs en `api-clinica/logs/`
2. Verifica la conexión a la base de datos
3. Asegúrate de tener permisos para actualizar usuarios
4. Consulta la documentación de seguridad

---

## ✅ Checklist de Seguridad

- [ ] Ejecutar script de verificación
- [ ] Actualizar contraseña del doctor
- [ ] Guardar nueva contraseña de forma segura
- [ ] Actualizar documentación
- [ ] Revisar otros usuarios
- [ ] Eliminar usuarios de prueba en producción
- [ ] Implementar política de contraseñas
- [ ] Configurar monitoreo continuo
- [ ] Revisar logs de seguridad
- [ ] Documentar proceso

---

**Última actualización:** 2025-12-14
**Versión del script:** 1.0.0

