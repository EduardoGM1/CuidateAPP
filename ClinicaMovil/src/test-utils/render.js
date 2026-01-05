/**
 * @file render.js
 * @description Custom render con providers para testing
 * @author Senior Developer
 * @date 2025-11-08
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

/**
 * Custom render que incluye todos los providers necesarios
 * 
 * Nota: Los providers reales (AuthProvider, DetallePacienteProvider) están mockeados
 * en setup-detalle-paciente.js, por lo que este wrapper simplemente pasa los children.
 * 
 * @param {React.ReactElement} ui - Componente a renderizar
 * @param {Object} options - Opciones adicionales para render
 * @returns {Object} - Objeto con métodos de testing library
 * 
 * @example
 * const { getByText } = renderWithProviders(
 *   <DetallePaciente route={mockRoute} navigation={mockNavigation} />
 * );
 */
export const renderWithProviders = (ui, options = {}) => {
  // Los providers están mockeados en setup-detalle-paciente.js
  // Este wrapper simplemente pasa los children
  const AllTheProviders = ({ children }) => {
    return <View>{children}</View>;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Re-exportar todo de React Native Testing Library
export * from '@testing-library/react-native';

// Exportar el custom render como default
export { renderWithProviders as render };

