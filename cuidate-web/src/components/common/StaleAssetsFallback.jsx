import { useEffect, useState } from 'react';
import { useRouteError } from 'react-router-dom';
import { Button } from '../ui';
import { isChunkLoadError, reloadOnceForStaleChunk } from '../../utils/chunkLoadRecovery';

/**
 * Sustituye el error genérico de React Router cuando falla un import dinámico.
 */
export default function StaleAssetsFallback({ autoReload = false }) {
  const routeError = useRouteError();
  const stale = isChunkLoadError(routeError);
  const [reloadFailed, setReloadFailed] = useState(false);

  useEffect(() => {
    if (!autoReload || !stale) return;
    const didReload = reloadOnceForStaleChunk();
    if (!didReload) setReloadFailed(true);
  }, [autoReload, stale]);

  const title = stale || reloadFailed
    ? 'Nueva versión disponible'
    : 'Algo salió mal';

  const description = stale || reloadFailed
    ? 'La aplicación se actualizó. Recarga la página para continuar (se conservará tu sesión si sigues en la misma pestaña).'
    : 'Ocurrió un error inesperado. Puedes reintentar o volver al inicio.';

  return (
    <div
      role="alert"
      style={{
        padding: '2rem',
        maxWidth: 520,
        margin: '3rem auto',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{title}</h1>
      <p style={{ color: 'var(--color-texto-secundario)', marginBottom: '1.25rem' }}>{description}</p>
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="primary"
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Recargar aplicación
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
