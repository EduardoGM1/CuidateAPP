import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { COLORES } from '../theme/colors';

const antdTestTheme = {
  token: {
    colorPrimary: COLORES.PRIMARIO,
    colorSuccess: COLORES.EXITO,
    colorError: COLORES.ERROR,
    colorWarning: COLORES.ADVERTENCIA,
    colorText: COLORES.TEXTO_PRIMARIO,
    colorTextSecondary: COLORES.TEXTO_SECUNDARIO,
    colorBgContainer: COLORES.FONDO_CARD,
    colorBorder: COLORES.BORDE_CLARO,
    borderRadius: 8,
    fontFamily: 'system-ui, sans-serif',
  },
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

/**
 * Render con Router, React Query y Ant Design (paridad con main.jsx).
 * @param {import('react').ReactElement} ui - Elemento raíz (p. ej. rutas con `<Route />`).
 * @param {{ initialEntries?: string[] }} [options]
 */
export function renderWithProviders(ui, options = {}) {
  const { initialEntries = ['/'] } = options;
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTestTheme}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
