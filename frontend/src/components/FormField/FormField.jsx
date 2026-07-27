import './FormField.css'

export function FormField({ label, error, hint, children }) {
  return (
    <label className="form-field">
      <span className="form-field-label">{label}</span>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="form-field-hint">{hint}</span>
      )}
    </label>
  )
}
