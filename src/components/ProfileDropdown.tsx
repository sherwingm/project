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
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
          {userName.charAt(0).toUpperCase()}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
          {/* Header Section */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 mb-1">Signed in as</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{userEmail}</p>
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
                  className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 transition-colors duration-200 text-left group"
                >
                  <div className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-200">
                    <Icon className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                    <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
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
