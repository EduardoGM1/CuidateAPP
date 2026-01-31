/**
 * Pantalla: Chat con Doctor
 * 
 * Interfaz ultra-simple de chat con doctor.
 * Envío de mensajes de voz y texto, TTS para leer mensajes.
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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import useTTS from '../../hooks/useTTS';
import useChat from '../../hooks/useChat';
import chatService from '../../api/chatService';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import VoiceRecorder from '../../components/chat/VoiceRecorder';
import ConnectionBanner from '../../components/chat/ConnectionBanner';
import MessageBubble from '../../components/chat/MessageBubble';
import permissionsService from '../../services/permissionsService';

const ChatDoctor = () => {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const { speak, stopAndClear, createTimeout } = useTTS();
  
  // Normalizar pacienteId
  const pacienteId = useMemo(() => {
    const id = userData?.id_paciente || userData?.id;
    return id ? String(id) : null;
  }, [userData?.id_paciente, userData?.id]);
  
  const [fontSize, setFontSize] = useState(16);
  const [mostrarModalFontSize, setMostrarModalFontSize] = useState(false);
  const [mostrarModalOpciones, setMostrarModalOpciones] = useState(false);
  const [mensajeSeleccionado, setMensajeSeleccionado] = useState(null);
  const [editandoMensaje, setEditandoMensaje] = useState(false);
  const [textoEditado, setTextoEditado] = useState('');
  
  const speakRef = useRef(speak);
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

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
    doctorId,
    setDoctorId,
  } = useChat({
    pacienteId,
    doctorId: null, // El backend obtendrá automáticamente el doctorId de la relación doctor_paciente
    remitente: 'Paciente',
    onNuevoMensaje: (mensaje) => {
      // Leer mensaje con TTS si es del doctor
      if (mensaje.remitente === 'Doctor' && mensaje.mensaje_texto && speakRef.current) {
        speakRef.current(`Nuevo mensaje del doctor: ${mensaje.mensaje_texto}`);
      }
    },
  });

  // Nota: El backend ahora obtiene automáticamente el doctorId de la relación doctor_paciente
  // cuando el paciente envía un mensaje sin proporcionarlo, así que no necesitamos obtenerlo aquí

  // Cargar tamaño de fuente guardado
  useEffect(() => {
    const cargarFontSize = async () => {
      try {
        const { storageService } = require('../../services/storageService');
        const saved = await storageService.getItem('chat_font_size');
        if (saved) setFontSize(parseInt(saved, 10));
      } catch (error) {
        Logger.warn('Error cargando tamaño de fuente:', error);
      }
    };
    cargarFontSize();
  }, []);


  // Cargar datos al entrar
  useFocusEffect(
    useCallback(() => {
      cargarMensajes();
      
      permissionsService.checkMicrophonePermission().then((hasPermission) => {
        if (!hasPermission && Platform.OS === 'android') {
          Logger.info('ChatDoctor: Permiso de micrófono no otorgado, se solicitará cuando sea necesario');
        }
      }).catch((error) => {
        Logger.warn('ChatDoctor: Error verificando permiso de micrófono', error);
      });
      
      const timer = createTimeout(async () => {
        await speak('Chat con tu doctor. Puedes enviar mensajes de texto o de voz.');
      }, 500);
      
      return () => {
        stopAndClear();
        clearTimeout(timer);
      };
    }, [cargarMensajes, speak, stopAndClear, createTimeout])
  );

  // Wrapper para handleEnviarTexto con TTS
  const handleEnviarTextoConTTS = useCallback(async (texto = null) => {
    // El backend ahora obtiene automáticamente el doctorId si no se proporciona
    // Así que podemos enviar el mensaje incluso si doctorId es null
    await handleEnviarTexto(texto);
    if (isOnline) {
      await speak('Mensaje enviado');
    } else {
      await speak('Mensaje guardado. Se enviará cuando haya conexión');
    }
  }, [handleEnviarTexto, isOnline, speak]);

  // Wrapper para handleGrabacionCompleta con TTS
  const handleGrabacionCompletaConTTS = useCallback(async ({ audioFilePath, audioUrl, duration }) => {
    try {
      // Validar que tenemos duración y al menos una ruta (local o URL del servidor)
      if (!duration || (!audioFilePath && !audioUrl)) {
        await speak('Error al obtener el archivo de audio');
        return;
      }
      
      // Si ya tenemos audioUrl, el archivo ya fue subido por VoiceRecorder
      if (audioUrl) {
        await speak('Enviando mensaje de voz');
      } else {
        await speak('Subiendo mensaje de voz');
      }
      
      // Pasar audioUrl si está disponible (archivo ya subido) o audioFilePath si no
      await handleGrabacionCompleta({ audioFilePath, audioUrl, duration });
      await speak('Mensaje de voz enviado');
    } catch (error) {
      Logger.error('ChatDoctor: Error en handleGrabacionCompletaConTTS', error);
      await speak('Error al enviar el mensaje de voz. Intenta nuevamente');
    }
  }, [handleGrabacionCompleta, speak]);

  // Leer mensaje con TTS
  const handleLeerMensaje = async (mensaje) => {
    hapticService.light();
    
    if (mensaje.mensaje_texto) {
      const remitente = mensaje.remitente === 'Paciente' ? 'Tú dijiste' : 'El doctor dice';
      await speak(`${remitente}: ${mensaje.mensaje_texto}`);
    } else if (mensaje.mensaje_audio_transcripcion) {
      const remitente = mensaje.remitente === 'Paciente' ? 'Tú dijiste' : 'El doctor dice';
      await speak(`${remitente}: ${mensaje.mensaje_audio_transcripcion}`);
    } else {
      await speak('Mensaje de voz sin transcripción');
    }
  };


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
    }, 500);
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

  // Editar mensaje
  const handleEditarMensaje = useCallback((mensaje) => {
    setMensajeSeleccionado(mensaje);
    setTextoEditado(mensaje.mensaje_texto || '');
    setEditandoMensaje(true);
    setMostrarModalOpciones(false);
  }, []);

  // Guardar mensaje editado
  const handleGuardarEdicion = useCallback(async () => {
    if (!mensajeSeleccionado || !textoEditado.trim()) {
      Alert.alert('Error', 'El mensaje no puede estar vacío');
      await speak('El mensaje no puede estar vacío');
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
      await speak('Mensaje actualizado');
    } catch (error) {
      Logger.error('Error editando mensaje:', error);
      Alert.alert('Error', 'No se pudo editar el mensaje');
      await speak('No se pudo editar el mensaje');
      audioFeedbackService.playError();
    }
  }, [mensajeSeleccionado, textoEditado, speak]);

  // Eliminar mensaje
  const handleEliminarMensaje = useCallback(async (mensaje) => {
    if (mensaje.remitente !== 'Paciente') {
      Alert.alert('Error', 'Solo puedes eliminar tus propios mensajes');
      await speak('Solo puedes eliminar tus propios mensajes');
      return;
    }

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
              await speak('Mensaje eliminado');
            } catch (error) {
              Logger.error('Error eliminando mensaje:', error);
              Alert.alert('Error', 'No se pudo eliminar el mensaje');
              await speak('No se pudo eliminar el mensaje');
              audioFeedbackService.playError();
            }
          }
        }
      ]
    );
  }, [speak]);


  // Reintentar mensaje fallido
  const handleReintentarMensaje = useCallback(async (mensaje) => {
    if (mensaje.mensaje_texto) {
      await handleEnviarTextoConTTS(mensaje.mensaje_texto);
    }
  }, [handleEnviarTextoConTTS]);

  // Cambiar tamaño de fuente
  const handleCambiarFontSize = useCallback(async (nuevoSize) => {
    setFontSize(nuevoSize);
    try {
      const { storageService } = require('../../services/storageService');
      await storageService.setItem('chat_font_size', nuevoSize.toString());
      hapticService.light();
      await speak(`Tamaño de fuente cambiado`);
    } catch (error) {
      Logger.error('Error guardando tamaño de fuente:', error);
    }
  }, [speak]);


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PACIENTE} />
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
        {/* Banner de conexión */}
        <ConnectionBanner 
          pendingMessages={mensajesPendientes.length}
          onRetry={() => {
            hapticService.medium();
            sincronizarMensajesPendientes();
          }}
        />

        {/* Header */}
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
          
          <Text style={styles.title}>💬 Chat con Doctor</Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => {
                hapticService.light();
                setMostrarModalFontSize(true);
              }}
            >
              <Text style={styles.settingsButtonText}>⚙️</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.listenButton}
              onPress={async () => {
                hapticService.light();
                await speak(`Chat con tu doctor. ${mensajes.length} mensajes. Puedes enviar mensajes de texto o de voz.`);
              }}
            >
              <Text style={styles.listenButtonText}>🔊</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Indicador "escribiendo..." */}
        {escribiendo && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>Doctor está escribiendo...</Text>
          </View>
        )}

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
              colors={[COLORES.NAV_PACIENTE]}
              tintColor={COLORES.NAV_PACIENTE}
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
            mensajes.map((mensaje) => (
              <MessageBubble
                key={mensaje.id_mensaje}
                mensaje={mensaje}
                remitenteActual="Paciente"
                onPress={() => handleLeerMensaje(mensaje)}
                onLongPressStart={handleLongPressStart}
                onLongPressEnd={handleLongPressEnd}
                fontSize={fontSize}
                style={[
                  mensaje.remitente === 'Paciente' ? styles.mensajePaciente : styles.mensajeDoctor
                ]}
              />
            ))
          )}
        </ScrollView>

        {/* Grabador de voz */}
        {mostrarGrabador && (
          <View style={styles.recorderContainer}>
            <VoiceRecorder
              onRecordingComplete={handleGrabacionCompletaConTTS}
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
            placeholderTextColor={COLORES.TEXTO_SECUNDARIO}
            value={typeof mensajeTexto === 'string' ? mensajeTexto : String(mensajeTexto || '')}
            onChangeText={handleTextChange}
            multiline
            maxLength={500}
            editable={!enviando}
            onSubmitEditing={(e) => {
              e.preventDefault();
              const texto = typeof mensajeTexto === 'string' ? mensajeTexto.trim() : String(mensajeTexto || '').trim();
              if (texto && !enviando) {
                handleEnviarTextoConTTS();
              }
            }}
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, (!(typeof mensajeTexto === 'string' ? mensajeTexto.trim() : '') || enviando) && styles.sendButtonDisabled]}
            onPress={() => handleEnviarTextoConTTS()}
            disabled={!(typeof mensajeTexto === 'string' ? mensajeTexto.trim() : '') || enviando}
          >
            {enviando ? (
              <ActivityIndicator size="small" color={COLORES.TEXTO_EN_PRIMARIO} />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal de tamaño de fuente */}
        <Modal
          visible={mostrarModalFontSize}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMostrarModalFontSize(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Tamaño de fuente</Text>
              <Text style={styles.modalSubtitle}>Selecciona el tamaño de fuente</Text>
              
              <TouchableOpacity
                style={[styles.modalOption, fontSize === 14 && styles.modalOptionSelected]}
                onPress={() => {
                  handleCambiarFontSize(14);
                  setMostrarModalFontSize(false);
                }}
              >
                <Text style={[styles.modalOptionText, fontSize === 14 && styles.modalOptionTextSelected]}>
                  Pequeño (14px)
                </Text>
                {fontSize === 14 && <Text style={styles.modalCheckmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, fontSize === 16 && styles.modalOptionSelected]}
                onPress={() => {
                  handleCambiarFontSize(16);
                  setMostrarModalFontSize(false);
                }}
              >
                <Text style={[styles.modalOptionText, fontSize === 16 && styles.modalOptionTextSelected]}>
                  Mediano (16px)
                </Text>
                {fontSize === 16 && <Text style={styles.modalCheckmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, fontSize === 18 && styles.modalOptionSelected]}
                onPress={() => {
                  handleCambiarFontSize(18);
                  setMostrarModalFontSize(false);
                }}
              >
                <Text style={[styles.modalOptionText, fontSize === 18 && styles.modalOptionTextSelected]}>
                  Grande (18px)
                </Text>
                {fontSize === 18 && <Text style={styles.modalCheckmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, fontSize === 20 && styles.modalOptionSelected]}
                onPress={() => {
                  handleCambiarFontSize(20);
                  setMostrarModalFontSize(false);
                }}
              >
                <Text style={[styles.modalOptionText, fontSize === 20 && styles.modalOptionTextSelected]}>
                  GRANDE (20px)
                </Text>
                {fontSize === 20 && <Text style={styles.modalCheckmark}>✓</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setMostrarModalFontSize(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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
              
              {mensajeSeleccionado && mensajeSeleccionado.mensaje_texto && mensajeSeleccionado.remitente === 'Paciente' && (
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
              
              {mensajeSeleccionado && mensajeSeleccionado.remitente === 'Paciente' && (
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
              
              {mensajeSeleccionado && mensajeSeleccionado.estado === 'error' && (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setMostrarModalOpciones(false);
                    handleReintentarMensaje(mensajeSeleccionado);
                  }}
                >
                  <Text style={styles.modalOptionText}>🔄 Reintentar</Text>
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
                  onPress={handleGuardarEdicion}
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
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 18,
    color: COLORES.NAV_PACIENTE,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    flex: 1,
    textAlign: 'center',
  },
  listenButton: {
    padding: 8,
  },
  listenButtonText: {
    fontSize: 20,
  },
  mensajesContainer: {
    flex: 1,
  },
  mensajesContent: {
    padding: 16,
    paddingBottom: 20,
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
    fontWeight: 'bold',
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  mensajePaciente: {
    backgroundColor: COLORES.NAV_PACIENTE,
  },
  mensajeDoctor: {
    backgroundColor: COLORES.FONDO_CARD,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORES.FONDO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  typingText: {
    fontSize: 13,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORES.FONDO,
  },
  modalOptionSelected: {
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderWidth: 2,
    borderColor: COLORES.NAV_PRIMARIO,
  },
  modalOptionText: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: COLORES.NAV_PRIMARIO,
    fontWeight: 'bold',
  },
  modalCheckmark: {
    fontSize: 18,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: 'bold',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '500',
  },
  recorderContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORES.FONDO,
    borderTopWidth: 1,
    borderTopColor: COLORES.BORDE_CLARO,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORES.FONDO_CARD,
    borderTopWidth: 1,
    borderTopColor: COLORES.BORDE_CLARO,
  },
  audioButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORES.FONDO,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  audioButtonActive: {
    backgroundColor: COLORES.ERROR_LIGHT,
  },
  audioButtonText: {
    fontSize: 24,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: COLORES.FONDO,
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORES.NAV_PACIENTE,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: COLORES.SWITCH_TRACK_OFF,
  },
  sendButtonText: {
    fontSize: 20,
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORES.FONDO_CARD,
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
    backgroundColor: COLORES.FONDO_SECUNDARIO,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORES.NEGRO,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  modalOptionDanger: {
    backgroundColor: COLORES.FONDO_ERROR_CLARO,
    borderColor: COLORES.BORDE_ERROR_CLARO,
  },
  modalOptionText: {
    fontSize: 18,
    color: COLORES.TEXTO_PRIMARIO,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalOptionTextDanger: {
    color: COLORES.ERROR_LIGHT,
    fontWeight: '700',
  },
  editModalContent: {
    backgroundColor: COLORES.FONDO_CARD,
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
    borderColor: COLORES.BORDE_CLARO,
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
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  editModalButtonCancel: {
    backgroundColor: COLORES.FONDO,
  },
  editModalButtonSave: {
    backgroundColor: COLORES.NAV_PACIENTE,
  },
  editModalButtonText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
  },
  editModalButtonTextSave: {
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
});

export default ChatDoctor;

