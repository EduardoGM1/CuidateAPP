/**
 * Componente: Gráfico de Barras Mensual de Signos Vitales
 * 
 * Muestra un gráfico de barras interactivo donde cada barra representa un mes,
 * ordenado de peor a mejor resultado según el consolidado de signos vitales.
 * Al presionar una barra, muestra el desglose detallado de ese mes.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryLabel } from 'victory-native';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  estaFueraDeRango, 
  presionFueraDeRango, 
  glucosaFueraDeRango, 
  imcFueraDeRango,
  colesterolFueraDeRango,
  trigliceridosFueraDeRango
} from '../../utils/vitalSignsRanges';

// Funciones de evaluación removidas - el gráfico ahora es simple sin clasificaciones

/**
 * Agrupa signos vitales por mes
 * @param {Array} signosVitales - Array completo de signos vitales
 * @returns {Object} Objeto con meses como keys y arrays de signos vitales como values
 */
const agruparPorMes = (signosVitales) => {
  if (!signosVitales || signosVitales.length === 0) return {};

  const meses = {};

  signosVitales.forEach(signo => {
    const fecha = new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion);
    if (isNaN(fecha.getTime())) return;

    const mesKey = format(startOfMonth(fecha), 'yyyy-MM');
    
    if (!meses[mesKey]) {
      meses[mesKey] = {
        fecha: startOfMonth(fecha),
        signosVitales: [],
      };
    }
    
    meses[mesKey].signosVitales.push(signo);
  });

  return meses;
};

/**
 * Formatea mes y año en español (abreviado)
 * @param {Date} fecha - Fecha a formatear
 * @returns {string} Mes y año en español (ej: "ene 2026")
 */
const formatearMesCorto = (fecha) => {
  const mesesAbreviados = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];
  const mes = mesesAbreviados[fecha.getMonth()];
  const año = fecha.getFullYear();
  return `${mes} ${año}`;
};

/**
 * Formatea mes y año en español (completo)
 * @param {Date} fecha - Fecha a formatear
 * @returns {string} Mes y año en español (ej: "enero 2026")
 */
const formatearMesCompleto = (fecha) => {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mes = meses[fecha.getMonth()];
  const año = fecha.getFullYear();
  return `${mes} ${año}`;
};

/**
 * Prepara datos para el gráfico de barras
 * @param {Object} mesesAgrupados - Objeto con meses agrupados
 * @returns {Array} Array de objetos { x, y, mes, fecha, signosVitales, totalMediciones }
 */
const prepararDatosGrafico = (mesesAgrupados) => {
  const datos = Object.keys(mesesAgrupados).map(mesKey => {
    const mesData = mesesAgrupados[mesKey];
    const totalMediciones = mesData.signosVitales.length;

    return {
      x: mesKey,
      y: totalMediciones, // Altura de la barra = total de mediciones
      mes: formatearMesCompleto(mesData.fecha), // Mes completo en español
      mesCorto: formatearMesCorto(mesData.fecha), // Mes abreviado en español
      fecha: mesData.fecha,
      signosVitales: mesData.signosVitales,
      totalMediciones: totalMediciones,
    };
  });

  // Ordenar cronológicamente (más antiguo primero)
  return datos.sort((a, b) => {
    return a.fecha - b.fecha; // Orden cronológico ascendente
  });
};

/**
 * Filtra signos vitales según el rango de tiempo seleccionado
 * @param {Array} signosVitales - Array completo de signos vitales
 * @param {string} filtroTiempo - Tipo de filtro ('completo', 'año_actual', 'ultimos_3_meses', 'ultimos_6_meses')
 * @returns {Array} Array de signos vitales filtrados
 */
