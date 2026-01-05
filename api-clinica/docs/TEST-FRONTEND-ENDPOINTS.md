# Pruebas de Endpoints del Frontend

## Instrucciones

Este documento describe cómo ejecutar las pruebas completas de todos los endpoints usados por el frontend, especialmente los accesos rápidos del Dashboard Administrativo.

### Prerequisitos

1. **El servidor backend debe estar corriendo**
   ```bash
   cd api-clinica
   npm start
   # o
   node index.js
   ```

2. **El administrador debe existir**
   - Email: `admin@clinica.com`
   - Contraseña: `Admin123!`

### Ejecutar las Pruebas

```bash
cd api-clinica
node scripts/test-frontend-endpoints.js
```

## Endpoints que se Prueban

### 1. Autenticación
- ✅ `POST /api/auth/login` - Login de administrador
- ✅ `GET /api/auth/usuarios` - Verificar token

### 2. Dashboard Administrativo
- ✅ `GET /api/dashboard/admin/summary` - Resumen completo del dashboard

### 3. Módulos (Acceso Rápido: 🏢 Módulos)
- ✅ `GET /api/modulos` - Listar todos los módulos
- ✅ `POST /api/modulos` - Crear módulo
- ✅ `GET /api/modulos/:id` - Obtener módulo por ID
- ✅ `PUT /api/modulos/:id` - Actualizar módulo
- ✅ `DELETE /api/modulos/:id` - Eliminar módulo

### 4. Medicamentos (Acceso Rápido: 💊 Medicamentos)
- ✅ `GET /api/medicamentos` - Listar todos los medicamentos
- ✅ `POST /api/medicamentos` - Crear medicamento
- ✅ `DELETE /api/medicamentos/:id` - Eliminar medicamento

### 5. Comorbilidades (Acceso Rápido: 🏥 Comorbilidades)
- ✅ `GET /api/comorbilidades` - Listar todas las comorbilidades
- ✅ `POST /api/comorbilidades` - Crear comorbilidad
- ✅ `DELETE /api/comorbilidades/:id` - Eliminar comorbilidad

### 6. Vacunas (Acceso Rápido: 💉 Vacunas)
- ✅ `GET /api/vacunas` - Listar todas las vacunas
- ✅ `POST /api/vacunas` - Crear vacuna
- ✅ `DELETE /api/vacunas/:id` - Eliminar vacuna

### 7. Gestión de Usuarios
- ✅ `GET /api/auth/usuarios` - Listar todos los usuarios

### 8. Otros Accesos Rápidos del Dashboard
Los siguientes accesos rápidos navegan a pantallas, pero no se prueban sus endpoints directamente:
- 👨‍⚕️ **Agregar Doctor** - Navega a `AgregarDoctor` (requiere endpoints de doctores)
- 👥 **Registrar Paciente** - Navega a `AgregarPaciente` (requiere endpoints de pacientes)

## Resultado Esperado

Al ejecutar las pruebas, deberías ver:

```
╔══════════════════════════════════════════════════════════╗
║  RESUMEN DE PRUEBAS                                      ║
╚══════════════════════════════════════════════════════════╝

✅ Pruebas exitosas: X
❌ Pruebas fallidas: 0
📊 Total: X

📈 Tasa de éxito: 100.0%

🎉 ¡Todas las pruebas pasaron exitosamente!
```

## Solución de Problemas

### Error: "No se puede conectar al servidor"
- **Solución**: Asegúrate de que el servidor backend esté corriendo en el puerto 3000
- Verifica la URL en `scripts/test-frontend-endpoints.js` (variable `BASE_URL`)

### Error: "Login fallido"
- **Solución**: Verifica que el administrador exista con las credenciales correctas
- Ejecuta: `node scripts/truncate-and-create-admin.js` para crear/recrear el administrador

### Error: "404 Not Found" en algún endpoint
- **Solución**: Verifica que las rutas estén correctamente configuradas en `api-clinica/index.js`
- Verifica que los controladores estén exportados correctamente

## Notas

- Las pruebas crean registros temporales (módulos, medicamentos, comorbilidades, vacunas) que luego se eliminan
- Las pruebas requieren autenticación válida
- El script simula exactamente las llamadas que hace el frontend


