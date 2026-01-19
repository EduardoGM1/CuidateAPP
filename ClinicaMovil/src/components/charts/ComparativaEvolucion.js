/**
 * Componente: Comparativa de Evolución de Signos Vitales
 * 
 * Muestra una comparativa textual clara entre el primer y último registro
 * de signos vitales del paciente para entender su evolución.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Formatea un valor de signo vital para mostrar
 */
const formatearValor = (valor, unidad = '') => {
  if (valor === null || valor === undefined || valor === '') return 'No registrado';
  const num = parseFloat(valor);
  if (isNaN(num)) return 'No registrado';
  return `${num}${unidad ? ` ${unidad}` : ''}`;
};

/**
 * Formatea presión arterial
 */
const formatearPresion = (sistolica, diastolica) => {
  const sist = formatearValor(sistolica);
  const diast = formatearValor(diastolica);
  
  if (sist === 'No registrado' && diast === 'No registrado') return 'No registrado';
  if (sist === 'No registrado') return `--/${diast} mmHg`;
  if (diast === 'No registrado') return `${sist}/-- mmHg`;
  return `${sist}/${diast} mmHg`;
};

/**
 * Comparativa de Evolución de Signos Vitales
 */
const ComparativaEvolucion = ({ signosVitales = [] }) => {
  if (!signosVitales || signosVitales.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sinDatos}>
          No hay registros de signos vitales disponibles para comparar
        </Text>
      </View>
    );
  }

  // Ordenar por fecha (más antiguo primero)
  const signosOrdenados = [...signosVitales].sort((a, b) => {
    const fechaA = new Date(a.fecha_medicion || a.fecha_registro || a.fecha_creacion);
    const fechaB = new Date(b.fecha_medicion || b.fecha_registro || b.fecha_creacion);
    return fechaA - fechaB;
  });

  const primerRegistro = signosOrdenados[0];
  const ultimoRegistro = signosOrdenados[signosOrdenados.length - 1];

  if (!primerRegistro || !ultimoRegistro) {
    return (
      <View style={styles.container}>
        <Text style={styles.sinDatos}>
          No se pudo obtener la información de evolución
        </Text>
      </View>
    );
  }

  // Formatear fechas
  const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no disponible';
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      const dia = date.getDate();
      const mes = meses[date.getMonth()];
      const año = date.getFullYear();
      
      return `${dia} de ${mes} de ${año}`;
    } catch {
      return 'Fecha inválida';
    }
  };

  const fechaPrimerRegistro = formatearFecha(
    primerRegistro.fecha_medicion || primerRegistro.fecha_registro || primerRegistro.fecha_creacion
  );
  const fechaUltimoRegistro = formatearFecha(
    ultimoRegistro.fecha_medicion || ultimoRegistro.fecha_registro || ultimoRegistro.fecha_creacion
  );

  // Renderizar un signo vital en la comparativa
  const renderSignoVital = (label, primerValor, ultimoValor, formateador = formatearValor) => {
    const valorPrimero = formateador(primerValor);
    const valorUltimo = formateador(ultimoValor);
    
    // Si ambos son "No registrado", no mostrar
    if (valorPrimero === 'No registrado' && valorUltimo === 'No registrado') {
      return null;
    }

    return (
      <View key={label} style={styles.signoVitalRow}>
        <Text style={styles.signoVitalLabel}>{label}</Text>
        <View style={styles.valoresContainer}>
          <View style={styles.valorItem}>
            <Text style={styles.valorFecha}>Inicio</Text>
            <Text style={styles.valorTexto}>{valorPrimero}</Text>
          </View>
          <View style={styles.flechaContainer}>
            <Text style={styles.flecha}>→</Text>
          </View>
          <View style={styles.valorItem}>
            <Text style={styles.valorFecha}>Actual</Text>
            <Text style={styles.valorTexto}>{valorUltimo}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>📊 Comparativa de Evolución</Text>
      <Text style={styles.subtitulo}>
        Desde el primer registro ({fechaPrimerRegistro}) hasta el último ({fechaUltimoRegistro})
      </Text>

      <View style={styles.comparativaContainer}>
        {/* Presión Arterial */}
        {renderSignoVital(
          '📊 Presión Arterial',
          { sistolica: primerRegistro.presion_sistolica, diastolica: primerRegistro.presion_diastolica },
          { sistolica: ultimoRegistro.presion_sistolica, diastolica: ultimoRegistro.presion_diastolica },
          (valor) => {
            if (typeof valor === 'object' && valor.sistolica !== undefined) {
              return formatearPresion(valor.sistolica, valor.diastolica);
            }
            return formatearValor(valor);
          }
        )}

        {/* Glucosa */}
        {renderSignoVital(
          '🩸 Glucosa',
          primerRegistro.glucosa_mg_dl,
          ultimoRegistro.glucosa_mg_dl,
          (valor) => formatearValor(valor, 'mg/dL')
        )}

        {/* Peso */}
        {renderSignoVital(
          '⚖️ Peso',
          primerRegistro.peso_kg,
          ultimoRegistro.peso_kg,
          (valor) => formatearValor(valor, 'kg')
        )}

        {/* IMC */}
        {renderSignoVital(
          '📏 Índice de Masa Corporal (IMC)',
          primerRegistro.imc,
          ultimoRegistro.imc,
          (valor) => formatearValor(valor, 'kg/m²')
        )}

        {/* Talla */}
        {renderSignoVital(
          '📐 Talla',
          primerRegistro.talla_m,
          ultimoRegistro.talla_m,
          (valor) => formatearValor(valor, 'm')
        )}

        {/* Circunferencia de Cintura */}
        {renderSignoVital(
          '📏 Circunferencia de Cintura',
          primerRegistro.medida_cintura_cm,
          ultimoRegistro.medida_cintura_cm,
          (valor) => formatearValor(valor, 'cm')
        )}

        {/* Colesterol Total */}
        {renderSignoVital(
          '🧪 Colesterol Total',
          primerRegistro.colesterol_mg_dl,
          ultimoRegistro.colesterol_mg_dl,
          (valor) => formatearValor(valor, 'mg/dL')
        )}

        {/* Colesterol LDL */}
        {renderSignoVital(
          '🧪 Colesterol LDL',
          primerRegistro.colesterol_ldl,
          ultimoRegistro.colesterol_ldl,
          (valor) => formatearValor(valor, 'mg/dL')
        )}

        {/* Colesterol HDL */}
        {renderSignoVital(
          '🧪 Colesterol HDL',
          primerRegistro.colesterol_hdl,
          ultimoRegistro.colesterol_hdl,
          (valor) => formatearValor(valor, 'mg/dL')
        )}

        {/* Triglicéridos */}
        {renderSignoVital(
          '🧪 Triglicéridos',
          primerRegistro.trigliceridos_mg_dl,
          ultimoRegistro.trigliceridos_mg_dl,
          (valor) => formatearValor(valor, 'mg/dL')
        )}

        {/* HbA1c */}
        {renderSignoVital(
          '🩸 Hemoglobina Glicosilada (HbA1c)',
          primerRegistro.hba1c_porcentaje,
          ultimoRegistro.hba1c_porcentaje,
          (valor) => formatearValor(valor, '%')
        )}

        {/* Temperatura */}
        {renderSignoVital(
          '🌡️ Temperatura',
          primerRegistro.temperatura,
          ultimoRegistro.temperatura,
          (valor) => formatearValor(valor, '°C')
        )}

        {/* Frecuencia Cardíaca */}
        {renderSignoVital(
          '❤️ Frecuencia Cardíaca',
          primerRegistro.frecuencia_cardiaca,
          ultimoRegistro.frecuencia_cardiaca,
          (valor) => formatearValor(valor, 'bpm')
        )}

        {/* Saturación de Oxígeno */}
        {renderSignoVital(
          '🫁 Saturación de Oxígeno',
          primerRegistro.saturacion_oxigeno,
          ultimoRegistro.saturacion_oxigeno,
          (valor) => formatearValor(valor, '%')
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  comparativaContainer: {
    gap: 16,
  },
  signoVitalRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  signoVitalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  valoresContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  valorItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 100,
  },
  valorFecha: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  valorTexto: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  flechaContainer: {
    paddingHorizontal: 12,
  },
  flecha: {
    fontSize: 20,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  sinDatos: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});

export default ComparativaEvolucion;
