const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-split-expenser', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, sparse: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Group Schema
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    color: { type: String, required: true }
  }],
  expenses: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    paidBy: { type: String, required: true },
    splitBetween: [{ type: String }],
    category: { type: String, required: true },
    date: { type: Date, default: Date.now },
    receiptImage: { type: String }
  }],
  shareCode: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});

const Group = mongoose.model('Group', groupSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register/Login (Unified endpoint)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, phone, password, name, isLogin } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (isLogin) {
      // Login logic
      const query = email ? { email } : { phone };
      const user = await User.findOne(query);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone
        }
      });
    } else {
      // Register logic
      if (!name) {
        return res.status(400).json({ error: 'Name is required for registration' });
      }

      if (!email && !phone) {
        return res.status(400).json({ error: 'Email or phone is required' });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: email ? [{ email }] : [{ phone }]
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new User({
        name,
        email,
        phone,
        password: hashedPassword
      });

      await newUser.save();

      const token = jwt.sign(
        { id: newUser._id, email: newUser.email, name: newUser.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'Registration successful',
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone
        }
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user groups
app.get('/api/groups', authenticateToken, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.id': req.user.id });
    res.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create group
app.post('/api/groups', authenticateToken, async (req, res) => {
  try {
    const { name, members } = req.body;
    
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const groupMembers = [
      {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        color: '#3B82F6'
      },
      ...members.map((member, index) => ({
        id: `member-${Date.now()}-${index}`,
        name: member,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }))
    ];

    const newGroup = new Group({
      name,
      createdBy: req.user.id,
      members: groupMembers,
      shareCode,
      expenses: []
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add expense to group
app.post('/api/groups/:groupId/expenses', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const expenseData = req.body;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const newExpense = {
      id: `expense-${Date.now()}`,
      ...expenseData,
      date: new Date()
    };

    group.expenses.push(newExpense);
    await group.save();

    res.status(201).json(newExpense);
  } catch (error) {
    console.error('Add expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete expense
app.delete('/api/groups/:groupId/expenses/:expenseId', authenticateToken, async (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    group.expenses = group.expenses.filter(expense => expense.id !== expenseId);
    await group.save();

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join group by share code
app.post('/api/groups/join', authenticateToken, async (req, res) => {
  try {
    const { shareCode } = req.body;
    
    const group = await Group.findOne({ shareCode });
    if (!group) {
      return res.status(404).json({ error: 'Invalid share code' });
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(member => member.id === req.user.id);
    if (isAlreadyMember) {
      return res.status(400).json({ error: 'Already a member of this group' });
    }

    // Add user to group
    group.members.push({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    });

    await group.save();
    res.json(group);
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Wallet endpoints
app.get('/api/wallet/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // For demo, create or get wallet from database
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-split-expenser');
    await client.connect();
    const db = client.db('budget-split-expenser');
    
    let wallet = await db.collection('wallet').findOne({ userId });
    if (!wallet) {
      // Create default wallet
      wallet = {
        userId,
        balance: 0,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await db.collection('wallet').insertOne(wallet);
    }
    
    await client.close();
    res.json(wallet);
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/wallet/:userId/transactions', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-split-expenser');
    await client.connect();
    const db = client.db('budget-split-expenser');
    
    const transactions = await db.collection('wallet').find({ userId, type: { $exists: true } }).toArray();
    
    await client.close();
    res.json(transactions);
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/wallet/:userId/transaction', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, description, amount, category } = req.body;
    
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-split-expenser');
    await client.connect();
    const db = client.db('budget-split-expenser');
    
    // Add transaction
    const transaction = {
      userId,
      type,
      description,
      amount: parseFloat(amount),
      category: category || 'Other',
      date: new Date(),
      createdAt: new Date()
    };
    
    await db.collection('wallet').insertOne(transaction);
    
    // Update wallet balance
    const wallet = await db.collection('wallet').findOne({ userId, balance: { $exists: true } });
    if (wallet) {
      const newBalance = type === 'income' 
        ? wallet.balance + parseFloat(amount)
        : wallet.balance - parseFloat(amount);
      
      await db.collection('wallet').updateOne(
        { userId, balance: { $exists: true } },
        { $set: { balance: newBalance, updatedAt: new Date() } }
      );
    }
    
    await client.close();
    res.json(transaction);
  } catch (error) {
    console.error('Add wallet transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
