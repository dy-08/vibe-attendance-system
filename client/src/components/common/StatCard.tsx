import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  icon: ReactNode;
  iconVariant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  label: string;
  value: string | number;
  change?: {
    value: string;
    positive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export default function StatCard({
  icon,
  iconVariant = 'primary',
  label,
  value,
  change,
  className,
  onClick,
}: StatCardProps) {
  return (
    <div 
      className={clsx('stat-card', onClick && 'stat-card--clickable', className)}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className={`stat-card__icon stat-card__icon--${iconVariant}`}>
        {icon}
      </div>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {change && (
        <span className={`stat-card__change stat-card__change--${change.positive ? 'positive' : 'negative'}`}>
          {change.positive ? '↑' : '↓'} {change.value}
        </span>
      )}
    </div>
  );
}

