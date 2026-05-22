import { Component } from 'react';
import { Button } from '../ui';
import { isChunkLoadError, reloadOnceForStaleChunk } from '../../utils/chunkLoadRecovery';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, staleAssets: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, staleAssets: isChunkLoadError(error) };
  }

  componentDidCatch(error, info) {
    if (this.state.staleAssets) {
      reloadOnceForStaleChunk();
      return;
    }
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info?.componentStack);
    }
  }

  handleRetry = () => {
    if (this.state.staleAssets) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, staleAssets: false });
  };

  render() {
    if (this.state.hasError) {
      const title = this.state.staleAssets ? 'Nueva versión disponible' : 'Algo salió mal';
      const description = this.state.staleAssets
        ? 'La aplicación se actualizó. Recarga para obtener la última versión.'
        : 'Ocurrió un error inesperado. Puedes reintentar o volver al inicio.';

      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            maxWidth: 480,
            margin: '3rem auto',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{title}</h1>
          <p style={{ color: 'var(--color-texto-secundario)', marginBottom: '1.25rem' }}>{description}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" type="button" onClick={this.handleRetry}>
              {this.state.staleAssets ? 'Recargar aplicación' : 'Reintentar'}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Ir al inicio
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
