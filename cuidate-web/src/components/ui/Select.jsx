import { Select as AntSelect } from 'antd';

/**
 * Select reutilizable basado en Ant Design.
 * options: [{ label, value }] o usar children (option elements).
 */
export default function Select({
  label,
  options = [],
  placeholder = 'Seleccionar…',
  value,
  onChange,
  error,
  required,
  id,
  disabled,
  style,
  className = '',
  ...rest
}) {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
  const antOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null && 'value' in opt
      ? { label: opt.label ?? opt.children ?? String(opt.value), value: opt.value }
      : { label: String(opt), value: opt }
  );

  return (
    <div className={className} style={{ marginBottom: '0.75rem', ...style }}>
      {label && (
        <label
          htmlFor={selectId}
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
      <AntSelect
        id={selectId}
        placeholder={placeholder}
        value={value === undefined ? undefined : value}
        onChange={onChange}
        options={antOptions}
        status={error ? 'error' : ''}
        disabled={disabled}
        style={{ width: '100%' }}
        allowClear
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
