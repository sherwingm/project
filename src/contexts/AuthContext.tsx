import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, phone: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string, upiId?: string) => Promise<void>;
  updateUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    const storedUser = apiService.getCurrentUser();
    if (storedUser) {
      console.log('Found stored user:', storedUser);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const redirectToPendingJoin = () => {
    const pendingJoinUrl = localStorage.getItem('pendingJoinUrl');
    if (pendingJoinUrl) {
      localStorage.removeItem('pendingJoinUrl');
      window.location.assign(pendingJoinUrl);
    }
  };

  const login = async (email: string, phone: string, password: string) => {
    try {
      console.log('AuthContext login called with:', { email, phone });
      const response = await apiService.login(email, phone, password);
      console.log('Login successful:', response);
      setUser(response.user);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      redirectToPendingJoin();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, phone: string, password: string, upiId?: string) => {
    try {
      console.log('AuthContext register called with:', { name, email, phone, upiId });
      const response = await apiService.register(name, email, phone, password, upiId);
      console.log('Registration successful:', response);
      setUser(response.user);
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      redirectToPendingJoin();
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  const logout = () => {
    console.log('AuthContext logout called');
    apiService.logout();
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  console.log('AuthProvider render - user:', user, 'isLoading:', isLoading);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
