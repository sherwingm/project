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
    splitMethod: {
      type: String,
      enum: ['equal', 'exact', 'shares', 'percentage'],
      default: 'equal'
    },
    splits: [{
      userId: { type: String, required: true },
      amountOwed: { type: Number, required: true },
    }],
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

  try {
    return JSON.parse(candidate);
  } catch (error) {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
      } catch (nestedError) {
        return null;
      }
    }

    return null;
  }
}

function normalizeAmountValue(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
  }

  if (typeof value === 'string') {
    const cleaned = value
      .replace(/,/g, '')
      .replace(/[₹$€]/g, '')
      .replace(/[^\d.-]/g, '')
      .trim();

    if (!cleaned) {
      return null;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
  }

  return null;
}

function extractAmountFromText(text) {
  const source = String(text || '');
  const keywordPatterns = [
    /(?:grand\s*total|total\s*due|net\s*amount|bill\s*total|final\s*amount|amount\s*payable|payable|balance\s*due|total)[^\d]{0,24}([₹$€]?\s*[\d,]+(?:\.\d{1,2})?)/i,
    /(?:₹|rs\.?|inr|\$|€)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of keywordPatterns) {
    const match = source.match(pattern);
    if (match) {
      const amount = normalizeAmountValue(match[1]);
      if (amount !== null) {
        return amount;
      }
    }
  }

  const fallbackAmounts = Array.from(source.matchAll(/(?:₹|rs\.?|inr|\$|€)?\s*([\d,]+(?:\.\d{1,2})?)/gi))
    .map((match) => normalizeAmountValue(match[1]))
    .filter((value) => value !== null)
    .sort((a, b) => b - a);

  return fallbackAmounts.length > 0 ? fallbackAmounts[0] : null;
}

function extractShopNameFromText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  let bestName = '';
  let bestScore = -Infinity;

  for (const [index, rawLine] of lines.entries()) {
    let line = rawLine.replace(/^(shop\s*name|merchant|store|bill\s*to|sold\s*by|from)\s*[:\-]?\s*/i, '').trim();

    if (line.length < 3 || line.length > 80) {
      continue;
    }

    if (/^\d/.test(line)) {
      continue;
    }

    const letterCount = (line.match(/[A-Za-z]/g) || []).length;
    if (letterCount < 3) {
      continue;
    }

    const upperCount = (line.match(/[A-Z]/g) || []).length;
    const upperRatio = upperCount / Math.max(letterCount, 1);
    const keywordBonus = /(restaurant|hotel|store|mart|cafe|shop|supermarket|market|kitchen|foods?|bistro|dining|traders?|emporium)/i.test(line) ? 0.75 : 0;
    const positionBonus = index < 3 ? 0.55 : index < 6 ? 0.25 : 0;
    const lengthBonus = line.length <= 30 ? 0.2 : 0;
    const digitPenalty = (line.match(/\d/g) || []).length * 0.35;
    const score = upperRatio + keywordBonus + positionBonus + lengthBonus - digitPenalty;

    if (score > bestScore) {
      bestScore = score;
      bestName = line;
    }
  }

  return bestName;
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

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

function isValidUpiId(value) {
  const trimmed = String(value || '').trim();
  return trimmed.length >= 5 && trimmed.length <= 50 && trimmed.includes('@') && !/\s/.test(trimmed);
}

