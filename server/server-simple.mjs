import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-split-expenser';

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
let db;

async function connectToDatabase() {
  try {
    await new MongoClient(MONGODB_URI).connect();
    db = new MongoClient(MONGODB_URI).db('budget-split-expenser');
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
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
    res.status(201).json({ message: '✅ User registered successfully', user: newUser });
  } catch (error) {
    console.error('❌ Registration error:', error);
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
      message: '✅ Login successful',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
