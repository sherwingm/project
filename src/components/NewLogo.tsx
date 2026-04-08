import type { FC } from 'react';

type LogoSize = 'sm' | 'md' | 'lg';

interface NewLogoProps {
  size?: LogoSize;
}

const sizeClasses: Record<LogoSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const LOGO_IMAGE = '/OIP.jpeg';

export const NewLogo: FC<NewLogoProps> = ({ size = 'md' }) => {
  const classes = sizeClasses[size] ?? sizeClasses.md;

  return (
    <div className={`flex items-center space-x-2`}>
      <img
        src={LOGO_IMAGE}
        alt="BudgeSplit"
        className={`${classes} rounded-2xl object-cover shadow-sm flex-shrink-0`}
      />
      <div className="hidden sm:flex flex-col leading-tight">
      <span className={`font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent `}>
            BudgeSplit
          </span>
        <span className="text-xs text-gray-500 font-medium">
            Smart Expense Sharing
          </span>
      </div>
    </div>
  );
};

