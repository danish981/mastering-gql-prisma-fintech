const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
    const marketData = [
        { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', currentPrice: 42000.5, change24h: 2.5, volume24h: 30000000000 },
        { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', currentPrice: 2250.75, change24h: -1.2, volume24h: 15000000000 },
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', currentPrice: 185.92, change24h: 0.8, volume24h: 50000000 },
        { symbol: 'TSLA', name: 'Tesla Inc.', type: 'STOCK', currentPrice: 215.45, change24h: -3.4, volume24h: 80000000 },
        { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'FOREX', currentPrice: 1.09, change24h: 0.1, volume24h: 100000000 },
    ];
    await prisma.marketData.createMany({ data: marketData });

    // ============================================
    // USERS & PROFILES (100 users)
    // ============================================
    console.log('👥 Creating 100 users...');
    const baseUsers = [];
    for (let i = 1; i <= 100; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName });
        const phoneNumber = faker.phone.number('+1##########');
        const role = i === 1 ? 'ADMIN' : (i % 10 === 0 ? 'MERCHANT' : 'CUSTOMER');
        const status = i % 5 === 0 ? 'SUSPENDED' : 'ACTIVE';

        baseUsers.push({
            email,
            password: 'password123',
            firstName,
            lastName,
            phoneNumber,
            role,
            status,
            emailVerified: i % 3 === 0,
            kycVerified: i % 4 === 0,
        });
    }
    await prisma.user.createMany({ data: baseUsers });

    const allUsers = await prisma.user.findMany({ select: { id: true, email: true } });

    console.log('👤 Creating profiles and sessions...');
    const profiles = allUsers.map((u) => ({
        userId: u.id,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        postalCode: faker.location.zipCode(),
        occupation: faker.person.jobTitle(),
        annualIncome: faker.number.int({ min: 20000, max: 150000 }),
        profileImageUrl: faker.image.avatar(),
    }));
    await prisma.userProfile.createMany({ data: profiles });

    // ============================================
    // ACCOUNTS (2 accounts per user)
    // ============================================
    console.log('💰 Creating 200 accounts...');
    const accountsData = [];
    allUsers.forEach((u) => {
        const currency = u.role === 'MERCHANT' ? 'EUR' : 'USD';
        const balance = u.role === 'MERCHANT' ? faker.number.float({ min: 5000, max: 50000 }) : faker.number.float({ min: 1000, max: 10000 });

        // Checking Account
        accountsData.push({
            userId: u.id,
            accountNumber: `ACC${u.id}CHK${faker.number.int({ min: 1000, max: 9999 })}`,
            accountType: 'CHECKING',
            currency,
            balance,
            availableBalance: balance * 0.9,
            isDefault: true,
        });

        // Savings Account
        accountsData.push({
            userId: u.id,
            accountNumber: `ACC${u.id}SAV${faker.number.int({ min: 1000, max: 9999 })}`,
            accountType: 'SAVINGS',
            currency,
            balance: balance * 2,
            availableBalance: balance * 2,
            isDefault: false,
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
        const amount = faker.number.float({ min: 10, max: 1000 });
        const statusOptions = ['COMPLETED', 'PENDING', 'FAILED'];
        const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

        transactions.push({
            userId: fromAcc.userId,
            fromAccountId: fromAcc.id,
            toAccountId: toAcc.id !== fromAcc.id ? toAcc.id : null,
            type: 'TRANSFER',
            status,
            amount,
            fee: faker.number.float({ min: 0, max: 5 }),
            reference: faker.string.uuid(),
            description: faker.lorem.sentence(),
            processedAt: status === 'COMPLETED' ? new Date() : null,
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
        const quantity = faker.number.float({ min: 0.1, max: 10 });
        const avgPrice = faker.number.float({ min: 100, max: 40000 });
        const currentPrice = avgPrice * (1 + (Math.random() - 0.5) * 0.1);

        investments.push({
            accountId: acc.id,
            symbol,
            assetName: symbol === 'BTC' ? 'Bitcoin' : symbol,
            quantity,
            averagePrice: avgPrice,
            currentPrice,
            totalValue: quantity * currentPrice,
            plPercentage: ((currentPrice - avgPrice) / avgPrice) * 100,
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
        const action = actions[Math.floor(Math.random() * actions.length)];

        auditLogs.push({
            userId: u.id,
            action,
            resource: action === 'LOGIN' ? 'AUTHENTICATION' : 'API',
            ipAddress: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
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
        const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const priority = priorityOptions[Math.floor(Math.random() * priorityOptions.length)];

        tickets.push({
            userId: u.id,
            subject: faker.lorem.words(5),
            description: faker.lorem.paragraph(),
            status: i % 3 === 0 ? 'RESOLVED' : 'OPEN',
            priority,
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
        const typeOptions = ['TRANSACTION', 'SECURITY', 'ACCOUNT', 'PROMOTIONAL'];
        const type = typeOptions[Math.floor(Math.random() * typeOptions.length)];

        notifications.push({
            userId: u.id,
            type,
            title: faker.lorem.words(3),
            message: faker.lorem.sentence(),
            status: i % 2 === 0 ? 'READ' : 'UNREAD',
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