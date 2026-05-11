const API_BASE_URL = '/api';

// Types
export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  upiId?: string;
}

export interface UserLookupResponse {
  id?: string;
  name?: string;
  upiId?: string;
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
  upiId?: string;
  color: string;
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  splitMethod?: 'equal' | 'exact' | 'shares' | 'percentage';
  splits?: Array<{
    userId: string;
    amountOwed: number;
  }>;
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
  settlements?: Array<{
    from: string;
    fromId?: string;
    to: string;
    toId?: string;
    amount: number;
    settledAt: string;
  }>;
  shareCode: string;
  shareToken?: string;
  createdAt: string;
  autoDelete?: boolean;
  deleteAfter?: 'immediately' | '1-day' | '3-days' | '7-days';
  deleteScheduledAt?: string;
}

export interface SharedSettlement {
  from: string;
  to: string;
  amount: number;
}

export interface SharedExpense {
  id: string;
  name: string;
  amount: number;
  paidBy: string;
  paidByName: string;
  splitBetween: string[];
  category: string;
  date: string;
}

export interface SharedGroupResponse {
  id: string;
  groupName: string;
  creatorName: string;
  memberCount: number;
  members: Array<{
    id: string;
    name: string;
    color?: string;
  }>;
  expenses: SharedExpense[];
  settlements: SharedSettlement[];
  simplifiedSettlements?: SharedSettlement[];
}

export interface ReceiptScanResponse {
  rawText?: string;
  shopName?: string;
  totalAmount?: number | null;
  confidence?: number | null;
  nameConfident?: boolean;
  amountConfident?: boolean;
}

interface CreateGroupOptions {
  autoDelete?: boolean;
  deleteAfter?: 'immediately' | '1-day' | '3-days' | '7-days';
}

// API Service
class ApiService {
  private token: string | null = null;

  private normalizeGroup(group: any): Group {
    const expenses = Array.isArray(group.expenses) ? group.expenses : [];
    const members = Array.isArray(group.members) ? group.members : [];
    const settlements = Array.isArray(group.settlements) ? group.settlements : [];

    return {
      ...group,
      id: group.id || group._id,
      expenses,
      members,
      settlements,
    };
  }

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
      const error = await response.json().catch(() => null);
      console.error('API Error:', error);
      throw new Error(error?.error || response.statusText || 'Request failed');
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

  async register(name: string, email: string, phone: string, password: string, upiId?: string): Promise<LoginResponse> {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password, upiId }),
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
    const groups = await this.request('/groups');
    return Array.isArray(groups) ? groups.map((g) => this.normalizeGroup(g)) : [];
  }

  async createGroup(name: string, members: string[], options?: CreateGroupOptions): Promise<Group> {
    const group = await this.request('/groups', {
      method: 'POST',
      body: JSON.stringify({
        name,
        members,
        autoDelete: options?.autoDelete ?? false,
        deleteAfter: options?.deleteAfter ?? 'immediately',
      }),
    });

    return this.normalizeGroup(group);
  }

  async generateShareToken(groupId: string): Promise<string> {
    const response = await this.request(`/groups/${groupId}/generate-share-token`, {
      method: 'POST',
    });

    return response.shareToken;
  }

  async joinGroup(shareCode: string): Promise<Group> {
    const group = await this.request('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ shareCode }),
    });

    return this.normalizeGroup(group);
  }

  async getGroupInvitePreview(groupId: string): Promise<{
    id: string;
    groupName: string;
    creatorName: string;
    memberCount: number;
  }> {
    return this.request(`/groups/${groupId}/invite-preview`);
  }

  async joinGroupById(groupId: string): Promise<Group> {
    const group = await this.request(`/groups/${groupId}/join`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    return this.normalizeGroup(group);
  }

  async getSharedGroup(token: string): Promise<SharedGroupResponse> {
    return this.request(`/share/${token}`);
  }

  async joinGroupByToken(shareToken: string): Promise<Group> {
    const group = await this.request('/groups/join-by-token', {
      method: 'POST',
      body: JSON.stringify({ shareToken }),
    });

    return this.normalizeGroup(group);
  }

  async scanReceipt(imageBase64: string, mimeType: string): Promise<ReceiptScanResponse> {
    return this.request('/ocr/scan-receipt', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType }),
    });
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.request(`/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  async addExpense(groupId: string, expense: Omit<ExpenseItem, 'id' | 'date'>): Promise<ExpenseItem> {
    return this.request(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify({
        groupId,
        ...expense,
      }),
    });
  }

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    await this.request(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'DELETE',
    });
  }

  async updateExpense(
    groupId: string,
    expenseId: string,
    updates: Partial<Omit<ExpenseItem, 'id'>>
  ): Promise<ExpenseItem> {
    return this.request(`/groups/${groupId}/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
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

  async updateUserProfile(userId: string, name?: string, upiId?: string): Promise<User> {
    const body: Record<string, string> = {};

    if (name !== undefined) {
      body.name = name;
    }

    if (upiId !== undefined) {
      body.upiId = upiId;
    }

    const response = await this.request(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return response.user;
  }

  async getUserProfile(userId: string): Promise<User> {
    const response = await this.request(`/users/${userId}/profile`);
    return response.user;
  }

  async getUserByName(name: string): Promise<UserLookupResponse> {
    if (!name.trim()) return {};

    return this.request(`/users/by-name/${encodeURIComponent(name.trim())}`);
  }

  async updateUserUpiId(userId: string, upiId: string): Promise<User> {
    const response = await this.request(`/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify({ upiId }),
    });

    return response.user;
  }

  async recordSettlement(
    groupId: string,
    settlementData: { from: string; fromId?: string; to: string; toId?: string; amount: number }
  ) {
    const response = await this.request(`/groups/${groupId}/settlements`, {
      method: 'POST',
      body: JSON.stringify(settlementData),
    });

    return this.normalizeGroup(response);
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
