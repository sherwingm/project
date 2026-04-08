import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Group, ExpenseItem, Person } from '../types';

interface ExpenseSplitterDB extends DBSchema {
  groups: {
    key: string;
    value: Group;
  };
  expenses: {
    key: string;
    value: ExpenseItem;
    indexes: { 'by-group': string };
  };
}

let db: IDBPDatabase<ExpenseSplitterDB>;

export async function initDB() {
  db = await openDB<ExpenseSplitterDB>('expense-splitter', 1, {
    upgrade(db) {
      const groupStore = db.createObjectStore('groups', { keyPath: 'id' });
      const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
      expenseStore.createIndex('by-group', 'groupId');
    },
  });
}

export async function saveGroup(group: Group): Promise<void> {
  await db.put('groups', group);
}

export async function getGroup(id: string): Promise<Group | undefined> {
  return await db.get('groups', id);
}

export async function getAllGroups(): Promise<Group[]> {
  return await db.getAll('groups');
}

export async function deleteGroup(id: string): Promise<void> {
  await db.delete('groups', id);
}

export async function generateShareCode(groupId: string): Promise<string> {
  const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const group = await getGroup(groupId);
  if (group) {
    group.shareCode = shareCode;
    await saveGroup(group);
  }
  return shareCode;
}

export async function getGroupByShareCode(shareCode: string): Promise<Group | undefined> {
  const groups = await getAllGroups();
  return groups.find(group => group.shareCode === shareCode);
}