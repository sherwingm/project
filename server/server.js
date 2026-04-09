const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
  upiId: { type: String, default: '' },
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
    upiId: { type: String, default: '' },
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
  settlements: [{
    from: { type: String, required: true },
    fromId: { type: String },
    to: { type: String, required: true },
    toId: { type: String },
    amount: { type: Number, required: true },
    settledAt: { type: Date, default: Date.now }
  }],
  shareCode: { type: String, unique: true },
  shareToken: { type: String, unique: true, sparse: true },
  autoDelete: { type: Boolean, default: false },
  deleteAfter: {
    type: String,
    enum: ['immediately', '1-day', '3-days', '7-days'],
    default: 'immediately'
  },
  deleteScheduledAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Group = mongoose.model('Group', groupSchema);

async function hydrateGroupMembers(group) {
  if (!group) return group;

  const plainGroup = typeof group.toObject === 'function' ? group.toObject() : group;
  const memberIds = (plainGroup.members || [])
    .map((member) => member.id)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (memberIds.length === 0) {
    return plainGroup;
  }

  const users = await User.find({ _id: { $in: memberIds } }).lean();
  const userMap = new Map(users.map((user) => [user._id.toString(), user]));

  return {
    ...plainGroup,
    members: (plainGroup.members || []).map((member) => {
      const user = userMap.get(member.id);
      return user ? { ...member, upiId: user.upiId } : member;
    }),
  };
}

function generateShareToken() {
  return crypto.randomBytes(16).toString('hex');
}

function extractJsonFromText(text) {
  const trimmed = String(text || '').trim();
  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  return JSON.parse(candidate);
}

const DELETE_AFTER_MS = {
  immediately: 0,
  '1-day': 24 * 60 * 60 * 1000,
  '3-days': 3 * 24 * 60 * 60 * 1000,
  '7-days': 7 * 24 * 60 * 60 * 1000,
};

function getDeleteDelayMs(deleteAfter) {
  return DELETE_AFTER_MS[deleteAfter] ?? DELETE_AFTER_MS.immediately;
}

function calculateGroupBalances(group) {
  const balances = new Map();

  group.members.forEach((member) => {
    balances.set(member.id, 0);
  });

  (group.expenses || []).forEach((expense) => {
    const amount = Number(expense.amount || 0);
    if (amount <= 0) return;

    balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + amount);

    const splitBetween = Array.isArray(expense.splitBetween) ? expense.splitBetween : [];
    if (splitBetween.length === 0) return;

    const perPerson = amount / splitBetween.length;
    splitBetween.forEach((memberId) => {
      balances.set(memberId, (balances.get(memberId) || 0) - perPerson);
    });
  });

  (group.settlements || []).forEach((settlement) => {
    const fromId = settlement.fromId || settlement.from;
    const toId = settlement.toId || settlement.to;

    if (balances.has(fromId)) {
      balances.set(fromId, balances.get(fromId) + Number(settlement.amount || 0));
    }

    if (balances.has(toId)) {
      balances.set(toId, balances.get(toId) - Number(settlement.amount || 0));
    }
  });

  return Array.from(balances.values());
}

function calculateSimplifiedDebts(group) {
  const balances = new Map();
  const memberNames = new Map();

  group.members.forEach((member) => {
    balances.set(member.id, 0);
    memberNames.set(member.id, member.name);
  });

  (group.expenses || []).forEach((expense) => {
    const amount = Number(expense.amount || 0);
    if (amount <= 0) return;

    balances.set(expense.paidBy, (balances.get(expense.paidBy) || 0) + amount);

    const splitBetween = Array.isArray(expense.splitBetween) ? expense.splitBetween : [];
    if (splitBetween.length === 0) return;

    const perPerson = amount / splitBetween.length;
    splitBetween.forEach((memberId) => {
      balances.set(memberId, (balances.get(memberId) || 0) - perPerson);
    });
  });

  (group.settlements || []).forEach((settlement) => {
    const fromId = settlement.fromId || settlement.from;
    const toId = settlement.toId || settlement.to;

    if (balances.has(fromId)) {
      balances.set(fromId, (balances.get(fromId) || 0) + Number(settlement.amount || 0));
    }

    if (balances.has(toId)) {
      balances.set(toId, (balances.get(toId) || 0) - Number(settlement.amount || 0));
    }
  });

  const creditors = [];
  const debtors = [];

  for (const [memberId, balance] of balances.entries()) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ id: memberId, name: memberNames.get(memberId) || memberId, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ id: memberId, name: memberNames.get(memberId) || memberId, amount: Math.abs(rounded) });
    }
  }

  const settlements = [];

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);
    const roundedAmount = Math.round(amount * 100) / 100;

    if (roundedAmount > 0.01) {
      settlements.push({
        from: debtor.name,
        fromId: debtor.id,
        to: creditor.name,
        toId: creditor.id,
        amount: roundedAmount,
      });
    }

    creditor.amount = Math.round((creditor.amount - roundedAmount) * 100) / 100;
    debtor.amount = Math.round((debtor.amount - roundedAmount) * 100) / 100;

    if (creditor.amount <= 0.01) creditors.shift();
    if (debtor.amount <= 0.01) debtors.shift();
  }

  return settlements;
}

