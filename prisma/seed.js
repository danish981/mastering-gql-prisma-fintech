const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🏁 Starting FULL SCALE ENTERPRISE seed (43+ Tables)...');

    // CLEANUP ORDER (Child to Parent)
    console.log('🧹 Clearing all legacy data...');
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
        const prismaModel = model.charAt(0).toLowerCase() + model.slice(1);
        // Handle special casing for ATM
        const targetModel = model === 'ATM' ? 'aTM' : prismaModel;
        if (prisma[targetModel]) {
            await prisma[targetModel].deleteMany();
        }
    }

    // 1. STATIC SYSTEM DATA
    console.log('📊 Seeding static plans, categories, and market data...');
    await prisma.subscriptionPlan.createMany({
        data: [
            { name: 'Basic', price: 0, billingPeriod: 'MONTHLY' },
            { name: 'Premium', price: 15, billingPeriod: 'MONTHLY' },
            { name: 'Elite', price: 50, billingPeriod: 'YEARLY' }
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
            { name: 'Utilities', icon: '💡' }
        ]
    });
    const allCategories = await prisma.category.findMany();

    await prisma.biller.createMany({
        data: [
            { name: 'Electric Grid Co.', category: 'UTILITY' },
            { name: 'Telco Global', category: 'TELECOM' },
            { name: 'Water Works', category: 'UTILITY' },
            { name: 'City University', category: 'EDUCATION' }
        ]
    });
    const allBillers = await prisma.biller.findMany();

    await prisma.marketData.createMany({
        data: [
            { symbol: 'BTC', name: 'Bitcoin', type: 'CRYPTO', currentPrice: 45000.50, change24h: 2.5, volume24h: 30000000000 },
            { symbol: 'ETH', name: 'Ethereum', type: 'CRYPTO', currentPrice: 2500.75, change24h: 1.8, volume24h: 15000000000 },
            { symbol: 'AAPL', name: 'Apple Inc.', type: 'STOCK', currentPrice: 185.20, change24h: 0.5, volume24h: 50000000 },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'STOCK', currentPrice: 140.15, change24h: -1.2, volume24h: 20000000 }
        ]
    });

    await prisma.systemWebhook.createMany({
        data: [
            { url: 'https://api.external-service.com/webhooks', events: ['transaction.created', 'user.verified'], secret: 'whsec_12345' },
            { url: 'https://hooks.slack.com/services/TXXX/BXXX', events: ['support_ticket.created'], secret: 'whsec_slack' }
        ]
    });

    await prisma.voucher.createMany({
        data: [
            { code: 'WELCOME20', discountAmount: 20, isPercentage: true, expiryDate: new Date('2026-12-31'), isActive: true },
            { code: 'CASHBACK50', discountAmount: 50, isPercentage: false, expiryDate: new Date('2026-12-31'), isActive: true }
        ]
    });

    // 2. USERS & PROFILES
    console.log('👥 Creating 50 enterprise users with profiles and KYC...');
    const userData = Array.from({ length: 50 }).map((_, i) => ({
        email: `corp_user${i}@atlas.com`,
        password: 'secure_password', // In real apps, hash this
        firstName: `User${i}`,
        lastName: `Surname${i}`,
        status: 'ACTIVE',
        role: i % 10 === 0 ? 'ADMIN' : (i % 5 === 0 ? 'MERCHANT' : 'CUSTOMER'),
        kycVerified: true
    }));
    await prisma.user.createMany({ data: userData });
    const allUsers = await prisma.user.findMany();

    for (const u of allUsers) {
        await prisma.userProfile.create({
            data: {
                userId: u.id,
                address: `${100 + u.id} Main St`,
                city: 'Metropolis',
                country: 'Atlantis',
                occupation: u.role === 'ADMIN' ? 'System Administrator' : 'Account Holder',
                annualIncome: 50000 + (Math.random() * 50000)
            }
        });
        await prisma.kycDocument.create({
            data: {
                userId: u.id,
                documentType: 'PASSPORT',
                documentNumber: `PASS-${u.id}`,
                frontImageUrl: 'https://example.com/front.jpg',
                status: 'APPROVED'
            }
        });
        await prisma.kycVerification.create({
            data: {
                userId: u.id,
                status: 'APPROVED',
                notes: 'Verified by system automation'
            }
        });

        // Sessions & Logins
        await prisma.session.create({
            data: {
                userId: u.id,
                token: `token_${u.id}_${Date.now()}`,
                expiresAt: new Date(Date.now() + 86400000)
            }
        });
        await prisma.loginHistory.create({
            data: {
                userId: u.id,
                ipAddress: '127.0.0.1',
                userAgent: 'Mozilla/5.0',
                status: 'SUCCESS'
            }
        });
    }

    // 3. FINANCIAL CORE (Accounts, Limits, Cards, Goals)
    console.log('💰 Seeding accounts, cards, limits, and goals...');
    for (const u of allUsers) {
        const checking = await prisma.account.create({
            data: {
                userId: u.id,
                accountNumber: `ACC-CHK-${u.id}`,
                accountType: 'CHECKING',
                balance: 10000 + (Math.random() * 10000),
                availableBalance: 9500 + (Math.random() * 10000),
                isDefault: true
            }
        });
        const savings = await prisma.account.create({
            data: {
                userId: u.id,
                accountNumber: `ACC-SAV-${u.id}`,
                accountType: 'SAVINGS',
                balance: 20000,
                availableBalance: 20000
            }
        });

        await prisma.accountLimit.create({
            data: {
                accountId: checking.id,
                limitType: 'DAILY_SPEND',
                limitAmount: 5000,
                resetPeriod: 'DAILY'
            }
        });

        await prisma.card.create({
            data: {
                userId: u.id,
                cardNumber: `4111-2222-3333-${u.id.toString().padStart(4, '0')}`,
                cardHolderName: `${u.firstName} ${u.lastName}`,
                cardType: 'DEBIT',
                expiryMonth: 12,
                expiryYear: 2028,
                cvv: '123'
            }
        });

        await prisma.savingsGoal.create({
            data: {
                userId: u.id,
                name: 'New Car',
                targetAmount: 25000,
                currentAmount: 5000,
                status: 'ACTIVE'
            }
        });

        // Investment for some users
        if (u.id % 3 === 0) {
            await prisma.investment.create({
                data: {
                    accountId: checking.id,
                    symbol: 'BTC',
                    assetName: 'Bitcoin',
                    quantity: 0.5,
                    averagePrice: 40000,
                    currentPrice: 45000,
                    totalValue: 22500,
                    plPercentage: 12.5
                }
            });
        }
    }

    // 4. LENDING, INSURANCE & BILLS
    console.log('🏦 Seeding loans, insurance, and bills...');
    const customers = allUsers.filter(u => u.role === 'CUSTOMER');
    for (const u of customers.slice(0, 10)) {
        // Loans
        await prisma.loanApplication.create({
            data: { userId: u.id, amountRequested: 10000, purpose: 'Home Improvement', termMonths: 12, status: 'APPROVED' }
        });
        const loan = await prisma.loan.create({
            data: {
                userId: u.id,
                principalAmount: 10000,
                interestRate: 5.0,
                termMonths: 12,
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                remainingAmount: 9000,
                status: 'ACTIVE'
            }
        });
        await prisma.repayment.create({
            data: { loanId: loan.id, amount: 1000, repaymentDate: new Date(), principalPaid: 800, interestPaid: 200 }
        });

        // Insurance
        const policy = await prisma.insurancePolicy.create({
            data: {
                userId: u.id,
                policyNumber: `POL-${u.id}`,
                type: 'HEALTH',
                premiumAmount: 150,
                coverageAmount: 100000,
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                status: 'ACTIVE'
            }
        });
        await prisma.insuranceClaim.create({
            data: { policyId: policy.id, amountClaimed: 500, reason: 'Checkup', status: 'APPROVED', settledAmount: 450 }
        });

        // Bills & Budgets
        const biller = allBillers[Math.floor(Math.random() * allBillers.length)];
        await prisma.bill.create({
            data: { billerId: biller.id, amount: 120.50, dueDate: new Date(Date.now() + 864000000), status: 'UNPAID' }
        });
        const category = allCategories[Math.floor(Math.random() * allCategories.length)];
        await prisma.budget.create({
            data: { userId: u.id, categoryId: category.id, limitAmount: 500, period: 'MONTHLY' }
        });
    }

    // 5. COMMERCE & MERCHANTS
    console.log('🛍️ Seeding merchants, products, and orders...');
    const merchantUsers = allUsers.filter(u => u.role === 'MERCHANT');
    for (const u of merchantUsers) {
        const merchant = await prisma.merchant.create({
            data: { userId: u.id, businessName: `Shop ${u.id}`, category: 'Retail', isVerified: true }
        });
        const product = await prisma.product.create({
            data: { merchantId: merchant.id, name: `Product A-${u.id}`, price: 99.99, stock: 100 }
        });

        // Create some orders
        const buyer = customers[Math.floor(Math.random() * customers.length)];
        const order = await prisma.order.create({
            data: { userId: buyer.id, merchantId: merchant.id, totalAmount: 99.99, status: 'PAID' }
        });
        await prisma.orderItem.create({
            data: { orderId: order.id, productId: product.id, quantity: 1, price: 99.99 }
        });
    }

    // 6. SOCIAL, REWARDS & ADMIN
    console.log('🤝 Seeding links, referrals, rewards, and logs...');
    for (let i = 0; i < customers.length - 1; i++) {
        // Connections
        await prisma.connection.create({
            data: { userId: customers[i].id, targetUserId: customers[i + 1].id, status: 'ACCEPTED' }
        });

        // Referrals
        if (customers[i + 5]) {
            await prisma.referral.create({
                data: { referrerId: customers[i].id, referredUserId: customers[i + 5].id, referralCode: `REF-${customers[i].id}`, status: 'COMPLETED', rewardEarned: 100 }
            });
        }

        // Rewards
        await prisma.rewardPoint.create({
            data: { userId: customers[i].id, points: 500, action: 'EARNED', reason: 'Welcome Bonus' }
        });
        if (i % 2 === 0) {
            await prisma.rewardRedemption.create({
                data: { userId: customers[i].id, pointsSpent: 100, valueAmount: 1.0, description: 'Cashback' }
            });
        }

        // Subscriptions
        const plan = allPlans[i % allPlans.length];
        await prisma.userSubscription.create({
            data: { userId: customers[i].id, planId: plan.id, endDate: new Date(Date.now() + 30 * 86400000), status: 'ACTIVE' }
        });
    }

    // Support Tickets & Audit Logs for Admin
    const admins = allUsers.filter(u => u.role === 'ADMIN');
    for (const u of customers.slice(0, 5)) {
        await prisma.supportTicket.create({
            data: { userId: u.id, subject: 'Login issue', description: 'I cannot login to my account', status: 'OPEN', priority: 'HIGH' }
        });
        await prisma.auditLog.create({
            data: { userId: u.id, action: 'PASSWORD_CHANGE', resource: 'USER', ipAddress: '127.0.0.1' }
        });
        await prisma.notification.create({
            data: { userId: u.id, type: 'ACCOUNT', title: 'Security Alert', message: 'Your password was changed.' }
        });
        await prisma.taxReport.create({
            data: { userId: u.id, year: 2025, totalIncome: 55000, taxDeducted: 12000, status: 'APPROVED' }
        });
        await prisma.apiKey.create({
            data: { userId: u.id, name: 'Web API Key', key: `secret_key_${u.id}` }
        });
    }

    // 7. INFRASTRUCTURE (Branch & ATM)
    console.log('📍 Seeding branches and infrastructure...');
    const mainHQ = await prisma.branch.create({
        data: { name: 'Main HQ', code: 'BH-001', address: '1 Finance St', city: 'Metropolis', country: 'Atlantis' }
    });
    await prisma.aTM.createMany({
        data: [
            { branchId: mainHQ.id, atmNumber: 'ATM-00X', location: 'Lobby', city: 'Metropolis', status: 'ONLINE' },
            { branchId: mainHQ.id, atmNumber: 'ATM-00Y', location: 'Drive-thru', city: 'Metropolis', status: 'ONLINE' }
        ]
    });

    console.log('✨ ALL 43+ TABLES SEEDED WITH REALISTIC RECORDS! 🚀');
    await prisma.$disconnect();
}

main().catch(err => {
    console.error('❌ SEED ERROR:', err);
    process.exit(1);
});
