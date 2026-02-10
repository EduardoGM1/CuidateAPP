/**
 * Pantalla: Lista de Chats
 * 
 * Muestra lista de conversaciones del doctor con sus pacientes
 * Estilo similar a WhatsApp/Messenger
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import useConversacionesDoctor from '../../hooks/useConversacionesDoctor';
import ListChatItem from '../../components/chat/ListChatItem';
import { emptyStateStyles } from '../../utils/sharedStyles';
import { COLORES } from '../../utils/constantes';

const ListaChats = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Validar que solo doctores puedan acceder
  React.useEffect(() => {
    if (userRole !== 'Doctor' && userRole !== 'doctor') {
      Logger.warn('Acceso no autorizado a ListaChats', { userRole });
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);

  // Obtener conversaciones
  const {
    conversaciones,
    loading,
    error,
    refresh: refreshConversaciones
  } = useConversacionesDoctor(userData?.id_doctor);

  // Refrescar conversaciones cuando se vuelve a la pantalla
  useFocusEffect(
    useCallback(() => {
      Logger.info('ListaChats: Pantalla enfocada, refrescando conversaciones');
      refreshConversaciones();
    }, [refreshConversaciones])
  );

  // Filtrar conversaciones por búsqueda
  const conversacionesFiltradas = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversaciones;
    }

    const query = searchQuery.toLowerCase().trim();
    return conversaciones.filter(conv => {
      const nombreCompleto = conv.paciente?.nombre_completo || '';
      const nombre = conv.paciente?.nombre || '';
      const apellido = conv.paciente?.apellido_paterno || '';
      const preview = conv.ultimo_mensaje?.preview || '';

      return (
        nombreCompleto.toLowerCase().includes(query) ||
        nombre.toLowerCase().includes(query) ||
        apellido.toLowerCase().includes(query) ||
        preview.toLowerCase().includes(query)
      );
    });
  }, [conversaciones, searchQuery]);

  // Refrescar datos
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshConversaciones();
      Logger.info('ListaChats: Conversaciones refrescadas');
    } catch (error) {
      Logger.error('Error refrescando conversaciones', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshConversaciones]);

  // Navegar al chat individual
  const handleChatPress = useCallback((conversacion) => {
    const pacienteId = conversacion.id_paciente;
    Logger.navigation('ListaChats', 'ChatPaciente', {
      pacienteId,
      desde: 'lista_chats'
    });
    navigation.navigate('ChatPaciente', { pacienteId });
  }, [navigation]);

  // Renderizar item de la lista
  const renderItem = useCallback(({ item }) => (
    <ListChatItem
      conversacion={item}
      onPress={() => handleChatPress(item)}
    />
  ), [handleChatPress]);

  // Renderizar header de búsqueda
  const renderHeader = () => (
    <View style={styles.searchContainer}>
      <Searchbar
        placeholder="Buscar conversación..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
        inputStyle={styles.searchbarInput}
        icon={() => null}
      />
    </View>
  );

  // Renderizar estado vacío
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PRIMARIO} />
          <Text style={styles.emptyText}>Cargando conversaciones...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyText}>Error al cargar conversaciones</Text>
          <Text style={styles.emptySubtext}>{error.message || 'Intenta nuevamente'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>No se encontraron conversaciones</Text>
          <Text style={styles.emptySubtext}>Intenta con otros términos de búsqueda</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💬</Text>
        <Text style={styles.emptyText}>No hay conversaciones</Text>
        <Text style={styles.emptySubtext}>
          Cuando recibas mensajes de tus pacientes, aparecerán aquí
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Mensajes</Text>
        <Text style={styles.headerSubtitle}>
          {conversaciones.length} {conversaciones.length === 1 ? 'conversación' : 'conversaciones'}
        </Text>
      </View>

      {/* Lista de conversaciones */}
      <FlatList
        data={conversacionesFiltradas}
        renderItem={renderItem}
        keyExtractor={(item) => `chat-${item.id_paciente}`}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORES.NAV_PRIMARIO]}
            tintColor={COLORES.NAV_PRIMARIO}
          />
        }
        contentContainerStyle={
          conversacionesFiltradas.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO_CARD,
  },
  header: {
    padding: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: COLORES.FONDO_CARD,
  },
  searchbar: {
    elevation: 2,
    borderRadius: 8,
  },
  searchbarInput: {
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ListaChats;

