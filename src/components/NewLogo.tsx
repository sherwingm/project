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

const LOGO_IMAGE = '/QIP.jpeg';

export const NewLogo: FC<NewLogoProps> = ({ size = 'md' }) => {
  const classes = sizeClasses[size] ?? sizeClasses.md;

  return (
    <div className="flex items-center space-x-3">
      <img
        src={LOGO_IMAGE}
        alt="BudgeSplit"
        className={`${classes} rounded-2xl object-cover shadow-lg shadow-violet-500/20 flex-shrink-0 border border-white/10`}
      />
      <div className="hidden sm:flex flex-col leading-tight">
        <span className="font-display font-bold text-slate-100 tracking-tight">
          Budget Split Expenser
          </span>
        <span className="text-xs text-slate-400 font-medium tracking-wide">
          Smart expense sharing
        </span>
      </div>
    </div>
  );
};

