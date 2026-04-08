#!/usr/bin/env node

const { MongoClient } = require('mongodb');

// Test database connection and collections
async function testDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budget-split-expenser';
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db('budget-split-expenser');
    
    // Test all collections
    const collections = [
      'users',
      'groups', 
      'expenses',
      'wallet',
      'supportTickets',
      'userSettings',
      'fairnessSessions'
    ];
    
    console.log('\n📋 Testing collections:');
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`✅ ${collectionName}: ${count} documents`);
      } catch (error) {
        console.log(`❌ ${collectionName}: Error - ${error.message}`);
      }
    }
    
    // Test sample data
    console.log('\n🔍 Testing sample data:');
    
    const wallet = db.collection('wallet');
    const walletData = await wallet.findOne({ userId: 'demo-user', balance: { $exists: true } });
    if (walletData) {
      console.log(`✅ Demo wallet balance: $${walletData.balance}`);
    }
    
    const transactions = await wallet.find({ userId: 'demo-user', type: { $exists: true } }).toArray();
    console.log(`✅ Demo transactions: ${transactions.length} found`);
    
    const supportTickets = db.collection('supportTickets');
    const ticketCount = await supportTickets.countDocuments({ userId: 'demo-user' });
    console.log(`✅ Demo support tickets: ${ticketCount} found`);
    
    const fairnessSessions = db.collection('fairnessSessions');
    const sessionCount = await fairnessSessions.countDocuments({ userId: 'demo-user' });
    console.log(`✅ Demo fairness sessions: ${sessionCount} found`);
    
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log('\n🌐 Testing API endpoints...');
  
  const baseUrl = 'http://localhost:5000';
  
  const endpoints = [
    { method: 'GET', path: '/api/wallet/demo-user', description: 'Get wallet' },
    { method: 'GET', path: '/api/wallet/demo-user/transactions', description: 'Get wallet transactions' },
    { method: 'GET', path: '/api/user-settings/demo-user', description: 'Get user settings' },
    { method: 'GET', path: '/api/support-tickets/demo-user', description: 'Get support tickets' },
    { method: 'GET', path: '/api/fairness-sessions/demo-user', description: 'Get fairness sessions' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`);
      if (response.ok) {
        console.log(`✅ ${endpoint.description}: ${response.status}`);
      } else {
        console.log(`❌ ${endpoint.description}: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.description}: Connection failed`);
    }
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting database and API tests...\n');
  
  await testDatabase();
  
  // Only test API if server is running
  try {
    await testAPIEndpoints();
  } catch (error) {
    console.log('\n⚠️  API tests skipped (server not running on port 5000)');
    console.log('Start the server with: npm run server');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testDatabase, testAPIEndpoints };
