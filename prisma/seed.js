const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Starting bulk seed...');

    console.log('🗑️  Cleaning database...');
    await prisma.notification.deleteMany();
    await prisma.supportTicket.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.investment.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.card.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.marketData.deleteMany();

    // ============================================
    // MARKET DATA (Static seeds)
    // ============================================
    console.log('📈 Seeding market data...');
    await prisma.marketData.createMany({
        data: [
            { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', currentPrice: 42000.50, change24h: 2.5, volume24h: 30000000000 },
            { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', currentPrice: 2250.75, change24h: -1.2, volume24h: 15000000000 },
            { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', currentPrice: 185.92, change24h: 0.8, volume24h: 50000000 },
            { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', currentPrice: 215.45, change24h: -3.4, volume24h: 80000000 },
            { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'FOREX', currentPrice: 1.09, change24h: 0.1, volume24h: 100000000 },
        ]
    });

    // ============================================
    // USERS & PROFILES (100 users)
    // ============================================
    console.log('👥 Creating 100 users...');
    const baseUsers = [];
    for (let i = 1; i <= 100; i++) {
        baseUsers.push({
            email: `user${i}@example.com`,
            password: 'password123',
            firstName: `FirstName${i}`,
            lastName: `LastName${i}`,
            phoneNumber: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            role: i === 1 ? 'ADMIN' : (i % 10 === 0 ? 'MERCHANT' : 'CUSTOMER'),
            status: 'ACTIVE',
            emailVerified: true,
            kycVerified: i % 3 === 0,
        });
    }

    // Use createMany to insert users first
    await prisma.user.createMany({ data: baseUsers });

    // Fetch users to get their IDs for relations
    const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });

    // Create Profiles and Sessions in bulk
    console.log('👤 Creating profiles and sessions...');
    const profiles = allUsers.map((u, i) => ({
        userId: u.id,
        address: `${Math.floor(Math.random() * 999)} Fintech Lane`,
        city: 'New York',
        country: 'USA',
        occupation: i % 5 === 0 ? 'Engineer' : 'Trader',
        annualIncome: 50000 + Math.random() * 100000
    }));
    await prisma.userProfile.createMany({ data: profiles });

    // ============================================
    // ACCOUNTS (2 accounts per user)
    // ============================================
    console.log('💰 Creating 200 accounts...');
    const accountsData = [];
    allUsers.forEach(u => {
        // Checking Account
        accountsData.push({
            userId: u.id,
            accountNumber: `ACC${u.id}CHK${Math.floor(Math.random() * 1000)}`,
            accountType: 'CHECKING',
            balance: 1000 + Math.random() * 5000,
            availableBalance: 1000 + Math.random() * 5000,
            isDefault: true
        });
        // Savings Account
        accountsData.push({
            userId: u.id,
            accountNumber: `ACC${u.id}SAV${Math.floor(Math.random() * 1000)}`,
            accountType: 'SAVINGS',
            balance: 5000 + Math.random() * 20000,
            availableBalance: 5000 + Math.random() * 20000,
            isDefault: false
        });
    });
    await prisma.account.createMany({ data: accountsData });
    const allAccounts = await prisma.account.findMany({ select: { id: true, userId: true, accountNumber: true } });

    // ============================================
    // TRANSACTIONS (500 records)
    // ============================================
    console.log('💸 Creating 500 transactions...');
    const transactions = [];
    for (let i = 0; i < 500; i++) {
        const fromAcc = allAccounts[Math.floor(Math.random() * allAccounts.length)];
        const toAcc = allAccounts[Math.floor(Math.random() * allAccounts.length)];
        const amount = Math.floor(Math.random() * 500) + 1;

        transactions.push({
            userId: fromAcc.userId,
            fromAccountId: fromAcc.id,
            toAccountId: toAcc.id !== fromAcc.id ? toAcc.id : null,
            type: 'TRANSFER',
            status: 'COMPLETED',
            amount: amount,
            fee: 2.5,
            reference: `TXN${Date.now()}${i}${Math.floor(Math.random() * 1000)}`,
            description: `Bulk payment sample ${i}`,
            processedAt: new Date()
        });
    }
    await prisma.transaction.createMany({ data: transactions });

    // ============================================
    // INVESTMENTS (100 records)
    // ============================================
    console.log('📈 Creating 100 investment records...');
    const investments = [];
    const symbols = ['BTC', 'ETH', 'AAPL', 'TSLA'];
    for (let i = 0; i < 100; i++) {
        const acc = allAccounts[Math.floor(Math.random() * allAccounts.length)];
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const quantity = 0.1 + Math.random() * 10;
        const avgPrice = 100 + Math.random() * 40000;

        investments.push({
            accountId: acc.id,
            symbol: symbol,
            assetName: symbol === 'BTC' ? 'Bitcoin' : symbol,
            quantity: quantity,
            averagePrice: avgPrice,
            currentPrice: avgPrice * (1 + (Math.random() - 0.5) * 0.1),
            totalValue: quantity * avgPrice,
            plPercentage: (Math.random() - 0.5) * 20
        });
    }
    await prisma.investment.createMany({ data: investments });

    // ============================================
    // AUDIT LOGS (100 records)
    // ============================================
    console.log('📝 Creating 100 audit logs...');
    const auditLogs = [];
    const actions = ['LOGIN', 'TRANSFER', 'UPDATE_PROFILE', 'CHANGE_PASSWORD'];
    for (let i = 0; i < 100; i++) {
        const u = allUsers[Math.floor(Math.random() * allUsers.length)];
        auditLogs.push({
            userId: u.id,
            action: actions[Math.floor(Math.random() * actions.length)],
            resource: 'API',
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla/5.0'
        });
    }
    await prisma.auditLog.createMany({ data: auditLogs });

    // ============================================
    // SUPPORT TICKETS (50 records)
    // ============================================
    console.log('🎫 Creating 50 support tickets...');
    const tickets = [];
    for (let i = 0; i < 50; i++) {
        const u = allUsers[Math.floor(Math.random() * allUsers.length)];
        tickets.push({
            userId: u.id,
            subject: `Help request ${i}`,
            description: `This is a sample support ticket description for user ${u.id}`,
            status: 'OPEN',
            priority: 'MEDIUM'
        });
    }
    await prisma.supportTicket.createMany({ data: tickets });

    // ============================================
    // NOTIFICATIONS (300 records)
    // ============================================
    console.log('🔔 Creating 300 notifications...');
    const notifications = [];
    for (let i = 0; i < 300; i++) {
        const u = allUsers[Math.floor(Math.random() * allUsers.length)];
        notifications.push({
            userId: u.id,
            type: 'TRANSACTION',
            title: 'Alert',
            message: `Dynamic notification payload ${i}`,
            status: 'UNREAD'
        });
    }
    await prisma.notification.createMany({ data: notifications });

    console.log('\n✨ Bulk seed completed successfully!');
    await prisma.$disconnect();
    process.exit(0);
}

main().catch((e) => {
    console.error('❌ Error during bulk seed:', e);
    process.exit(1);
});