function isGroupSettled(group) {
  if (!group.expenses || group.expenses.length === 0) {
    return false;
  }

  const balances = calculateGroupBalances(group);
  return balances.every((balance) => Math.abs(balance) < 0.01);
}

async function evaluateAutoDeleteGroup(group) {
  if (!group) return { deleted: false };

  if (!group.autoDelete) {
    if (group.deleteScheduledAt) {
      group.deleteScheduledAt = null;
      await group.save();
    }
    return { deleted: false };
  }

  if (!isGroupSettled(group)) {
    if (group.deleteScheduledAt) {
      group.deleteScheduledAt = null;
      await group.save();
    }
    return { deleted: false };
  }

  const delayMs = getDeleteDelayMs(group.deleteAfter);
  const now = Date.now();

  if (delayMs === 0) {
    await Group.findByIdAndDelete(group._id);
    return { deleted: true };
  }

  const scheduledAt = group.deleteScheduledAt ? new Date(group.deleteScheduledAt).getTime() : null;

  if (!scheduledAt) {
    group.deleteScheduledAt = new Date(now + delayMs);
    await group.save();
    return { deleted: false };
  }

  if (scheduledAt <= now) {
    await Group.findByIdAndDelete(group._id);
    return { deleted: true };
  }

  return { deleted: false };
}

async function purgeAutoDeleteGroupsForUser(userId) {
  const groups = await Group.find({ 'members.id': userId, autoDelete: true });
  for (const group of groups) {
    await evaluateAutoDeleteGroup(group);
  }
}

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
          phone: user.phone,
          upiId: user.upiId || ''
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
          phone: newUser.phone,
          upiId: newUser.upiId || ''
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
    await purgeAutoDeleteGroupsForUser(req.user.id);
    const groups = await Group.find({ 'members.id': req.user.id });
    const hydratedGroups = await Promise.all(groups.map((group) => hydrateGroupMembers(group)));
    res.json(hydratedGroups);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create group
