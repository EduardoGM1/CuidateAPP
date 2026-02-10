import { forwardRef, useCallback } from 'react';
import { Input as AntInput } from 'antd';

const { Password: AntPassword } = AntInput;

function useMergedRef(ref, refFromRegister) {
  return useCallback(
    (el) => {
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
      if (typeof refFromRegister === 'function') refFromRegister(el);
      else if (refFromRegister) refFromRegister.current = el;
    },
    [ref, refFromRegister]
  );
}

/**
 * Input controlado con label y mensaje de error, basado en Ant Design.
 * Para type="password" usa Input.Password de antd (incluye botón mostrar/ocultar).
 * Combina el ref de forwardRef con el ref de react-hook-form (register) para que la validación lea el valor correctamente.
 */
const Input = forwardRef(function Input(
  {
    label,
    type = 'text',
    error,
    autoComplete,
    maxLength = 255,
    required,
    id,
    className = '',
    ...rest
  },
  ref
) {
  const { ref: refFromRegister, ...restWithoutRef } = rest;
  const mergedRef = useMergedRef(ref, refFromRegister);

  const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
  const safeType = ['text', 'email', 'password', 'number', 'search', 'date', 'datetime-local'].includes(type)
    ? type
    : 'text';
  const isPassword = safeType === 'password';

  return (
    <div className={className} style={{ marginBottom: '0.75rem' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: 4,
            fontWeight: 500,
            color: 'rgba(0,0,0,0.88)',
            fontSize: 12,
          }}
        >
          {label}
          {required && <span style={{ color: '#ff4d4f' }}> *</span>}
        </label>
      )}
      {isPassword ? (
        <AntPassword
          ref={mergedRef}
          id={inputId}
          autoComplete={autoComplete}
          maxLength={maxLength}
          status={error ? 'error' : ''}
          {...restWithoutRef}
        />
      ) : (
        <AntInput
          ref={mergedRef}
          id={inputId}
          type={safeType}
          autoComplete={autoComplete}
          maxLength={maxLength}
          status={error ? 'error' : ''}
          {...restWithoutRef}
        />
      )}
      {error && (
        <div
          id={`${inputId}-error`}
          role="alert"
          style={{
            marginTop: 4,
            fontSize: 12,
            color: '#ff4d4f',
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
});

export default Input;
