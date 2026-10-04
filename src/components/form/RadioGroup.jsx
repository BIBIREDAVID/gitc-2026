import { forwardRef } from 'react';

const RadioGroup = forwardRef(function RadioGroup(
  { id, legend, options, value, onChange, error, required, hint },
  ref
) {
  return (
    <fieldset
      className="field"
      ref={ref}
      tabIndex={-1}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend>
        {legend}
        {required && (
          <span className="field-required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </legend>
      {hint && <p className="field-hint">{hint}</p>}
      <div className="option-list">
        {options.map((opt) => (
          <label className="option" key={opt.id}>
            <input
              type="radio"
              name={id}
              value={opt.id}
              checked={value === opt.id}
              onChange={() => onChange(opt.id)}
              aria-required={required || undefined}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
});

export default RadioGroup;
