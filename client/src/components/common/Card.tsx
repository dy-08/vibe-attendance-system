import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  flat?: boolean;
  accent?: 'default' | 'success' | 'warning' | 'error';
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ 
  children, 
  className, 
  hover = false, 
  flat = false,
  accent,
  onClick,
  style
}: CardProps) {
  const classes = clsx(
    'card',
    hover && 'card--hover',
    flat && 'card--flat',
    accent && `card--accent-${accent}`,
    onClick && 'cursor-pointer',
    className
  );

  return (
    <div className={classes} onClick={onClick} style={style}>
      {children}
    </div>
  );
}

export function CardHeader({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={clsx('card__header', className)}>
      {children}
    </div>
  );
}

export function CardBody({ 
  children, 
  className,
  style
}: { 
  children: ReactNode; 
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={clsx('card__body', className)} style={style}>
      {children}
    </div>
  );
}

export function CardFooter({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={clsx('card__footer', className)}>
      {children}
    </div>
  );
}

