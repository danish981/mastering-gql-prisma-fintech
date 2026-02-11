const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🏁 Starting ENTERPRISE seed (43 Tables)...');

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
        if (prisma[model.charAt(0).toLowerCase() + model.slice(1)]) {
            await prisma[model.charAt(0).toLowerCase() + model.slice(1)].deleteMany();
        }
    }

    // 1. STATIC DATA
    console.log('📊 Seeding static plans and categories...');
    await prisma.subscriptionPlan.createMany({
        data: [
            { name: 'Basic', price: 0, billingPeriod: 'MONTHLY' },
            { name: 'Premium', price: 15, billingPeriod: 'MONTHLY' },
            { name: 'Elite', price: 50, billingPeriod: 'YEARLY' }
        ]
    });

    await prisma.category.createMany({
        data: [
            { name: 'Food', icon: '🍲' },
            { name: 'Transport', icon: '🚗' },
            { name: 'Rent', icon: '🏠' },
            { name: 'Entertainment', icon: '🎬' },
            { name: 'Health', icon: '🏥' }
        ]
    });

    await prisma.biller.createMany({
        data: [
            { name: 'Electric Grid', category: 'UTILITY' },
            { name: 'Telco Mobile', category: 'TELECOM' },
            { name: 'Water Works', category: 'UTILITY' }
        ]
    });

    // 2. USERS
    console.log('👥 Creating 50 enterprise users...');
    const userData = Array.from({ length: 50 }).map((_, i) => ({
        email: `corp_user${i}@atlas.com`,
        password: 'secure_password',
        firstName: `John${i}`,
        lastName: `Doe${i}`,
        status: 'ACTIVE',
        role: i % 10 === 0 ? 'ADMIN' : 'CUSTOMER'
    }));
    await prisma.user.createMany({ data: userData });
    const allUsers = await prisma.user.findMany();

    // 3. KYC & PROFILES
    console.log('🆔 Processing KYC documents...');
    for (const u of allUsers) {
        await prisma.userProfile.create({
            data: { userId: u.id, city: 'Metropolis', country: 'Atlantis' }
        });
        await prisma.kycDocument.create({
            data: {
                userId: u.id,
                documentType: 'PASSPORT',
                documentNumber: `PASS${u.id}`,
                frontImageUrl: 'https://example.com/front.jpg',
                status: 'APPROVED'
            }
        });
    }

    // 4. ACCOUNTS & CARDS
    console.log('💳 Opening accounts and issuing cards...');
    for (const u of allUsers) {
        const acc = await prisma.account.create({
            data: {
                userId: u.id,
                accountNumber: `ACC-CORP-${u.id}`,
                balance: 50000,
                availableBalance: 48000
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
    }

    // 5. LOANS & INSURANCE
    console.log('🏦 Processing loans and policies...');
    const targetUsers = allUsers.slice(0, 10);
    for (const u of targetUsers) {
        await prisma.loan.create({
            data: {
                userId: u.id,
                principalAmount: 10000,
                interestRate: 5.5,
                termMonths: 24,
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
                remainingAmount: 10000,
                status: 'ACTIVE'
            }
        });
        await prisma.insurancePolicy.create({
            data: {
                userId: u.id,
                policyNumber: `INS-${u.id}`,
                type: 'HEALTH',
                premiumAmount: 200,
                coverageAmount: 500000,
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                status: 'ACTIVE'
            }
        });
    }

    // 6. INFRASTRUCTURE
    console.log('📍 Mapping branches and ATMs...');
    const branch = await prisma.branch.create({
        data: { name: 'Main HQ', code: 'HQ001', address: '1 Enterprise Way', city: 'Metropolis', country: 'Atlantis' }
    });
    await prisma.aTM.createMany({
        data: [
            { atmNumber: 'ATM-001', location: 'Lobby 1', city: 'Metropolis', status: 'ONLINE', branchId: branch.id },
            { atmNumber: 'ATM-002', location: 'Parking P5', city: 'Metropolis', status: 'ONLINE', branchId: branch.id }
        ]
    });

    // 7. SECURITY & ACCESS
    console.log('🔐 Generating API keys and audit logs...');
    for (const u of allUsers.slice(0, 5)) {
        await prisma.apiKey.create({
            data: { userId: u.id, name: 'Prod Access', key: `pk_live_${u.id}` }
        });
        await prisma.loginHistory.create({
            data: { userId: u.id, ipAddress: '127.0.0.1', status: 'SUCCESS' }
        });
    }

    console.log('✅ ENTERPRISE SEED COMPLETE! 🚀');
    await prisma.$disconnect();
}

main().catch(err => {
    console.error('❌ Seed Failed:', err);
    process.exit(1);
});
