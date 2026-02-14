import { useState, useCallback } from 'react';

/**
 * Hook reutilizable para controlar un modal de sección (abrir/cerrar por id).
 * Útil en detalle de paciente u otras vistas con múltiples modales por sección.
 *
 * @returns {{ sectionId: string | null, openSection: (id: string) => void, closeSection: () => void }}
 */
export function useSectionModal() {
  const [sectionId, setSectionId] = useState(null);

  const openSection = useCallback((id) => {
    setSectionId(id);
  }, []);

  const closeSection = useCallback(() => {
    setSectionId(null);
  }, []);

  return {
    sectionId,
    openSection,
    closeSection,
  };
}
