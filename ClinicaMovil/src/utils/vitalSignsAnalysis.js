/**
 * Utilidades para análisis evolutivo de signos vitales
 * 
 * Funciones para calcular tendencias, estadísticas y comparaciones
 * de signos vitales a lo largo del tiempo.
 */

/**
 * Obtiene el nombre del campo del signo vital según el tipo de gráfica
 */
export const getCampoSignoVital = (tipo) => {
  const campos = {
    presion: 'presion_sistolica',
    glucosa: 'glucosa_mg_dl',
    peso: 'peso_kg',
    imc: 'imc',
  };
  return campos[tipo] || null;
};

/**
 * Obtiene el nombre legible del signo vital
 */
export const getNombreSignoVital = (tipo) => {
  const nombres = {
    presion: 'Presión Arterial',
    glucosa: 'Glucosa',
    peso: 'Peso',
    imc: 'Índice de Masa Corporal',
  };
  return nombres[tipo] || tipo;
};

/**
 * Determina si un valor mayor es mejor para un campo específico
 */
const esMejorValorMayor = (campo) => {
  // Por ahora, todos los signos vitales actuales tienen menor = mejor
  // Excepto saturación (que no está en el modelo actual)
  return false;
};

/**
 * Obtiene el umbral significativo para determinar tendencia
 */
const getUmbralSignificativo = (campo) => {
  const umbrales = {
    presion_sistolica: 0.5, // mmHg por punto
    presion_diastolica: 0.5,
    glucosa_mg_dl: 1.0, // mg/dL por punto
    peso_kg: 0.2, // kg por punto
    imc: 0.1, // IMC por punto
  };
  return umbrales[campo] || 1.0;
};

/**
 * Calcula la tendencia de un signo vital a lo largo del tiempo
 * @param {Array} datos - Array de signos vitales ordenados por fecha (más reciente primero)
 * @param {String} campo - Campo a analizar (ej: 'glucosa_mg_dl')
 * @returns {Object} Análisis de tendencia
 */
