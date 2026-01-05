/**
 * Componente para mostrar un item de conversación en la lista de chats
 * Estilo similar a WhatsApp/Messenger
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatRelativeTime } from '../../utils/dateUtils';
import Logger from '../../services/logger';

/**
 * Componente ListChatItem
 * @param {Object} props
 * @param {Object} props.conversacion - Objeto de conversación con paciente, último mensaje, etc.
 * @param {Function} props.onPress - Función a ejecutar al presionar
 */
const ListChatItem = ({ conversacion, onPress }) => {
  const { paciente, ultimo_mensaje, mensajes_no_leidos, ultima_fecha } = conversacion;

  // Obtener iniciales del paciente para el avatar
  const obtenerIniciales = (nombre, apellido) => {
    const inicialNombre = nombre ? nombre.charAt(0).toUpperCase() : '';
    const inicialApellido = apellido ? apellido.charAt(0).toUpperCase() : '';
    return `${inicialNombre}${inicialApellido}` || '?';
  };

  const iniciales = obtenerIniciales(paciente.nombre, paciente.apellido_paterno);
  const nombreCompleto = paciente.nombre_completo || `${paciente.nombre} ${paciente.apellido_paterno}`.trim();
  const previewMensaje = ultimo_mensaje?.preview || 'Sin mensajes';
  
  // Asegurar que mensajes_no_leidos sea un número válido
  const mensajesNoLeidosNum = Number(mensajes_no_leidos) || 0;
  const tieneNoLeidos = mensajesNoLeidosNum > 0;
  const tiempoRelativo = ultima_fecha ? formatRelativeTime(ultima_fecha) : '';

  // Debug: Log para verificar valores
  if (tieneNoLeidos) {
    Logger.debug('ListChatItem: Badge debería mostrarse', {
      pacienteId: conversacion.id_paciente,
      mensajes_no_leidos: mensajesNoLeidosNum,
      tieneNoLeidos
    });
  }

  return (
    <TouchableOpacity 
      style={[styles.container, tieneNoLeidos && styles.containerNoLeido]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar circular con iniciales */}
      <View style={[styles.avatar, tieneNoLeidos && styles.avatarNoLeido]}>
        <Text style={styles.avatarText}>{iniciales}</Text>
      </View>

      {/* Contenido */}
      <View style={styles.content}>
        {/* Header: Nombre y tiempo */}
        <View style={styles.header}>
          <Text style={[styles.nombre, tieneNoLeidos && styles.nombreNoLeido]} numberOfLines={1}>
            {nombreCompleto}
          </Text>
          {tiempoRelativo && (
            <Text style={styles.tiempo}>{tiempoRelativo}</Text>
          )}
        </View>

        {/* Preview del último mensaje */}
        <View style={styles.previewContainer}>
          <Text 
            style={[styles.preview, tieneNoLeidos && styles.previewNoLeido]} 
            numberOfLines={1}
          >
            {previewMensaje}
          </Text>
          {tieneNoLeidos && (
            <View style={styles.badgeContainer}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {mensajesNoLeidosNum > 99 ? '99+' : String(mensajesNoLeidosNum)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  containerNoLeido: {
    backgroundColor: '#F5F5F5',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarNoLeido: {
    backgroundColor: '#1565C0',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  nombreNoLeido: {
    fontWeight: '700',
    color: '#000000',
  },
  tiempo: {
    fontSize: 12,
    color: '#999999',
    marginLeft: 8,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
    marginRight: 8,
  },
  previewNoLeido: {
    fontWeight: '500',
    color: '#333333',
  },
  badgeContainer: {
    marginLeft: 8,
  },
  badge: {
    height: 20,
    minWidth: 20,
    backgroundColor: '#1976D2',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 11,
  },
});

export default ListChatItem;

