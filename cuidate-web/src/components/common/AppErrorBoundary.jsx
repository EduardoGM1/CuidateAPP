import { Component } from 'react';
import { Button } from '../ui';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info?.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
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
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Algo salió mal</h1>
          <p style={{ color: 'var(--color-texto-secundario)', marginBottom: '1.25rem' }}>
            Ocurrió un error inesperado. Puedes reintentar o volver al inicio.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" type="button" onClick={this.handleRetry}>
              Reintentar
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
