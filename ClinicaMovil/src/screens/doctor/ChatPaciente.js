/**
 * Pantalla: Chat con Paciente (Doctor)
 * 
 * Interfaz profesional de chat para doctores.
 * Permite comunicarse con pacientes asignados.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import useChat from '../../hooks/useChat';
import chatService from '../../api/chatService';
import gestionService from '../../api/gestionService';
import hapticService from '../../services/hapticService';
import { obtenerIniciales, obtenerNombreCompleto, formatearUltimaActividad, agruparMensajesPorFecha } from '../../utils/chatUtils';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import VoiceRecorder from '../../components/chat/VoiceRecorder';
import ConnectionBanner from '../../components/chat/ConnectionBanner';
import MessageBubble from '../../components/chat/MessageBubble';
import permissionsService from '../../services/permissionsService';

const ChatPaciente = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userData } = useAuth();
  
  // Obtener pacienteId de los parámetros de ruta
  const pacienteId = useMemo(() => {
    const id = route.params?.pacienteId || route.params?.paciente?.id_paciente || route.params?.paciente?.id;
    return id ? String(id) : null;
  }, [route.params?.pacienteId, route.params?.paciente?.id_paciente, route.params?.paciente?.id]);
  
  const doctorId = userData?.id_doctor || userData?.id;
  
  const [pacienteData, setPacienteData] = useState(null);
  const [mostrarModalOpciones, setMostrarModalOpciones] = useState(false);
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState(null);
  const [editandoMensaje, setEditandoMensaje] = useState(false);
  const [textoEditado, setTextoEditado] = useState('');

  // Usar hook useChat para lógica común
  const {
    mensajes,
    setMensajes,
    loading,
    refreshing,
    enviando,
    mensajeTexto,
    mostrarGrabador,
    mensajesPendientes,
    escribiendo,
    isOnline,
    cargarMensajes,
    handleRefresh,
    handleEnviarTexto,
    handleGrabacionCompleta,
    handleToggleGrabador,
    handleTextChange,
    sincronizarMensajesPendientes,
    scrollViewRef,
    longPressTimerRef,
  } = useChat({
    pacienteId,
    doctorId,
    remitente: 'Doctor',
  });


  // Cargar datos del paciente
  const cargarDatosPaciente = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      // Intentar obtener de route.params primero
      if (route.params?.paciente) {
        setPacienteData(route.params.paciente);
        return;
      }
      
      // Si no está en params, cargar desde API
      const paciente = await gestionService.getPacienteById(pacienteId);
      setPacienteData(paciente);
    } catch (error) {
      Logger.error('Error cargando datos del paciente:', error);
      // No es crítico, continuar sin datos del paciente
    }
  }, [pacienteId, route.params?.paciente]);

  // Resetear modal cuando cambien los parámetros de ruta
  useEffect(() => {
    setMostrarModalOpciones(false);
    setEditandoMensaje(false);
    setMensajeSeleccionado(null);
  }, [pacienteId]);

  // Marcar notificación de mensaje como leída al abrir el chat
  useEffect(() => {
    const marcarNotificacionLeida = async () => {
      if (pacienteId && doctorId) {
        try {
          await gestionService.marcarNotificacionMensajeLeida(doctorId, pacienteId);
          Logger.info('ChatPaciente: Notificación de mensaje marcada como leída', {
            pacienteId,
            doctorId
          });
        } catch (error) {
          // No crítico - no debe fallar la carga del chat
          Logger.warn('ChatPaciente: Error marcando notificación como leída (no crítico)', error);
        }
      }
    };

    marcarNotificacionLeida();
  }, [pacienteId, doctorId]);

  // Cargar datos al entrar
  useFocusEffect(
    useCallback(() => {
      if (!pacienteId) {
        Alert.alert('Error', 'No se especificó el paciente');
        navigation.goBack();
        return;
      }
      
      cargarMensajes();
      cargarDatosPaciente();
      
      permissionsService.checkMicrophonePermission().then((hasPermission) => {
        if (!hasPermission && Platform.OS === 'android') {
          Logger.info('ChatPaciente: Permiso de micrófono no otorgado, se solicitará cuando sea necesario');
        }
      }).catch((error) => {
        Logger.warn('ChatPaciente: Error verificando permiso de micrófono', error);
      });
      
      return () => {
        // Cleanup: cerrar modal al salir
        setMostrarModalOpciones(false);
        setEditandoMensaje(false);
      };
    }, [cargarMensajes, cargarDatosPaciente, pacienteId, navigation])
  );


  // Wrapper para handleGrabacionCompleta con limpieza de archivo temporal
  const handleGrabacionCompletaConLimpieza = useCallback(async ({ audioFilePath, audioUrl, duration }) => {
    try {
      // Validar que tenemos duración y al menos una ruta (local o URL del servidor)
      if (!duration || (!audioFilePath && !audioUrl)) {
        Alert.alert('Error', 'No se pudo obtener el archivo de audio');
        return;
      }

      // Si tenemos audioUrl, el archivo ya fue subido por VoiceRecorder
      // Si no, verificar que el archivo local existe antes de subirlo
      if (!audioUrl && audioFilePath) {
        const RNFS = require('react-native-fs').default;
        const fileExists = await RNFS.exists(audioFilePath.replace(/^file:\/\/+/, ''));
        if (!fileExists) {
          throw new Error('El archivo de audio no existe. No se pudo subir.');
        }
      }

      // Pasar audioUrl si está disponible (archivo ya subido) o audioFilePath si no
      await handleGrabacionCompleta({ audioFilePath, audioUrl, duration });

      // Eliminar archivo temporal después de subirlo exitosamente (solo si existe localmente)
      if (audioFilePath) {
        try {
          // Usar audioService para eliminar el archivo (maneja RNFS correctamente)
          const audioService = (await import('../../services/audioService')).default;
          await audioService.deleteFile(audioFilePath);
          Logger.info('ChatPaciente: Archivo temporal eliminado después de subir', { path: audioFilePath });
        } catch (deleteError) {
          // Solo registrar como warning si el error es significativo
          const errorMessage = deleteError?.message || String(deleteError);
          const errorCode = deleteError?.code;
          
          // Ignorar errores de "archivo no encontrado" ya que el archivo puede haber sido eliminado por otro proceso
          if (errorCode !== 'ENOENT' && !errorMessage.includes('ENOENT') && !errorMessage.includes('no such file') && !errorMessage.includes('exists')) {
            Logger.warn('ChatPaciente: Error eliminando archivo temporal', {
              error: errorMessage,
              code: errorCode,
              path: audioFilePath,
            });
          } else {
            Logger.debug('ChatPaciente: Archivo temporal no encontrado (ya eliminado)', { path: audioFilePath });
          }
        }
      }
    } catch (error) {
      Logger.error('Error procesando audio:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo enviar el mensaje de audio. Intenta nuevamente.'
      );
    }
  }, [handleGrabacionCompleta]);

  // Leer mensaje (solo haptic feedback para doctores)
  const handleLeerMensaje = useCallback((mensaje) => {
    hapticService.light();
  }, []);

  // Manejar long press (2 segundos) para mostrar opciones
  const handleLongPressStart = useCallback((mensaje) => {
    // Limpiar timer anterior si existe
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    // Iniciar timer de 0.5 segundos
    longPressTimerRef.current = setTimeout(() => {
      hapticService.medium();
      setMensajeSeleccionado(mensaje);
      setMostrarModalOpciones(true);
      longPressTimerRef.current = null;
    }, 300);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    // Cancelar timer si se suelta antes de 0.5 segundos
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Eliminar mensaje
  const handleEliminarMensaje = useCallback(async (mensaje) => {
    Alert.alert(
      'Eliminar mensaje',
      '¿Estás seguro de que deseas eliminar este mensaje?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticService.medium();
              await chatService.eliminarMensaje(mensaje.id_mensaje);

              // Remover mensaje de la lista
              setMensajes(prev => prev.filter(m => m.id_mensaje !== mensaje.id_mensaje));

              setMostrarModalOpciones(false);
              setMensajeSeleccionado(null);
              audioFeedbackService.playSuccess();
            } catch (error) {
              Logger.error('Error eliminando mensaje:', error);
              Alert.alert('Error', 'No se pudo eliminar el mensaje');
              audioFeedbackService.playError();
            }
          }
        }
      ]
    );
  }, []);


  if (!pacienteId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se especificó el paciente</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header Mejorado */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              hapticService.light();
              navigation.goBack();
            }}
          >
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
          
          {/* Información del Paciente */}
          <View style={styles.pacienteInfoContainer}>
            {pacienteData && (
              <>
                <View style={styles.pacienteAvatar}>
                  <Text style={styles.pacienteIniciales}>
                    {obtenerIniciales(pacienteData)}
                  </Text>
                </View>
                <View style={styles.pacienteTextContainer}>
                  <Text style={styles.pacienteNombre} numberOfLines={1}>
                    {obtenerNombreCompleto(pacienteData)}
                  </Text>
                  {(pacienteData.ultima_actividad || pacienteData.ultima_conexion || pacienteData.fecha_ultima_actividad) && (
                    <Text style={styles.pacienteActividad}>
                      Última vez: {formatearUltimaActividad(
                        pacienteData.ultima_actividad || 
                        pacienteData.ultima_conexion || 
                        pacienteData.fecha_ultima_actividad
                      )}
                    </Text>
                  )}
                </View>
              </>
            )}
            {!pacienteData && (
              <Text style={styles.title}>💬 Chat con Paciente</Text>
            )}
          </View>
          
        </View>

        {/* Banner de conexión */}
        <ConnectionBanner 
          pendingMessages={mensajesPendientes.length}
          onRetry={() => {
            hapticService.medium();
            sincronizarMensajesPendientes();
          }}
        />

        {/* Lista de mensajes */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.mensajesContainer}
          contentContainerStyle={styles.mensajesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2196F3']}
              tintColor="#2196F3"
            />
          }
        >
          {mensajes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
              <Text style={styles.emptySubtext}>Envía un mensaje para comenzar</Text>
            </View>
          ) : (
            agruparMensajesPorFecha(mensajes).map((grupo, grupoIndex) => (
              <View key={`grupo-${grupoIndex}`}>
                {/* Separador de fecha */}
                <View style={styles.dateSeparator}>
                  <View style={styles.dateSeparatorLine} />
                  <Text style={styles.dateSeparatorText}>{grupo.fecha}</Text>
                  <View style={styles.dateSeparatorLine} />
                </View>

                {/* Mensajes del grupo */}
                {grupo.mensajes.map((mensaje) => (
                  <MessageBubble
                    key={mensaje.id_mensaje}
                    mensaje={mensaje}
                    remitenteActual="Doctor"
                    onPress={() => handleLeerMensaje(mensaje)}
                    onLongPressStart={handleLongPressStart}
                    onLongPressEnd={handleLongPressEnd}
                    style={[
                      mensaje.remitente === 'Doctor' ? styles.mensajeDoctor : styles.mensajePaciente
                    ]}
                  />
                ))}
              </View>
            ))
          )}
          
          {/* Indicador "Paciente está escribiendo..." */}
          {escribiendo && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Paciente está escribiendo...</Text>
              <ActivityIndicator size="small" color="#999" style={styles.typingSpinner} />
            </View>
          )}
        </ScrollView>

        {/* Grabador de voz */}
        {mostrarGrabador && (
          <View style={styles.recorderContainer}>
            <VoiceRecorder
              onRecordingComplete={handleGrabacionCompletaConLimpieza}
              onCancel={() => handleToggleGrabador()}
            />
          </View>
        )}

        {/* Input de mensaje */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.audioButton, mostrarGrabador && styles.audioButtonActive]}
            onPress={handleToggleGrabador}
            disabled={enviando}
          >
            <Text style={styles.audioButtonText}>🎤</Text>
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#999"
            value={typeof mensajeTexto === 'string' ? mensajeTexto : String(mensajeTexto || '')}
            onChangeText={handleTextChange}
            multiline
            maxLength={500}
            editable={!enviando}
            onSubmitEditing={(e) => {
              e.preventDefault();
              const texto = typeof mensajeTexto === 'string' ? mensajeTexto.trim() : String(mensajeTexto || '').trim();
              if (texto && !enviando) {
                handleEnviarTexto(texto);
              }
            }}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!(typeof mensajeTexto === 'string' ? mensajeTexto.trim() : '') || enviando) && styles.sendButtonDisabled]}
            onPress={() => handleEnviarTexto()}
            disabled={!(typeof mensajeTexto === 'string' ? mensajeTexto.trim() : '') || enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal de opciones de mensaje */}
        <Modal
          visible={mostrarModalOpciones}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setMostrarModalOpciones(false);
            setMensajeSeleccionado(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setMostrarModalOpciones(false);
              setMensajeSeleccionado(null);
            }}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Opciones del mensaje</Text>
              
              {mensajeSeleccionado && mensajeSeleccionado.mensaje_texto && (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setMensajeSeleccionado(mensajeSeleccionado);
                    setTextoEditado(mensajeSeleccionado.mensaje_texto || '');
                    setEditandoMensaje(true);
                    setMostrarModalOpciones(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>✏️ Editar</Text>
                </TouchableOpacity>
              )}
              
              {mensajeSeleccionado && (
                <TouchableOpacity
                  style={[styles.modalOption, styles.modalOptionDanger]}
                  onPress={() => {
                    setMostrarModalOpciones(false);
                    handleEliminarMensaje(mensajeSeleccionado);
                  }}
                >
                  <Text style={[styles.modalOptionText, styles.modalOptionTextDanger]}>🗑️ Eliminar</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setMostrarModalOpciones(false);
                  setMensajeSeleccionado(null);
                }}
              >
                <Text style={styles.modalOptionText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Modal de edición de mensaje */}
        <Modal
          visible={editandoMensaje}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setEditandoMensaje(false);
            setMensajeSeleccionado(null);
            setTextoEditado('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.editModalContent}>
              <Text style={styles.editModalTitle}>Editar mensaje</Text>
              
              <TextInput
                style={styles.editTextInput}
                value={textoEditado}
                onChangeText={setTextoEditado}
                multiline
                placeholder="Escribe tu mensaje..."
                autoFocus
              />
              
              <View style={styles.editModalButtons}>
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalButtonCancel]}
                  onPress={() => {
                    setEditandoMensaje(false);
                    setMensajeSeleccionado(null);
                    setTextoEditado('');
                  }}
                >
                  <Text style={styles.editModalButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.editModalButton, styles.editModalButtonSave]}
                  onPress={async () => {
                    if (!mensajeSeleccionado || !textoEditado.trim()) {
                      Alert.alert('Error', 'El mensaje no puede estar vacío');
                      return;
                    }

                    try {
                      hapticService.medium();
                      const mensajeActualizado = await chatService.actualizarMensaje(
                        mensajeSeleccionado.id_mensaje,
                        textoEditado.trim()
                      );

                      // Actualizar mensaje en la lista
                      setMensajes(prev => prev.map(m => 
                        m.id_mensaje === mensajeSeleccionado.id_mensaje 
                          ? { ...m, ...mensajeActualizado }
                          : m
                      ));

                      setEditandoMensaje(false);
                      setMensajeSeleccionado(null);
                      setTextoEditado('');
                      audioFeedbackService.playSuccess();
                      Alert.alert('Éxito', 'Mensaje actualizado');
                    } catch (error) {
                      Logger.error('Error editando mensaje:', error);
                      Alert.alert('Error', 'No se pudo editar el mensaje');
                      audioFeedbackService.playError();
                    }
                  }}
                >
                  <Text style={[styles.editModalButtonText, styles.editModalButtonTextSave]}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
    textAlign: 'center',
  },
  mensajesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  mensajesContent: {
    paddingVertical: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  mensajeDoctor: {
    backgroundColor: '#2196F3',
  },
  mensajePaciente: {
    backgroundColor: '#E0E0E0',
  },
  recorderContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  audioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  audioButtonActive: {
    backgroundColor: '#2196F3',
  },
  audioButtonText: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: COLORES.TEXTO_PRIMARIO,
  },
  modalOption: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalOptionDanger: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFCDD2',
  },
  modalOptionText: {
    fontSize: 18,
    color: COLORES.TEXTO_PRIMARIO,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalOptionTextDanger: {
    color: '#F44336',
    fontWeight: '700',
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: COLORES.TEXTO_PRIMARIO,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  editModalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  editModalButtonSave: {
    backgroundColor: '#2196F3',
  },
  editModalButtonText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
  },
  editModalButtonTextSave: {
    color: '#FFFFFF',
  },
  // Estilos para información del paciente en header
  pacienteInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  pacienteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pacienteIniciales: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pacienteTextContainer: {
    flex: 1,
  },
  pacienteNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
  },
  pacienteActividad: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  // Estilos para agrupación por fecha
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dateSeparatorText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  // Estilos para indicador "escribiendo..."
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginRight: 8,
  },
  typingSpinner: {
    marginLeft: 4,
  },
});

export default ChatPaciente;

