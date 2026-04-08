const { MongoClient } = require('mongodb');

// Database configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-split-expenser';
const DB_NAME = 'budget-split-expenser';

async function setupDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = client.db(DB_NAME);
    
    // Create collections with indexes
    console.log('Creating collections and indexes...');
    
    // 1. Users collection
    const users = db.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
    await users.createIndex({ createdAt: -1 });
    console.log('✓ Users collection created with indexes');
    
    // 2. Groups collection
    const groups = db.collection('groups');
    await groups.createIndex({ userId: 1 });
    await groups.createIndex({ createdAt: -1 });
    await groups.createIndex({ shareCode: 1 }, { unique: true, sparse: true });
    console.log('✓ Groups collection created with indexes');
    
    // 3. Expenses collection
    const expenses = db.collection('expenses');
    await expenses.createIndex({ groupId: 1 });
    await expenses.createIndex({ createdAt: -1 });
    await expenses.createIndex({ paidBy: 1 });
    console.log('✓ Expenses collection created with indexes');
    
    // 4. Wallet collection (for personal finance tracking)
    const wallet = db.collection('wallet');
    await wallet.createIndex({ userId: 1 });
    await wallet.createIndex({ date: -1 });
    await wallet.createIndex({ type: 1 });
    console.log('✓ Wallet collection created with indexes');
    
    // 5. Support tickets collection
    const supportTickets = db.collection('supportTickets');
    await supportTickets.createIndex({ userId: 1 });
    await supportTickets.createIndex({ createdAt: -1 });
    await supportTickets.createIndex({ status: 1 });
    console.log('✓ Support tickets collection created with indexes');
    
    // 6. User settings collection
    const userSettings = db.collection('userSettings');
    await userSettings.createIndex({ userId: 1 }, { unique: true });
    console.log('✓ User settings collection created with indexes');
    
    // 7. Fairness calculator sessions collection
    const fairnessSessions = db.collection('fairnessSessions');
    await fairnessSessions.createIndex({ userId: 1 });
    await fairnessSessions.createIndex({ createdAt: -1 });
    console.log('✓ Fairness sessions collection created with indexes');
    
    // Insert sample data for demonstration
    console.log('Inserting sample data...');
    
    // Sample user settings
    await userSettings.updateOne(
      { userId: 'demo-user' },
      {
        $setOnInsert: {
          userId: 'demo-user',
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
        }
      },
      { upsert: true }
    );
    console.log('✓ Sample user settings inserted');
    
    // Sample wallet data
    await wallet.updateOne(
      { userId: 'demo-user' },
      {
        $setOnInsert: {
          userId: 'demo-user',
          balance: 0,
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    // Sample wallet transactions (no default income)
    const sampleTransactions = [
      {
        userId: 'demo-user',
        type: 'expense',
        description: 'Grocery Shopping',
        amount: 150,
        category: 'Food',
        date: new Date('2026-03-15'),
        createdAt: new Date()
      },
      {
        userId: 'demo-user',
        type: 'expense',
        description: 'Electric Bill',
        amount: 80,
        category: 'Utilities',
        date: new Date('2026-03-10'),
        createdAt: new Date()
      }
    ];
    
    for (const transaction of sampleTransactions) {
      await wallet.insertOne(transaction);
    }
    console.log('✓ Sample wallet transactions inserted');
    
    // Sample support ticket
    await supportTickets.insertOne({
      userId: 'demo-user',
      type: 'general',
      subject: 'Welcome to Budget Split Expenser!',
      message: 'This is a sample support ticket to demonstrate the system.',
      status: 'resolved',
      priority: 'low',
      responses: [
        {
          message: 'Thank you for using our app! If you have any questions, feel free to reach out.',
          responder: 'support-team',
          timestamp: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✓ Sample support ticket inserted');
    
    // Sample fairness calculator session
    await fairnessSessions.insertOne({
      userId: 'demo-user',
      name: 'Weekend Trip Expenses',
      participants: [
        { id: '1', name: 'Alice', totalPaid: 150, totalOwes: 133.33 },
        { id: '2', name: 'Bob', totalPaid: 100, totalOwes: 133.33 },
        { id: '3', name: 'Charlie', totalPaid: 150, totalOwes: 133.33 }
      ],
      expenses: [
        {
          id: '1',
          description: 'Gas',
          amount: 60,
          paidBy: '1',
          splitBetween: ['1', '2', '3'],
          date: new Date()
        },
        {
          id: '2',
          description: 'Food',
          amount: 120,
          paidBy: '2',
          splitBetween: ['1', '2', '3'],
          date: new Date()
        },
        {
          id: '3',
          description: 'Hotel',
          amount: 220,
          paidBy: '3',
          splitBetween: ['1', '2', '3'],
          date: new Date()
        }
      ],
      settlements: [
        { from: '2', to: '1', amount: 33.33 },
        { from: '2', to: '3', amount: 33.33 }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('✓ Sample fairness calculator session inserted');
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nCollections created:');
    console.log('- users: User accounts and authentication');
    console.log('- groups: Expense groups with members');
    console.log('- expenses: Individual expenses within groups');
    console.log('- wallet: Personal finance tracking');
    console.log('- supportTickets: Customer support requests');
    console.log('- userSettings: User preferences and settings');
    console.log('- fairnessSessions: Fairness calculator sessions');
    
    console.log('\nSample data inserted for demonstration purposes.');
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
