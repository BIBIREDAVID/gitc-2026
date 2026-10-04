import { forwardRef } from 'react';

const TextField = forwardRef(function TextField(
  {
    id,
    label,
    type = 'text',
    value,
    onChange,
    error,
    required,
    autoComplete,
    inputMode,
    placeholder,
    hint,
  },
  ref
) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="field-required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {hint && <p className="field-hint">{hint}</p>}
      <input
        ref={ref}
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-required={required || undefined}
      />
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default TextField;
