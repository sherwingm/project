import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';

interface DropdownMenuItemProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export const DropdownMenuItem: FC<DropdownMenuItemProps> = ({
  icon: Icon,
  title,
  subtitle,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-start space-x-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 focus:outline-none ${className}`}
    >
      <span className="mt-0.5">
        <Icon className="h-4 w-4 text-gray-500" />
      </span>
      <span className="flex flex-col">
        <span className="font-medium text-gray-900">{title}</span>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </span>
    </button>
  );
};

