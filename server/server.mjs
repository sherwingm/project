import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-split-expenser';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db;

async function connectToDatabase() {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    db = client.db('budget-split-expenser');
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please fill in all fields' });
    }

    const database = await connectToDatabase();
    const users = database.collection('users');
    
    // Check if user already exists
    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const newUser = {
      name,
      email,
      password,
      createdAt: new Date()
    };

    await users.insertOne(newUser);
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const database = await connectToDatabase();
    const users = database.collection('users');
    
    const user = await users.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.status(200).json({ 
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { name, userId, members } = req.body;
    
    if (!name || !userId || !members) {
      return res.status(400).json({ error: 'Please provide group name, userId, and members' });
    }

    const database = await connectToDatabase();
    const groups = database.collection('groups');
    
    const newGroup = {
      name,
      userId,
      members: members.split(',').map(m => m.trim()),
      createdAt: new Date()
    };

    await groups.insertOne(newGroup);
    res.status(201).json({ message: 'Group created successfully', group: newGroup });
  } catch (error) {
    console.error('Group creation error:', error);
    res.status(500).json({ error: 'Group creation failed' });
  }
});

app.get('/api/groups/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const database = await connectToDatabase();
    const groups = database.collection('groups');
    
    const userGroups = await groups.find({ userId }).toArray();
    res.status(200).json(userGroups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { groupId, name, amount, paidBy, splitBetween } = req.body;
    
    if (!groupId || !name || !amount || !paidBy || !splitBetween) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const database = await connectToDatabase();
    const expenses = database.collection('expenses');
    
    const newExpense = {
      groupId,
      name,
      amount: parseFloat(amount),
      paidBy,
      splitBetween: splitBetween.split(',').map(m => m.trim()),
      createdAt: new Date()
    };

    await expenses.insertOne(newExpense);
    res.status(201).json({ message: 'Expense added successfully', expense: newExpense });
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

app.get('/api/expenses/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }

    const database = await connectToDatabase();
    const expenses = database.collection('expenses');
    
    const groupExpenses = await expenses.find({ groupId }).toArray();
    res.status(200).json(groupExpenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to get expenses' });
  }
});

// Wallet endpoints
app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const database = await connectToDatabase();
    const wallet = database.collection('wallet');
    
    const userWallet = await wallet.findOne({ userId });
    if (!userWallet) {
      // Create wallet if it doesn't exist
      const newWallet = {
        userId,
        balance: 0,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await wallet.insertOne(newWallet);
      return res.status(200).json(newWallet);
    }
    
    res.status(200).json(userWallet);
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

app.get('/api/wallet/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const database = await connectToDatabase();
    const wallet = database.collection('wallet');
    
    const transactions = await wallet.find({ userId, type: { $exists: true } }).sort({ date: -1 }).toArray();
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ error: 'Failed to get wallet transactions' });
  }
});

