/**
 * Componente: Tarjeta de Valor
 * 
 * Muestra un valor médico (peso, glucosa, presión, etc.) de forma clara y accesible.
 * Incluye TTS para leer el valor.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';
import { COLORES } from '../../utils/constantes';

/**
 * Tarjeta para mostrar un valor médico
 * @param {Object} props
 * @param {string} props.label - Etiqueta del valor (ej: "Peso")
 * @param {string|number} props.value - Valor a mostrar
 * @param {string} props.unit - Unidad (ej: "kg", "mg/dL")
 * @param {string} props.status - Estado: 'normal', 'warning', 'critical'
 * @param {string} props.color - Color del borde (opcional)
 * @param {Function} props.onPress - Función al presionar (opcional)
 */
const ValueCard = memo(({
  label,
  value,
  unit = '',
  status = 'normal',
  color,
  onPress,
  icon,
}) => {
  const { speak } = useTTS();

  // Colores por estado (paleta IMSS Bienestar)
  const statusColors = {
    normal: { border: COLORES.PRIMARIO, bg: COLORES.FONDO_VERDE_SUAVE, text: COLORES.PRIMARIO },
    warning: { border: COLORES.SECUNDARIO, bg: COLORES.FONDO_ADVERTENCIA_CLARO, text: COLORES.ADVERTENCIA_TEXTO },
    critical: { border: COLORES.ERROR, bg: COLORES.FONDO_ERROR_CLARO, text: COLORES.ERROR },
    empty: { border: COLORES.BORDE_CLARO, bg: COLORES.FONDO, text: COLORES.TEXTO_SECUNDARIO },
  };

  const selectedStatus = statusColors[status] || statusColors.normal;
  const borderColor = color || selectedStatus.border;
  const bgColor = selectedStatus.bg;
  const textColor = selectedStatus.text;

  const handlePress = async () => {
    hapticService.light();
    
    // Pronunciar valor completo
    const fullText = unit 
      ? `${label}: ${value} ${unit}`
      : `${label}: ${value}`;
    await speak(fullText);

    if (onPress) {
      onPress();
    }
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[
        styles.card,
        {
          borderColor,
          backgroundColor: bgColor,
        },
      ]}
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`${label}: ${value} ${unit}`}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: textColor }]}>
          {value}
        </Text>
        {unit && (
          <Text style={[styles.unit, { color: textColor }]}>
            {unit}
          </Text>
        )}
      </View>
    </Component>
  );
});

ValueCard.displayName = 'ValueCard';

const styles = StyleSheet.create({
  card: {
    width: '100%', // Ocupa todo el ancho del contenedor gridItem
    minHeight: 100,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  icon: {
    fontSize: 32,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  unit: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default ValueCard;


