const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🏁 Starting HYPER-SCALE ENTERPRISE seed (43+ Tables, 50,000+ Records)...');

    const startTime = Date.now();

    // CLEANUP ORDER (Child to Parent)
    console.log('🧹 Clearing legacy data...');
    const models = [
        'SystemWebhook', 'TaxReport', 'LoginHistory', 'ApiKey', 'UserSubscription',
        'SubscriptionPlan', 'Voucher', 'Referral', 'ATM', 'Branch', 'InsuranceClaim',
        'InsurancePolicy', 'Repayment', 'Loan', 'LoanApplication', 'KycVerification',
        'KycDocument', 'Budget', 'Category', 'Bill', 'Biller', 'OrderItem', 'Order',
        'Product', 'Merchant', 'RewardRedemption', 'RewardPoint', 'Investment',
        'MarketData', 'Transaction', 'Card', 'AccountLimit', 'SavingsGoal', 'Account',
        'Connection', 'Notification', 'SupportTicket', 'AuditLog', 'Session',
        'UserProfile', 'User'
    ];

    for (const model of models) {
        const prismaModel = model === 'ATM' ? 'aTM' : model.charAt(0).toLowerCase() + model.slice(1);
        if (prisma[prismaModel]) {
            await prisma[prismaModel].deleteMany();
        }
    }

    // 1. STATIC SYSTEM DATA
    console.log('📊 Seeding static plans, categories, and market data...');
    await prisma.subscriptionPlan.createMany({
        data: [
            { name: 'Basic', price: 0, billingPeriod: 'MONTHLY' },
            { name: 'Premium', price: 15, billingPeriod: 'MONTHLY' },
            { name: 'Elite', price: 50, billingPeriod: 'YEARLY' },
            { name: 'Business', price: 150, billingPeriod: 'MONTHLY' }
        ]
    });
    const allPlans = await prisma.subscriptionPlan.findMany();

    await prisma.category.createMany({
        data: [
            { name: 'Food', icon: '🍲' },
            { name: 'Transport', icon: '🚗' },
            { name: 'Rent', icon: '🏠' },
            { name: 'Entertainment', icon: '🎬' },
            { name: 'Health', icon: '🏥' },
            { name: 'Utilities', icon: '💡' },
            { name: 'Shopping', icon: '🛍️' },
            { name: 'Insurance', icon: '🛡️' }
        ]
    });
    const allCategories = await prisma.category.findMany();

    await prisma.biller.createMany({
        data: Array.from({ length: 20 }).map(() => ({
            name: faker.company.name(),
            category: faker.helpers.arrayElement(['UTILITY', 'TELECOM', 'EDUCATION', 'INSURANCE', 'GOVERNMENT']),
            accountNumber: faker.finance.accountNumber(),
            logoUrl: faker.image.url()
        }))
    });
    const allBillers = await prisma.biller.findMany();

    await prisma.marketData.createMany({
        data: Array.from({ length: 100 }).map(() => ({
            symbol: faker.finance.currencyCode() + faker.number.int({ min: 1, max: 99 }),
            name: faker.company.name(),
            type: faker.helpers.arrayElement(['STOCK', 'CRYPTO', 'FOREX']),
            currentPrice: faker.number.float({ min: 0.1, max: 60000, fractionDigits: 2 }),
            change24h: faker.number.float({ min: -10, max: 10, fractionDigits: 2 }),
            volume24h: faker.number.float({ min: 1000000, max: 100000000000, fractionDigits: 0 })
        })).filter((v, i, a) => a.findIndex(t => t.symbol === v.symbol) === i)
    });

    // 2. USERS (1,000 users)
    console.log('👥 Generating 1,000 users...');
    const usersBatch = Array.from({ length: 1000 }).map((_, i) => ({
        email: faker.internet.email().toLowerCase() + i,
        password: 'secure_password',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phoneNumber: faker.phone.number(),
        status: 'ACTIVE',
        role: i % 20 === 0 ? 'ADMIN' : (i % 7 === 0 ? 'MERCHANT' : 'CUSTOMER'),
        kycVerified: Math.random() > 0.2
    }));
    await prisma.user.createMany({ data: usersBatch });
    const allUsers = await prisma.user.findMany();
    const userIds = allUsers.map(u => u.id);

    // 3. PROFILES, KYC, SESSIONS, LOGINS (Bulk)
    console.log('🆔 Generating 1,000 profiles, KYC docs, and login histories...');
    await prisma.userProfile.createMany({
        data: allUsers.map(u => ({
            userId: u.id,
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            country: faker.location.country(),
            occupation: faker.person.jobTitle(),
            annualIncome: faker.number.int({ min: 30000, max: 200000 })
        }))
    });

    await prisma.kycDocument.createMany({
        data: allUsers.map(u => ({
            userId: u.id,
            documentType: faker.helpers.arrayElement(['PASSPORT', 'DRIVING_LICENSE', 'ID_CARD']),
            documentNumber: faker.string.alphanumeric(10).toUpperCase(),
            frontImageUrl: faker.image.url(),
            status: u.kycVerified ? 'APPROVED' : 'PENDING'
        }))
    });

    await prisma.loginHistory.createMany({
        data: Array.from({ length: 3000 }).map(() => ({
            userId: faker.helpers.arrayElement(userIds),
            ipAddress: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            status: 'SUCCESS',
            createdAt: faker.date.recent({ days: 30 })
        }))
    });

    // 4. ACCOUNTS (2,000+ accounts)
    console.log('💰 Generating 2,000 accounts and limits...');
    const accountsData = [];
    userIds.forEach(uid => {
        accountsData.push({
            userId: uid,
            accountNumber: faker.finance.accountNumber(),
            accountType: 'CHECKING',
            balance: faker.number.int({ min: 1000, max: 50000 }),
            availableBalance: faker.number.int({ min: 1000, max: 50000 }),
            isDefault: true
        });
        if (Math.random() > 0.5) {
            accountsData.push({
                userId: uid,
                accountNumber: faker.finance.accountNumber(),
                accountType: 'SAVINGS',
                balance: faker.number.int({ min: 5000, max: 100000 }),
                availableBalance: faker.number.int({ min: 5000, max: 100000 }),
                isDefault: false
            });
        }
    });
    await prisma.account.createMany({ data: accountsData });
    const allAccounts = await prisma.account.findMany();
    const accountIds = allAccounts.map(a => a.id);

    await prisma.accountLimit.createMany({
        data: allAccounts.map(a => ({
            accountId: a.id,
            limitType: faker.helpers.arrayElement(['DAILY_SPEND', 'SINGLE_TXN', 'MONTHLY_WITHDRAWAL']),
            limitAmount: faker.number.int({ min: 1000, max: 10000 }),
            resetPeriod: 'DAILY'
        }))
    });

    // 5. CARDS, SAVINGS GOALS, INVESTMENTS
    console.log('💳 Generating 1,500 cards, 800 goals, and 500 investments...');
    await prisma.card.createMany({
        data: Array.from({ length: 1500 }).map(() => ({
            userId: faker.helpers.arrayElement(userIds),
            cardNumber: faker.finance.creditCardNumber(),
            cardHolderName: faker.person.fullName(),
            cardType: faker.helpers.arrayElement(['DEBIT', 'CREDIT']),
            expiryMonth: faker.number.int({ min: 1, max: 12 }),
            expiryYear: 2027 + faker.number.int({ min: 1, max: 5 }),
            cvv: faker.finance.creditCardCVV(),
            status: 'ACTIVE'
        }))
    });

    await prisma.savingsGoal.createMany({
        data: Array.from({ length: 800 }).map(() => ({
            userId: faker.helpers.arrayElement(userIds),
            name: faker.helpers.arrayElement(['New Car', 'House Downpayment', 'Wedding', 'Vacation', 'Emergency Fund']),
            targetAmount: faker.number.int({ min: 5000, max: 100000 }),
            currentAmount: faker.number.int({ min: 0, max: 5000 }),
            status: 'ACTIVE'
        }))
    });

    const marketSymbols = (await prisma.marketData.findMany({ select: { symbol: true, name: true } }));
    await prisma.investment.createMany({
        data: Array.from({ length: 500 }).map(() => {
            const sym = faker.helpers.arrayElement(marketSymbols);
            return {
                accountId: faker.helpers.arrayElement(accountIds),
                symbol: sym.symbol,
                assetName: sym.name,
                quantity: faker.number.float({ min: 0.1, max: 10 }),
                averagePrice: faker.number.float({ min: 10, max: 50000 }),
                currentPrice: faker.number.float({ min: 10, max: 51000 }),
                totalValue: faker.number.float({ min: 100, max: 50000 }),
                plPercentage: faker.number.float({ min: -20, max: 50 })
            };
        })
    });

    // 6. TRANSACTIONS (10,000+ records) - Blazing Speed
    console.log('💸 Generating 15,000 transactions...');
    const txnBatchSize = 5000;
    for (let i = 0; i < 15000; i += txnBatchSize) {
        const txns = Array.from({ length: txnBatchSize }).map(() => {
            const aid = faker.helpers.arrayElement(accountIds);
            const acc = allAccounts.find(a => a.id === aid);
            return {
                userId: acc.userId,
                fromAccountId: aid,
                toAccountId: faker.helpers.arrayElement(accountIds.filter(id => id !== aid)),
                type: 'TRANSFER',
                status: 'COMPLETED',
                amount: faker.number.int({ min: 10, max: 2000 }),
                reference: faker.string.uuid(),
                description: faker.finance.transactionDescription(),
                createdAt: faker.date.recent({ days: 60 })
            };
        });
        await prisma.transaction.createMany({ data: txns });
    }

    // 7. LENDING & INSURANCE (Massive)
    console.log('🏦 Generating 300 loans and 400 insurance policies...');
    const loanData = Array.from({ length: 300 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        principalAmount: faker.number.int({ min: 5000, max: 50000 }),
        interestRate: faker.number.float({ min: 3, max: 15 }),
        termMonths: faker.helpers.arrayElement([12, 24, 36, 48, 60]),
        startDate: faker.date.past(),
        endDate: faker.date.future(),
        remainingAmount: faker.number.int({ min: 1000, max: 40000 }),
        status: 'ACTIVE'
    }));
    await prisma.loan.createMany({ data: loanData });
    const allLoans = await prisma.loan.findMany();

    await prisma.repayment.createMany({
        data: Array.from({ length: 1500 }).map(() => ({
            loanId: faker.helpers.arrayElement(allLoans.map(l => l.id)),
            amount: 500,
            repaymentDate: faker.date.recent(),
            principalPaid: 400,
            interestPaid: 100
        }))
    });

    await prisma.insurancePolicy.createMany({
        data: Array.from({ length: 400 }).map(() => ({
            userId: faker.helpers.arrayElement(userIds),
            policyNumber: faker.string.alphanumeric(12).toUpperCase(),
            type: faker.helpers.arrayElement(['HEALTH', 'LIFE', 'TRAVEL', 'AUTO', 'PROPERTY']),
            premiumAmount: faker.number.int({ min: 50, max: 1000 }),
            coverageAmount: faker.number.int({ min: 5000, max: 1000000 }),
            startDate: faker.date.past(),
            endDate: faker.date.future(),
            status: 'ACTIVE'
        }))
    });

    // 8. COMMERCE BATCH (500 Merchants, 2,000 Products, 5,000 Orders)
    console.log('🏬 Generating 300 merchants, 1,500 products, and 5,000 orders...');
    const merchants = allUsers.filter(u => u.role === 'MERCHANT').slice(0, 300);
    const merchantIds = merchants.map(m => m.id);
    await prisma.merchant.createMany({
        data: merchants.map(u => ({
            userId: u.id,
            businessName: faker.company.name(),
            category: faker.commerce.department(),
            isVerified: true
        }))
    });
    const seededMerchants = await prisma.merchant.findMany();

    const productData = [];
    seededMerchants.forEach(m => {
        for (let i = 0; i < 5; i++) {
            productData.push({
                merchantId: m.id,
                name: faker.commerce.productName(),
                price: faker.commerce.price({ min: 5, max: 1000 }),
                stock: faker.number.int({ min: 0, max: 500 })
            });
        }
    });
    await prisma.product.createMany({ data: productData });
    const allProducts = await prisma.product.findMany();

    // Orders
    for (let i = 0; i < 5000; i += 1000) {
        const orderSlice = Array.from({ length: 1000 }).map(() => {
            const m = faker.helpers.arrayElement(seededMerchants);
            return {
                userId: faker.helpers.arrayElement(userIds),
                merchantId: m.id,
                totalAmount: faker.number.int({ min: 20, max: 500 }),
                status: 'PAID',
                createdAt: faker.date.recent({ days: 30 })
            };
        });
        await prisma.order.createMany({ data: orderSlice });
    }

    // 9. LOGS, NOTIFICATIONS, TICKETS
    console.log('📋 Generating 10,000 audit logs and notifications...');
    for (let i = 0; i < 10000; i += 2000) {
        await prisma.auditLog.createMany({
            data: Array.from({ length: 2000 }).map(() => ({
                userId: faker.helpers.arrayElement(userIds),
                action: faker.helpers.arrayElement(['LOGIN', 'TRANSACTION_CREATED', 'ACCOUNT_UPDATED', 'CARD_BLOCKED']),
                resource: faker.helpers.arrayElement(['USER', 'ACCOUNT', 'TRANSACTION', 'CARD']),
                ipAddress: faker.internet.ip(),
                createdAt: faker.date.recent({ days: 15 })
            }))
        });
        await prisma.notification.createMany({
            data: Array.from({ length: 2000 }).map(() => ({
                userId: faker.helpers.arrayElement(userIds),
                type: faker.helpers.arrayElement(['TRANSACTION', 'SECURITY', 'ACCOUNT', 'SYSTEM']),
                title: faker.lorem.sentence(3),
                message: faker.lorem.sentence(),
                status: 'UNREAD',
                createdAt: faker.date.recent({ days: 10 })
            }))
        });
    }

    // 10. INFRASTRUCTURE & SOCIAL
    console.log('📍 Seeding branches, ATMs, and social connectors...');
    await prisma.branch.createMany({
        data: Array.from({ length: 50 }).map(() => ({
            name: faker.company.name() + ' Branch',
            code: faker.string.alphanumeric(5).toUpperCase(),
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            country: 'Atlantis'
        }))
    });
    const seededBranches = await prisma.branch.findMany();
    await prisma.aTM.createMany({
        data: Array.from({ length: 200 }).map(() => ({
            branchId: faker.helpers.arrayElement(seededBranches).id,
            atmNumber: 'ATM-' + faker.string.alphanumeric(6),
            location: faker.location.street(),
            city: 'Metropolis',
            status: 'ONLINE'
        }))
    });

    await prisma.connection.createMany({
        data: Array.from({ length: 2000 }).map(() => {
            const u1 = faker.helpers.arrayElement(userIds);
            const u2 = faker.helpers.arrayElement(userIds.filter(id => id !== u1));
            return { userId: u1, targetUserId: u2, status: 'ACCEPTED' };
        }),
        skipDuplicates: true
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // FINAL REPORTING
    const counts = {
        Users: await prisma.user.count(),
        Accounts: await prisma.account.count(),
        Transactions: await prisma.transaction.count(),
        AuditLogs: await prisma.auditLog.count(),
        Notifications: await prisma.notification.count(),
        Orders: await prisma.order.count(),
        Products: await prisma.product.count(),
        Merchants: await prisma.merchant.count(),
        Cards: await prisma.card.count(),
        Loans: await prisma.loan.count(),
        MarketData: await prisma.marketData.count(),
        Connections: await prisma.connection.count(),
        LoginHistory: await prisma.loginHistory.count()
    };

    console.log('\n================================================');
    console.log(`🚀 HYPER-SCALE SEED COMPLETED IN ${duration}s`);
    console.log('================================================');
    Object.entries(counts).forEach(([table, count]) => {
        console.log(`✅ ${table.padEnd(20)} : ${count.toString().padStart(6)} records`);
    });
    console.log('================================================\n');

    await prisma.$disconnect();
}

main().catch(err => {
    console.error('❌ SEED ERROR:', err);
    process.exit(1);
});
