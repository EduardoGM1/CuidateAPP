import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import 'antd/dist/reset.css';
import './theme/globals.css';
import App from './App';
import { COLORES } from './theme/colors';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minuto de frescura
      refetchOnWindowFocus: false,
    },
  },
});

/** Tema Ant Design con paleta IMSS Bienestar (igual que app móvil) */
const antdTheme = {
  token: {
    colorPrimary: COLORES.PRIMARIO,
    colorSuccess: COLORES.EXITO,
    colorError: COLORES.ERROR,
    colorWarning: COLORES.SECUNDARIO_DARK,
    colorText: COLORES.TEXTO_PRIMARIO,
    colorTextSecondary: COLORES.TEXTO_SECUNDARIO,
    colorBgContainer: COLORES.FONDO_CARD,
    colorBorder: COLORES.BORDE_CLARO,
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme}>
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>
);
