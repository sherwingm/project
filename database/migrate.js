const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const LOCAL_URI = 'mongodb://localhost:27017/budget-split-expenser';
const ATLAS_URI = process.env.MONGODB_URI || '';
const DB_NAME = 'budget-split-expenser';

// Collections to migrate
const COLLECTIONS = [
  'users',
  'groups',
  'expenses',
  'wallet',
  'supportTickets',
  'settlements',
  'receipts'
];

async function migrateData() {
  let localClient, atlasClient;

  try {
    console.log('🔄 Starting data migration...\n');

    // Validate Atlas URI
    if (!ATLAS_URI) {
      throw new Error('MONGODB_URI environment variable not set');
    }

    // Connect to local MongoDB
    console.log('📍 Connecting to local MongoDB...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db(DB_NAME);
    console.log('✓ Connected to local MongoDB\n');

    // Connect to Atlas
    console.log('☁️  Connecting to MongoDB Atlas...');
    atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    const atlasDb = atlasClient.db(DB_NAME);
    console.log('✓ Connected to MongoDB Atlas\n');

    let totalDocsMigrated = 0;

    // Migrate each collection
    for (const collectionName of COLLECTIONS) {
      try {
        const sourceCollection = localDb.collection(collectionName);
        const targetCollection = atlasDb.collection(collectionName);

        // Count documents in source
        const count = await sourceCollection.countDocuments();

        if (count === 0) {
          console.log(`⏭️  Skipping ${collectionName} (empty)`);
          continue;
        }

        console.log(`📦 Migrating ${collectionName}...`);

        // Fetch all documents from local
        const documents = await sourceCollection.find({}).toArray();

        if (documents.length > 0) {
          // Clear target collection first
          await targetCollection.deleteMany({});

          // Insert into Atlas
          const result = await targetCollection.insertMany(documents);
          console.log(`   ✓ Migrated ${result.insertedIds.length} documents`);
          totalDocsMigrated += result.insertedIds.length;
        }
      } catch (collectionError) {
        console.log(`   ⚠️  Skipped ${collectionName} (collection may not exist)`);
      }
    }

    console.log(`\n✅ Migration complete! Total documents migrated: ${totalDocsMigrated}`);
    console.log('\n📝 Next steps:');
    console.log('1. Restart your Render backend');
    console.log('2. Try logging in on your Vercel frontend');
    console.log('3. Verify your data is accessible');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
  }
}

// Run migration
migrateData();
