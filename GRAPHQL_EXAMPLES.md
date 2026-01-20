# GraphQL Fintech API - Example Queries & Mutations

This document contains example GraphQL queries and mutations you can use to test the fintech API.

## 🔐 Authentication

### Register a New User
```graphql
mutation {
  register(input: {
    email: "newuser@example.com"
    password: "password123"
    firstName: "Alice"
    lastName: "Johnson"
    phoneNumber: "+1234567895"
    dateOfBirth: "1995-06-15"
  }) {
    token
    user {
      id
      email
      fullName
      role
      status
    }
    expiresAt
  }
}
```

### Login
```graphql
mutation {
  login(email: "john.doe@example.com", password: "hashed_password_123") {
    token
    user {
      id
      email
      fullName
      role
      emailVerified
      kycVerified
    }
    expiresAt
  }
}
```

### Get Current User
```graphql
query {
  me {
    id
    email
    fullName
    phoneNumber
    role
    status
    emailVerified
    kycVerified
    profile {
      address
      city
      state
      country
      occupation
      annualIncome
    }
  }
}
```

## 👥 User Management

### Get All Users
```graphql
query {
  users {
    id
    email
    fullName
    role
    status
    createdAt
  }
}
```

### Get Users by Role
```graphql
query {
  users(role: CUSTOMER) {
    id
    fullName
    email
    status
  }
}
```

### Get User by ID with Relations
```graphql
query {
  user(id: 1) {
    id
    fullName
    email
    accounts {
      id
      accountNumber
      accountType
      balance
      currency
    }
    cards {
      id
      cardNumber
      cardType
      status
    }
    transactions {
      id
      type
      amount
      status
      createdAt
    }
  }
}
```

### Update User Profile
```graphql
mutation {
  updateUserProfile(
    userId: 1
    input: {
      address: "456 New Street"
      city: "Boston"
      state: "MA"
      occupation: "Senior Engineer"
      annualIncome: 150000
    }
  ) {
    id
    address
    city
    occupation
    annualIncome
  }
}
```

## 💰 Accounts

### Get User Accounts
```graphql
query {
  accounts(userId: 1) {
    id
    accountNumber
    accountType
    currency
    balance
    availableBalance
    isDefault
    status
    createdAt
  }
}
```

### Create New Account
```graphql
mutation {
  createAccount(input: {
    userId: 1
    accountType: SAVINGS
    currency: USD
  }) {
    id
    accountNumber
    accountType
    balance
    status
  }
}
```

### Get Account by Number
```graphql
query {
  accountByNumber(accountNumber: "ACC1234567890") {
    id
    accountNumber
    accountType
    balance
    user {
      fullName
      email
    }
  }
}
```

### Set Default Account
```graphql
mutation {
  setDefaultAccount(id: 2, userId: 1) {
    id
    accountNumber
    isDefault
  }
}
```

## 💸 Transactions

### Get User Transactions
```graphql
query {
  transactions(userId: 1, limit: 10) {
    id
    type
    status
    amount
    currency
    fee
    description
    reference
    createdAt
    fromAccount {
      accountNumber
      accountType
    }
    toAccount {
      accountNumber
      accountType
    }
  }
}
```

### Get Transactions by Status
```graphql
query {
  transactions(userId: 1, status: COMPLETED, limit: 20) {
    id
    type
    amount
    description
    processedAt
  }
}
```

### Create Transaction (Transfer)
```graphql
mutation {
  createTransaction(input: {
    userId: 1
    fromAccountId: 1
    toAccountId: 4
    type: TRANSFER
    amount: 100.00
    currency: USD
    description: "Payment for services"
  }) {
    id
    reference
    type
    amount
    fee
    status
    createdAt
  }
}
```

### Create Transaction (Deposit)
```graphql
mutation {
  createTransaction(input: {
    userId: 1
    toAccountId: 1
    type: DEPOSIT
    amount: 1000.00
    description: "Monthly salary"
  }) {
    id
    reference
    amount
    status
  }
}
```

### Process Pending Transaction
```graphql
mutation {
  processTransaction(id: 5) {
    id
    status
    processedAt
    fromAccount {
      balance
      availableBalance
    }
    toAccount {
      balance
      availableBalance
    }
  }
}
```

### Cancel Transaction
```graphql
mutation {
  cancelTransaction(id: 6) {
    id
    status
  }
}
```

### Get Transaction by Reference
```graphql
query {
  transactionByReference(reference: "TXN1737399123456") {
    id
    type
    amount
    status
    description
    user {
      fullName
    }
  }
}
```

## 💳 Cards

### Get User Cards
```graphql
query {
  cards(userId: 1) {
    id
    cardNumber
    cardHolderName
    cardType
    status
    expiryMonth
    expiryYear
    isVirtual
    creditLimit
    availableCredit
  }
}
```

