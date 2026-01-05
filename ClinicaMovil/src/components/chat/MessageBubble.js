/**
 * Componente reutilizable para renderizar mensajes del chat
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import VoicePlayer from './VoicePlayer';
import chatService from '../../api/chatService';
import { obtenerEstadoMensaje, obtenerIconoEstado, obtenerColorEstado, formatearFechaMensaje } from '../../utils/chatUtils';

/**
 * MessageBubble - Componente para renderizar un mensaje individual
 * @param {Object} props
 * @param {Object} props.mensaje - Objeto del mensaje
 * @param {string} props.remitenteActual - 'Paciente' o 'Doctor' (quien está viendo el chat)
 * @param {Function} props.onPress - Callback cuando se presiona el mensaje
 * @param {Function} props.onLongPressStart - Callback cuando se inicia long press
 * @param {Function} props.onLongPressEnd - Callback cuando se termina long press
 * @param {number} props.fontSize - Tamaño de fuente (opcional, solo para pacientes)
 * @param {Object} props.style - Estilos adicionales
 */
const MessageBubble = memo(({
  mensaje,
  remitenteActual,
  onPress,
  onLongPressStart,
  onLongPressEnd,
  fontSize,
  style,
}) => {
  const esRemitente = mensaje.remitente === remitenteActual;
  const estado = obtenerEstadoMensaje(mensaje);
  const estadoIcono = obtenerIconoEstado(estado);
  const estadoColor = obtenerColorEstado(estado);

  return (
    <TouchableOpacity
      style={[
        styles.mensajeBubble,
        esRemitente ? styles.mensajeRemitente : styles.mensajeOtro,
        style // Estilos adicionales del componente padre (colores de fondo)
      ]}
      onPress={onPress}
      onPressIn={() => onLongPressStart?.(mensaje)}
      onPressOut={onLongPressEnd}
    >
      {mensaje.mensaje_texto ? (
        <Text style={[
          styles.mensajeTexto,
          esRemitente && styles.mensajeTextoRemitente,
          fontSize && { fontSize }
        ]}>
          {typeof mensaje.mensaje_texto === 'string' ? mensaje.mensaje_texto : String(mensaje.mensaje_texto || '')}
        </Text>
      ) : mensaje.mensaje_audio_url ? (
        <VoicePlayer
          audioUrl={mensaje.mensaje_audio_url}
          duration={mensaje.mensaje_audio_duracion}
          isOwnMessage={esRemitente}
          waveformData={mensaje.mensaje_audio_waveform || null}
          onPlayComplete={() => {
            // Marcar como leído después de reproducir (solo si no es del remitente)
            if (!esRemitente && !mensaje.leido) {
              chatService.marcarComoLeido(mensaje.id_mensaje);
            }
          }}
        />
      ) : (
        <Text style={[
          styles.mensajeTexto,
          esRemitente && styles.mensajeTextoRemitente,
          fontSize && { fontSize }
        ]}>
          🎤 Mensaje de voz
        </Text>
      )}
      
      <View style={styles.mensajeFooter}>
        <Text style={[
          styles.mensajeFecha,
          esRemitente && styles.mensajeFechaRemitente
        ]}>
          {formatearFechaMensaje(mensaje.fecha_envio)}
        </Text>
        {esRemitente && estado && (
          <Text style={[styles.estadoIcono, { color: estadoColor }]}>
            {estadoIcono}
          </Text>
        )}
      </View>
      
      {!mensaje.leido && !esRemitente && (
        <View style={styles.noLeidoBadge} />
      )}
    </TouchableOpacity>
  );
});

MessageBubble.displayName = 'MessageBubble';

const styles = StyleSheet.create({
  mensajeBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    position: 'relative',
  },
  mensajeRemitente: {
    alignSelf: 'flex-end',
  },
  mensajeOtro: {
    alignSelf: 'flex-start',
  },
  mensajeTexto: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  mensajeTextoRemitente: {
    color: '#FFFFFF',
  },
  mensajeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  mensajeFecha: {
    fontSize: 11,
    color: '#999',
  },
  mensajeFechaRemitente: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  estadoIcono: {
    fontSize: 12,
    marginLeft: 4,
  },
  noLeidoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
  },
});

export default MessageBubble;

