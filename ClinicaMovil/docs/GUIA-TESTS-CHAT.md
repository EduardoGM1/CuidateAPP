# 🧪 Guía de Tests Unitarios del Chat

## 📋 Descripción

Esta guía explica cómo ejecutar y mantener los tests unitarios para las funcionalidades críticas del chat.

## 🎯 Tests Disponibles

### 1. **Tests de Utilidades** (`src/utils/__tests__/chatUtils.test.js`)

Prueban las funciones de utilidad extraídas del componente:

- ✅ `obtenerIniciales` - Genera iniciales del paciente
- ✅ `obtenerNombreCompleto` - Formatea nombre completo
- ✅ `formatearUltimaActividad` - Formatea última actividad
- ✅ `agruparMensajesPorFecha` - Agrupa mensajes por fecha

**Ejecutar:**
```bash
npm test -- src/utils/__tests__/chatUtils.test.js
```

### 2. **Tests de WebSocket** (`src/__tests__/ChatWebSocket.test.js`)

Prueban la lógica de eventos WebSocket:

- ✅ `mensaje_actualizado` - Recarga mensajes cuando se actualiza
- ✅ `mensaje_eliminado` - Recarga mensajes cuando se elimina
- ✅ `usuario_escribiendo` - Muestra/oculta indicador de escritura

**Ejecutar:**
```bash
npm test -- src/__tests__/ChatWebSocket.test.js
```

### 3. **Tests del Componente** (`src/__tests__/ChatPaciente.test.js`)

Prueban el componente completo (requiere mocks adicionales):

**Ejecutar:**
```bash
npm test -- src/__tests__/ChatPaciente.test.js
```

## 🚀 Ejecutar Tests

### Método 1: Script PowerShell (Recomendado)

```powershell
# Todos los tests del chat
.\scripts\test-chat.ps1

# Con cobertura
.\scripts\test-chat.ps1 -Coverage

# Modo watch (se ejecutan automáticamente al cambiar archivos)
.\scripts\test-chat.ps1 -Watch

# Incluir tests del componente completo
.\scripts\test-chat.ps1 -All
```

### Método 2: NPM Scripts

```bash
# Todos los tests
npm test

# Tests específicos del chat
npm test -- --testPathPattern="chat"

# Con cobertura
npm test -- --coverage --testPathPattern="chat"

# Modo watch
npm test -- --watch --testPathPattern="chat"
```

### Método 3: Comandos Directos

```bash
# Tests de utilidades
npm test -- src/utils/__tests__/chatUtils.test.js

# Tests de WebSocket
npm test -- src/__tests__/ChatWebSocket.test.js

# Todos los tests del chat
npm test -- --testPathPattern="chat"
```

## 📊 Cobertura de Código

Para ver la cobertura de código:

```bash
npm test -- --coverage --testPathPattern="chat"
```

Esto generará un reporte en `coverage/` con:
- Cobertura por archivo
- Líneas cubiertas/no cubiertas
- Funciones cubiertas/no cubiertas

## ✅ Verificar Funcionalidad

### Tests que Garantizan Funcionalidad

1. **Actualizaciones en Tiempo Real**
   - ✅ Verifica que `mensaje_actualizado` recarga mensajes
   - ✅ Verifica que se usa `cargarMensajesRef.current(false)`
   - ✅ Verifica delay de 300ms

2. **Eliminaciones en Tiempo Real**
   - ✅ Verifica que `mensaje_eliminado` recarga mensajes
   - ✅ Verifica que se usa `cargarMensajesRef.current(false)`
   - ✅ Verifica delay de 300ms

3. **Funciones de Utilidad**
   - ✅ Verifica formato de iniciales
   - ✅ Verifica formato de nombres
   - ✅ Verifica formato de fechas
   - ✅ Verifica agrupación de mensajes

## 🔧 Mantenimiento

### Agregar Nuevos Tests

1. **Para funciones de utilidad:**
   - Agregar test en `src/utils/__tests__/chatUtils.test.js`
   - Asegurar que la función esté en `src/utils/chatUtils.js`

2. **Para eventos WebSocket:**
   - Agregar test en `src/__tests__/ChatWebSocket.test.js`
   - Simular el evento y verificar el comportamiento

3. **Para componentes:**
   - Agregar test en `src/__tests__/ChatPaciente.test.js`
   - Usar mocks para dependencias

### Ejecutar Tests Antes de Commit

```bash
# Ejecutar todos los tests
npm test

# Verificar que todos pasen
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests fallaron. No hacer commit." -ForegroundColor Red
    exit 1
}
```

## 📝 Notas Importantes

1. **Funciones Extraídas:**
   - Las funciones de utilidad están en `src/utils/chatUtils.js`
   - Esto permite testearlas de forma aislada
   - El componente las importa y usa

2. **Mocks Necesarios:**
   - `useAuth` - Contexto de autenticación
   - `useWebSocket` - Hook de WebSocket
   - `chatService` - Servicio de API
   - `gestionService` - Servicio de gestión

3. **Tests de Integración:**
   - Los tests de WebSocket simulan eventos
   - Verifican que se llamen las funciones correctas
   - No requieren servidor real

## 🐛 Troubleshooting

### Error: "Cannot find module"
```bash
# Limpiar cache y reinstalar
npm run start:reset
rm -rf node_modules/.cache
```

### Tests muy lentos
```bash
# Ejecutar solo tests específicos
npm test -- src/utils/__tests__/chatUtils.test.js
```

### Tests fallan en CI
```bash
# Ejecutar en modo CI
npm test -- --ci --coverage --watchAll=false
```

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)