export const calcularTendencia = (datos, campo) => {
  if (!datos || datos.length < 3) {
    return {
      tendencia: 'insuficiente',
      mensaje: 'Se necesitan al menos 3 registros para calcular tendencia',
      pendiente: null,
      cambioPromedio: null,
      cambioTotal: null,
      primerValor: null,
      ultimoValor: null,
      puntosAnalizados: datos?.length || 0
    };
  }

  // Filtrar datos válidos y ordenar por fecha (más antiguo primero para cálculo)
  const valoresValidos = datos
    .filter(signo => {
      const valor = signo[campo];
      return valor !== null && valor !== undefined && !isNaN(parseFloat(valor));
    })
    .map((signo) => ({
      valor: parseFloat(signo[campo]),
      fecha: new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion)
    }))
    .sort((a, b) => a.fecha - b.fecha); // Ordenar de más antiguo a más reciente

  if (valoresValidos.length < 3) {
    return {
      tendencia: 'insuficiente',
      mensaje: 'Datos insuficientes para calcular tendencia',
      pendiente: null,
      cambioPromedio: null,
      cambioTotal: null,
      primerValor: null,
      ultimoValor: null,
      puntosAnalizados: valoresValidos.length
    };
  }

  // Calcular pendiente usando regresión lineal simple
  const n = valoresValidos.length;
  const indices = valoresValidos.map((_, i) => i);
  const valores = valoresValidos.map(v => v.valor);
  
  const sumX = indices.reduce((sum, x) => sum + x, 0);
  const sumY = valores.reduce((sum, y) => sum + y, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * valores[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calcular cambio promedio
  const primerValor = valoresValidos[0].valor;
  const ultimoValor = valoresValidos[valoresValidos.length - 1].valor;
  const cambioTotal = ultimoValor - primerValor;
  const diasTranscurridos = (valoresValidos[valoresValidos.length - 1].fecha - valoresValidos[0].fecha) / (1000 * 60 * 60 * 24);
  const cambioPromedio = diasTranscurridos > 0 ? cambioTotal / diasTranscurridos : 0;

  // Determinar tipo de tendencia
  let tendencia = 'estable';
  let mensaje = 'Estable';
  let color = '#FF9800'; // Naranja
  let icono = '➡️';

  // Umbrales para determinar tendencia (ajustables según signo vital)
  const umbralSignificativo = getUmbralSignificativo(campo);
  
  if (Math.abs(pendiente) < umbralSignificativo) {
    tendencia = 'estable';
    mensaje = 'Estable';
    color = '#FF9800';
    icono = '➡️';
  } else if (pendiente > 0) {
    // Tendencia creciente
    if (esMejorValorMayor(campo)) {
      // Para valores donde mayor es mejor (ej: saturación)
      tendencia = 'mejorando';
      mensaje = 'Mejorando';
      color = '#4CAF50';
      icono = '📈';
    } else {
      // Para valores donde menor es mejor (ej: glucosa, presión)
      tendencia = 'empeorando';
      mensaje = 'Aumentando';
      color = '#F44336';
      icono = '📈';
    }
  } else {
    // Tendencia decreciente
    if (esMejorValorMayor(campo)) {
      tendencia = 'empeorando';
      mensaje = 'Disminuyendo';
      color = '#F44336';
      icono = '📉';
    } else {
      tendencia = 'mejorando';
      mensaje = 'Mejorando';
      color = '#4CAF50';
      icono = '📉';
    }
  }

  return {
    tendencia,
    mensaje,
    pendiente: pendiente.toFixed(4),
    cambioPromedio: cambioPromedio.toFixed(2),
    cambioTotal: cambioTotal.toFixed(2),
    primerValor: primerValor.toFixed(2),
    ultimoValor: ultimoValor.toFixed(2),
    color,
    icono,
    puntosAnalizados: valoresValidos.length,
    diasTranscurridos: Math.round(diasTranscurridos)
  };
};

/**
 * Calcula estadísticas descriptivas de un signo vital
 * @param {Array} datos - Array de signos vitales
 * @param {String} campo - Campo a analizar
 * @returns {Object|null} Estadísticas o null si no hay datos
 */
export const calcularEstadisticas = (datos, campo) => {
  if (!datos || datos.length === 0) return null;

  const valores = datos
    .map(s => {
      const valor = s[campo];
      return valor !== null && valor !== undefined ? parseFloat(valor) : null;
    })
    .filter(v => v !== null && !isNaN(v));
  
  if (valores.length === 0) return null;
  
  const suma = valores.reduce((a, b) => a + b, 0);
  const promedio = suma / valores.length;
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  
  // Calcular desviación estándar
  const varianza = valores.reduce((sum, v) => sum + Math.pow(v - promedio, 2), 0) / valores.length;
  const desviacion = Math.sqrt(varianza);
  
  // Calcular coeficiente de variación (variabilidad relativa)
  const coeficienteVariacion = promedio !== 0 ? (desviacion / promedio) * 100 : 0;
  
  // Determinar estabilidad
  let estabilidad = 'estable';
  let colorEstabilidad = '#4CAF50';
  let mensajeEstabilidad = 'Estable';
  
  if (coeficienteVariacion > 20) {
    estabilidad = 'variable';
    colorEstabilidad = '#F44336';
    mensajeEstabilidad = 'Variable';
  } else if (coeficienteVariacion > 10) {
    estabilidad = 'moderada';
    colorEstabilidad = '#FF9800';
    mensajeEstabilidad = 'Moderadamente variable';
  }
  
  return {
    promedio: promedio.toFixed(2),
    minimo: minimo.toFixed(2),
    maximo: maximo.toFixed(2),
    desviacion: desviacion.toFixed(2),
    coeficienteVariacion: coeficienteVariacion.toFixed(1),
    estabilidad,
    colorEstabilidad,
    mensajeEstabilidad,
    totalRegistros: valores.length
  };
};

/**
 * Compara el promedio de un período con el período anterior
 * @param {Array} datos - Array de signos vitales ordenados por fecha (más reciente primero)
 * @param {String} campo - Campo a analizar
 * @param {Number} diasPeriodo - Días del período a comparar (default: 30)
 * @returns {Object|null} Comparación o null si no hay datos suficientes
 */
export const compararPeriodos = (datos, campo, diasPeriodo = 30) => {
  if (!datos || datos.length === 0) return null;

  const ahora = new Date();
  const fechaLimiteActual = new Date(ahora.getTime() - diasPeriodo * 24 * 60 * 60 * 1000);
  const fechaLimiteAnterior = new Date(ahora.getTime() - (diasPeriodo * 2) * 24 * 60 * 60 * 1000);
  
  // Período actual (últimos N días)
  const periodoActual = datos.filter(signo => {
    const fecha = new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion);
    return fecha >= fechaLimiteActual;
  }).map(s => {
    const valor = s[campo];
    return valor !== null && valor !== undefined ? parseFloat(valor) : null;
  }).filter(v => v !== null && !isNaN(v));
  
  // Período anterior (N días antes de eso)
  const periodoAnterior = datos.filter(signo => {
    const fecha = new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion);
    return fecha >= fechaLimiteAnterior && fecha < fechaLimiteActual;
  }).map(s => {
    const valor = s[campo];
    return valor !== null && valor !== undefined ? parseFloat(valor) : null;
  }).filter(v => v !== null && !isNaN(v));
  
  if (periodoActual.length === 0 || periodoAnterior.length === 0) {
    return null;
  }
  
  const promedioActual = periodoActual.reduce((sum, v) => sum + v, 0) / periodoActual.length;
  const promedioAnterior = periodoAnterior.reduce((sum, v) => sum + v, 0) / periodoAnterior.length;
  
  const diferencia = promedioActual - promedioAnterior;
  const porcentaje = promedioAnterior !== 0 ? ((diferencia / promedioAnterior) * 100) : 0;
  
  let estado = 'igual';
  let mensaje = '';
  let color = '#666';
  
  // Umbrales para determinar cambio significativo
  const umbralAbsoluto = getUmbralSignificativo(campo) * 5; // 5 veces el umbral de tendencia
  
  if (Math.abs(diferencia) < umbralAbsoluto) {
    estado = 'igual';
    mensaje = 'Estable';
    color = '#FF9800';
  } else if (diferencia < 0 && !esMejorValorMayor(campo)) {
    estado = 'mejoro';
    mensaje = 'Mejoró';
    color = '#4CAF50';
  } else if (diferencia > 0 && !esMejorValorMayor(campo)) {
    estado = 'empeoro';
    mensaje = 'Aumentó';
    color = '#F44336';
  } else {
    // Para valores donde mayor es mejor
    if (diferencia > 0) {
      estado = 'mejoro';
      mensaje = 'Mejoró';
      color = '#4CAF50';
    } else {
      estado = 'empeoro';
      mensaje = 'Disminuyó';
      color = '#F44336';
    }
  }
  
  return {
    periodoActual: {
      promedio: promedioActual.toFixed(2),
      registros: periodoActual.length
    },
    periodoAnterior: {
      promedio: promedioAnterior.toFixed(2),
      registros: periodoAnterior.length
    },
    diferencia: diferencia.toFixed(2),
    porcentaje: Math.abs(porcentaje).toFixed(1),
    estado,
    mensaje,
    color
  };
};