### Create New Card
```graphql
mutation {
  createCard(input: {
    userId: 1
    cardHolderName: "JOHN DOE"
    cardType: VIRTUAL
    expiryMonth: 12
    expiryYear: 2028
    isVirtual: true
  }) {
    id
    cardNumber
    cardType
    status
    cvv
  }
}
```

### Block Card
```graphql
mutation {
  blockCard(id: 1) {
    id
    cardNumber
    status
  }
}
```

### Unblock Card
```graphql
mutation {
  unblockCard(id: 1) {
    id
    cardNumber
    status
  }
}
```

## 👤 Beneficiaries

### Get User Beneficiaries
```graphql
query {
  beneficiaries(userId: 1) {
    id
    name
    accountNumber
    bankName
    bankCode
    email
    phoneNumber
    isVerified
    createdAt
  }
}
```

### Add Beneficiary
```graphql
mutation {
  addBeneficiary(input: {
    userId: 1
    name: "Mike Johnson"
    accountNumber: "ACC9876543210"
    bankName: "FinTech Bank"
    bankCode: "FTB001"
    email: "mike.johnson@example.com"
    phoneNumber: "+1234567892"
  }) {
    id
    name
    accountNumber
    isVerified
  }
}
```

### Verify Beneficiary
```graphql
mutation {
  verifyBeneficiary(id: 2) {
    id
    name
    isVerified
  }
}
```

### Remove Beneficiary
```graphql
mutation {
  removeBeneficiary(id: 3)
}
```

## 🔔 Notifications

### Get User Notifications
```graphql
query {
  notifications(userId: 1) {
    id
    type
    status
    title
    message
    metadata
    createdAt
    readAt
  }
}
```

### Get Unread Notifications
```graphql
query {
  notifications(userId: 1, status: UNREAD) {
    id
    title
    message
    createdAt
  }
}
```

### Get Unread Count
```graphql
query {
  unreadNotificationCount(userId: 1)
}
```

### Mark Notification as Read
```graphql
mutation {
  markNotificationAsRead(id: 1) {
    id
    status
    readAt
  }
}
```

### Mark All as Read
```graphql
mutation {
  markAllNotificationsAsRead(userId: 1)
}
```

### Delete Notification
```graphql
mutation {
  deleteNotification(id: 5)
}
```

## 🎯 Complex Queries with Multiple Relations

### Complete User Financial Overview
```graphql
query {
  user(id: 1) {
    id
    fullName
    email
    status
    
    profile {
      city
      state
      occupation
      annualIncome
    }
    
    accounts {
      id
      accountNumber
      accountType
      balance
      currency
      isDefault
      
      transactionsFrom(limit: 5) {
        id
        type
        amount
        description
        createdAt
      }
    }
    
    cards {
      id
      cardNumber
      cardType
      status
      creditLimit
      availableCredit
    }
    
    beneficiaries {
      id
      name
      bankName
      isVerified
    }
    
    notifications(status: UNREAD) {
      id
      title
      message
      createdAt
    }
  }
}
```

### Account with Transaction History
```graphql
query {
  account(id: 1) {
    id
    accountNumber
    accountType
    balance
    availableBalance
    
    user {
      fullName
      email
    }
    
    transactionsFrom {
      id
      type
      amount
      description
      toAccount {
        accountNumber
      }
      createdAt
    }
    
    transactionsTo {
      id
      type
      amount
      description
      fromAccount {
        accountNumber
      }
      createdAt
    }
  }
}
```

## 📊 Useful Filters & Pagination

### Recent Completed Transactions
```graphql
query {
  transactions(
    userId: 1
    status: COMPLETED
    limit: 20
  ) {
    id
    type
    amount
    description
    processedAt
  }
}
```

### Filter by Transaction Type
```graphql
query {
  transactions(
    userId: 1
    type: TRANSFER
    limit: 10
  ) {
    id
    amount
    description
    fromAccount {
      accountNumber
    }
    toAccount {
      accountNumber
    }
  }
}
```

## 🎮 Testing Workflow

1. **Start with authentication**: Register or login to get a user
2. **Create accounts**: Set up checking, savings, or crypto accounts
3. **Add beneficiaries**: Add trusted recipients for transfers
4. **Create cards**: Issue debit, credit, or virtual cards
5. **Make transactions**: Create deposits, transfers, or payments
6. **Process transactions**: Move pending transactions to completed
7. **Check notifications**: View transaction confirmations and alerts
8. **Explore relations**: Query nested data to see the full picture

## 🚀 Access GraphQL Playground

Once the server is running, visit:
```
http://localhost:4000/graphql
```

You can use the GraphQL Playground to:
- Explore the schema documentation
- Test queries and mutations
- See autocomplete suggestions
- View query results in real-time

## 💡 Tips

- Use variables in GraphQL Playground for dynamic queries
- Check the schema docs (right panel) for all available fields
- Transactions are created as PENDING - use `processTransaction` to complete them
- The seeder creates sample data you can query immediately
- All IDs are auto-incremented integers starting from 1