const filtrarPorRangoTiempo = (signosVitales, filtroTiempo) => {
  if (!signosVitales || signosVitales.length === 0) return [];
  if (filtroTiempo === 'completo') return signosVitales;

  const ahora = new Date();
  let fechaLimite = null;
  let fechaFin = null;

  switch (filtroTiempo) {
    case 'año_actual':
      // Año actual completo (1 de enero a 31 de diciembre)
      fechaLimite = new Date(ahora.getFullYear(), 0, 1); // 1 de enero del año actual
      fechaFin = new Date(ahora.getFullYear(), 11, 31, 23, 59, 59); // 31 de diciembre del año actual
      return signosVitales.filter(signo => {
        const fecha = new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion);
        return !isNaN(fecha.getTime()) && fecha >= fechaLimite && fecha <= fechaFin;
      });
    case 'ultimos_3_meses':
      fechaLimite = new Date(ahora);
      fechaLimite.setMonth(fechaLimite.getMonth() - 3);
      break;
    case 'ultimos_6_meses':
      fechaLimite = new Date(ahora);
      fechaLimite.setMonth(fechaLimite.getMonth() - 6);
      break;
    default:
      return signosVitales;
  }

  if (!fechaLimite) return signosVitales;

  return signosVitales.filter(signo => {
    const fecha = new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion);
    return !isNaN(fecha.getTime()) && fecha >= fechaLimite;
  });
};

