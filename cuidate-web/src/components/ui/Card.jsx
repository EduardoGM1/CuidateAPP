import { Card as AntCard } from 'antd';

/**
 * Card reutilizable basada en Ant Design.
 * Mantiene la API básica (children, className, style, ...rest).
 */
export default function Card({ children, className = '', style = {}, ...rest }) {
  return (
    <AntCard className={className} style={style} {...rest}>
      {children}
    </AntCard>
  );
}
