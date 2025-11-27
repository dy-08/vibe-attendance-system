import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  outline?: boolean;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export default function Badge({
  variant = 'default',
  size = 'md',
  outline = false,
  dot = false,
  children,
  className,
}: BadgeProps) {
  const classes = clsx(
    'badge',
    `badge--${variant}`,
    size !== 'md' && `badge--${size}`,
    outline && 'badge--outline',
    className
  );

  return (
    <span className={classes}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}

// Attendance status badge
export function AttendanceBadge({ 
  status 
}: { 
  status: string;
}) {
  const statusMap: Record<string, { label: string; variant: string }> = {
    PRESENT: { label: '출석', variant: 'success' },
    ABSENT: { label: '결석', variant: 'error' },
    LATE: { label: '지각', variant: 'warning' },
    EARLY_LEAVE: { label: '조퇴', variant: 'default' },
    SICK_LEAVE: { label: '병가', variant: 'info' },
    VACATION: { label: '휴가', variant: 'secondary' },
  };

  const config = statusMap[status] || { label: status, variant: 'default' };

  return (
    <Badge variant={config.variant as any} dot>
      {config.label}
    </Badge>
  );
}

// Role badge
export function RoleBadge({ 
  role 
}: { 
  role: string;
}) {
  const roleMap: Record<string, { label: string; className: string }> = {
    GUEST: { label: '손님', className: 'role-badge role-badge--guest' },
    STUDENT: { label: '학생', className: 'role-badge role-badge--student' },
    TEACHER: { label: '선생님', className: 'role-badge role-badge--teacher' },
    SUPER_ADMIN: { label: '관리자', className: 'role-badge role-badge--admin' },
  };

  const config = roleMap[role] || { label: role, className: 'badge badge--default' };

  return (
    <span className={config.className}>
      {config.label}
    </span>
  );
}

