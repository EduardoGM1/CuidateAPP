import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Card, Title } from 'react-native-paper';
import ModalBase from './ModalBase';
import { COLORES } from '../../../utils/constantes';

/**
 * HistoryModal - Modal reutilizable para mostrar historiales completos
 * 
 * Elimina duplicación en modales de "Ver Historial Completo"
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Controla la visibilidad
 * @param {Function} props.onClose - Función para cerrar
 * @param {string} props.title - Título del modal
 * @param {Array} props.items - Array de items a mostrar
 * @param {boolean} props.loading - Estado de carga
 * @param {Function} props.renderItem - Función para renderizar cada item
 * @param {string} props.emptyMessage - Mensaje cuando no hay items
 * 
 * @example
 * <HistoryModal
 *   visible={showAll}
 *   onClose={() => setShowAll(false)}
 *   title="Historial de Citas"
 *   items={citas}
 *   loading={loading}
 *   renderItem={(item) => <CitaCard cita={item} />}
 *   emptyMessage="No hay citas registradas"
 * />
 */
const HistoryModal = ({
  visible,
  onClose,
  title,
  items = [],
  loading = false,
  renderItem,
  emptyMessage = 'No hay registros'
}) => {
  return (
    <ModalBase
      visible={visible}
      title={title}
      onClose={onClose}
      animationType="slide"
      allowOutsideClick={false}
    >
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={true} 
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        ) : items && Array.isArray(items) && items.length > 0 ? (
          <View style={styles.itemsContainer}>
            {items.map((item, index) => {
              if (!renderItem) {
                return (
                  <View key={`item-${index}`} style={styles.itemWrapper}>
                    <Card style={styles.itemCard}>
                      <Card.Content>
                        <Text>{JSON.stringify(item)}</Text>
                      </Card.Content>
                    </Card>
                  </View>
                );
              }
              const rendered = renderItem(item, index);
              // Siempre envolvemos en un View para mantener consistencia de estilos
              // El key del componente renderizado se mantiene si existe
              return (
                <View key={`wrapper-${index}`} style={styles.itemWrapper}>
                  {rendered}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        )}
      </ScrollView>
    </ModalBase>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  itemsContainer: {
    padding: 0,
  },
  itemWrapper: {
    marginBottom: 12,
  },
  itemCard: {
    marginBottom: 8,
    elevation: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
});

export default HistoryModal;

