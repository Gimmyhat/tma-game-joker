import type { ReactNode, MouseEvent, FC } from 'react';
import { Link } from 'react-router';

interface DropdownItemProps {
  tag?: 'a' | 'button';
  to?: string;
  onClick?: () => void;
  onItemClick?: () => void;
  baseClassName?: string;
  className?: string;
  children: ReactNode;
}

export const DropdownItem: FC<DropdownItemProps> = ({
  tag = 'button',
  to,
  onClick,
  onItemClick,
  baseClassName = 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900',
  className = '',
  children,
}) => {
  const combinedClasses = `${baseClassName} ${className}`.trim();

  const handleClick = (event: MouseEvent) => {
    if (tag === 'button') {
      event.preventDefault();
    }
    if (onClick) onClick();
    if (onItemClick) onItemClick();
  };

  if (tag === 'a' && to) {
    return (
      <Link to={to} className={combinedClasses} onClick={handleClick}>
        {/* Cast needed due to React 18/19 type mismatch in monorepo hoisting */}
        {children as React.ReactNode}
      </Link>
    );
  }

  return (
    <button onClick={handleClick} className={combinedClasses}>
      {children}
    </button>
  );
};
