/**
 * Componente: Heatmap de Comorbilidades por Periodo
 * 
 * Muestra una tabla de calor (heatmap) para visualizar comorbilidades
 * a través de diferentes periodos. Cada celda muestra la frecuencia
 * con un color que indica la intensidad.
 * 
 * @author Senior Developer
 * @date 2025-01-XX
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { COLORES } from '../../utils/constantes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Calcula el color de una celda basado en su valor relativo al máximo (escala IMSS Bienestar)
 * @param {number} value - Valor de la celda
 * @param {number} maxValue - Valor máximo en todo el dataset
 * @returns {string} Color en formato hexadecimal
 */
const getHeatmapColor = (value, maxValue) => {
  if (value === 0) return COLORES.FONDO;
  
  const normalized = value / maxValue;
  // Escala verde IMSS: claro -> oscuro
  if (normalized <= 0.2) return COLORES.BORDE_VERDE_SUAVE;
  if (normalized <= 0.4) return '#7BB5A8';
  if (normalized <= 0.6) return COLORES.IMSS_VERDE_MEDIO;
  if (normalized <= 0.8) return COLORES.PRIMARIO;
  return COLORES.PRIMARIO_DARK;
};

/**
 * Formatea el periodo a etiqueta legible
 * @param {string} periodoKey - Clave del periodo (YYYY-MM, YYYY-S1, YYYY)
 * @returns {string} Etiqueta formateada
 */
const formatearPeriodo = (periodoKey) => {
  // Si es formato YYYY-MM (mensual)
  if (/^\d{4}-\d{2}$/.test(periodoKey)) {
    const [año, mes] = periodoKey.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                   'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${meses[parseInt(mes) - 1]} ${año}`;
  }
  // Si es formato YYYY-S1 o YYYY-S2 (semestral)
  if (/^\d{4}-S[12]$/.test(periodoKey)) {
    const [año, semestre] = periodoKey.split('-S');
    return `${año}-S${semestre}`;
  }
  // Si es solo año (anual)
  if (/^\d{4}$/.test(periodoKey)) {
    return periodoKey;
  }
  return periodoKey;
};

/**
 * Componente Heatmap de Comorbilidades
 * 
 * @param {Array} datosPorPeriodo - Array de objetos con estructura:
 *   [{ periodo: '2024-01', comorbilidades: [{ nombre: 'Diabetes', frecuencia: 15 }] }]
 * @param {string} periodoFiltro - Tipo de periodo ('mensual', 'semestre', 'anual')
 * @param {Function} onCellPress - Callback cuando se presiona una celda (opcional)
 */
