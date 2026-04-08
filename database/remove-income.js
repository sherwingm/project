const { MongoClient } = require('mongodb');

async function removeDefaultIncome() {
  const client = new MongoClient('mongodb://localhost:27017/budget-split-expenser');
  
  try {
    await client.connect();
    const db = client.db('budget-split-expenser');
    
    // Update wallet balance to 0
    await db.collection('wallet').updateOne(
      { userId: 'demo-user' },
      { 
        $set: { balance: 0, updatedAt: new Date() }
      }
    );
    
    // Remove income transactions
    await db.collection('wallet').deleteMany({ 
      userId: 'demo-user', 
      type: 'income' 
    });
    
    console.log('✓ Default income removed, balance set to 0');
    
    // Check current state
    const wallet = await db.collection('wallet').findOne({ userId: 'demo-user', balance: { $exists: true } });
    if (wallet) {
      console.log('✓ Current wallet balance:', wallet.balance);
    }
    
    const transactions = await db.collection('wallet').find({ userId: 'demo-user', type: { $exists: true } }).toArray();
    console.log('✓ Current transactions:', transactions.length);
    transactions.forEach(t => console.log('  -', t.type, t.description, t.amount));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

removeDefaultIncome();
