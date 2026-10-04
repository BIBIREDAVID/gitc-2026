import { forwardRef } from 'react';

const Checkbox = forwardRef(function Checkbox({ id, label, checked, onChange, error, required }, ref) {
  return (
    <div className="field">
      <label className="option option-consent">
        <input
          ref={ref}
          id={id}
          name={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-required={required || undefined}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Checkbox;
