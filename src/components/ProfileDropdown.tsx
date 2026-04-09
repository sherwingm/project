import React, { useState, useRef, useEffect } from 'react';
import { User, Plus, Calculator, Wallet, HelpCircle, LogOut, ChevronDown } from 'lucide-react';

interface ProfileDropdownProps {
  userName?: string;
  userEmail?: string;
  onAccountClick?: () => void;
  onCreateGroup?: () => void;
  onFairness?: () => void;
  onWallet?: () => void;
  onSupport?: () => void;
  onLogout?: () => void;
}

export function ProfileDropdown({ 
  userName = 'User', 
  userEmail = 'user@example.com',
  onAccountClick = () => {},
  onCreateGroup = () => {},
  onFairness = () => {},
  onWallet = () => {},
  onSupport = () => {},
  onLogout = () => {}
}: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    {
      icon: User,
      title: 'Your account',
      subtitle: 'Manage profile settings',
      onClick: onAccountClick
    },
    {
      icon: Plus,
      title: 'Create a group',
      subtitle: 'Start a new expense group',
      onClick: onCreateGroup
    },
    {
      icon: Calculator,
      title: 'Fairness calculators',
      subtitle: 'Split expenses fairly',
      onClick: onFairness
    },
    {
      icon: Wallet,
      title: 'Wallet',
      subtitle: 'Manage income and expenses',
      onClick: onWallet
    },
    {
      icon: HelpCircle,
      title: 'Contact support',
      subtitle: 'Get help with the app',
      onClick: onSupport
    },
    {
      icon: LogOut,
      title: 'Log out',
      subtitle: 'Sign out of your account',
      onClick: onLogout
    }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition-all duration-200 hover:bg-white/10"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-violet-400/60 bg-gradient-to-br from-violet-500 to-cyan-500 font-semibold text-sm text-white">
          {userName.charAt(0).toUpperCase()}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/8 bg-[#1a1a2e] shadow-2xl shadow-slate-950/40">
          {/* Header Section */}
          <div className="border-b border-white/8 px-4 py-3 bg-white/5">
            <p className="mb-1 text-xs text-slate-400">Signed in as</p>
            <p className="truncate text-sm font-semibold text-slate-100">{userEmail}</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    item.onClick();
                    setIsOpen(false);
                  }}
                    className="group flex w-full items-center space-x-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/5"
                >
                    <div className="flex h-5 w-5 flex-shrink-0 text-slate-400 transition-colors duration-200 group-hover:text-white">
                    <Icon className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{item.title}</p>
                      <p className="truncate text-xs text-slate-400">{item.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
