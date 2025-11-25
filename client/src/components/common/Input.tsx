import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

// Input
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  icon,
  iconRight,
  inputSize = 'md',
  className,
  required,
  ...props
}, ref) => {
  const inputClasses = clsx(
    'input',
    inputSize !== 'md' && `input--${inputSize}`,
    error && 'input--error',
    icon && 'input--with-icon-left',
    iconRight && 'input--with-icon-right',
    className
  );

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {icon && <span className="input-icon">{icon}</span>}
        <input ref={ref} className={inputClasses} {...props} />
        {iconRight && <span className="input-icon-right">{iconRight}</span>}
      </div>
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

// Select
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  hint,
  options,
  inputSize = 'md',
  className,
  required,
  ...props
}, ref) => {
  const selectClasses = clsx(
    'select',
    inputSize !== 'md' && `input--${inputSize}`,
    error && 'input--error',
    className
  );

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <select ref={ref} className={selectClasses} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';

// Textarea
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  hint,
  className,
  required,
  ...props
}, ref) => {
  const textareaClasses = clsx(
    'input',
    error && 'input--error',
    className
  );

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <textarea ref={ref} className={textareaClasses} {...props} />
      {hint && !error && <p className="form-hint">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Search Input
interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

export function SearchInput({ 
  placeholder = '검색...', 
  onSearch,
  className,
  ...props 
}: SearchInputProps) {
  return (
    <div className={clsx('search-input', className)}>
      <span className="search-icon">
        <SearchIcon />
      </span>
      <input
        type="text"
        className="input"
        placeholder={placeholder}
        onChange={(e) => onSearch?.(e.target.value)}
        {...props}
      />
    </div>
  );
}

