import { clsx } from 'clsx';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  ring?: boolean;
  className?: string;
}

export default function Avatar({ 
  src, 
  name = '', 
  size = 'md', 
  status,
  ring = false,
  className 
}: AvatarProps) {
  // Get initials from name
  const getInitials = (name: string) => {
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const classes = clsx(
    'avatar',
    `avatar--${size}`,
    ring && 'avatar--ring',
    className
  );

  return (
    <div className={classes}>
      {src ? (
        <img src={src} alt={name} />
      ) : (
        <span>{getInitials(name)}</span>
      )}
      {status && (
        <span className={`avatar__status avatar__status--${status}`} />
      )}
    </div>
  );
}

