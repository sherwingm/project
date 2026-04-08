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
import { Group, ExpenseItem } from './types';
import { Group as ApiGroup } from './services/api';
import { useAuth } from './contexts/AuthContext';
import { apiService } from './services/api';

// URL utility functions
const getJoinCodeFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('join');
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
      color: member.color
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
    createdAt: apiGroup.createdAt,
    shareCode: apiGroup.shareCode
  };
}

function App() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<'groups' | 'group' | 'add-expense' | 'create-group' | 'account' | 'wallet' | 'fairness-calculator' | 'contact-support'>('groups');
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ApiGroup | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, [user]);

  // When user is logged in, check for ?join=CODE in URL and open join modal
  useEffect(() => {
    if (!user || isLoading) return;
    const code = getJoinCodeFromUrl();
    if (code) {
      clearJoinFromUrl();
      setPendingJoinCode(code);
      setCurrentView('groups');
    }
  }, [user, isLoading]);

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

  const createGroup = async (name: string, memberNames: string[]) => {
    try {
      const newGroup = await apiService.createGroup(name, memberNames);
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
    if (!selectedGroup) return;
    
    try {
      // Copy share code to clipboard
      navigator.clipboard.writeText(selectedGroup.shareCode || '');
      alert(`Share code ${selectedGroup.shareCode} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy share code:', error);
      alert('Failed to copy share code');
    }
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

  if (authLoading || isLoading) {
    console.log('App is loading - authLoading:', authLoading, 'isLoading:', isLoading);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SplitWise...</p>
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

  return (
    <div className="min-h-screen bg-fixed bg-cover bg-center" style={{ backgroundImage: "url('/images/yy.jpg')" }}>
      <Header
        currentView={currentView}
        groupName={selectedGroup?.name}
        onNavigate={handleNavigate}
        user={user}
        onLogout={logout}
      />

      <main className="min-h-screen">
        {currentView === 'groups' && (
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
          />
        )}
        {currentView === 'group' && selectedGroup && (
          <GroupView
            group={convertApiGroupToGroup(selectedGroup)}
            onAddExpense={() => handleNavigate('add-expense')}
            onDeleteExpense={deleteExpense}
            onGenerateShareCode={handleGenerateShareCode}
            onOpenFairnessCalculator={() => handleNavigate('fairness-calculator')}
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
              email: user.email
            }} 
            onBack={() => handleNavigate('groups')} 
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