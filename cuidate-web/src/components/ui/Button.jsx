import { forwardRef } from 'react';
import { Button as AntButton } from 'antd';

const variantTypeMap = {
  primary: 'primary',
  secondary: 'default',
  outline: 'default',
  danger: 'primary',
};

/**
 * Botón reutilizable ahora basado en Ant Design.
 * Mantiene la API existente (type, variant, ...rest).
 */
const Button = forwardRef(function Button(
  { type = 'button', variant = 'primary', disabled, children, className = '', style = {}, ...rest },
  ref
) {
  const antType = variantTypeMap[variant] || 'primary';
  const danger = variant === 'danger';

  return (
    <AntButton
      ref={ref}
      type={antType}
      danger={danger}
      disabled={disabled}
      className={className}
      style={style}
      htmlType={type}
      {...rest}
    >
      {children}
    </AntButton>
  );
});

export default Button;
