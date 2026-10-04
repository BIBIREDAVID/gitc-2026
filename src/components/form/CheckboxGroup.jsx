import { forwardRef } from 'react';

const CheckboxGroup = forwardRef(function CheckboxGroup(
  { id, legend, options, values, onToggle, error, required, hint },
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
              type="checkbox"
              name={id}
              value={opt.id}
              checked={values.includes(opt.id)}
              onChange={() => onToggle(opt.id)}
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

export default CheckboxGroup;
