import { useNavigate } from 'react-router-dom';
import { Button } from '../ui';

/**
 * Encabezado de página con título, botón Volver opcional y acción opcional (ej. botón Nuevo/Editar).
 */
export default function PageHeader({ title, showBack = false, backTo = '..', action }) {
  const navigate = useNavigate();

  return (
    <div className="page-header">
      {showBack && (
        <Button variant="outline" type="button" onClick={() => navigate(backTo)}>
          ← Volver
        </Button>
      )}
      <h1>{title}</h1>
      {action}
    </div>
  );
}