const ComorbilidadesHeatmap = ({ 
  datosPorPeriodo = [], 
  periodoFiltro = null,
  onCellPress = null 
}) => {
  const [selectedCell, setSelectedCell] = useState(null);

  // Procesar datos para el heatmap
  const { comorbilidadesLista, periodosOrdenados, maxValue, heatmapData } = useMemo(() => {
    if (!datosPorPeriodo || datosPorPeriodo.length === 0) {
      return {
        comorbilidadesLista: [],
        periodosOrdenados: [],
        maxValue: 1,
        heatmapData: {}
      };
    }

    // Obtener todas las comorbilidades únicas
    const todasComorbilidades = new Set();
    datosPorPeriodo.forEach(periodo => {
      periodo.comorbilidades.forEach(com => todasComorbilidades.add(com.nombre));
    });
    const comorbilidadesLista = Array.from(todasComorbilidades).sort();

    // Ordenar periodos
    const periodosOrdenados = [...datosPorPeriodo].sort((a, b) => {
      if (periodoFiltro === 'mensual') {
        return a.periodo.localeCompare(b.periodo); // Orden cronológico
      }
      return b.periodo.localeCompare(a.periodo); // Más reciente primero
    });

    // Calcular valor máximo para normalización
    let maxValue = 1;
    datosPorPeriodo.forEach(periodo => {
      periodo.comorbilidades.forEach(com => {
        if (com.frecuencia > maxValue) maxValue = com.frecuencia;
      });
    });

    // Construir matriz de datos (comorbilidad x periodo)
    const heatmapData = {};
    comorbilidadesLista.forEach(comorbilidad => {
      heatmapData[comorbilidad] = {};
      periodosOrdenados.forEach(periodo => {
        const comorbilidadData = periodo.comorbilidades.find(c => c.nombre === comorbilidad);
        heatmapData[comorbilidad][periodo.periodo] = comorbilidadData 
          ? comorbilidadData.frecuencia 
          : 0;
      });
    });

    return {
      comorbilidadesLista,
      periodosOrdenados,
      maxValue,
      heatmapData
    };
  }, [datosPorPeriodo, periodoFiltro]);

  // Calcular ancho de celda basado en el número de periodos
  const cellWidth = useMemo(() => {
    const minWidth = 80;
    const maxWidth = 120;
    const availableWidth = SCREEN_WIDTH - 120; // Espacio para label de comorbilidad
    const calculatedWidth = Math.max(
      minWidth,
      Math.min(maxWidth, availableWidth / periodosOrdenados.length)
    );
    return calculatedWidth;
  }, [periodosOrdenados.length]);

  const handleCellPress = (comorbilidad, periodo, frecuencia) => {
    const cellKey = `${comorbilidad}-${periodo}`;
    setSelectedCell(selectedCell === cellKey ? null : cellKey);
    
    if (onCellPress) {
      onCellPress({ comorbilidad, periodo, frecuencia });
    }
  };

  if (comorbilidadesLista.length === 0 || periodosOrdenados.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay datos disponibles</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Leyenda de colores */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendLabel}>Intensidad:</Text>
        <View style={styles.legendColors}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: COLORES.BORDE_VERDE_SUAVE }]} />
            <Text style={styles.legendText}>Bajo</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: COLORES.IMSS_VERDE_MEDIO }]} />
            <Text style={styles.legendText}>Medio</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: COLORES.PRIMARIO_DARK }]} />
            <Text style={styles.legendText}>Alto</Text>
          </View>
        </View>
      </View>

      {/* Tabla Heatmap */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heatmapTable}>
          {/* Header con periodos */}
          <View style={styles.headerRow}>
            <View style={styles.headerCellLabel}>
              <Text style={styles.headerLabelText}>Comorbilidad</Text>
            </View>
            {periodosOrdenados.map((periodo, index) => (
              <View 
                key={index} 
                style={[styles.headerCell, { width: cellWidth }]}
              >
                <Text style={styles.headerCellText} numberOfLines={2}>
                  {formatearPeriodo(periodo.periodo)}
                </Text>
              </View>
            ))}
          </View>

          {/* Filas de datos */}
          {comorbilidadesLista.map((comorbilidad, rowIndex) => (
            <View key={rowIndex} style={styles.dataRow}>
              {/* Label de comorbilidad */}
              <View style={styles.comorbilidadLabel}>
                <Text 
                  style={styles.comorbilidadLabelText} 
                  numberOfLines={2}
                >
                  {comorbilidad}
                </Text>
              </View>

              {/* Celdas de datos */}
              {periodosOrdenados.map((periodo, colIndex) => {
                const frecuencia = heatmapData[comorbilidad][periodo.periodo] || 0;
                const cellKey = `${comorbilidad}-${periodo.periodo}`;
                const isSelected = selectedCell === cellKey;
                const cellColor = getHeatmapColor(frecuencia, maxValue);

                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[
                      styles.dataCell,
                      { 
                        width: cellWidth,
                        backgroundColor: cellColor,
                      },
                      isSelected && styles.dataCellSelected
                    ]}
                    onPress={() => handleCellPress(comorbilidad, periodo.periodo, frecuencia)}
                    activeOpacity={0.7}
                  >
                    <Text 
                      style={[
                        styles.cellValue,
                        frecuencia === 0 && styles.cellValueZero
                      ]}
                    >
                      {frecuencia}
                    </Text>
                    {isSelected && (
                      <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedIndicatorText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Información de celda seleccionada */}
      {selectedCell && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedInfoText}>
            {selectedCell.split('-')[0]} - {formatearPeriodo(selectedCell.split('-').slice(1).join('-'))}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
    flexWrap: 'wrap',
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
    fontWeight: '500',
  },
  legendColors: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: 16,
    height: 16,
    borderRadius: 2,
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  scrollContainer: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingRight: 8,
  },
  heatmapTable: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  headerCellLabel: {
    width: 120,
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  headerLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  headerCell: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    minHeight: 50,
  },
  headerCellText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  comorbilidadLabel: {
    width: 120,
    padding: 12,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  comorbilidadLabelText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  dataCell: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    minHeight: 60,
    position: 'relative',
  },
  dataCellSelected: {
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 4,
    zIndex: 1,
  },
  cellValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  cellValueZero: {
    color: '#999',
    fontWeight: 'normal',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#2196F3',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedInfo: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  selectedInfoText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
});

export default ComorbilidadesHeatmap;
