/**
 * Componente: Tarjeta de Medicamento
 * 
 * Muestra información de un medicamento con horario y estado (tomado/pendiente).
 * Accesible con TTS y feedback visual.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';

/**
 * Tarjeta de medicamento
 * @param {Object} props
 * @param {string} props.nombre - Nombre del medicamento
 * @param {string} props.dosis - Dosis (ej: "500mg")
 * @param {string} props.horario - Horario (ej: "08:00")
 * @param {boolean} props.tomado - Si ya fue tomado
 * @param {Function} props.onPress - Función al presionar "Tomé este medicamento"
 */
const MedicationCard = memo(({
  nombre,
  dosis,
  horario,
  horarios, // Nuevo prop para múltiples horarios
  tomado = false,
  onPress,
  frecuencia,
}) => {
  const { speak, speakTime } = useTTS();

  // Obtener horarios: usar array o fallback a horario único
  // Manejar caso donde horarios puede no existir (compatibilidad)
  let horariosArray = [];
  if (horarios !== undefined && horarios !== null && Array.isArray(horarios) && horarios.length > 0) {
    horariosArray = horarios;
  } else if (horario) {
    horariosArray = [horario];
  }

  const handlePress = async () => {
    hapticService.medium();
    
    if (tomado) {
      const horariosTexto = horariosArray.length > 1 
        ? `a las ${horariosArray.join(', ')}`
        : `a las ${horario}`;
      await speak(`Ya tomaste ${nombre} ${horariosTexto}`);
      audioFeedbackService.playSuccess();
    } else {
      await speak(`Debes tomar ${nombre} ahora. ${dosis}`);
      if (onPress) {
        onPress();
      }
    }
  };

  const handleLongPress = async () => {
    hapticService.heavy();
    
    const horariosTexto = horariosArray.length > 1 
      ? `Horarios: ${horariosArray.join(', ')}`
      : `Horario: ${horario}`;
    const fullText = `${nombre}. ${dosis}. ${horariosTexto}${frecuencia ? `. ${frecuencia}` : ''}. ${tomado ? 'Ya tomado' : 'Pendiente'}`;
    await speak(fullText);
  };

  // Formatear horario para mostrar
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes || '00'} ${period}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        tomado && styles.cardTaken,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}. ${dosis}. ${horariosArray.length > 1 ? `Horarios ${horariosArray.map(h => formatTime(h)).join(', ')}` : `Horario ${formatTime(horario)}`}. ${tomado ? 'Ya tomado' : 'Pendiente'}`}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>💊</Text>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, tomado ? styles.taken : styles.pending]} />
          <Text style={[styles.statusText, tomado && styles.takenText]}>
            {tomado ? '✅ Tomado' : '⏰ Pendiente'}
          </Text>
        </View>
      </View>

      <Text style={styles.nombre}>{nombre}</Text>
      <Text style={styles.dosis}>{dosis}</Text>

      <View style={styles.horarioContainer}>
        <Text style={styles.horarioLabel}>
          {horariosArray.length > 1 ? 'Horarios:' : 'Horario:'}
        </Text>
        <Text style={styles.horario}>
          {horariosArray.length > 1 
            ? horariosArray.map(h => formatTime(h)).join(', ')
            : formatTime(horario)}
        </Text>
      </View>

      {frecuencia && (
        <Text style={styles.frecuencia}>{frecuencia}</Text>
      )}

      {!tomado && onPress && (
        <TouchableOpacity
          style={styles.button}
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Tomé este medicamento</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

MedicationCard.displayName = 'MedicationCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 2,
    borderColor: '#FF9800',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardTaken: {
    borderColor: '#4CAF50',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 40,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  taken: {
    backgroundColor: '#4CAF50',
  },
  pending: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
  },
  takenText: {
    color: '#4CAF50',
  },
  nombre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
  },
  dosis: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  horarioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  horarioLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  horario: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  frecuencia: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicationCard;




