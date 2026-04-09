import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GroupList } from './components/GroupList';
import { GroupView } from './components/GroupView';
import { AddExpenseForm } from './components/AddExpenseForm';
import { CreateGroupView } from './components/CreateGroupView';
import { Login } from './components/Login';
import { AccountSettings } from './components/AccountSettings';
import { Wallet } from './components/Wallet';
import { FairnessCalculator } from './components/FairnessCalculator';
import { ContactSupport } from './components/ContactSupport';
import ShareView from './pages/ShareView';
import { Group, ExpenseItem } from './types';
import { Group as ApiGroup } from './services/api';
import { useAuth } from './contexts/AuthContext';
import { apiService } from './services/api';

// URL utility functions
const getJoinCodeFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('join');
};

const getJoinCodeFromPath = (): string | null => {
  const pathMatch = window.location.pathname.match(/^\/join\/([^/]+)\/?$/);
  return pathMatch?.[1] || null;
};

const clearJoinFromUrl = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('join');
  window.history.replaceState({}, '', url.toString());
};

// Helper function to convert ApiGroup to Group type
function convertApiGroupToGroup(apiGroup: ApiGroup): Group {
  return {
    id: apiGroup.id,
    name: apiGroup.name,
    members: apiGroup.members.map(member => ({
      id: member.id,
      name: member.name,
      color: member.color,
      email: member.email,
      upiId: member.upiId,
    })),
    expenses: apiGroup.expenses.map(expense => ({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      paidBy: expense.paidBy,
      splitBetween: expense.splitBetween,
      category: expense.category,
      date: expense.date
    })),
    settlements: apiGroup.settlements,
    createdAt: apiGroup.createdAt,
    shareCode: apiGroup.shareCode,
    shareToken: apiGroup.shareToken,
    autoDelete: apiGroup.autoDelete,
    deleteAfter: apiGroup.deleteAfter,
    deleteScheduledAt: apiGroup.deleteScheduledAt,
  };
}

