# 📋 Guía para Probar los Filtros por Periodo de Comorbilidades

## 🎯 Objetivo
Verificar que los filtros por periodo (trimestre, semestre, anual) funcionen correctamente y muestren la comparación de comorbilidades agrupadas por periodos.

---

## 📝 Paso 1: Preparar Datos de Prueba

### Opción A: Actualizar fechas existentes (Recomendado)
Si ya tienes pacientes con comorbilidades, ejecuta este script para distribuir las fechas en diferentes periodos:

```bash
cd api-clinica
node scripts/actualizar-fechas-deteccion-periodos.js
```

Este script:
- ✅ Actualiza las fechas de detección de todas las comorbilidades existentes
- ✅ Distribuye las fechas en los últimos 2 años
- ✅ Crea datos en diferentes trimestres, semestres y años

### Opción B: Crear nuevos pacientes con fechas distribuidas
Si prefieres crear nuevos datos, puedes modificar el script `crear-pacientes-prueba-comorbilidades.js` para asignar fechas aleatorias en diferentes periodos.

---

## 🔐 Paso 2: Iniciar Sesión como Doctor

1. **Abre la aplicación móvil**
2. **Inicia sesión con:**
   - Email: `Doctor@clinica.com`
   - Password: `Doctor123!`

3. **Navega a:** "Reportes y Estadísticas" (pestaña de Reportes)

---

## 🧪 Paso 3: Probar Filtros

### Prueba 1: Sin Filtros (Vista Normal)
1. **Verifica que se muestre:**
   - ✅ Gráfico "Comorbilidades Más Frecuentes"
   - ✅ Lista de comorbilidades con barras horizontales
   - ✅ Botón de filtro (🔍) en la esquina superior derecha del card

2. **Observa:**
   - Las comorbilidades están ordenadas de mayor a menor frecuencia
   - Cada barra muestra el nombre y la cantidad de pacientes

---

### Prueba 2: Filtro por Estado
1. **Presiona el botón de filtro (🔍)**
2. **Selecciona un estado** (ej: "Tabasco")
3. **Presiona "Aplicar"**
4. **Verifica:**
   - ✅ El título del gráfico cambia a "Comorbilidades Más Frecuentes - Tabasco"
   - ✅ El badge del botón muestra "1" (1 filtro activo)
   - ✅ Solo se muestran comorbilidades de pacientes de ese estado
   - ✅ Los números son menores o iguales a los totales

---

### Prueba 3: Filtro por Periodo (Trimestral)
1. **Presiona el botón de filtro (🔍)**
2. **En "Agrupar por Periodo:", presiona "Trimestral"**
   - El botón se pondrá azul cuando esté seleccionado
3. **Presiona "Aplicar"**
4. **Verifica:**
   - ✅ El gráfico cambia a mostrar periodos (ej: "2024-Q4", "2024-Q3", etc.)
   - ✅ Cada periodo muestra sus comorbilidades agrupadas
   - ✅ El título incluye "(Trimestral)"
   - ✅ El badge del botón muestra "1" (1 filtro activo)
   - ✅ Las barras están agrupadas por periodo
   - ✅ Cada comorbilidad tiene un color diferente

---

### Prueba 4: Filtro por Periodo (Semestral)
1. **Presiona el botón de filtro (🔍)**
2. **En "Agrupar por Periodo:", presiona "Semestral"**
3. **Presiona "Aplicar"**
4. **Verifica:**
   - ✅ El gráfico muestra periodos semestrales (ej: "2024-S2", "2024-S1", etc.)
   - ✅ El título incluye "(Semestral)"
   - ✅ Los datos están agrupados por semestre

---

### Prueba 5: Filtro por Periodo (Anual)
1. **Presiona el botón de filtro (🔍)**
2. **En "Agrupar por Periodo:", presiona "Anual"**
3. **Presiona "Aplicar"**
4. **Verifica:**
   - ✅ El gráfico muestra años (ej: "2024", "2023", etc.)
   - ✅ El título incluye "(Anual)"
   - ✅ Los datos están agrupados por año

---

### Prueba 6: Filtros Combinados (Estado + Periodo)
1. **Presiona el botón de filtro (🔍)**
2. **Selecciona un estado** (ej: "Tabasco")
3. **Selecciona un periodo** (ej: "Trimestral")
4. **Presiona "Aplicar"**
5. **Verifica:**
   - ✅ El título muestra: "Comorbilidades Más Frecuentes - Tabasco (Trimestral)"
   - ✅ El badge del botón muestra "2" (2 filtros activos)
   - ✅ Solo se muestran comorbilidades de pacientes de ese estado
   - ✅ Los datos están agrupados por trimestre
   - ✅ Puedes comparar el crecimiento entre trimestres

