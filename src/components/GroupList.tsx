import React, { useState } from 'react';
import { Users, ArrowLeft, PlusCircle, UserPlus } from 'lucide-react';
import { Group } from '../types';
import GroupCard from './GroupCard';

interface GroupListProps {
  groups: Group[];
  onSelectGroup: (group: Group) => void;
  onCreateGroup: (name: string, members: string[]) => void;
  onDeleteGroup: (groupId: string) => void;
  onJoinGroup: (shareCode: string) => void;
  onOpenCreateGroup: () => void;
  pendingJoinCode: string | null;
  onAddExpense: (group: Group) => void;
}

export function GroupList({ groups, onSelectGroup, onCreateGroup, onDeleteGroup, onJoinGroup, onOpenCreateGroup: _onOpenCreateGroup, pendingJoinCode: _pendingJoinCode, onAddExpense }: GroupListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showGroupSelection, setShowGroupSelection] = useState(false);

  const handleBack = () => {
    // Navigate back to previous page - can be customized based on needs
    window.history.back();
  };
  const [groupName, setGroupName] = useState('');
  const [memberNames, setMemberNames] = useState(['']);
  const [shareCode, setShareCode] = useState('');

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName.trim() && memberNames.some(name => name.trim())) {
      const validMembers = memberNames.filter(name => name.trim());
      onCreateGroup(groupName.trim(), validMembers);
      setGroupName('');
      setMemberNames(['']);
      setShowCreateForm(false);
    }
  };

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (shareCode.trim()) {
      onJoinGroup(shareCode.trim().toUpperCase());
      setShareCode('');
      setShowJoinForm(false);
    }
  };

  const addMemberField = () => {
    setMemberNames([...memberNames, '']);
  };

  const updateMemberName = (index: number, name: string) => {
    const updated = [...memberNames];
    updated[index] = name;
    setMemberNames(updated);
  };

  const removeMemberField = (index: number) => {
    if (memberNames.length > 1) {
      setMemberNames(memberNames.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="min-h-screen bg-fixed bg-cover bg-center" style={{ backgroundImage: "url('https://source.unsplash.com/1600x900/?map,travel')" }}>
      {/* Hero Banner with overlay */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-teal-500 opacity-80"></div>
        <div className="relative text-center text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Split Expenses Smartly</h1>
            <p className="text-xl sm:text-2xl max-w-2xl mx-auto">
              Track, Share, and Settle Costs Together
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="flex justify-center space-x-4 mb-8">
          <button
            onClick={() => {
              console.log('Add Expense clicked, groups:', groups);
              if (groups.length > 0) {
                setShowGroupSelection(true);
              } else {
                console.log('No groups available, opening create group');
                _onOpenCreateGroup();
              }
            }}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl shadow-2xl border-4 border-green-300 transition-all font-bold text-lg transform hover:scale-105"
          >
            <PlusCircle className="w-6 h-6" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => setShowJoinForm(true)}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-xl shadow-2xl border-4 border-blue-300 transition-all font-bold text-lg transform hover:scale-105"
          >
            <UserPlus className="w-6 h-6" />
            <span>Join Group</span>
          </button>
          <button
            onClick={_onOpenCreateGroup}
            className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl shadow-2xl border-4 border-orange-300 transition-all font-bold text-lg transform hover:scale-105"
          >
            <Users className="w-6 h-6" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h2 className="text-3xl font-bold text-gradient-secondary font-dancing">Your Groups</h2>
                <p className="text-gray-600 mt-2">Manage your expense groups and track shared costs</p>
              </div>
            </div>
          </div>
        </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Group</h3>
            <form onSubmit={handleCreateGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Trip to Paris"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Members
                </label>
                {memberNames.map((name, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updateMemberName(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Member name"
                    />
                    {memberNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMemberField(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMemberField}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + Add member
                </button>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Form */}
      {showJoinForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Join Group</h3>
            <form onSubmit={handleJoinGroup}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Code
                </label>
                <input
                  type="text"
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                  placeholder="ABC123"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowJoinForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Join Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-6">
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
          <p className="text-gray-600 mb-6">Create your first group to start splitting expenses</p>
          <button
            onClick={_onOpenCreateGroup}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={{
                id: group.id,
                name: group.name,
                location: group.name, // Use group name as location for display
                members: group.members.length,
                date: new Date(group.createdAt).toLocaleDateString(),
                totalExpenses: group.expenses.reduce((sum, expense) => sum + expense.amount, 0),
                currency: '₹'
              }}
              onViewDetails={() => onSelectGroup(group)}
              onDelete={onDeleteGroup}
              onAddExpense={() => {
                console.log('GroupCard Add Expense clicked for group:', group);
                onAddExpense(group);
              }}
            />
          ))}
        </div>
      )}

      {/* Group Selection Modal for Add Expense */}
      {showGroupSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Select a Group</h3>
            <p className="text-gray-600 mb-4">Choose which group to add the expense to:</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    onAddExpense(group);
                    setShowGroupSelection(false);
                  }}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium">{group.name}</div>
                  <div className="text-sm text-gray-600">{group.members.length} members</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGroupSelection(false)}
              className="mt-4 w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}