function App() {
  const { user, isLoading: authLoading, logout, updateUser } = useAuth();
  const [currentView, setCurrentView] = useState<'groups' | 'group' | 'add-expense' | 'create-group' | 'account' | 'wallet' | 'fairness-calculator' | 'contact-support'>('groups');
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ApiGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);
  const sharePathMatch = window.location.pathname.match(/^\/share\/([^/]+)\/?$/);
  const shareToken = sharePathMatch?.[1] || null;
  const joinPathCode = getJoinCodeFromPath();

  useEffect(() => {
    loadGroups();
  }, [user]);

  // When user is logged in, check for ?join=CODE in URL and open join modal
  useEffect(() => {
    if (!user || isLoading) return;
    const code = joinPathCode || getJoinCodeFromUrl();
    if (code) {
      clearJoinFromUrl();
      if (joinPathCode) {
        window.history.replaceState({}, '', window.location.origin + window.location.pathname.replace(/^\/join\/[^/]+\/?$/, '/'));
      }
      setPendingJoinCode(code);
      setCurrentView('groups');
    }
  }, [user, isLoading, joinPathCode]);

  useEffect(() => {
    if (!user || !pendingJoinCode) return;

    const code = pendingJoinCode;
    setPendingJoinCode(null);
    handleJoinGroup(code).catch(() => undefined);
  }, [user, pendingJoinCode]);

  const loadGroups = async () => {
    if (!user) {
      console.log('No user found, skipping group loading');
      return;
    }
    
    try {
      console.log('Loading groups for user:', user.id);
      setIsLoading(true);
      const userGroups = await apiService.getGroups();
      console.log('Groups loaded successfully:', userGroups);
      setGroups(userGroups);
    } catch (error) {
      console.error('Failed to load groups:', error);
      // Set empty groups to prevent infinite loading
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createGroup = async (
    name: string,
    memberNames: string[],
    options?: { autoDelete: boolean; deleteAfter: 'immediately' | '1-day' | '3-days' | '7-days' }
  ) => {
    try {
      const newGroup = await apiService.createGroup(name, memberNames, options);
      setGroups(prev => [...prev, newGroup]);
      setSelectedGroup(newGroup);
      setCurrentView('group');
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const selectGroup = (group: ApiGroup) => {
    setSelectedGroup(group);
    setCurrentView('group');
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        // Note: You'll need to add deleteGroup API endpoint
        // await apiService.deleteGroup(groupId);
        setGroups(prev => prev.filter(g => g.id !== groupId));
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
          setCurrentView('groups');
        }
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
  };

  const handleJoinGroup = async (shareCode: string) => {
    try {
      const group = await apiService.joinGroup(shareCode);
      // Check if group already exists in state
      const existingGroup = groups.find(g => g.id === group.id);
      if (!existingGroup) {
        setGroups(prev => [...prev, group]);
      }
      selectGroup(group);
    } catch (error) {
      console.error('Failed to join group:', error);
      alert('Failed to join group');
    }
  };

  const addExpense = async (expenseData: Omit<ExpenseItem, 'id'>) => {
    console.log('addExpense called with data:', expenseData);
    console.log('selectedGroup:', selectedGroup);
    console.log('selectedGroup.id:', selectedGroup?.id);
    console.log('selectedGroup._id:', selectedGroup?._id);
    
    if (!selectedGroup || (!selectedGroup.id && !selectedGroup._id)) {
      console.log('No selected group or group ID is undefined, returning');
      return;
    }

    const groupId = selectedGroup.id || selectedGroup._id;
    console.log('Using groupId:', groupId);

    try {
      console.log('Calling apiService.addExpense for group:', groupId);
      const newExpense = await apiService.addExpense(groupId, expenseData);
      console.log('Expense added successfully:', newExpense);
      
      // Update selected group with new expense
      const updatedGroup = {
        ...selectedGroup,
        expenses: [...selectedGroup.expenses, newExpense]
      };
      
      setSelectedGroup(updatedGroup);
      setGroups(prev => prev.map(g => (g.id === groupId || g._id === groupId) ? updatedGroup : g));
      setCurrentView('group');
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!selectedGroup) return;

    try {
      await apiService.deleteExpense(selectedGroup.id, expenseId);
      
      const updatedGroup = {
        ...selectedGroup,
        expenses: selectedGroup.expenses.filter(e => e.id !== expenseId)
      };

      setSelectedGroup(updatedGroup);
      setGroups(prev => prev.map(g => g.id === selectedGroup.id ? updatedGroup : g));
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const handleGenerateShareCode = async () => {
    if (!selectedGroup) {
      throw new Error('No group selected');
    }
    
    try {
      const groupId = selectedGroup.id || selectedGroup._id;
      const shareToken = await apiService.generateShareToken(groupId);
      return `${window.location.origin}/share/${shareToken}`;
    } catch (error) {
      console.error('Failed to generate share link:', error);
      throw error;
    }
  };

  const handleUpdateProfile = async (name: string, upiId: string) => {
    if (!user) return;

    const updatedUser = await apiService.updateUserProfile(user.id, name, upiId);
    updateUser(updatedUser);
  };

  const handleRecordSettlement = async (groupId: string, settlement: {
    from: string;
    fromId?: string;
    to: string;
    toId?: string;
    amount: number;
  }) => {
    const updatedGroup = await apiService.recordSettlement(groupId, settlement);
    if (selectedGroup && (selectedGroup.id === updatedGroup.id || selectedGroup._id === updatedGroup.id)) {
      setSelectedGroup(updatedGroup);
    }
    setGroups(prev => prev.map(g => (g.id === updatedGroup.id || g._id === updatedGroup.id) ? updatedGroup : g));
  };

  const handleNavigate = (view: 'groups' | 'group' | 'add-expense' | 'create-group' | 'account' | 'wallet' | 'fairness-calculator' | 'contact-support') => {
    console.log('handleNavigate called with:', view);
    setCurrentView(view);
    if (view === 'groups' || view === 'create-group' || view === 'account' || view === 'wallet' || view === 'fairness-calculator' || view === 'contact-support') {
      if (view !== 'fairness-calculator') {
        setSelectedGroup(null);
      }
    }
  };

  if (shareToken) {
    return <ShareView token={shareToken} />;
  }

  if (authLoading || isLoading) {
    console.log('App is loading - authLoading:', authLoading, 'isLoading:', isLoading);
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center text-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-violet-500"></div>
          <p className="text-slate-400">Loading SplitWise...</p>
        </div>
      </div>
    );
  }

  console.log('App render - user:', user, 'authLoading:', authLoading, 'isLoading:', isLoading);

  if (!user) {
    console.log('No user found, showing Login component');
    return <Login />;
  }

  console.log('User found, showing main app:', user);

  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });

  const groupCount = groups.length;
  const memberCount = groups.reduce((total, group) => total + group.members.length, 0);
  const expenseCount = groups.reduce((total, group) => total + group.expenses.length, 0);
  const totalVolume = groups.reduce((total, group) => {
    return total + group.expenses.reduce((groupTotal, expense) => groupTotal + expense.amount, 0);
  }, 0);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.12),transparent_34%)]" />
      <Header
        currentView={currentView}
        groupName={selectedGroup?.name}
        onNavigate={handleNavigate}
        user={user}
        onLogout={logout}
      />

      <main className="min-h-screen">
        {currentView === 'groups' && (
          <div className="space-y-6">
            <div className="mx-auto max-w-7xl px-6 pt-6">
              <section
                className="relative overflow-hidden rounded-[32px] border border-white/10 bg-cover bg-center px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:px-8"
                style={{
                  backgroundImage: "linear-gradient(135deg, rgba(49, 46, 129, 0.8), rgba(109, 40, 217, 0.6), rgba(15, 23, 42, 0.2)), url('/images/rr.avif')",
                }}
              >
                <div className="relative space-y-6">
                  <div className="max-w-3xl space-y-3 text-white">
                    <p className="text-xs uppercase tracking-[0.3em] text-violet-100/70">Dashboard</p>
                    <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Keep every split visible</h2>
                    <p className="max-w-2xl text-sm text-white/75 sm:text-base">
                      Track groups, settle balances, and keep the payment flow moving with a live map-backed dashboard.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="dark-card rounded-3xl px-6 py-5 text-white">
                      <p className="text-xs uppercase tracking-[0.28em] text-white/50">Active groups</p>
                      <div className="mt-3 flex items-end justify-between gap-4">
                        <div>
                          <div className="text-3xl font-semibold tracking-tight">{groupCount}</div>
                          <p className="mt-1 text-sm text-white/70">Groups currently open</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/80">Live</div>
                      </div>
                    </div>

                    <div className="dark-card rounded-3xl px-6 py-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Members</p>
                      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">{memberCount}</div>
                      <p className="mt-1 text-sm text-slate-400">People across all groups</p>
                    </div>

                    <div className="dark-card rounded-3xl px-6 py-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Expenses</p>
                      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">{expenseCount}</div>
                      <p className="mt-1 text-sm text-slate-400">Recorded transactions</p>
                    </div>

                    <div className="dark-card rounded-3xl px-6 py-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Total volume</p>
                      <div className="mt-3 text-3xl font-semibold tracking-tight text-cyan-300">{currencyFormatter.format(totalVolume)}</div>
                      <p className="mt-1 text-sm text-slate-400">Tracked across every group</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <GroupList
              groups={groups.map(g => convertApiGroupToGroup(g))}
              onSelectGroup={(group) => {
                const apiGroup = groups.find(g => g.id === group.id);
                if (apiGroup) setSelectedGroup(apiGroup);
                handleNavigate('group');
              }}
              onCreateGroup={createGroup}
              onDeleteGroup={handleDeleteGroup}
              onJoinGroup={handleJoinGroup}
              onOpenCreateGroup={() => handleNavigate('create-group')}
              pendingJoinCode={pendingJoinCode}
              onAddExpense={(group) => {
                const apiGroup = groups.find(g => g.id === group.id);
                if (apiGroup) setSelectedGroup(apiGroup);
                handleNavigate('add-expense');
              }}
              currentUserId={user.id}
              currentUserName={user.name}
              onRecordSettlement={handleRecordSettlement}
            />
          </div>
        )}
        {currentView === 'group' && selectedGroup && (
          <GroupView
            group={convertApiGroupToGroup(selectedGroup)}
            currentUserId={user.id}
            currentUserName={user.name}
            onAddExpense={() => handleNavigate('add-expense')}
            onDeleteExpense={deleteExpense}
            onGenerateShareCode={handleGenerateShareCode}
            onOpenFairnessCalculator={() => handleNavigate('fairness-calculator')}
            onRecordSettlement={(settlement) => handleRecordSettlement(selectedGroup.id, settlement)}
          />
        )}
        {currentView === 'add-expense' && selectedGroup && (
          <AddExpenseForm
            group={convertApiGroupToGroup(selectedGroup)}
            onBack={() => handleNavigate('group')}
            members={convertApiGroupToGroup(selectedGroup).members}
            onAddExpense={addExpense}
            onCancel={() => setCurrentView('group')}
          />
        )}
        {currentView === 'create-group' && (
          <CreateGroupView onCancel={() => handleNavigate('groups')} onCreateGroup={createGroup} />
        )}
        {currentView === 'account' && user && user.email && (
          <AccountSettings 
            user={{
              id: user.id,
              name: user.name,
              email: user.email || '',
              upiId: user.upiId,
            }} 
            onBack={() => handleNavigate('groups')} 
            onUpdateProfile={handleUpdateProfile}
          />
        )}
        {currentView === 'wallet' && (
          <Wallet onBack={() => handleNavigate('groups')} />
        )}
        {currentView === 'fairness-calculator' && (
          <FairnessCalculator 
            onBack={() => selectedGroup ? handleNavigate('group') : handleNavigate('groups')}
            groupMembers={selectedGroup ? selectedGroup.members.map(m => ({ id: m.id, name: m.name })) : undefined}
            groupExpenses={selectedGroup ? selectedGroup.expenses : undefined}
          />
        )}
        {currentView === 'contact-support' && (
          <ContactSupport onBack={() => handleNavigate('groups')} />
        )}
      </main>
    </div>
  );
}

export default App;