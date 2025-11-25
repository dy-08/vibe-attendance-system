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
}

export default function StatCard({
  icon,
  iconVariant = 'primary',
  label,
  value,
  change,
  className,
}: StatCardProps) {
  return (
    <div className={clsx('stat-card', className)}>
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

