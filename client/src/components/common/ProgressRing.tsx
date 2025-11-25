import { clsx } from 'clsx';

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export default function ProgressRing({
  value,
  max = 100,
  size = 'md',
  label = '%',
  color = 'primary',
  className,
}: ProgressRingProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Size configurations
  const sizeConfig = {
    sm: { size: 80, strokeWidth: 6, radius: 34 },
    md: { size: 120, strokeWidth: 8, radius: 52 },
    lg: { size: 160, strokeWidth: 10, radius: 70 },
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color map
  const colorMap = {
    primary: 'var(--color-primary-500)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
  };

  return (
    <div className={clsx('progress-ring', `progress-ring--${size}`, className)}>
      <svg className="progress-ring__svg" width={config.size} height={config.size}>
        <circle
          className="progress-ring__bg"
          cx={config.size / 2}
          cy={config.size / 2}
          r={config.radius}
          strokeWidth={config.strokeWidth}
        />
        <circle
          className="progress-ring__progress"
          cx={config.size / 2}
          cy={config.size / 2}
          r={config.radius}
          strokeWidth={config.strokeWidth}
          style={{
            stroke: colorMap[color],
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className="progress-ring__text">
        <span className="progress-ring__text-value">{Math.round(percentage)}</span>
        <span className="progress-ring__text-label">{label}</span>
      </div>
    </div>
  );
}

