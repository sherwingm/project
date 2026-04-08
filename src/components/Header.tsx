import { useState, useRef, useEffect } from 'react';
import { LogOut, User, Plus, Calculator as CalculatorIcon, HelpCircle, ChevronDown, ChevronLeft, Wallet } from 'lucide-react';
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

export function Header({ currentView, groupName, user, onLogout, onNavigate }: HeaderProps) {
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
    <header className="relative z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <NewLogo size="md" />
          <h1 className="text-3xl font-bold text-gradient-primary font-playfair">Budget Expensive Splitter</h1>
        </div>

        <nav className="flex items-center space-x-4">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md py-2 px-3"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden sm:block">{user.name || user.email}</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 text-xs text-gray-500">Signed in as</div>
                  <div className="px-4 py-2 text-sm font-medium text-gray-900 truncate">{user.email}</div>
                  <div className="border-t border-gray-100 my-1"></div>

                  <DropdownMenuItem
                    icon={User}
                    title="Your account"
                    subtitle="Manage profile settings"
                    onClick={handleAccountClick}
                  />

                  <DropdownMenuItem
                    icon={Plus}
                    title="Create a group"
                    subtitle="Start a new expense group"
                    onClick={handleCreateGroupClick}
                  />

                  <DropdownMenuItem
                    icon={CalculatorIcon}
                    title="Fairness calculators"
                    subtitle="Split expenses fairly"
                    onClick={handleFairnessCalculatorClick}
                  />

                  <DropdownMenuItem
                    icon={Wallet}
                    title="Wallet"
                    subtitle="Manage income and expenses"
                    onClick={handleWalletClick}
                  />

                  <DropdownMenuItem
                    icon={HelpCircle}
                    title="Contact support"
                    subtitle="Get help with the app"
                    onClick={handleSupportClick}
                  />

                  <div className="border-t border-gray-100 my-1"></div>

                  <DropdownMenuItem
                    icon={LogOut}
                    title="Log out"
                    subtitle="Sign out of your account"
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:bg-red-50"
                  />
                </div>
              )}
            </div>
          ) : (
            <button className="text-indigo-600 hover:text-indigo-700 font-medium">
              Sign in
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}