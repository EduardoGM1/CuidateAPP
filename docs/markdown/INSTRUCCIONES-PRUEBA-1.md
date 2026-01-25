# 🧪 INSTRUCCIONES: Prueba 1 - Verificación de Datos GET

**Objetivo:** Verificar que los datos GET de signos vitales se reciben correctamente

---

## 📋 PASOS PARA EJECUTAR LA PRUEBA

### **Opción 1: Usando el Botón de Prueba (Recomendado)**

1. **Abrir la aplicación en modo desarrollo**
   - Asegúrate de que estás en modo `__DEV__ = true`

2. **Navegar a la pantalla de Gráficos de Evolución**
   - Como paciente, ve a "Gráficos de Evolución"

3. **Buscar el botón de prueba**
   - En la parte superior derecha, junto a los botones 🔊 y 📥
   - Verás un botón 🧪 (solo visible en desarrollo)

4. **Presionar el botón 🧪**
   - Se abrirá un diálogo preguntando si quieres ejecutar la prueba
   - Presiona "Ejecutar"

5. **Revisar la consola**
   - Abre la consola de React Native (Metro bundler o Flipper)
   - Busca el mensaje: `=== PRUEBA 1: VERIFICACIÓN DE DATOS GET ===`
   - Revisa todos los resultados

---

### **Opción 2: Usando la Consola de JavaScript**

1. **Abrir la consola de React Native**
   - Metro bundler: Presiona `j` en la terminal
   - O usa Flipper/React Native Debugger

2. **Ejecutar el comando:**
   ```javascript
   // Obtener el ID del paciente desde los signos vitales
   const pacienteId = signosVitales?.[0]?.id_paciente;
   
   // Importar y ejecutar la prueba
   const { ejecutarPruebaSignosVitales } = require('./src/utils/testVitalSignsData');
   ejecutarPruebaSignosVitales(pacienteId);
   ```

---

## ✅ QUÉ VERIFICAR

### **1. Petición GET Exitosa**
- ✅ Debe mostrar: `✅ Petición exitosa`
- ❌ Si falla, revisa:
  - Conexión a la API
  - Token de autenticación
  - URL del endpoint

### **2. Estructura de Respuesta**
- ✅ Debe mostrar el formato de respuesta (Array directo o Objeto con data)
- ✅ Debe mostrar el total de registros
- ✅ Debe mostrar cuántos registros se recibieron

### **3. Validación de Datos**
- ✅ Registros válidos: Debe ser igual al total (o muy cercano)
- ✅ Con signos vitales: Debe haber al menos algunos registros con datos
- ✅ Con fecha: Todos los registros deben tener fecha

### **4. Campos Disponibles**
- ✅ Debe verificar cada campo de signo vital:
  - `presion_sistolica`: ✅ o ❌
  - `presion_diastolica`: ✅ o ❌
  - `glucosa_mg_dl`: ✅ o ❌
  - `peso_kg`: ✅ o ❌
  - `imc`: ✅ o ❌

### **5. Funciones de Análisis**
- ✅ Para cada tipo de gráfica (presión, glucosa, peso, IMC):
  - Tendencia: Debe calcularse si hay 3+ registros
  - Estadísticas: Debe calcularse si hay 1+ registro
  - Comparación: Debe calcularse si hay datos en ambos períodos

---

## 📊 RESULTADO ESPERADO

### **Ejemplo de Salida Exitosa:**

```
=== PRUEBA 1: VERIFICACIÓN DE DATOS GET ===

Paciente ID: 1
Parámetros: limit=100, offset=0, sort=DESC

1. Realizando petición GET...
✅ Petición exitosa

2. Verificando estructura de respuesta...
   Formato: Objeto con data y total
   Total de registros: 10
   Registros recibidos: 10

3. Verificando estructura de cada signo vital...
   Registros válidos: 10/10
   Registros inválidos: 0/10
   Con signos vitales: 10/10
   Con fecha: 10/10

4. Verificando campos disponibles...
   Campos encontrados en los datos:
   ✅ presion_sistolica: Presente
   ✅ presion_diastolica: Presente
   ✅ glucosa_mg_dl: Presente
   ✅ peso_kg: Presente
   ✅ imc: Presente

5. Probando funciones de análisis...
   ✅ presion - Tendencia: Estable (➡️)
   ✅ presion - Estadísticas: Promedio=125.5, Min=120, Max=130
   ✅ presion - Comparación: Estable (0.5)
   ✅ glucosa - Tendencia: Mejorando (📉)
   ✅ glucosa - Estadísticas: Promedio=110.2, Min=98, Max=125
   ✅ glucosa - Comparación: Mejoró (-5.2)
   ✅ peso - Estadísticas: Promedio=70.5, Min=68, Max=73
   ✅ imc - Estadísticas: Promedio=24.2, Min=22.5, Max=25.8

=== RESUMEN ===
✅ Petición GET: Exitosa
✅ Total de registros: 10
✅ Registros válidos: 10/10
✅ Con signos vitales: 10/10
✅ Con fecha: 10/10

✅ PRUEBA COMPLETADA EXITOSAMENTE
```

---

## ❌ PROBLEMAS COMUNES Y SOLUCIONES

### **1. Error: "La respuesta está vacía o es null"**
- **Causa:** El endpoint no está retornando datos
- **Solución:** 
  - Verificar que el backend esté corriendo
  - Verificar que el paciente tenga signos vitales registrados
  - Verificar la URL del endpoint

### **2. Error: "Formato de respuesta no reconocido"**
- **Causa:** La estructura de la respuesta cambió
- **Solución:**
  - Revisar la respuesta en la consola
  - Actualizar el script de prueba si es necesario

### **3. "Registros inválidos" > 0**
- **Causa:** Algunos registros tienen datos faltantes o inválidos
- **Solución:**
  - Revisar los errores específicos en la consola
  - Verificar que los datos en la base de datos sean válidos

### **4. "No hay datos disponibles" para algún tipo**
- **Causa:** El paciente no tiene registros de ese signo vital
- **Solución:** Es normal, solo significa que no hay datos de ese tipo

### **5. "No hay datos suficientes para comparar períodos"**
- **Causa:** No hay datos en los últimos 60 días o en ambos períodos
- **Solución:** Es normal si el paciente tiene pocos registros recientes

---

## 📝 NOTAS IMPORTANTES

1. **Modo Desarrollo:** El botón de prueba solo aparece en modo desarrollo (`__DEV__ = true`)

2. **Datos Encriptados:** Si los signos vitales están encriptados, deben desencriptarse antes de usar las funciones de análisis

3. **Mínimo de Registros:**
   - Tendencia: Requiere 3+ registros
   - Estadísticas: Requiere 1+ registro
   - Comparación: Requiere datos en ambos períodos (últimos 60 días)

4. **Consola:** Todos los resultados se muestran en la consola, no en la UI

---

## 🎯 CRITERIOS DE ÉXITO

La prueba se considera **exitosa** si:

1. ✅ La petición GET se completa sin errores
2. ✅ Se reciben datos (aunque sean 0, es válido)
3. ✅ Los registros recibidos son válidos (sin errores de estructura)
4. ✅ Al menos algunos registros tienen signos vitales
5. ✅ Las funciones de análisis se ejecutan sin errores (aunque no haya datos suficientes)

---

## 📞 SIGUIENTE PASO

Una vez que la Prueba 1 sea exitosa, proceder con:
- **Prueba 2:** Pruebas en dispositivo físico
- **Prueba 3:** Verificación de visualización de gráficas mejoradas
- **Prueba 4:** Prueba de resumen TTS

---

**¡Listo para ejecutar la prueba!** 🚀