/**
 * Genera datos para la zona de rango normal en la gráfica
 * @param {Object} rango - Objeto con min y max
 * @param {Number} numPuntos - Número de puntos a generar
 * @returns {Array|null} Datos para VictoryArea o null si no hay rango
 */
export const generarZonaRango = (rango, numPuntos) => {
  if (!rango || rango.min === null || rango.max === null || numPuntos < 2) {
    return null;
  }
  
  const min = parseFloat(rango.min);
  const max = parseFloat(rango.max);
  
  // Validar que min y max sean números válidos
  if (isNaN(min) || !isFinite(min) || isNaN(max) || !isFinite(max)) {
    return null;
  }
  
  // VictoryArea usa y como valor superior y y0 como valor inferior
  return Array.from({ length: numPuntos }, (_, i) => ({
    x: i + 1,
    y: max,  // Valor superior (top)
    y0: min  // Valor inferior (bottom)
  }));
};

/**
 * Genera datos para la línea de tendencia
 * @param {Array} datos - Datos originales con x e y
 * @returns {Array|null} Datos de la línea de tendencia o null si no hay suficientes datos
 */
export const generarLineaTendencia = (datos) => {
  if (!datos || datos.length < 3) return null;

  // Filtrar datos válidos (sin NaN, null, undefined)
  const datosValidos = datos.filter(p => 
    p && 
    typeof p.x === 'number' && !isNaN(p.x) && isFinite(p.x) &&
    typeof p.y === 'number' && !isNaN(p.y) && isFinite(p.y)
  );

  if (datosValidos.length < 3) return null;

  const n = datosValidos.length;
  const sumX = datosValidos.reduce((sum, p) => sum + p.x, 0);
  const sumY = datosValidos.reduce((sum, p) => sum + p.y, 0);
  const sumXY = datosValidos.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = datosValidos.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const denominador = (n * sumX2 - sumX * sumX);
  if (denominador === 0 || !isFinite(denominador)) return null;
  
  const pendiente = (n * sumXY - sumX * sumY) / denominador;
  const intercepto = (sumY - pendiente * sumX) / n;
  
  // Validar que pendiente e intercepto sean números válidos
  if (isNaN(pendiente) || !isFinite(pendiente) || isNaN(intercepto) || !isFinite(intercepto)) {
    return null;
  }
  
  // Generar puntos de la línea de tendencia
  return datosValidos.map(p => {
    const y = pendiente * p.x + intercepto;
    // Validar que el resultado sea un número válido
    if (isNaN(y) || !isFinite(y)) {
      return null;
    }
    return {
      x: p.x,
      y: y
    };
  }).filter(p => p !== null); // Filtrar puntos inválidos
};

