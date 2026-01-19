# Alternativas al Score Numérico en Gráficos de Evolución

## 📊 Análisis del Problema Actual

Actualmente se usa un **score numérico (0-100)** para ordenar las barras del gráfico, donde:
- Score alto (≥50) = Peor estado de salud (Rojo)
- Score medio (25-49) = Estado regular (Naranja)
- Score bajo (<25) = Buen estado (Verde)

**Problemas del score:**
- No es intuitivo para el usuario
- No explica qué significa el número
- Puede ser confuso (¿es bueno o malo un score de 30?)

---

## ✅ Alternativas Propuestas

### **Opción 1: Estado de Salud Textual** ⭐ (Recomendada)
**Descripción:** Reemplazar el score por categorías de estado de salud claras y comprensibles.

**Categorías:**
- 🟢 **"Excelente"** - Todos los valores en rango normal
- 🟡 **"Bueno"** - Mayoría de valores normales, algunas variaciones menores
- 🟠 **"Requiere atención"** - Algunos valores fuera de rango
- 🔴 **"Atención urgente"** - Múltiples valores críticos

**Ventajas:**
- ✅ Muy intuitivo y fácil de entender
- ✅ No requiere interpretación numérica
- ✅ Más preciso (indica el estado real)
- ✅ Accesible para todos los niveles de educación

**Desventajas:**
- ⚠️ Requiere definir umbrales claros para cada categoría

---

### **Opción 2: Número de Alertas**
**Descripción:** Mostrar cuántos signos vitales están fuera de rango normal.

**Categorías:**
- 🟢 **"Sin alertas"** - 0 valores fuera de rango
- 🟡 **"1-2 alertas"** - 1 o 2 valores fuera de rango
- 🟠 **"3-4 alertas"** - 3 o 4 valores fuera de rango
- 🔴 **"5+ alertas"** - 5 o más valores fuera de rango

**Ventajas:**
- ✅ Muy específico (indica exactamente cuántos problemas hay)
- ✅ Fácil de entender
- ✅ Accionable (sabes qué revisar)

**Desventajas:**
- ⚠️ No considera la gravedad de cada alerta

---

### **Opción 3: Porcentaje de Valores Normales**
**Descripción:** Mostrar qué porcentaje de los signos vitales están en rango normal.

**Categorías:**
- 🟢 **"100% normal"** - Todos los valores normales
- 🟡 **"75-99% normal"** - Mayoría normal
- 🟠 **"50-74% normal"** - Mitad normal
- 🔴 **"<50% normal"** - Menos de la mitad normal

**Ventajas:**
- ✅ Fácil de entender (porcentaje es universal)
- ✅ Da una idea de la proporción de valores normales

**Desventajas:**
- ⚠️ Puede ser confuso si hay pocos registros

---

### **Opción 4: Nivel de Riesgo**
**Descripción:** Clasificar según el nivel de riesgo para la salud.

**Categorías:**
- 🟢 **"Riesgo bajo"** - Valores normales, sin preocupaciones
- 🟡 **"Riesgo moderado"** - Algunos valores fuera de rango, monitoreo recomendado
- 🟠 **"Riesgo alto"** - Múltiples valores fuera de rango, requiere atención médica
- 🔴 **"Riesgo crítico"** - Valores muy fuera de rango, atención urgente

**Ventajas:**
- ✅ Enfocado en la acción (qué hacer)
- ✅ Familiar para personal médico
- ✅ Claro sobre la urgencia

**Desventajas:**
- ⚠️ Puede generar ansiedad si se usa "crítico" frecuentemente

---

### **Opción 5: Combinación: Estado + Número de Alertas**
**Descripción:** Combinar estado textual con número específico de alertas.

**Ejemplos:**
- 🟢 **"Excelente (0 alertas)"**
- 🟡 **"Bueno (1 alerta)"**
- 🟠 **"Requiere atención (3 alertas)"**
- 🔴 **"Atención urgente (5 alertas)"**

**Ventajas:**
- ✅ Combina simplicidad con precisión
- ✅ Da contexto completo
- ✅ Más informativo

**Desventajas:**
- ⚠️ Puede ser más largo en pantallas pequeñas

---

## 🎯 Recomendación

**Opción 1: Estado de Salud Textual** es la más recomendada porque:
1. Es la más simple y clara
2. No requiere conocimientos médicos para entender
3. Es accesible para pacientes de todas las edades y niveles educativos
4. Se puede combinar con colores para reforzar el mensaje

**Implementación sugerida:**
- Reemplazar el score numérico por categorías textuales
- Mantener los colores (verde, amarillo, naranja, rojo)
- Ordenar las barras de peor a mejor estado (igual que ahora)
- Mostrar el estado en la leyenda y en el modal de desglose

---

## 📝 Ejemplo de Implementación

```javascript
const calcularEstadoSalud = (signosVitalesMes) => {
  // Contar valores fuera de rango
  let alertas = 0;
  let alertasCriticas = 0;
  
  signosVitalesMes.forEach(signo => {
    // Evaluar cada signo vital
    if (presionFueraDeRango) alertas++;
    if (glucosaFueraDeRango) alertas++;
    if (imcFueraDeRango) alertas++;
    // ... etc
  });
  
  // Determinar estado
  if (alertasCriticas >= 2) return { estado: 'Atención urgente', color: '#F44336', orden: 4 };
  if (alertas >= 3) return { estado: 'Requiere atención', color: '#FF9800', orden: 3 };
  if (alertas >= 1) return { estado: 'Bueno', color: '#FFC107', orden: 2 };
  return { estado: 'Excelente', color: '#4CAF50', orden: 1 };
};
```
