import { Spin } from 'antd';

export default function LoadingSpinner({ size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="status"
      aria-label="Cargando"
    >
      <Spin />
    </div>
  );
}