app.post('/api/wallet/:userId/transaction', async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, description, amount, category } = req.body;
    
    if (!userId || !type || !description || !amount) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const database = await connectToDatabase();
    const wallet = database.collection('wallet');
    
    // Add transaction
    const newTransaction = {
      userId,
      type,
      description,
      amount: parseFloat(amount),
      category: category || 'Other',
      date: new Date(),
      createdAt: new Date()
    };
    
    await wallet.insertOne(newTransaction);
    
    // Update wallet balance
    const userWallet = await wallet.findOne({ userId, balance: { $exists: true } });
    if (userWallet) {
      const newBalance = type === 'income' 
        ? userWallet.balance + parseFloat(amount)
        : userWallet.balance - parseFloat(amount);
      
      await wallet.updateOne(
        { userId, balance: { $exists: true } },
        { 
          $set: { 
            balance: newBalance,
            updatedAt: new Date()
          } 
        }
      );
    } else {
      // Create wallet with initial balance
      const initialBalance = type === 'income' ? parseFloat(amount) : -parseFloat(amount);
      await wallet.insertOne({
        userId,
        balance: initialBalance,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    res.status(201).json({ message: 'Transaction added successfully', transaction: newTransaction });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// User settings endpoints
app.get('/api/user-settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const database = await connectToDatabase();
    const userSettings = database.collection('userSettings');
    
    const settings = await userSettings.findOne({ userId });
    if (!settings) {
      // Create default settings if they don't exist
      const defaultSettings = {
        userId,
        theme: 'light',
        currency: 'USD',
        notifications: {
          email: true,
          push: true,
          expenseReminders: true
        },
        privacy: {
          profileVisibility: 'friends',
          showEmail: false
        },
        preferences: {
          defaultSplitMethod: 'equal',
          autoSettle: false,
          language: 'en'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await userSettings.insertOne(defaultSettings);
      return res.status(200).json(defaultSettings);
    }
    
    res.status(200).json(settings);
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Failed to get user settings' });
  }
});

app.put('/api/user-settings/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const database = await connectToDatabase();
    const userSettings = database.collection('userSettings');
    
    await userSettings.updateOne(
      { userId },
      { 
        $set: { 
          ...settings,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    
    res.status(200).json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

// Support tickets endpoints
app.post('/api/support-tickets', async (req, res) => {
  try {
    const { userId, type, subject, message, priority } = req.body;
    
    if (!userId || !type || !subject || !message) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const database = await connectToDatabase();
    const supportTickets = database.collection('supportTickets');
    
    const newTicket = {
      userId,
      type,
      subject,
      message,
      priority: priority || 'medium',
      status: 'open',
      responses: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await supportTickets.insertOne(newTicket);
    res.status(201).json({ message: 'Support ticket created successfully', ticket: newTicket });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

app.get('/api/support-tickets/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const database = await connectToDatabase();
    const supportTickets = database.collection('supportTickets');
    
    const tickets = await supportTickets.find({ userId }).sort({ createdAt: -1 }).toArray();
    res.status(200).json(tickets);
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({ error: 'Failed to get support tickets' });
  }
});

// Fairness calculator sessions endpoints
app.post('/api/fairness-sessions', async (req, res) => {
  try {
    const { userId, name, participants, expenses, settlements } = req.body;
    
    if (!userId || !name || !participants) {
      return res.status(400).json({ error: 'Please provide userId, name, and participants' });
    }

    const database = await connectToDatabase();
    const fairnessSessions = database.collection('fairnessSessions');
    
    const newSession = {
      userId,
      name,
      participants,
      expenses: expenses || [],
      settlements: settlements || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await fairnessSessions.insertOne(newSession);
    res.status(201).json({ message: 'Fairness session created successfully', session: newSession });
  } catch (error) {
    console.error('Create fairness session error:', error);
    res.status(500).json({ error: 'Failed to create fairness session' });
  }
});

app.get('/api/fairness-sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const database = await connectToDatabase();
    const fairnessSessions = database.collection('fairnessSessions');
    
    const sessions = await fairnessSessions.find({ userId }).sort({ createdAt: -1 }).toArray();
    res.status(200).json(sessions);
  } catch (error) {
    console.error('Get fairness sessions error:', error);
    res.status(500).json({ error: 'Failed to get fairness sessions' });
  }
});

// Account management endpoints
app.put('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name } = req.body;
    
    if (!userId || !name) {
      return res.status(400).json({ error: 'Please provide userId and name' });
    }

    const database = await connectToDatabase();
    const users = database.collection('users');
    
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { name, updatedAt: new Date() } }
    );
    
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.put('/api/users/:userId/password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.body;
    
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const database = await connectToDatabase();
    const users = database.collection('users');
    
    const user = await users.findOne({ _id: new ObjectId(userId) });
    if (!user || user.password !== oldPassword) {
      return res.status(401).json({ error: 'Invalid current password' });
    }
    
    await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: newPassword, updatedAt: new Date() } }
    );
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.delete('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const database = await connectToDatabase();
    
    // Delete user and all related data
    await database.collection('users').deleteOne({ _id: new ObjectId(userId) });
    await database.collection('groups').deleteMany({ userId });
    await database.collection('wallet').deleteMany({ userId });
    await database.collection('supportTickets').deleteMany({ userId });
    await database.collection('userSettings').deleteOne({ userId });
    await database.collection('fairnessSessions').deleteMany({ userId });
    
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
