import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import 'antd/dist/reset.css';
import './theme/globals.css';
import App from './App';
import { COLORES } from './theme/colors';
import { setupChunkLoadRecovery, syncBuildVersionOnStartup } from './utils/chunkLoadRecovery';

setupChunkLoadRecovery();
syncBuildVersionOnStartup();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minuto de frescura
      refetchOnWindowFocus: false,
    },
  },
});

/** Tema Ant Design — minimalista, alineado con CSS variables */
const antdTheme = {
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
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
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