app.post('/api/groups', authenticateToken, async (req, res) => {
  try {
    const { name, members, autoDelete = false, deleteAfter = 'immediately' } = req.body;
    const currentUser = await User.findById(req.user.id).lean();
    
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const shareToken = generateShareToken();
    
    const groupMembers = [
      {
        id: req.user.id,
        name: currentUser?.name || req.user.name,
        email: currentUser?.email || req.user.email,
        phone: currentUser?.phone || req.user.phone,
        upiId: currentUser?.upiId || '',
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
      shareToken,
      expenses: [],
      autoDelete: Boolean(autoDelete),
      deleteAfter: Boolean(autoDelete) ? deleteAfter : 'immediately',
      deleteScheduledAt: null,
    });

    await newGroup.save();
    res.status(201).json(await hydrateGroupMembers(newGroup));
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/ocr/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body || {};

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return res.status(500).json({ error: 'Anthropic API key is not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': anthropicApiKey,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are a receipt OCR transcriber. Transcribe every visible line of the receipt as raw text.

Reply ONLY in this exact JSON format, nothing else:
{"rawText": "line 1\nline 2\nline 3"}

Rules:
- Preserve line breaks where possible.
- Do not summarize or interpret the receipt.
- Return an empty string only if no text can be read.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic OCR error:', errorText);
      return res.status(502).json({ error: 'Receipt scan failed' });
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text;

    if (!text) {
      return res.status(502).json({ error: 'Receipt scan failed' });
    }

    const parsed = extractJsonFromText(text);
    const rawText = typeof parsed.rawText === 'string' ? parsed.rawText : '';

    const amountMatch = rawText.match(/(?:GRAND\s*TOTAL|TOTAL|AMOUNT|NET|BILL\s*TOTAL)[^\d]*(\d+\.?\d*)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);

    let bestShopName = '';
    let bestScore = 0;

    for (const line of lines) {
      if (line.length < 3 || line.length > 40 || /^\d/.test(line)) {
        continue;
      }

      const uppercaseChars = (line.match(/[A-Z]/g) || []).length;
      const score = uppercaseChars / line.length;

      if (score > bestScore) {
        bestScore = score;
        bestShopName = line;
      }
    }

    const nameConfident = bestScore >= 0.5 && Boolean(bestShopName);

    res.json({
      rawText,
      shopName: nameConfident ? bestShopName : '',
      nameConfident,
      totalAmount: amount,
    });
  } catch (error) {
    console.error('Scan receipt error:', error);
    res.status(500).json({ error: 'Receipt scan failed' });
  }
});

// Generate public share token
app.post('/api/groups/:groupId/generate-share-token', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some(member => member.id === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'You do not have access to this group' });
    }

    group.shareToken = generateShareToken();
    await group.save();

    res.json({ shareToken: group.shareToken });
  } catch (error) {
    console.error('Generate share token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public read-only share route
app.get('/api/share/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const group = await Group.findOne({ shareToken: token });
    if (!group) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    const memberNames = new Map(group.members.map(member => [member.id, member.name]));
    const expenses = group.expenses.map(expense => ({
      id: expense.id,
      name: expense.name,
      amount: expense.amount,
      paidBy: expense.paidBy,
      paidByName: memberNames.get(expense.paidBy) || expense.paidBy,
      splitBetween: expense.splitBetween,
      category: expense.category,
      date: expense.date,
    }));

    const settlements = calculateSimplifiedDebts(group);

    res.json({
      groupName: group.name,
      members: group.members,
      expenses,
      settlements: group.settlements || [],
      simplifiedSettlements: settlements,
    });
  } catch (error) {
    console.error('Public share route error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/groups/:groupId/settlements', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { from, fromId, to, toId, amount } = req.body;

    if (!groupId || !from || !to || !amount) {
      return res.status(400).json({ error: 'Missing settlement details' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    group.settlements = [
      ...(group.settlements || []),
      {
        from,
        fromId: fromId || from,
        to,
        toId: toId || to,
        amount: Number(amount),
        settledAt: new Date(),
      },
    ];

    await group.save();
    res.status(201).json(await hydrateGroupMembers(group));
  } catch (error) {
    console.error('Record settlement error:', error);
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

    const autoDeleteResult = await evaluateAutoDeleteGroup(group);

    res.status(201).json({ ...newExpense, groupAutoDeleted: autoDeleteResult.deleted });
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

    const autoDeleteResult = await evaluateAutoDeleteGroup(group);

    res.json({ message: 'Expense deleted successfully', groupAutoDeleted: autoDeleteResult.deleted });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join group by share code
app.post('/api/groups/join', authenticateToken, async (req, res) => {
  try {
    const { shareCode } = req.body;
    const currentUser = await User.findById(req.user.id).lean();
    
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
      name: currentUser?.name || req.user.name,
      email: currentUser?.email || req.user.email,
      phone: currentUser?.phone || req.user.phone,
      upiId: currentUser?.upiId || '',
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    });

    await group.save();
    res.json(await hydrateGroupMembers(group));
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, upiId = '' } = req.body;

    if (!userId || !name) {
      return res.status(400).json({ error: 'Please provide userId and name' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { name, upiId, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        upiId: updatedUser.upiId || '',
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/users/:userId/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        upiId: user.upiId || '',
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.get('/api/users/by-name/:name', authenticateToken, async (req, res) => {
  try {
    const decodedName = decodeURIComponent(req.params.name || '').trim();

    if (!decodedName) {
      return res.status(400).json({ error: 'name is required' });
    }

    const escapedName = decodedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await User.findOne(
      { name: { $regex: `^${escapedName}$`, $options: 'i' } },
      { upiId: 1, name: 1 }
    ).lean();

    res.status(200).json(
      user
        ? {
            id: user._id.toString(),
            name: user.name,
            upiId: user.upiId || '',
          }
        : {}
    );
  } catch (error) {
    console.error('Get user by name error:', error);
    res.status(500).json({ error: 'Failed to fetch user by name' });
  }
});

app.put('/api/users/:userId/upi', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { upiId = '' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { upiId, updatedAt: new Date() } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: 'UPI updated successfully',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        upiId: updatedUser.upiId || '',
      },
    });
  } catch (error) {
    console.error('Update UPI error:', error);
    res.status(500).json({ error: 'Failed to update UPI ID' });
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
