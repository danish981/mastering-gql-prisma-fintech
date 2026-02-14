const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🏁 Starting SUPER-HUGE GALAXY-SCALE seed (50+ Tables, 500,000+ Records)...');

    const startTime = Date.now();

    // Batch helper to avoid memory issues
    const batchCreate = async (model, data, batchSize = 5000) => {
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            await prisma[model].createMany({ data: batch, skipDuplicates: true });
            process.stdout.write('.');
        }
        console.log(`\n✅ Finished batch for ${model}`);
    };

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
            try {
                await prisma[prismaModel].deleteMany();
            } catch (e) {
                console.warn(`Could not clear ${model}: ${e.message}`);
            }
        }
    }

    // 1. STATIC SYSTEM DATA
    console.log('📊 Seeding static plans, categories, and market data...');
    await prisma.subscriptionPlan.createMany({
        data: [
            { name: 'Basic', price: 0, billingPeriod: 'MONTHLY' },
            { name: 'Premium', price: 15, billingPeriod: 'MONTHLY' },
            { name: 'Elite', price: 50, billingPeriod: 'YEARLY' },
            { name: 'Business', price: 150, billingPeriod: 'MONTHLY' },
            { name: 'Enterprise', price: 500, billingPeriod: 'MONTHLY' }
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
            { name: 'Insurance', icon: '🛡️' },
            { name: 'Education', icon: '📚' },
            { name: 'Investment', icon: '📈' },
            { name: 'Taxes', icon: '📜' },
            { name: 'Charity', icon: '🎁' }
        ]
    });
    const allCategories = await prisma.category.findMany();

    await prisma.biller.createMany({
        data: Array.from({ length: 100 }).map(() => ({
            name: faker.company.name(),
            category: faker.helpers.arrayElement(['UTILITY', 'TELECOM', 'EDUCATION', 'INSURANCE', 'GOVERNMENT']),
            accountNumber: faker.finance.accountNumber(),
            logoUrl: faker.image.url()
        }))
    });
    const allBillers = await prisma.biller.findMany();

    await prisma.marketData.createMany({
        data: Array.from({ length: 500 }).map(() => ({
            symbol: faker.finance.currencyCode() + faker.number.int({ min: 100, max: 999 }),
            name: faker.company.name(),
            type: faker.helpers.arrayElement(['STOCK', 'CRYPTO', 'FOREX']),
            currentPrice: faker.number.float({ min: 0.1, max: 70000, fractionDigits: 2 }),
            change24h: faker.number.float({ min: -15, max: 15, fractionDigits: 2 }),
            volume24h: faker.number.float({ min: 1000000, max: 1000000000000, fractionDigits: 0 })
        })).filter((v, i, a) => a.findIndex(t => t.symbol === v.symbol) === i)
    });
    const allMarketData = await prisma.marketData.findMany();

    // 2. USERS (10,000 users)
    console.log('👥 Generating 10,000 users...');
    const usersData = Array.from({ length: 10000 }).map((_, i) => ({
        email: `user${i}@example.com`,
        password: 'secure_password_123',
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        phoneNumber: faker.phone.number() + i, // ensure uniqueness
        status: 'ACTIVE',
        role: i % 100 === 0 ? 'ADMIN' : (i % 50 === 0 ? 'SUPPORT' : (i % 10 === 0 ? 'MERCHANT' : 'CUSTOMER')),
        kycVerified: Math.random() > 0.1,
        emailVerified: Math.random() > 0.05
    }));
    await batchCreate('user', usersData, 2000);
    const allUsers = await prisma.user.findMany({ select: { id: true, role: true, kycVerified: true } });
    const userIds = allUsers.map(u => u.id);

    // 3. PROFILES, KYC, SESSIONS, LOGINS, API KEYS
    console.log('🆔 Generating profiles, KYC, sessions, logins, and API keys...');
    const profiles = allUsers.map(u => ({
        userId: u.id,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        country: faker.location.country(),
        postalCode: faker.location.zipCode(),
        occupation: faker.person.jobTitle(),
        annualIncome: faker.number.int({ min: 20000, max: 500000 }),
        profileImageUrl: faker.image.avatar(),
        bio: faker.lorem.paragraph()
    }));
    await batchCreate('userProfile', profiles, 2000);

    const kycDocs = allUsers.map(u => ({
        userId: u.id,
        documentType: faker.helpers.arrayElement(['PASSPORT', 'DRIVING_LICENSE', 'ID_CARD']),
        documentNumber: faker.string.alphanumeric(12).toUpperCase(),
        frontImageUrl: faker.image.url(),
        backImageUrl: faker.image.url(),
        status: u.kycVerified ? 'APPROVED' : 'PENDING'
    }));
    await batchCreate('kycDocument', kycDocs, 2000);

    const loginHistories = Array.from({ length: 30000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        ipAddress: faker.internet.ip(),
        userAgent: faker.internet.userAgent(),
        location: faker.location.city() + ', ' + faker.location.country(),
        status: Math.random() > 0.1 ? 'SUCCESS' : 'FAILED',
        createdAt: faker.date.recent({ days: 90 })
    }));
    await batchCreate('loginHistory', loginHistories, 5000);

    const apiKeys = Array.from({ length: 5000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        key: 'ak_' + faker.string.alphanumeric(32),
        name: faker.commerce.productAdjective() + ' Key',
        scopes: ['read:profile', 'write:transactions'],
        isActive: true
    }));
    await batchCreate('apiKey', apiKeys, 2000);

    // 4. ACCOUNTS (20,000 accounts)
    console.log('💰 Generating 20,000 accounts...');
    const accountsData = [];
    userIds.forEach(uid => {
        accountsData.push({
            userId: uid,
            accountNumber: faker.finance.accountNumber(),
            accountType: 'CHECKING',
            balance: faker.number.int({ min: 100, max: 20000 }),
            availableBalance: faker.number.int({ min: 100, max: 20000 }),
            isDefault: true
        });
        if (Math.random() > 0.4) {
            accountsData.push({
                userId: uid,
                accountNumber: faker.finance.accountNumber(),
                accountType: faker.helpers.arrayElement(['SAVINGS', 'INVESTMENT', 'CRYPTO']),
                balance: faker.number.int({ min: 1000, max: 100000 }),
                availableBalance: faker.number.int({ min: 1000, max: 100000 }),
                isDefault: false
            });
        }
    });
    await batchCreate('account', accountsData, 2000);
    const allAccounts = await prisma.account.findMany({ select: { id: true, userId: true } });
    const accountIds = allAccounts.map(a => a.id);

    // 5. CARDS & LIMITS & GOALS
    console.log('💳 Generating cards, limits, and savings goals...');
    const cards = Array.from({ length: 15000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        cardNumber: faker.finance.creditCardNumber(),
        cardHolderName: faker.person.fullName().toUpperCase(),
        cardType: faker.helpers.arrayElement(['DEBIT', 'CREDIT', 'PREPAID', 'VIRTUAL']),
        expiryMonth: faker.number.int({ min: 1, max: 12 }),
        expiryYear: 2026 + faker.number.int({ min: 1, max: 10 }),
        cvv: faker.finance.creditCardCVV(),
        status: 'ACTIVE'
    }));
    await batchCreate('card', cards, 5000);

    const accountLimits = allAccounts.map(a => ({
        accountId: a.id,
        limitType: faker.helpers.arrayElement(['DAILY_SPEND', 'ATM_WITHDRAWAL', 'ONLINE_TXN']),
        limitAmount: faker.number.int({ min: 500, max: 5000 }),
        resetPeriod: 'DAILY'
    }));
    await batchCreate('accountLimit', accountLimits, 5000);

    const savingsGoals = Array.from({ length: 5000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        name: faker.helpers.arrayElement(['Retirement', 'New Car', 'Education', 'Holiday', 'Wedding', 'Emergency Fund']),
        targetAmount: faker.number.int({ min: 5000, max: 500000 }),
        currentAmount: faker.number.int({ min: 0, max: 10000 }),
        status: 'ACTIVE'
    }));
    await batchCreate('savingsGoal', savingsGoals, 2000);

    // 6. TRANSACTIONS (100,000 transactions)
    console.log('💸 Generating 100,000 transactions (this may take a moment)...');
    for (let i = 0; i < 100000; i += 10000) {
        const txns = Array.from({ length: 10000 }).map(() => {
            const acc = faker.helpers.arrayElement(allAccounts);
            return {
                userId: acc.userId,
                fromAccountId: acc.id,
                toAccountId: faker.helpers.arrayElement(accountIds),
                type: faker.helpers.arrayElement(['TRANSFER', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL']),
                status: faker.helpers.arrayElement(['COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED', 'PENDING']),
                amount: faker.number.float({ min: 1, max: 5000, fractionDigits: 2 }),
                fee: faker.number.float({ min: 0, max: 10, fractionDigits: 2 }),
                reference: 'TXN-' + faker.string.uuid(),
                description: faker.finance.transactionDescription(),
                createdAt: faker.date.recent({ days: 365 })
            };
        });
        await prisma.transaction.createMany({ data: txns, skipDuplicates: true });
        process.stdout.write('.');
    }
    console.log('\n✅ Finished transactions');

    // 7. LENDING, INSURANCE, BILLS
    console.log('🏦 Generating loans, repayments, insurance, and bills...');
    const loans = Array.from({ length: 2000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        principalAmount: faker.number.int({ min: 5000, max: 100000 }),
        interestRate: faker.number.float({ min: 2, max: 20 }),
        termMonths: faker.helpers.arrayElement([6, 12, 24, 36, 48, 60]),
        startDate: faker.date.past(),
        endDate: faker.date.future(),
        remainingAmount: faker.number.int({ min: 0, max: 90000 }),
        status: 'ACTIVE'
    }));
    await batchCreate('loan', loans, 1000);
    const allLoans = await prisma.loan.findMany({ select: { id: true } });

    const repayments = Array.from({ length: 10000 }).map(() => ({
        loanId: faker.helpers.arrayElement(allLoans).id,
        amount: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
        repaymentDate: faker.date.recent({ days: 180 }),
        principalPaid: faker.number.float({ min: 50, max: 1500, fractionDigits: 2 }),
        interestPaid: faker.number.float({ min: 10, max: 500, fractionDigits: 2 })
    }));
    await batchCreate('repayment', repayments, 2000);

    const insurancePolicies = Array.from({ length: 2000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        policyNumber: 'POL-' + faker.string.alphanumeric(10).toUpperCase(),
        type: faker.helpers.arrayElement(['HEALTH', 'LIFE', 'TRAVEL', 'AUTO', 'PROPERTY']),
        premiumAmount: faker.number.int({ min: 100, max: 5000 }),
        coverageAmount: faker.number.int({ min: 10000, max: 1000000 }),
        startDate: faker.date.past(),
        endDate: faker.date.future(),
        status: 'ACTIVE'
    }));
    await batchCreate('insurancePolicy', insurancePolicies, 1000);

    const bills = Array.from({ length: 10000 }).map(() => ({
        billerId: faker.helpers.arrayElement(allBillers).id,
        amount: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
        dueDate: faker.date.future(),
        status: faker.helpers.arrayElement(['UNPAID', 'PAID', 'OVERDUE']),
        referenceNum: faker.finance.accountNumber()
    }));
    await batchCreate('bill', bills, 2000);

    // 8. COMMERCE (Merchants, Products, Orders)
    console.log('🏬 Generating 1,000 merchants, 5,000 products, and 20,000 orders...');
    const merchantUsers = allUsers.filter(u => u.role === 'MERCHANT');
    const merchantsData = merchantUsers.map(u => ({
        userId: u.id,
        businessName: faker.company.name(),
        category: faker.commerce.department(),
        isVerified: true,
        taxId: faker.string.alphanumeric(10).toUpperCase()
    }));
    await batchCreate('merchant', merchantsData, 500);
    const allMerchants = await prisma.merchant.findMany({ select: { id: true } });

    const productsData = Array.from({ length: 5000 }).map(() => ({
        merchantId: faker.helpers.arrayElement(allMerchants).id,
        name: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price({ min: 10, max: 2000 }),
        stock: faker.number.int({ min: 0, max: 1000 }),
        imageUrl: faker.image.url()
    }));
    await batchCreate('product', productsData, 1000);
    const allProducts = await prisma.product.findMany({ select: { id: true, price: true } });

    const ordersData = Array.from({ length: 20000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        merchantId: faker.helpers.arrayElement(allMerchants).id,
        status: faker.helpers.arrayElement(['PAID', 'SHIPPED', 'DELIVERED']),
        totalAmount: 0, // calculated later or just seed
        currency: 'USD'
    }));
    await batchCreate('order', ordersData, 2000);
    const allOrders = await prisma.order.findMany({ select: { id: true } });

    const orderItems = Array.from({ length: 50000 }).map(() => {
        const prod = faker.helpers.arrayElement(allProducts);
        return {
            orderId: faker.helpers.arrayElement(allOrders).id,
            productId: prod.id,
            quantity: faker.number.int({ min: 1, max: 5 }),
            price: prod.price
        };
    });
    await batchCreate('orderItem', orderItems, 5000);

    // 9. LOGS, NOTIFICATIONS, TICKETS, REWARDS
    console.log('📋 Generating 50,000 logs, 50,000 notifications, 5,000 tickets...');
    for (let i = 0; i < 50000; i += 10000) {
        const logs = Array.from({ length: 10000 }).map(() => ({
            userId: faker.helpers.arrayElement(userIds),
            action: faker.helpers.arrayElement(['LOGIN', 'TRANSACTION_CREATED', 'ACCOUNT_UPDATED', 'CARD_BLOCKED', 'PASSWORD_CHANGED', 'KYC_SUBMITTED']),
            resource: faker.helpers.arrayElement(['USER', 'ACCOUNT', 'TRANSACTION', 'CARD', 'LOAN', 'ORDER']),
            ipAddress: faker.internet.ip(),
            userAgent: faker.internet.userAgent(),
            createdAt: faker.date.recent({ days: 30 })
        }));
        await prisma.auditLog.createMany({ data: logs });

        const notifs = Array.from({ length: 10000 }).map(() => ({
            userId: faker.helpers.arrayElement(userIds),
            type: faker.helpers.arrayElement(['TRANSACTION', 'SECURITY', 'ACCOUNT', 'SYSTEM', 'PROMOTIONAL', 'REWARD']),
            status: faker.helpers.arrayElement(['READ', 'UNREAD', 'ARCHIVED']),
            title: faker.lorem.sentence(5),
            message: faker.lorem.paragraph(1),
            createdAt: faker.date.recent({ days: 30 })
        }));
        await prisma.notification.createMany({ data: notifs });
        process.stdout.write('.');
    }
    console.log('\n✅ Finished logs and notifications');

    const tickets = Array.from({ length: 5000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        subject: faker.lorem.sentence(5),
        description: faker.lorem.paragraph(2),
        status: faker.helpers.arrayElement(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
        priority: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
        category: faker.helpers.arrayElement(['Technical', 'Billing', 'Account Access', 'Card Issue'])
    }));
    await batchCreate('supportTicket', tickets, 2000);

    const rewardPoints = Array.from({ length: 20000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        points: faker.number.int({ min: 10, max: 1000 }),
        action: 'EARNED',
        reason: faker.helpers.arrayElement(['Cashback', 'Referral Bonus', 'Promo Code', 'Loyalty Reward'])
    }));
    await batchCreate('rewardPoint', rewardPoints, 5000);

    const redemptions = Array.from({ length: 5000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        pointsSpent: faker.number.int({ min: 100, max: 5000 }),
        valueAmount: faker.number.int({ min: 1, max: 50 }),
        description: 'Redeemed for voucher'
    }));
    await batchCreate('rewardRedemption', redemptions, 2000);

    // 10. INVESTMENTS & CONNECTIONS
    console.log('📈 Generating 5,000 investments and 10,000 social connections...');
    const investments = Array.from({ length: 5000 }).map(() => {
        const md = faker.helpers.arrayElement(allMarketData);
        return {
            accountId: faker.helpers.arrayElement(accountIds),
            symbol: md.symbol,
            assetName: md.name,
            quantity: faker.number.float({ min: 0.01, max: 100 }),
            averagePrice: md.currentPrice,
            currentPrice: md.currentPrice * 1.05,
            totalValue: md.currentPrice * 10,
            plPercentage: faker.number.float({ min: -30, max: 100 })
        };
    });
    await batchCreate('investment', investments, 2000);

    const connections = Array.from({ length: 10000 }).map(() => {
        const u1 = faker.helpers.arrayElement(userIds);
        const u2 = faker.helpers.arrayElement(userIds.filter(id => id !== u1));
        return { userId: u1, targetUserId: u2, status: 'ACCEPTED' };
    });
    await batchCreate('connection', connections, 5000);

    // 11. INFRASTRUCTURE & OTHER
    console.log('📍 Seeding branches, ATMs, vouchers, subs, and tax reports...');
    await prisma.branch.createMany({
        data: Array.from({ length: 100 }).map(() => ({
            name: faker.company.name() + ' Branch',
            code: faker.string.alphanumeric(8).toUpperCase(),
            address: faker.location.streetAddress(),
            city: faker.location.city(),
            country: faker.location.country()
        }))
    });
    const seededBranches = await prisma.branch.findMany({ select: { id: true } });

    await prisma.aTM.createMany({
        data: Array.from({ length: 1000 }).map(() => ({
            branchId: faker.helpers.arrayElement(seededBranches).id,
            atmNumber: 'ATM-' + faker.string.alphanumeric(10).toUpperCase(),
            location: faker.location.streetAddress(),
            city: faker.location.city(),
            status: 'ONLINE'
        }))
    });

    const vouchers = Array.from({ length: 500 }).map(() => ({
        code: faker.string.alphanumeric(12).toUpperCase(),
        discountAmount: faker.number.int({ min: 5, max: 100 }),
        isPercentage: Math.random() > 0.5,
        expiryDate: faker.date.future(),
        isActive: true
    }));
    await batchCreate('voucher', vouchers, 500);

    const subs = Array.from({ length: 5000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        planId: faker.helpers.arrayElement(allPlans).id,
        startDate: faker.date.past(),
        endDate: faker.date.future(),
        status: 'ACTIVE'
    }));
    await batchCreate('userSubscription', subs, 2000);

    const taxReports = Array.from({ length: 1000 }).map(() => ({
        userId: faker.helpers.arrayElement(userIds),
        year: 2024,
        totalIncome: faker.number.int({ min: 30000, max: 200000 }),
        taxDeducted: faker.number.int({ min: 5000, max: 50000 }),
        status: 'SUBMITTED'
    }));
    await batchCreate('taxReport', taxReports, 500);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // FINAL REPORTING
    const finalCounts = {};
    for (const model of models) {
        const prismaModel = model === 'ATM' ? 'aTM' : model.charAt(0).toLowerCase() + model.slice(1);
        if (prisma[prismaModel]) {
            finalCounts[model] = await prisma[prismaModel].count();
        }
    }

    console.log('\n================================================');
    console.log(`🚀 GALAXY-SCALE SEED COMPLETED IN ${duration}s`);
    console.log('================================================');
    Object.entries(finalCounts).forEach(([table, count]) => {
        console.log(`✅ ${table.padEnd(20)} : ${count.toString().padStart(8)} records`);
    });
    console.log('================================================\n');

    await prisma.$disconnect();
}

main().catch(err => {
    console.error('❌ SEED ERROR:', err);
    process.exit(1);
});
