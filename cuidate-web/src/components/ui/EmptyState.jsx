import { Empty as AntEmpty, Button as AntButton } from 'antd';

/**
 * Estado vacío reutilizable (sin datos), basado en Ant Design.
 */
export default function EmptyState({ message = 'No hay datos', actionLabel, onAction }) {
  return (
    <div style={{ padding: '1.5rem 0' }}>
      <AntEmpty
        description={message}
        image={AntEmpty.PRESENTED_IMAGE_SIMPLE}
      >
        {actionLabel && onAction && (
          <AntButton type="primary" onClick={onAction}>
            {actionLabel}
          </AntButton>
        )}
      </AntEmpty>
    </div>
  );
}
