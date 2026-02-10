import { Tag } from 'antd';

const variantColorMap = {
  success: 'green',
  warning: 'orange',
  error: 'red',
  neutral: 'default',
};

/**
 * Badge reutilizable para estados (activo, pendiente, etc.), basado en Ant Design.
 */
export default function Badge({ children, variant = 'neutral', style = {} }) {
  const color = variantColorMap[variant] || 'default';
  return (
    <Tag color={color} style={style}>
      {children}
    </Tag>
  );
}
