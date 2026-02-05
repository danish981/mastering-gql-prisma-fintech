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
    console.log('🌱 Starting MEGA bulk seed...');

    console.log('🗑️  Cleaning database...');
    await prisma.connection.deleteMany();
    await prisma.rewardRedemption.deleteMany();
    await prisma.rewardPoint.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.merchant.deleteMany();
    await prisma.savingsGoal.deleteMany();
    await prisma.accountLimit.deleteMany();
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
    // MARKET DATA
    // ============================================
    console.log('📈 Seeding market data...');
    await prisma.marketData.createMany({
        data: [
            { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', currentPrice: 43500.50, change24h: 3.2, volume24h: 35000000000 },
            { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', currentPrice: 2350.75, change24h: 1.5, volume24h: 18000000000 },
            { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', currentPrice: 190.45, change24h: 0.5, volume24h: 45000000 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', currentPrice: 145.20, change24h: -0.2, volume24h: 25000000 },
            { symbol: 'MSFT', name: 'Microsoft', type: 'STOCK', currentPrice: 410.15, change24h: 1.2, volume24h: 30000000 },
        ]
    });

    // ============================================
    // USERS (200 users)
    // ============================================
    console.log('👥 Creating 200 users...');
    const usersData = [];
    for (let i = 1; i <= 200; i++) {
        usersData.push({
            email: `user${i}@fintech.com`,
            password: 'password_secret',
            firstName: `User${i}`,
            lastName: `Last${i}`,
            phoneNumber: `+1800555${i.toString().padStart(4, '0')}`,
            role: i <= 10 ? 'ADMIN' : (i <= 60 ? 'MERCHANT' : 'CUSTOMER'),
            status: 'ACTIVE',
            emailVerified: true,
            kycVerified: i % 2 === 0,
        });
    }
    await prisma.user.createMany({ data: usersData });
    const allUsers = await prisma.user.findMany();

    // ============================================
    // PROFILES & SAVINGS GOALS
    // ============================================
    console.log('👤 Creating profiles and savings goals...');
    const profiles = allUsers.map((u, i) => ({
        userId: u.id,
        address: `${100 + i} Financial Ave`,
        city: i % 2 === 0 ? 'New York' : 'London',
        country: i % 2 === 0 ? 'USA' : 'UK',
        occupation: i % 3 === 0 ? 'Analyst' : 'Developer',
        annualIncome: 60000 + (Math.random() * 80000)
    }));
    await prisma.userProfile.createMany({ data: profiles });

    const goals = allUsers.slice(60).map(u => ({
        userId: u.id,
        name: 'New Car' + u.id,
        targetAmount: 25000,
        currentAmount: 5000 + Math.random() * 5000,
        status: 'ACTIVE'
    }));
    await prisma.savingsGoal.createMany({ data: goals });
    const allGoals = await prisma.savingsGoal.findMany();

    // ============================================
    // ACCOUNTS & LIMITS
    // ============================================
    console.log('💰 Creating 400 accounts...');
    const accountsData = [];
    allUsers.forEach(u => {
        accountsData.push({
            userId: u.id,
            accountNumber: `BNK${u.id}001`,
            accountType: 'CHECKING',
            balance: 2000 + Math.random() * 10000,
            availableBalance: 2000 + Math.random() * 10000,
            isDefault: true
        });
        accountsData.push({
            userId: u.id,
            accountNumber: `BNK${u.id}002`,
            accountType: 'SAVINGS',
            balance: 10000 + Math.random() * 50000,
            availableBalance: 10000 + Math.random() * 50000,
            isDefault: false,
            savingsGoalId: u.role === 'CUSTOMER' ? allGoals.find(g => g.userId === u.id)?.id : null
        });
    });
    await prisma.account.createMany({ data: accountsData });
    const allAccounts = await prisma.account.findMany();

    console.log('🔒 Setting account limits...');
    const limits = allAccounts.filter(a => a.accountType === 'CHECKING').map(a => ({
        accountId: a.id,
        limitType: 'SINGLE_TXN',
        limitAmount: 5000,
        resetPeriod: 'DAILY'
    }));
    await prisma.accountLimit.createMany({ data: limits });

    // ============================================
    // MERCHANTS & PRODUCTS
    // ============================================
    console.log('🏬 Creating 50 merchants and 250 products...');
    const merchantUsers = allUsers.filter(u => u.role === 'MERCHANT').slice(0, 50);
    const merchantsData = merchantUsers.map((u, i) => ({
        userId: u.id,
        businessName: `BizCore ${i}`,
        category: i % 2 === 0 ? 'Electronics' : 'Food',
        isVerified: true
    }));
    await prisma.merchant.createMany({ data: merchantsData });
    const allMerchants = await prisma.merchant.findMany();

    const productsData = [];
    allMerchants.forEach(m => {
        for (let i = 1; i <= 5; i++) {
            productsData.push({
                merchantId: m.id,
                name: `Product ${i} from ${m.businessName}`,
                price: 10 + Math.random() * 500,
                stock: 100
            });
        }
    });
    await prisma.product.createMany({ data: productsData });
    const allProducts = await prisma.product.findMany();

    // ============================================
    // ORDERS & REWARDS
    // ============================================
    console.log('🛒 Creating 400 orders...');
    const customers = allUsers.filter(u => u.role === 'CUSTOMER');
    const ordersData = [];
    for (let i = 0; i < 400; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const merchant = allMerchants[Math.floor(Math.random() * allMerchants.length)];
        ordersData.push({
            userId: customer.id,
            merchantId: merchant.id,
            totalAmount: 50 + Math.random() * 200,
            status: 'PAID'
        });
    }
    await prisma.order.createMany({ data: ordersData });
    const allOrders = await prisma.order.findMany();

    console.log('🎁 Giving reward points...');
    const points = customers.map(c => ({
        userId: c.id,
        points: Math.floor(Math.random() * 1000),
        action: 'EARNED',
        reason: 'Initial Signup'
    }));
    await prisma.rewardPoint.createMany({ data: points });

    // ============================================
    // TRANSACTIONS (1000 records)
    // ============================================
    console.log('💸 Creating 1000 transactions...');
    const transactions = [];
    for (let i = 0; i < 1000; i++) {
        const acc = allAccounts[Math.floor(Math.random() * allAccounts.length)];
        const targetAcc = allAccounts[Math.floor(Math.random() * allAccounts.length)];
        transactions.push({
            userId: acc.userId,
            fromAccountId: acc.id,
            toAccountId: targetAcc.id !== acc.id ? targetAcc.id : null,
            type: 'TRANSFER',
            amount: 10 + Math.random() * 1000,
            status: 'COMPLETED',
            reference: `TXN_MEGA_${i}_${Date.now()}`,
            description: `Regular payment ${i}`
        });
    }
    await prisma.transaction.createMany({ data: transactions });

    // ============================================
    // SOCIAL CONNECTIONS
    // ============================================
    console.log('🤝 Linking 100 connections...');
    const connections = [];
    for (let i = 0; i < 100; i++) {
        const u1 = customers[Math.floor(Math.random() * (customers.length / 2))];
        const u2 = customers[Math.floor(Math.random() * (customers.length / 2)) + (customers.length / 2)];
        if (u1 && u2) {
            connections.push({
                userId: u1.id,
                targetUserId: u2.id,
                status: 'ACCEPTED'
            });
        }
    }
    // Remove duplicates for unique constraint
    const uniqueConnections = Array.from(new Set(connections.map(c => JSON.stringify([c.userId, c.targetUserId]))))
        .map(c => JSON.parse(c)).map(c => ({ userId: c[0], targetUserId: c[1], status: 'ACCEPTED' }));

    await prisma.connection.createMany({ data: uniqueConnections });

    console.log('\n✨ MEGA seed completed! Platform upgraded to Enterprise scale.');
    await prisma.$disconnect();
    process.exit(0);
}

main().catch((e) => {
    console.error('❌ Error during MEGA seed:', e);
    process.exit(1);
});
