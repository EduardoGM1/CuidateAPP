import { StyleSheet } from 'react-native';

/**
 * Estilos compartidos para pantallas de listado con filtros
 * Reutilizados por: VerTodasCitas, HistorialAuditoria, HistorialNotificaciones
 */

export const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  closeButtonX: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
});

export const filterStyles = StyleSheet.create({
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  doctoresList: {
    flexDirection: 'row',
  },
  doctorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  doctorChipActive: {
    backgroundColor: '#2196F3',
  },
  doctorChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  doctorChipTextActive: {
    color: '#FFFFFF',
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    borderColor: '#E0E0E0',
  },
  applyButton: {
    backgroundColor: '#2196F3',
  },
});

export const listStyles = StyleSheet.create({
  citaCard: {
    margin: 12,
    marginVertical: 6,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  cardInfo: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
});

export const emptyStateStyles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export const activeFiltersStyles = StyleSheet.create({
  activeFilters: {
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 8,
    fontWeight: '600',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
});

