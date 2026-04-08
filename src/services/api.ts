const API_BASE_URL = '/api';

// Types
export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface GroupMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  color: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  category: string;
  date: string;
  receiptImage?: string;
}

export interface Group {
  _id: string;
  id: string;
  name: string;
  createdBy: string;
  members: GroupMember[];
  expenses: ExpenseItem[];
  shareCode: string;
  createdAt: string;
}

// API Service
class ApiService {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    console.log(`Making ${options.method || 'GET'} request to:`, url);
    console.log('Token present:', !!this.token);

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('API Error:', error);
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth methods
  async login(email: string, phone: string, password: string): Promise<LoginResponse> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, phone, password, isLogin: true }),
    });
    
    this.token = response.token;
    localStorage.setItem('authToken', response.token);
    
    return response;
  }

  async register(name: string, email: string, phone: string, password: string): Promise<LoginResponse> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, isLogin: false }),
    });
    
    this.token = response.token;
    localStorage.setItem('authToken', response.token);
    
    return response;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }

  // Group methods
  async getGroups(): Promise<Group[]> {
    return this.request('/groups');
  }

  async createGroup(name: string, members: string[]): Promise<Group> {
    const group = await this.request('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, members }),
    });
    
    // Convert _id to id for frontend compatibility
    return {
      ...group,
      id: group._id
    };
  }

  async joinGroup(shareCode: string): Promise<Group> {
    const group = await this.request('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ shareCode }),
    });
    
    return {
      ...group,
      id: group._id
    };
  }

  async addExpense(groupId: string, expense: Omit<ExpenseItem, 'id' | 'date'>): Promise<ExpenseItem> {
    return this.request(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  }

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    await this.request(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  // Helper method to check if authenticated
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Get current user from token (you might want to decode JWT)
  getCurrentUser(): User | null {
    const userData = localStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
  }

  // Wallet methods
  async getWallet(userId: string) {
    return this.request(`/wallet/${userId}`);
  }

  async getWalletTransactions(userId: string) {
    return this.request(`/wallet/${userId}/transactions`);
  }

  async addWalletTransaction(userId: string, transactionData: any) {
    return this.request(`/wallet/${userId}/transaction`, {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }
}

export const apiService = new ApiService();
