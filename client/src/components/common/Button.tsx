import { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: boolean;
  full?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon = false,
  full = false,
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = clsx(
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    icon && 'btn--icon',
    full && 'btn--full',
    loading && 'btn--loading',
    className
  );

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
}

