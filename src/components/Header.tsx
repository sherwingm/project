import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Plus, Calculator as CalculatorIcon, HelpCircle, ChevronDown, ChevronLeft, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NewLogo } from './NewLogo';
import { DropdownMenuItem } from './DropdownMenuItem';
import { User as ApiUser } from '../services/api';

interface HeaderProps {
  currentView: 'groups' | 'group' | 'add-expense' | 'create-group' | 'account' | 'wallet' | 'fairness-calculator' | 'contact-support';
  groupName?: string;
  user?: ApiUser;
  onLogout?: () => void;
  onNavigate?: (view: 'groups' | 'group' | 'add-expense' | 'create-group' | 'account' | 'wallet' | 'fairness-calculator' | 'contact-support') => void;
}

export function Header({ currentView, groupName: _groupName, user, onLogout, onNavigate }: HeaderProps) {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateGroupClick = () => {
    onNavigate?.('create-group');
    setIsDropdownOpen(false);
  };

  const handleAccountClick = () => {
    onNavigate?.('account');
    setIsDropdownOpen(false);
  };

  const handleFairnessCalculatorClick = () => {
    onNavigate?.('fairness-calculator');
    setIsDropdownOpen(false);
  };

  const handleSupportClick = () => {
    onNavigate?.('contact-support');
    setIsDropdownOpen(false);
  };

  const handleWalletClick = () => {
    onNavigate?.('wallet');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    onLogout?.();
    setIsDropdownOpen(false);
  };

  const showBackButton = currentView !== 'groups';
  const handleBack = () => {
    if (!onNavigate) return;
    if (currentView === 'add-expense') onNavigate('group');
    else if (currentView === 'group' || currentView === 'create-group' || currentView === 'account' || currentView === 'wallet' || currentView === 'fairness-calculator' || currentView === 'contact-support') onNavigate('groups');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0f0f1a]/85 backdrop-blur-xl shadow-[0_10px_40px_rgba(2,6,23,0.35)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center space-x-3">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 transition-all hover:bg-white/5 hover:text-white"
              aria-label={t('nav.goBack')}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <NewLogo size="sm" />
        </div>

        <nav className="flex items-center space-x-4">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-slate-200 shadow-sm transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-400/60 bg-gradient-to-br from-violet-500 to-violet-700 font-semibold text-sm text-white shadow-[0_0_0_3px_rgba(124,58,237,0.15)]">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden max-w-[12rem] truncate font-sans text-sm font-medium sm:block">{user.name || user.email}</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/8 bg-[#1a1a2e] py-2 shadow-2xl shadow-slate-950/40">
                  <div className="px-4 py-2 text-xs text-slate-300">{t('nav.signedInAs')}</div>
                  <div className="px-4 pb-2 text-sm font-medium truncate text-slate-100">{user.email}</div>
                  <div className="my-1 border-t border-white/8"></div>

                  <DropdownMenuItem
                    icon={User}
                    title={t('nav.yourAccount')}
                    subtitle={t('nav.manageProfileSettings')}
                    onClick={handleAccountClick}
                  />

                  <DropdownMenuItem
                    icon={Plus}
                    title={t('nav.createGroup')}
                    subtitle={t('nav.startNewExpenseGroup')}
                    onClick={handleCreateGroupClick}
                  />

                  <DropdownMenuItem
                    icon={CalculatorIcon}
                    title={t('nav.fairnessCalculators')}
                    subtitle={t('nav.splitExpensesFairly')}
                    onClick={handleFairnessCalculatorClick}
                  />

                  <DropdownMenuItem
                    icon={Wallet}
                    title={t('nav.wallet')}
                    subtitle={t('nav.manageIncomeAndExpenses')}
                    onClick={handleWalletClick}
                  />

                  <DropdownMenuItem
                    icon={HelpCircle}
                    title={t('nav.contactSupport')}
                    subtitle={t('nav.getHelp')}
                    onClick={handleSupportClick}
                  />

                  <div className="my-1 border-t border-white/8"></div>

                  <DropdownMenuItem
                    icon={LogOut}
                    title={t('nav.logOut')}
                    subtitle={t('nav.signOut')}
                    onClick={handleLogout}
                    className="text-sm text-red-300 hover:bg-red-500/10"
                  />
                </div>
              )}
            </div>
          ) : (
            <button className="font-sans font-medium tracking-wide text-violet-300 hover:text-violet-200">
              {t('nav.signIn')}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}