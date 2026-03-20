interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  required?: boolean;
}

export function FormField({
  id, label, type = 'text', placeholder, value, onChange, error, autoComplete, required,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition
          focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
          ${error ? 'border-red-400 bg-red-50' : 'border-zinc-300 bg-white hover:border-zinc-400'}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