function getExpenseSplitAmounts(expense) {
  if (Array.isArray(expense.splits) && expense.splits.length > 0) {
    return expense.splits
      .filter((split) => split && split.userId)
      .map((split) => ({
        userId: split.userId,
        amountOwed: Number(split.amountOwed || 0),
      }))
      .filter((split) => Number.isFinite(split.amountOwed));
  }

  const splitBetween = Array.isArray(expense.splitBetween) ? expense.splitBetween : [];
  if (splitBetween.length === 0) {
    return [];
  }

  const amount = Number(expense.amount || 0);
  const perPerson = splitBetween.length > 0 ? amount / splitBetween.length : 0;
  return splitBetween.map((userId) => ({ userId, amountOwed: perPerson }));
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

    const splitAmounts = getExpenseSplitAmounts(expense);
    if (splitAmounts.length === 0) return;

    splitAmounts.forEach((split) => {
      balances.set(split.userId, (balances.get(split.userId) || 0) - split.amountOwed);
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

    const splitAmounts = getExpenseSplitAmounts(expense);
    if (splitAmounts.length === 0) return;

    splitAmounts.forEach((split) => {
      balances.set(split.userId, (balances.get(split.userId) || 0) - split.amountOwed);
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
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

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
    const { email, phone, password, name, upiId, isLogin } = req.body;
    console.log('Login attempt:', req.body);

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (isLogin) {
      // Login logic
      if (!email && !phone) {
        return res.status(400).json({ error: 'Email or phone is required' });
      }

      const loginEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const loginPhone = typeof phone === 'string' ? phone.trim() : '';

      const loginQuery = {
        $or: [
          ...(loginEmail ? [{ email: loginEmail }] : []),
          ...(loginPhone ? [{ phone: loginPhone }] : []),
        ],
      };

      const user = await User.findOne(loginQuery);

      if (!user) {
        return res.status(404).json({ message: 'User not found', error: 'User not found' });
      }

      let isPasswordValid = false;
      const storedPassword = typeof user.password === 'string' ? user.password : '';

      if (isBcryptHash(storedPassword)) {
        try {
          isPasswordValid = await bcrypt.compare(password, storedPassword);
        } catch (compareError) {
          console.warn('Bcrypt compare failed, falling back to plain-text check:', compareError?.message || compareError);
        }
      }

      if (!isPasswordValid) {
        isPasswordValid = password === storedPassword;
        if (isPasswordValid && storedPassword && !isBcryptHash(storedPassword)) {
          user.password = await bcrypt.hash(password, 10);
          await user.save();
        }
      }

      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid password', error: 'Invalid password' });
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

      if (!email) {
        return res.status(400).json({ error: 'Email is required for registration' });
      }

      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
      const normalizedUpiId = typeof upiId === 'string' ? upiId.trim() : '';

      // Check if user already exists
      const existingQueries = [];
      if (normalizedEmail) existingQueries.push({ email: normalizedEmail });
      if (normalizedPhone) existingQueries.push({ phone: normalizedPhone });

      const existingUser = existingQueries.length > 0
        ? await User.findOne({ $or: existingQueries })
        : null;

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new User({
        name,
        email: normalizedEmail || undefined,
        phone: normalizedPhone || undefined,
        password: hashedPassword,
        upiId: normalizedUpiId || ''
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
    res.status(500).json({
      message: error?.message || 'Internal Server Error',
      error: error?.message || 'Internal Server Error'
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, phone, password, name, upiId } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required for registration' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required for registration' });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
    const normalizedUpiId = typeof upiId === 'string' ? upiId.trim() : '';

    const existingQueries = [];
    if (normalizedEmail) existingQueries.push({ email: normalizedEmail });
    if (normalizedPhone) existingQueries.push({ phone: normalizedPhone });

    const existingUser = existingQueries.length > 0
      ? await User.findOne({ $or: existingQueries })
      : null;

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email: normalizedEmail || undefined,
      phone: normalizedPhone || undefined,
      password: hashedPassword,
      upiId: normalizedUpiId || '',
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
        upiId: newUser.upiId || '',
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      message: error?.message || 'Internal Server Error',
      error: error?.message || 'Internal Server Error'
    });
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
    const { name, autoDelete = false, deleteAfter = 'immediately' } = req.body;
    const currentUser = await User.findById(req.user.id).lean();
    
    const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const shareToken = generateShareToken();

    const newGroup = new Group({
      name,
      createdBy: req.user.id,
      members: [{
        id: req.user.id,
        name: currentUser?.name || req.user.name,
        email: currentUser?.email || req.user.email,
        phone: currentUser?.phone || req.user.phone,
        upiId: currentUser?.upiId || '',
        color: '#3B82F6'
      }],
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

// Public invite preview for join pages
app.get('/api/groups/:groupId/invite-preview', async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId).lean();
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const creator = await User.findById(group.createdBy).lean();

    res.json({
      id: group._id.toString(),
      groupName: group.name,
      creatorName: creator?.name || 'Someone',
      memberCount: Array.isArray(group.members) ? group.members.length : 0,
    });
  } catch (error) {
    console.error('Invite preview error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join group by invite link
app.post('/api/groups/:groupId/join', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const currentUser = await User.findById(req.user.id).lean();

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const alreadyMember = group.members.some((member) => member.id === req.user.id);
    if (alreadyMember) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    group.members.push({
      id: req.user.id,
      name: currentUser?.name || req.user.name,
      email: currentUser?.email || req.user.email,
      phone: currentUser?.phone || req.user.phone,
      upiId: currentUser?.upiId || '',
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
    });

    await group.save();
    res.json(await hydrateGroupMembers(group));
  } catch (error) {
    console.error('Join group by id error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Join group directly via public share token
app.post('/api/groups/join-by-token', authenticateToken, async (req, res) => {
  try {
    const { shareToken } = req.body || {};
    if (!shareToken) {
      return res.status(400).json({ error: 'shareToken is required' });
    }

    const currentUser = await User.findById(req.user.id).lean();
    const group = await Group.findOne({ shareToken });

    if (!group) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    const alreadyMember = group.members.some((member) => member.id === req.user.id);
    if (alreadyMember) {
      return res.status(400).json({ error: 'You are already a member of this group' });
    }

    group.members.push({
      id: req.user.id,
      name: currentUser?.name || req.user.name,
      email: currentUser?.email || req.user.email,
      phone: currentUser?.phone || req.user.phone,
      upiId: currentUser?.upiId || '',
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
    });

    await group.save();
    res.json(await hydrateGroupMembers(group));
  } catch (error) {
    console.error('Join group by token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/ocr/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body || {};

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64 and mimeType are required' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 768,
            responseMimeType: 'application/json',
          },
          contents: [{
            parts: [
              { inlineData: { mimeType, data: imageBase64 } },
              {
                text: `You are a receipt OCR extractor for an expense splitting app.

Analyze the receipt image and return ONLY valid JSON with these keys:
{
  "shopName": "string",
  "totalAmount": number | null,
  "confidence": number,
  "rawText": "string"
}

Rules:
- shopName should be the primary merchant or business name.
- totalAmount should be the final amount paid if visible.
- confidence must be a number from 0 to 1.
- rawText should preserve the visible receipt text as best as possible.
- If a value is unreadable, use an empty string for shopName, null for totalAmount, and a lower confidence.
- Do not include any explanation, markdown, or extra text outside the JSON object.`,
              },
            ],
          }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini OCR error:', errorText);
      return res.status(502).json({ error: 'Receipt scan failed' });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return res.status(502).json({ error: 'Receipt scan failed' });

    const parsed = extractJsonFromText(text);
    const rawText = typeof parsed?.rawText === 'string' ? parsed.rawText.trim() : String(text).trim();
    const parsedShopName = typeof parsed?.shopName === 'string' ? parsed.shopName.trim() : '';
    const parsedConfidence = typeof parsed?.confidence === 'number' && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : null;
    const parsedAmount = normalizeAmountValue(parsed?.totalAmount ?? parsed?.amount);

    const fallbackShopName = extractShopNameFromText(rawText || text);
    const fallbackAmount = extractAmountFromText(rawText || text);

    const shopName = parsedShopName || fallbackShopName;
    const totalAmount = parsedAmount ?? fallbackAmount;
    const amountConfident = totalAmount !== null && totalAmount > 0;
    const nameConfident = Boolean(shopName);
    const confidence = parsedConfidence ?? ((nameConfident && amountConfident) ? 0.85 : nameConfident || amountConfident ? 0.55 : 0.1);

    res.json({
      rawText,
      shopName: nameConfident ? shopName : '',
      totalAmount,
      confidence,
      nameConfident,
      amountConfident,
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
    const creator = await User.findById(group.createdBy).lean();

    res.json({
      id: group._id.toString(),
      groupName: group.name,
      creatorName: creator?.name || 'Someone',
      memberCount: Array.isArray(group.members) ? group.members.length : 0,
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

// Delete group — creator only
app.delete('/api/groups/:groupId', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the group creator can delete this group' });
    }

    await Group.findByIdAndDelete(groupId);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
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

// Edit expense — any member can edit
app.put('/api/groups/:groupId/expenses/:expenseId', authenticateToken, async (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const { name, amount, paidBy, splitBetween, splitMethod, splits, category, date, receiptImage } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const isMember = group.members.some((m) => m.id === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: 'Only group members can edit expenses' });
    }

    const expenseIndex = group.expenses.findIndex((e) => e.id === expenseId);
    if (expenseIndex === -1) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    group.expenses[expenseIndex] = {
      ...group.expenses[expenseIndex],
      name: name ?? group.expenses[expenseIndex].name,
      amount: amount ?? group.expenses[expenseIndex].amount,
      paidBy: paidBy ?? group.expenses[expenseIndex].paidBy,
      splitBetween: splitBetween ?? group.expenses[expenseIndex].splitBetween,
      splitMethod: splitMethod ?? group.expenses[expenseIndex].splitMethod,
      splits: splits ?? group.expenses[expenseIndex].splits,
      category: category ?? group.expenses[expenseIndex].category,
      date: date ? new Date(date) : group.expenses[expenseIndex].date,
      receiptImage: receiptImage ?? group.expenses[expenseIndex].receiptImage,
    };

    group.markModified('expenses');
    await group.save();

    res.json(group.expenses[expenseIndex]);
  } catch (error) {
    console.error('Edit expense error:', error);
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
    const { name, upiId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const updateFields = {};

    if (typeof name === 'string' && name.trim()) {
      updateFields.name = name.trim();
    }

    if (upiId !== undefined) {
      const normalizedUpiId = String(upiId || '').trim();
      if (normalizedUpiId && !isValidUpiId(normalizedUpiId)) {
        return res.status(400).json({ error: 'Please provide a valid UPI ID' });
      }
      updateFields.upiId = normalizedUpiId;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'Please provide at least one field to update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { ...updateFields, updatedAt: new Date() } },
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

app.put(['/api/users/:userId/upi', '/api/users/:id/upi'], authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId || req.params.id;
    const { upiId = '' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const normalizedUpiId = String(upiId || '').trim();
    if (normalizedUpiId && !isValidUpiId(normalizedUpiId)) {
      return res.status(400).json({ error: 'Please provide a valid UPI ID' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { upiId: normalizedUpiId, updatedAt: new Date() } },
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