const MonthlyVitalSignsBarChart = ({ signosVitales = [], loading = false, filtroTiempo = 'completo', signosVitalesCompletos = null }) => {
  const [mesSeleccionado, setMesSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [diaFiltroSeleccionado, setDiaFiltroSeleccionado] = useState(null); // null = todos los días
  
  // signosVitalesCompletos se usa para la comparativa (siempre desde el inicio)
  // Si no se proporciona, usar signosVitales (que ya puede estar filtrado)
  const signosParaComparativa = signosVitalesCompletos || signosVitales;

  // Detectar cambios en el tamaño de la pantalla
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Calcular dimensiones del gráfico de forma responsive
  const chartWidth = Math.max(280, dimensions.width - 40); // Mínimo 280px, máximo ancho de pantalla - 40px
  const chartHeight = Math.min(350, Math.max(250, dimensions.height * 0.35)); // Entre 250px y 350px, o 35% de altura de pantalla
  
  // Ajustar padding según el tamaño de pantalla
  const isSmallScreen = dimensions.width < 360;
  const chartPadding = isSmallScreen 
    ? { left: 45, top: 15, right: 15, bottom: 70 } 
    : { left: 60, top: 20, right: 20, bottom: 80 };
  
  const domainPaddingX = isSmallScreen ? 15 : 20;

  // Filtrar signos vitales según el rango de tiempo seleccionado
  const signosVitalesFiltrados = useMemo(() => {
    return filtrarPorRangoTiempo(signosVitales, filtroTiempo);
  }, [signosVitales, filtroTiempo]);
  
  // signosParaComparativa no se usa aquí, pero se pasa al componente ComparativaEvolucion
  // que se renderiza en las pantallas padre

  // Procesar datos para el gráfico
  const datosGrafico = useMemo(() => {
    if (!signosVitalesFiltrados || signosVitalesFiltrados.length === 0) return [];

    const mesesAgrupados = agruparPorMes(signosVitalesFiltrados);
    return prepararDatosGrafico(mesesAgrupados);
  }, [signosVitalesFiltrados]);

  // Manejar presión de barra
  const handleBarPress = (datum) => {
    if (!datum || !datum.datum) {
      console.warn('⚠️ handleBarPress: datum o datum.datum es null/undefined', { datum });
      return;
    }
    
    const mesData = datosGrafico.find(d => d.x === datum.datum.x);
    console.log('🔍 handleBarPress Debug:', {
      datumX: datum.datum.x,
      mesDataEncontrado: !!mesData,
      mesData: mesData ? {
        x: mesData.x,
        mes: mesData.mes,
        totalMediciones: mesData.totalMediciones,
        signosVitalesLength: mesData.signosVitales?.length,
        signosVitalesType: Array.isArray(mesData.signosVitales) ? 'array' : typeof mesData.signosVitales,
        primerSigno: mesData.signosVitales?.[0]
      } : null,
      datosGraficoLength: datosGrafico.length,
      datosGraficoXValues: datosGrafico.map(d => d.x)
    });
    
    if (mesData) {
      setMesSeleccionado(mesData);
      setModalVisible(true);
    } else {
      console.error('❌ No se encontró mesData para x:', datum.datum.x);
    }
  };

  // Formatear fecha y hora en español con formato: "1/enero/2026 9:25 AM"
  const formatearFechaHora = (fecha) => {
    try {
      if (!fecha) {
        return { fecha: 'Fecha inválida', hora: '', completa: 'Fecha inválida', encabezado: 'Fecha inválida' };
      }
      
      const date = new Date(fecha);
      if (isNaN(date.getTime())) {
        return { fecha: 'Fecha inválida', hora: '', completa: 'Fecha inválida', encabezado: 'Fecha inválida' };
      }
      
      // Nombres de meses en español
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      const dia = date.getDate();
      const mes = meses[date.getMonth()];
      const año = date.getFullYear();
      
      let horas = date.getHours();
      const minutos = String(date.getMinutes()).padStart(2, '0');
      const ampm = horas >= 12 ? 'PM' : 'AM';
      horas = horas % 12;
      horas = horas ? horas : 12; // 0 debería ser 12
      
      // Formato para el encabezado: "Registro del 1/enero/2026 9:25 AM"
      const encabezado = `Registro del ${dia}/${mes}/${año} ${horas}:${minutos} ${ampm}`;
      
      // Formato para fecha y hora separados (por si se necesita)
      const fechaFormateada = `${dia}/${mes}/${año}`;
      const horaFormateada = `${horas}:${minutos} ${ampm}`;
      
      return {
        fecha: fechaFormateada,
        hora: horaFormateada,
        completa: `${fechaFormateada} ${horaFormateada}`,
        encabezado: encabezado
      };
    } catch (error) {
      console.error('Error formateando fecha:', error, fecha);
      return { fecha: 'Fecha inválida', hora: '', completa: 'Fecha inválida', encabezado: 'Fecha inválida' };
    }
  };

  // Renderizar valores de signos vitales de un registro (TODOS los campos disponibles)
  const renderValoresSignosVitales = (signo) => {
    const valores = [];
    
    // Helper para verificar si un valor existe (incluyendo 0)
    const tieneValor = (valor) => {
      return valor !== null && valor !== undefined && valor !== '';
    };
    
    // Helper para obtener valor numérico
    const obtenerValor = (valor) => {
      if (valor === null || valor === undefined || valor === '') return null;
      const num = parseFloat(valor);
      return isNaN(num) ? null : num;
    };
    
    // Presión arterial (al menos una debe existir)
    if (tieneValor(signo.presion_sistolica) || tieneValor(signo.presion_diastolica)) {
      const sistolica = obtenerValor(signo.presion_sistolica);
      const diastolica = obtenerValor(signo.presion_diastolica);
      const fueraDeRango = presionFueraDeRango(sistolica, diastolica);
      valores.push({
        key: 'presion',
        label: '📊 Presión Arterial:',
        valor: `${sistolica !== null ? sistolica : '--'}/${diastolica !== null ? diastolica : '--'} mmHg`,
        fueraDeRango: fueraDeRango
      });
    }
    
    // Glucosa
    if (tieneValor(signo.glucosa_mg_dl)) {
      const glucosa = obtenerValor(signo.glucosa_mg_dl);
      if (glucosa !== null) {
        const fueraDeRango = glucosaFueraDeRango(glucosa);
        valores.push({
          key: 'glucosa',
          label: '🩸 Glucosa:',
          valor: `${glucosa} mg/dL`,
          fueraDeRango: fueraDeRango
        });
      }
    }
    
    // Peso
    if (tieneValor(signo.peso_kg)) {
      const peso = obtenerValor(signo.peso_kg);
      if (peso !== null) {
        valores.push({
          key: 'peso',
          label: '⚖️ Peso:',
          valor: `${peso} kg`
        });
      }
    }
    
    // Talla
    if (tieneValor(signo.talla_m)) {
      const talla = obtenerValor(signo.talla_m);
      if (talla !== null) {
        valores.push({
          key: 'talla',
          label: '📐 Talla:',
          valor: `${talla} m`
        });
      }
    }
    
    // IMC
    if (tieneValor(signo.imc)) {
      const imc = obtenerValor(signo.imc);
      if (imc !== null) {
        const fueraDeRango = imcFueraDeRango(imc);
        valores.push({
          key: 'imc',
          label: '📏 Índice de Masa Corporal (IMC):',
          valor: `${imc} kg/m²`,
          fueraDeRango: fueraDeRango
        });
      }
    }
    
    // Medida de cintura
    if (tieneValor(signo.medida_cintura_cm)) {
      const cintura = obtenerValor(signo.medida_cintura_cm);
      if (cintura !== null) {
        valores.push({
          key: 'cintura',
          label: '📏 Circunferencia de Cintura:',
          valor: `${cintura} cm`
        });
      }
    }
    
    // Colesterol Total
    if (tieneValor(signo.colesterol_mg_dl)) {
      const colesterol = obtenerValor(signo.colesterol_mg_dl);
      if (colesterol !== null) {
        const fueraDeRango = colesterolFueraDeRango(colesterol);
        valores.push({
          key: 'colesterol',
          label: '🧪 Colesterol Total:',
          valor: `${colesterol} mg/dL`,
          fueraDeRango: fueraDeRango
        });
      }
    }
    
    // Colesterol LDL
    if (tieneValor(signo.colesterol_ldl)) {
      const ldl = obtenerValor(signo.colesterol_ldl);
      if (ldl !== null) {
        valores.push({
          key: 'colesterol_ldl',
          label: '🧪 Colesterol LDL:',
          valor: `${ldl} mg/dL`
        });
      }
    }
    
    // Colesterol HDL
    if (tieneValor(signo.colesterol_hdl)) {
      const hdl = obtenerValor(signo.colesterol_hdl);
      if (hdl !== null) {
        valores.push({
          key: 'colesterol_hdl',
          label: '🧪 Colesterol HDL:',
          valor: `${hdl} mg/dL`
        });
      }
    }
    
    // Triglicéridos
    if (tieneValor(signo.trigliceridos_mg_dl)) {
      const trigliceridos = obtenerValor(signo.trigliceridos_mg_dl);
      if (trigliceridos !== null) {
        const fueraDeRango = trigliceridosFueraDeRango(trigliceridos);
        valores.push({
          key: 'trigliceridos',
          label: '🧪 Triglicéridos:',
          valor: `${trigliceridos} mg/dL`,
          fueraDeRango: fueraDeRango
        });
      }
    }
    
    // HbA1c (Hemoglobina Glicosilada)
    if (tieneValor(signo.hba1c_porcentaje)) {
      const hba1c = obtenerValor(signo.hba1c_porcentaje);
      if (hba1c !== null) {
        valores.push({
          key: 'hba1c',
          label: '🩸 Hemoglobina Glicosilada (HbA1c):',
          valor: `${hba1c}%`
        });
      }
    }
    
    // Temperatura (si existe en el modelo)
    if (tieneValor(signo.temperatura)) {
      const temp = obtenerValor(signo.temperatura);
      if (temp !== null) {
        valores.push({
          key: 'temperatura',
          label: '🌡️ Temperatura:',
          valor: `${temp} °C`
        });
      }
    }
    
    // Frecuencia cardíaca (si existe en el modelo)
    if (tieneValor(signo.frecuencia_cardiaca)) {
      const freq = obtenerValor(signo.frecuencia_cardiaca);
      if (freq !== null) {
        valores.push({
          key: 'frecuencia',
          label: '❤️ Frecuencia Cardíaca:',
          valor: `${freq} bpm`
        });
      }
    }
    
    // Saturación de oxígeno (si existe en el modelo)
    if (tieneValor(signo.saturacion_oxigeno)) {
      const sat = obtenerValor(signo.saturacion_oxigeno);
      if (sat !== null) {
        valores.push({
          key: 'saturacion',
          label: '🫁 Saturación de Oxígeno:',
          valor: `${sat}%`
        });
      }
    }
    
    // Observaciones
    if (tieneValor(signo.observaciones)) {
      valores.push({
        key: 'observaciones',
        label: '📝 Observaciones:',
        valor: signo.observaciones
      });
    }
    
    if (valores.length === 0) {
      // Debug en desarrollo
      if (__DEV__) {
        console.warn('⚠️ Signo vital sin valores detectados:', {
          keys: Object.keys(signo),
          valores: {
            presion_sistolica: signo.presion_sistolica,
            presion_diastolica: signo.presion_diastolica,
            glucosa_mg_dl: signo.glucosa_mg_dl,
            peso_kg: signo.peso_kg,
            imc: signo.imc,
          }
        });
      }
      
      return (
        <View style={styles.sinValoresContainer}>
          <Text style={styles.sinValores}>No hay valores registrados en este momento</Text>
        </View>
      );
    }
    
    return valores.map((item, index) => (
      <View 
        key={item.key} 
        style={[
          styles.valorItem,
          index === valores.length - 1 && styles.valorItemLast
        ]}
      >
        <Text style={styles.valorLabel}>{item.label}</Text>
        <Text style={[
          styles.valorTexto,
          item.fueraDeRango && styles.valorTextoFueraDeRango
        ]}>
          {item.valor}
        </Text>
      </View>
    ));
  };

  // Resetear filtro de día cuando se cierra el modal
  useEffect(() => {
    if (!modalVisible) {
      setDiaFiltroSeleccionado(null);
    }
  }, [modalVisible]);

  // Renderizar desglose del mes
  const renderDesgloseMes = () => {
    if (!mesSeleccionado) return null;

    const { mes, signosVitales: signosMes, totalMediciones } = mesSeleccionado;

    // Debug: Verificar datos
    console.log('🔍 Modal Debug:', {
      mesSeleccionado: !!mesSeleccionado,
      mes,
      totalMediciones,
      signosMesLength: signosMes?.length,
      signosMes: signosMes?.slice(0, 2), // Primeros 2 para debug
    });

    // Validar que signosMes existe y es un array
    if (!signosMes || !Array.isArray(signosMes) || signosMes.length === 0) {
      return (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Desglose: {mes}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <View style={styles.resumenContainer}>
                  <Text style={styles.resumenLabel}>Resumen del mes</Text>
                  <View style={styles.resumenGrid}>
                    <View style={styles.resumenItem}>
                      <Text style={styles.resumenValue}>{totalMediciones || 0}</Text>
                      <Text style={styles.resumenLabelSmall}>Total mediciones</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.sinRegistros}>
                  <Text style={styles.sinRegistrosText}>
                    No hay registros disponibles para este mes
                  </Text>
                  <Text style={[styles.sinRegistrosText, { fontSize: 12, marginTop: 8 }]}>
                    Debug: signosMes es {signosMes ? (Array.isArray(signosMes) ? `array[${signosMes.length}]` : typeof signosMes) : 'null/undefined'}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      );
    }

    // Ordenar registros por fecha y hora (más reciente primero)
    const registrosConFecha = [...signosMes]
      .map(signo => {
        const fechaStr = signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion;
        const fecha = new Date(fechaStr);
        const fechaFormateada = formatearFechaHora(fechaStr);
        
        // Extraer solo la fecha (sin hora) para el filtro
        const fechaSolo = fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        return {
          ...signo,
          fechaOrdenamiento: fecha.getTime(),
          fechaFormateada: fechaFormateada,
          fechaSolo: fechaSolo // Para el filtro de días
        };
      })
      .filter(signo => {
        const isValid = !isNaN(signo.fechaOrdenamiento) && 
                        signo.fechaFormateada && 
                        typeof signo.fechaFormateada === 'object' &&
                        signo.fechaFormateada.encabezado;
        
        if (!isValid) {
          console.warn('⚠️ Registro filtrado (fecha inválida):', {
            fechaOrdenamiento: signo.fechaOrdenamiento,
            fechaFormateada: signo.fechaFormateada,
            fechaOriginal: signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion,
            signoKeys: Object.keys(signo)
          });
        }
        return isValid;
      })
      .sort((a, b) => b.fechaOrdenamiento - a.fechaOrdenamiento); // Más reciente primero

    // Extraer días únicos disponibles en los registros
    const diasSet = new Set();
    registrosConFecha.forEach(registro => {
      if (registro.fechaSolo) {
        diasSet.add(registro.fechaSolo);
      }
    });
    const diasDisponibles = Array.from(diasSet).sort().reverse(); // Más reciente primero

    // Formatear día para mostrar en el filtro
    const formatearDiaFiltro = (fechaStr) => {
      try {
        const fecha = new Date(fechaStr + 'T00:00:00');
        if (isNaN(fecha.getTime())) return fechaStr;
        
        const meses = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        
        const dia = fecha.getDate();
        const mes = meses[fecha.getMonth()];
        const año = fecha.getFullYear();
        
        return `${dia} de ${mes} de ${año}`;
      } catch {
        return fechaStr;
      }
    };

    // Filtrar registros por día seleccionado
    const registrosOrdenados = diaFiltroSeleccionado
      ? registrosConFecha.filter(registro => registro.fechaSolo === diaFiltroSeleccionado)
      : registrosConFecha;

    console.log('📊 Registros ordenados:', registrosOrdenados.length, 'de', signosMes.length, 'totales');
    
    if (registrosOrdenados.length === 0 && signosMes.length > 0) {
      console.error('❌ Todos los registros fueron filtrados. Primer registro:', signosMes[0]);
    }

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Desglose: {mes}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
            >
              <View style={styles.resumenContainer}>
                <Text style={styles.resumenLabel}>Resumen del mes</Text>
                <View style={styles.resumenGrid}>
                  <View style={styles.resumenItem}>
                    <Text style={styles.resumenValue}>{totalMediciones}</Text>
                    <Text style={styles.resumenLabelSmall}>Total mediciones</Text>
                  </View>
                </View>
              </View>

              {/* Filtro de días */}
              {diasDisponibles.length > 1 && (
                <View style={styles.filtroDiasContainer}>
                  <Text style={styles.filtroDiasTitulo}>Filtrar por día:</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={true}
                    style={styles.filtroDiasScroll}
                    contentContainerStyle={styles.filtroDiasContent}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filtroDiaButton,
                        diaFiltroSeleccionado === null && styles.filtroDiaButtonActive
                      ]}
                      onPress={() => setDiaFiltroSeleccionado(null)}
                    >
                      <Text style={[
                        styles.filtroDiaButtonText,
                        diaFiltroSeleccionado === null && styles.filtroDiaButtonTextActive
                      ]}>
                        Todos
                      </Text>
                    </TouchableOpacity>
                    {diasDisponibles.map((dia) => (
                      <TouchableOpacity
                        key={dia}
                        style={[
                          styles.filtroDiaButton,
                          diaFiltroSeleccionado === dia && styles.filtroDiaButtonActive
                        ]}
                        onPress={() => setDiaFiltroSeleccionado(dia)}
                      >
                        <Text style={[
                          styles.filtroDiaButtonText,
                          diaFiltroSeleccionado === dia && styles.filtroDiaButtonTextActive
                        ]}>
                          {formatearDiaFiltro(dia)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Lista de registros ordenados cronológicamente */}
              <View style={styles.registrosContainer}>
                <Text style={styles.registrosTitulo}>
                  Registros ({registrosOrdenados.length})
                  {diaFiltroSeleccionado && ` - ${formatearDiaFiltro(diaFiltroSeleccionado)}`}
                </Text>
                {registrosOrdenados.length > 0 ? (
                  registrosOrdenados.map((signo, idx) => {
                    const fechaHora = signo.fechaFormateada;
                    
                    // Debug: Verificar datos del signo
                    if (__DEV__ && idx === 0) {
                      console.log('🔍 Primer registro renderizado:', {
                        fechaHora,
                        signoKeys: Object.keys(signo),
                        tieneValores: {
                          presion: !!(signo.presion_sistolica || signo.presion_diastolica),
                          glucosa: !!signo.glucosa_mg_dl,
                          peso: !!signo.peso_kg,
                          imc: !!signo.imc,
                        }
                      });
                    }
                    
                    return (
                      <View key={`registro-${idx}-${signo.id_signo_vital || signo.fechaOrdenamiento}`} style={styles.registroCompleto}>
                        <View style={styles.registroHeader}>
                          <Text style={styles.registroHeaderText}>
                            {fechaHora?.encabezado || `Registro del ${fechaHora?.fecha || 'Fecha inválida'} ${fechaHora?.hora || ''}`}
                          </Text>
                        </View>
                        <View style={styles.registroValores}>
                          {renderValoresSignosVitales(signo)}
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.sinRegistros}>
                    <Text style={styles.sinRegistrosText}>
                      No hay registros disponibles para este mes
                    </Text>
                    {__DEV__ && signosMes.length > 0 && (
                      <Text style={[styles.sinRegistrosText, { fontSize: 12, marginTop: 8, color: '#F44336' }]}>
                        ⚠️ {signosMes.length} registros fueron filtrados por fechas inválidas
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Cargando gráfico...</Text>
      </View>
    );
  }

  if (datosGrafico.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay datos suficientes para mostrar el gráfico</Text>
        <Text style={styles.emptySubtext}>
          Se necesitan al menos registros de signos vitales para generar el gráfico mensual
        </Text>
      </View>
    );
  }

  // Color uniforme para todas las barras (azul)
  const getBarColor = () => '#2196F3';

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>
        Evolución Mensual de Signos Vitales
      </Text>
      <Text style={[styles.subtitle, isSmallScreen && styles.subtitleSmall]}>
        Cada barra representa un mes con el total de mediciones registradas (presiona una barra para ver detalles)
      </Text>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.chartScrollContainer}
        style={styles.chartScrollView}
      >
        <View style={[styles.chartContainer, { width: chartWidth }]}>
          <VictoryChart
            width={chartWidth}
            height={chartHeight}
            padding={chartPadding}
            domainPadding={{ x: domainPaddingX }}
          >
          <VictoryAxis
            tickFormat={(t) => {
              const mesData = datosGrafico.find(d => d.x === t);
              return mesData ? mesData.mesCorto : t;
            }}
            style={{
              tickLabels: { 
                fontSize: isSmallScreen ? 9 : 10, 
                angle: -45,
                textAnchor: 'end',
                fill: '#666',
              },
              axis: { stroke: '#ccc' },
            }}
          />
          <VictoryAxis
            dependentAxis
            label="Total de Mediciones"
            style={{
              axisLabel: { padding: isSmallScreen ? 30 : 35, fontSize: isSmallScreen ? 11 : 12, fill: '#666' },
              tickLabels: { fontSize: isSmallScreen ? 9 : 10, fill: '#666' },
              axis: { stroke: '#ccc' },
            }}
          />
          <VictoryBar
            data={datosGrafico}
            x="x"
            y="y"
            style={{
              data: {
                fill: getBarColor(),
                stroke: '#fff',
                strokeWidth: 1,
              },
            }}
            events={[{
              target: "data",
              eventHandlers: {
                onPressIn: (evt, props) => {
                  handleBarPress(props);
                  return [
                    {
                      target: "data",
                      mutation: () => ({
                        style: { fill: '#2196F3', opacity: 0.8 },
                      }),
                    },
                  ];
                },
                onPressOut: () => {
                  return [
                    {
                      target: "data",
                      mutation: () => null,
                    },
                  ];
                },
              },
            }]}
            labels={({ datum }) => `${datum.totalMediciones}`}
            labelComponent={
              <VictoryLabel
                style={{ fontSize: isSmallScreen ? 8 : 9, fill: '#333' }}
                dy={-5}
              />
            }
          />
        </VictoryChart>
        </View>
      </ScrollView>

      {/* Información del gráfico */}
      <View style={styles.infoGrafico}>
        <Text style={styles.infoGraficoText}>
          📊 El gráfico muestra la cantidad de mediciones de signos vitales registradas por mes, ordenadas cronológicamente desde el inicio del tratamiento.
        </Text>
      </View>

      {renderDesgloseMes()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitleSmall: {
    fontSize: 12,
    marginBottom: 15,
  },
  chartScrollView: {
    marginHorizontal: -20, // Compensar padding del contenedor padre
  },
  chartScrollContainer: {
    paddingHorizontal: 20, // Restaurar padding interno
    alignItems: 'center',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 280, // Ancho mínimo para que el gráfico sea legible
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  infoGrafico: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
  },
  infoGraficoText: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end', // Mantener apertura desde abajo
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '98%', // Aumentar altura máxima casi al máximo de la pantalla
    paddingBottom: 20,
    minHeight: 500, // Aumentar altura mínima para mostrar más contenido
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    maxHeight: '100%',
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
    minHeight: 200, // Asegurar altura mínima para el contenido
  },
  resumenContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  resumenLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  resumenGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resumenItem: {
    alignItems: 'center',
  },
  resumenValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  resumenLabelSmall: {
    fontSize: 12,
    color: '#666',
  },
  registrosContainer: {
    marginTop: 8,
  },
  registrosTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  registroCompleto: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  registroHeader: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  registroHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
  registroValores: {
    padding: 16,
  },
  valorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  valorItemLast: {
    borderBottomWidth: 0,
  },
  valorLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  valorTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  valorTextoFueraDeRango: {
    color: '#F44336', // Rojo para valores fuera de rango
  },
  sinValoresContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  sinValores: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sinRegistros: {
    padding: 20,
    alignItems: 'center',
  },
  sinRegistrosText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  // Estilos del filtro de días
  filtroDiasContainer: {
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  filtroDiasTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  filtroDiasScroll: {
    maxHeight: 50,
  },
  filtroDiasContent: {
    paddingRight: 16,
    gap: 8,
  },
  filtroDiaButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  filtroDiaButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filtroDiaButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filtroDiaButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default MonthlyVitalSignsBarChart;
