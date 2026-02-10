import { Input } from 'antd';

const { TextArea: AntTextArea } = Input;

/**
 * TextArea reutilizable basado en Ant Design Input.TextArea.
 */
export default function TextArea({
  label,
  value,
  onChange,
  error,
  required,
  id,
  rows = 3,
  placeholder,
  maxLength,
  style,
  className = '',
  ...rest
}) {
  const inputId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;

  return (
    <div className={className} style={{ marginBottom: '0.75rem', ...style }}>
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
      <AntTextArea
        id={inputId}
        value={value}
        onChange={(e) => onChange && onChange(e)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        status={error ? 'error' : ''}
        style={{ width: '100%' }}
        {...rest}
      />
      {error && (
        <div
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
}
