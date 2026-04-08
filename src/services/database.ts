import { MongoClient, Db, ObjectId } from "mongodb";

// MongoDB connection URI
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017";

// Database name
const DB_NAME = "budget-split-expenser";

export interface User {
  id?: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

export interface Group {
  id?: string;
  name: string;
  members: string[];
  shareCode?: string;
  createdAt: Date;
}

export interface Expense {
  id?: string;
  groupId: string;
  name: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  createdAt: Date;
}

class DatabaseService {
  private client: MongoClient;
  private db: Db | null = null;

  constructor() {
    this.client = new MongoClient(MONGODB_URI);
  }

  async connect() {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(DB_NAME);
      console.log("✅ Connected to MongoDB");
    }
  }

  async disconnect() {
    await this.client.close();
    this.db = null;
  }

  private get collection() {
    if (!this.db) throw new Error("Database not connected");
    return {
      users: this.db.collection<User>("users"),
      groups: this.db.collection<Group>("groups"),
      expenses: this.db.collection<Expense>("expenses"),
    };
  }

  // ================= USERS =================

  async createUser(userData: Omit<User, "createdAt">): Promise<User> {
    const user: User = {
      ...userData,
      createdAt: new Date(),
    };

    const result = await this.collection.users.insertOne(user);

    return { ...user, id: result.insertedId.toString() };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const user = await this.collection.users.findOne({ email });

    if (!user) return null;

    return { ...user, id: user._id?.toString() };
  }

  async findUserById(id: string): Promise<User | null> {
    const user = await this.collection.users.findOne({
      _id: new ObjectId(id),
    });

    if (!user) return null;

    return { ...user, id: user._id?.toString() };
  }

  // ================= GROUPS =================

  async createGroup(groupData: Omit<Group, "createdAt">): Promise<Group> {
    const group: Group = {
      ...groupData,
      createdAt: new Date(),
    };

    const result = await this.collection.groups.insertOne(group);

    return { ...group, id: result.insertedId.toString() };
  }

  async getAllGroups(): Promise<Group[]> {
    const groups = await this.collection.groups.find().toArray();

    return groups.map((g: any) => ({
      ...g,
      id: g._id.toString(),
    }));
  }

  async getGroupById(id: string): Promise<Group | null> {
    const group = await this.collection.groups.findOne({
      _id: new ObjectId(id),
    });

    if (!group) return null;

    return { ...group, id: group._id?.toString() };
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<boolean> {
    const result = await this.collection.groups.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    return result.modifiedCount > 0;
  }

  async deleteGroup(id: string): Promise<boolean> {
    const result = await this.collection.groups.deleteOne({
      _id: new ObjectId(id),
    });

    return result.deletedCount > 0;
  }

  // ================= EXPENSES =================

  async addExpense(
    expenseData: Omit<Expense, "createdAt">
  ): Promise<Expense> {
    const expense: Expense = {
      ...expenseData,
      createdAt: new Date(),
    };

    const result = await this.collection.expenses.insertOne(expense);

    return { ...expense, id: result.insertedId.toString() };
  }

  async getExpensesByGroupId(groupId: string): Promise<Expense[]> {
    const expenses = await this.collection.expenses
      .find({ groupId })
      .toArray();

    return expenses.map((e: any) => ({
      ...e,
      id: e._id.toString(),
    }));
  }

  async updateExpense(id: string, updates: Partial<Expense>): Promise<boolean> {
    const result = await this.collection.expenses.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    return result.modifiedCount > 0;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await this.collection.expenses.deleteOne({
      _id: new ObjectId(id),
    });

    return result.deletedCount > 0;
  }

  // ================= SHARE CODE =================

  async generateShareCode(groupId: string): Promise<string> {
    const shareCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    await this.collection.groups.updateOne(
      { _id: new ObjectId(groupId) },
      { $set: { shareCode } }
    );

    return shareCode;
  }

  async getGroupByShareCode(shareCode: string): Promise<Group | null> {
    const group = await this.collection.groups.findOne({ shareCode });

    if (!group) return null;

    return { ...group, id: group._id?.toString() };
  }
}

export default DatabaseService;