/**
 * Genera resumen evolutivo completo para TTS
 * @param {Array} datos - Array de signos vitales
 * @param {String} campo - Campo a analizar
 * @param {String} tipo - Tipo de gráfica (presion, glucosa, peso, imc)
 * @param {Object} rango - Rango normal del signo vital
 * @returns {String} Mensaje completo para TTS
 */
export const generarResumenEvolutivo = (datos, campo, tipo, rango) => {
  if (!datos || datos.length === 0) {
    return `No hay datos disponibles para ${getNombreSignoVital(tipo)}.`;
  }

  const tendencia = calcularTendencia(datos, campo);
  const estadisticas = calcularEstadisticas(datos, campo);
  const comparacion = compararPeriodos(datos, campo);
  
  let mensaje = `Resumen de ${getNombreSignoVital(tipo)}. `;
  
  if (tendencia.tendencia !== 'insuficiente') {
    mensaje += `Tendencia: ${tendencia.mensaje}. `;
    if (tendencia.diasTranscurridos > 0) {
      mensaje += `Cambio promedio: ${tendencia.cambioPromedio} ${rango?.unidad || ''} por día. `;
    }
  }
  
  if (estadisticas) {
    mensaje += `Promedio: ${estadisticas.promedio} ${rango?.unidad || ''}. `;
    mensaje += `Rango: de ${estadisticas.minimo} a ${estadisticas.maximo} ${rango?.unidad || ''}. `;
    mensaje += `Estabilidad: ${estadisticas.mensajeEstabilidad}. `;
  }
  
  if (comparacion) {
    mensaje += `Comparado con el mes anterior: ${comparacion.mensaje}. `;
    mensaje += `Diferencia: ${comparacion.diferencia} ${rango?.unidad || ''}. `;
  }
  
  const ultimoValor = datos[0]?.[campo];
  if (ultimoValor !== null && ultimoValor !== undefined) {
    const valor = parseFloat(ultimoValor);
    if (!isNaN(valor)) {
      mensaje += `Último valor: ${valor.toFixed(2)} ${rango?.unidad || ''}. `;
      if (rango && rango.min !== null && rango.max !== null) {
        if (valor < rango.min) {
          mensaje += 'Valor bajo del rango normal.';
        } else if (valor > rango.max) {
          mensaje += 'Valor alto del rango normal.';
        } else {
          mensaje += 'Valor dentro del rango normal.';
        }
      }
    }
  }
  
  return mensaje;
};