---

### Prueba 7: Limpiar Filtros
1. **Presiona el botón de filtro (🔍)**
2. **Presiona "Limpiar"**
3. **Verifica:**
   - ✅ El modal se cierra
   - ✅ El gráfico vuelve a la vista normal (sin filtros)
   - ✅ El badge del botón desaparece
   - ✅ Se muestran todas las comorbilidades sin filtros

---

### Prueba 8: Cerrar Modal Sin Aplicar
1. **Presiona el botón de filtro (🔍)**
2. **Selecciona un estado y periodo**
3. **Cierra el modal** (botón X o fuera del modal)
4. **Verifica:**
   - ✅ Los filtros NO se aplican
   - ✅ El gráfico permanece igual
   - ✅ Los filtros temporales se descartan

---

## ✅ Checklist de Verificación

### Funcionalidad Básica
- [ ] El botón de filtro aparece en el card de comorbilidades
- [ ] El modal se abre correctamente
- [ ] El selector de estado funciona
- [ ] El selector de periodo funciona (3 opciones)
- [ ] Los botones "Aplicar" y "Limpiar" funcionan
- [ ] El botón X cierra el modal sin aplicar cambios

### Filtro por Estado
- [ ] Al aplicar filtro de estado, el gráfico se actualiza
- [ ] El título muestra el estado seleccionado
- [ ] Los datos se filtran correctamente
- [ ] El badge muestra "1" cuando hay un filtro activo

### Filtro por Periodo
- [ ] Al seleccionar "Trimestral", se muestran periodos Q1, Q2, Q3, Q4
- [ ] Al seleccionar "Semestral", se muestran periodos S1, S2
- [ ] Al seleccionar "Anual", se muestran años
- [ ] Cada periodo muestra sus comorbilidades
- [ ] Las comorbilidades tienen colores diferentes
- [ ] El título incluye el tipo de periodo

### Filtros Combinados
- [ ] Estado + Periodo funcionan juntos
- [ ] El badge muestra "2" cuando hay dos filtros activos
- [ ] El título muestra ambos filtros
- [ ] Los datos se filtran y agrupan correctamente

### Casos Especiales
- [ ] Si no hay datos para un periodo, no se muestra
- [ ] Si no hay datos con fecha_deteccion, muestra mensaje apropiado
- [ ] El gráfico se actualiza al cambiar filtros
- [ ] No hay errores en la consola

---

## 🐛 Solución de Problemas

### Problema: "No hay datos disponibles"
**Causa:** No hay comorbilidades con `fecha_deteccion` asignada
**Solución:** Ejecuta el script `actualizar-fechas-deteccion-periodos.js`

### Problema: Todos los periodos muestran los mismos datos
**Causa:** Todas las fechas están en el mismo periodo
**Solución:** Ejecuta el script para distribuir las fechas

### Problema: El gráfico no cambia al aplicar filtros
**Causa:** Error en la actualización de datos
**Solución:** 
1. Verifica la consola del servidor para errores
2. Refresca la pantalla (pull to refresh)
3. Verifica que el backend esté corriendo

### Problema: El badge muestra número incorrecto
**Causa:** Error en el cálculo de filtros activos
**Solución:** Verifica que ambos estados (`estadoFiltro` y `periodoFiltro`) se actualicen correctamente

---

## 📊 Datos Esperados

Después de ejecutar el script de actualización de fechas, deberías ver:

- **Periodos disponibles:**
  - Año actual: Q1, Q2, Q3, Q4 (si estamos en Q4)
  - Año anterior: Q1, Q2, Q3, Q4

- **Comorbilidades distribuidas:**
  - Diferentes comorbilidades en diferentes periodos
  - Algunas comorbilidades pueden aparecer en múltiples periodos
  - Los números deberían variar entre periodos

---

## 🎯 Resultado Esperado

Al finalizar todas las pruebas, deberías poder:
1. ✅ Ver comorbilidades sin filtros
2. ✅ Filtrar por estado
3. ✅ Agrupar por trimestre, semestre o año
4. ✅ Combinar ambos filtros
5. ✅ Comparar el crecimiento de comorbilidades entre periodos
6. ✅ Limpiar filtros y volver a la vista normal

---

## 📝 Notas Importantes

- **Los datos se basan en `fecha_deteccion`:** Solo se cuentan pacientes donde la comorbilidad tiene una fecha de detección válida
- **Solo periodos con datos:** Si un periodo no tiene comorbilidades detectadas, no aparecerá en el gráfico
- **Filtro de doctor:** Todos los datos están filtrados automáticamente por el doctor que inició sesión
- **Actualización en tiempo real:** Los datos se actualizan automáticamente al aplicar filtros

