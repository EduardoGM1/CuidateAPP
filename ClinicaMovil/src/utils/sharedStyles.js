import { StyleSheet } from 'react-native';
import { COLORES, TAMAÑOS } from './constantes';

/**
 * Estilos compartidos para pantallas de listado con filtros
 * Reutilizados por: VerTodasCitas, HistorialAuditoria, HistorialNotificaciones
 * Design System: colores desde COLORES (utils/constantes)
 */

export const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORES.FONDO_CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: TAMAÑOS.ESPACIADO_MEDIO,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.SECUNDARIO_LIGHT,
  },
  modalTitle: {
    fontSize: TAMAÑOS.TEXTO_TITULO,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    padding: TAMAÑOS.ESPACIADO_MEDIO,
    paddingBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: TAMAÑOS.ESPACIADO_MEDIO,
    paddingTop: 12,
    paddingBottom: TAMAÑOS.ESPACIADO_MEDIO,
    borderTopWidth: 1,
    borderTopColor: COLORES.SECUNDARIO_LIGHT,
    backgroundColor: COLORES.FONDO_CARD,
    gap: 12,
  },
  closeButtonX: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.TEXTO_SECUNDARIO,
  },
});

export const filterStyles = StyleSheet.create({
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: COLORES.SECUNDARIO_LIGHT,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORES.FONDO_CARD,
  },
  doctoresList: {
    flexDirection: 'row',
  },
  doctorChip: {
    paddingHorizontal: TAMAÑOS.ESPACIADO_MEDIO,
    paddingVertical: TAMAÑOS.ESPACIADO_PEQUEÑO,
    borderRadius: 20,
    backgroundColor: COLORES.SECUNDARIO_LIGHT,
    marginRight: TAMAÑOS.ESPACIADO_PEQUEÑO,
  },
  doctorChipActive: {
    backgroundColor: COLORES.PRIMARIO_LIGHT,
  },
  // Texto en chips no seleccionados: claro sobre fondo gris para buen contraste
  doctorChipText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 14,
    fontWeight: '500',
  },
  doctorChipTextActive: {
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
  modalButton: {
    flex: 1,
  },
  cancelButton: {
    borderColor: COLORES.SECUNDARIO_LIGHT,
  },
  applyButton: {
    backgroundColor: COLORES.PRIMARIO_LIGHT,
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
    marginBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
  },
  cardTitle: {
    fontSize: TAMAÑOS.TEXTO_NORMAL,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  cardInfo: {
    marginBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    fontSize: TAMAÑOS.TEXTO_NORMAL,
    marginRight: TAMAÑOS.ESPACIADO_PEQUEÑO,
    width: 24,
  },
  infoText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
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
    marginBottom: TAMAÑOS.ESPACIADO_MEDIO,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
});

export const activeFiltersStyles = StyleSheet.create({
  activeFilters: {
    padding: 12,
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.NAV_PRIMARIO_INACTIVO,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: COLORES.NAV_PRIMARIO,
    marginBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
    fontWeight: '600',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    marginBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: COLORES.PRIMARIO_LIGHT,
    textDecorationLine: 'underline',
  },
});

/**
 * Estilos unificados para botones de acción en pantallas de listado (Agregar, Filtros).
 * Usar en: GestionAdmin, GestionUsuarios, GestionMedicamentos, GestionVacunas, GestionComorbilidades, GestionModulos.
 * Especificación: minHeight 48, fontSize 15, fontWeight 600, color NAV_PRIMARIO.
 */
export const listActionButtonStyles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  addButton: {
    flex: 1,
    borderRadius: 12,
  },
  addButtonContent: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  filtersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORES.NAV_PRIMARIO,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  filtersButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filtersButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORES.NAV_PRIMARIO,
  },
});

