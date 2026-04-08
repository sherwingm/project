# Database Setup for Budget Split Expenser

This directory contains the database setup script and configuration for the Budget Split Expenser application.

## Collections Created

The setup script creates the following MongoDB collections:

### 1. `users`
- User accounts and authentication data
- **Indexes**: email (unique), createdAt
- **Sample data**: None (created during registration)

### 2. `groups`
- Expense groups with member information
- **Indexes**: userId, createdAt, shareCode (unique, sparse)
- **Sample data**: None (created by users)

### 3. `expenses`
- Individual expenses within groups
- **Indexes**: groupId, createdAt, paidBy
- **Sample data**: None (created by users)

### 4. `wallet`
- Personal finance tracking for each user
- **Indexes**: userId, date, type
- **Sample data**: Demo wallet with initial balance and transactions

### 5. `supportTickets`
- Customer support requests and responses
- **Indexes**: userId, createdAt, status
- **Sample data**: Demo support ticket

### 6. `userSettings`
- User preferences and application settings
- **Indexes**: userId (unique)
- **Sample data**: Default settings for demo user

### 7. `fairnessSessions`
- Saved fairness calculator sessions
- **Indexes**: userId, createdAt
- **Sample data**: Demo fairness calculator session

## Setup Instructions

### Prerequisites
- MongoDB installed and running locally, or
- MongoDB Atlas connection string

### 1. Configure Environment Variables
Create a `.env` file in the project root:
```env
MONGODB_URI=mongodb://localhost:27017/budget-split-expenser
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/budget-split-expenser
```

### 2. Install Dependencies
```bash
cd database
npm install
```

### 3. Run Database Setup
```bash
npm run setup
```

This will:
- Create all necessary collections
- Set up indexes for optimal performance
- Insert sample data for demonstration

## API Endpoints

The server includes the following API endpoints for the new collections:

### Wallet Endpoints
- `GET /api/wallet/:userId` - Get user wallet info
- `GET /api/wallet/:userId/transactions` - Get wallet transactions
- `POST /api/wallet/:userId/transaction` - Add new transaction

### User Settings Endpoints
- `GET /api/user-settings/:userId` - Get user settings
- `PUT /api/user-settings/:userId` - Update user settings

### Support Tickets Endpoints
- `POST /api/support-tickets` - Create support ticket
- `GET /api/support-tickets/:userId` - Get user support tickets

### Fairness Calculator Endpoints
- `POST /api/fairness-sessions` - Save fairness session
- `GET /api/fairness-sessions/:userId` - Get user fairness sessions

### Account Management Endpoints
- `PUT /api/users/:userId/profile` - Update profile name
- `PUT /api/users/:userId/password` - Change password
- `DELETE /api/users/:userId` - Delete account and all data

## Data Models

### Wallet Transaction
```javascript
{
  userId: string,
  type: 'income' | 'expense',
  description: string,
  amount: number,
  category: string,
  date: Date,
  createdAt: Date
}
```

### Support Ticket
```javascript
{
  userId: string,
  type: string,
  subject: string,
  message: string,
  priority: 'low' | 'medium' | 'high',
  status: 'open' | 'in-progress' | 'resolved',
  responses: Array,
  createdAt: Date,
  updatedAt: Date
}
```

### User Settings
```javascript
{
  userId: string,
  theme: 'light' | 'dark',
  currency: string,
  notifications: {
    email: boolean,
    push: boolean,
    expenseReminders: boolean
  },
  privacy: {
    profileVisibility: string,
    showEmail: boolean
  },
  preferences: {
    defaultSplitMethod: string,
    autoSettle: boolean,
    language: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Fairness Session
```javascript
{
  userId: string,
  name: string,
  participants: Array,
  expenses: Array,
  settlements: Array,
  createdAt: Date,
  updatedAt: Date
}
```

## Security Notes

- Passwords are stored as plain text in this demo (use bcrypt in production)
- No authentication middleware is implemented (add JWT or similar in production)
- Consider adding data validation and sanitization
- Implement rate limiting for API endpoints

## Next Steps

1. Add authentication middleware to protect endpoints
2. Implement password hashing with bcrypt
3. Add input validation and sanitization
4. Set up proper error handling and logging
5. Add unit and integration tests
6. Consider implementing data backup strategies
