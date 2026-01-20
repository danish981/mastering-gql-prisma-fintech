const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

// Create a PostgreSQL connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

// Configure PrismaClient with the adapter
const prisma = new PrismaClient({ adapter });

// Helper function to generate random account number
function generateAccountNumber() {
    return `ACC${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`;
}

// Helper function to generate random transaction reference
function generateReference() {
    return `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;
}

// Helper function to generate random card number (last 4 digits)
function generateCardNumber() {
    return `****-****-****-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function main() {
    console.log('🌱 Starting seed...');

    // Clear existing data
    console.log('🗑️  Cleaning database...');
    await prisma.notification.deleteMany();
    await prisma.beneficiary.deleteMany();
    await prisma.card.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();

    // ============================================
    // CREATE USERS
    // ============================================
    console.log('👥 Creating users...');

    const users = await Promise.all([
        // Customer 1 - John Doe
        prisma.user.create({
            data: {
                email: 'john.doe@example.com',
                password: 'hashed_password_123', // In production, use bcrypt
                firstName: 'John',
                lastName: 'Doe',
                phoneNumber: '+1234567890',
                dateOfBirth: new Date('1990-05-15'),
                role: 'CUSTOMER',
                status: 'ACTIVE',
                emailVerified: true,
                kycVerified: true,
                lastLoginAt: new Date(),
                profile: {
                    create: {
                        address: '123 Main Street',
                        city: 'New York',
                        state: 'NY',
                        country: 'USA',
                        postalCode: '10001',
                        occupation: 'Software Engineer',
                        annualIncome: 120000.00,
                    }
                }
            }
        }),

        // Customer 2 - Jane Smith
        prisma.user.create({
            data: {
                email: 'jane.smith@example.com',
                password: 'hashed_password_456',
                firstName: 'Jane',
                lastName: 'Smith',
                phoneNumber: '+1234567891',
                dateOfBirth: new Date('1985-08-22'),
                role: 'CUSTOMER',
                status: 'ACTIVE',
                emailVerified: true,
                kycVerified: true,
                lastLoginAt: new Date(),
                profile: {
                    create: {
                        address: '456 Oak Avenue',
                        city: 'Los Angeles',
                        state: 'CA',
                        country: 'USA',
                        postalCode: '90001',
                        occupation: 'Marketing Manager',
                        annualIncome: 95000.00,
                    }
                }
            }
        }),

        // Customer 3 - Mike Johnson
        prisma.user.create({
            data: {
                email: 'mike.johnson@example.com',
                password: 'hashed_password_789',
                firstName: 'Mike',
                lastName: 'Johnson',
                phoneNumber: '+1234567892',
                dateOfBirth: new Date('1992-03-10'),
                role: 'CUSTOMER',
                status: 'ACTIVE',
                emailVerified: true,
                kycVerified: false,
                profile: {
                    create: {
                        address: '789 Pine Road',
                        city: 'Chicago',
                        state: 'IL',
                        country: 'USA',
                        postalCode: '60601',
                        occupation: 'Entrepreneur',
                        annualIncome: 150000.00,
                    }
                }
            }
        }),

        // Merchant
        prisma.user.create({
            data: {
                email: 'merchant@techstore.com',
                password: 'hashed_password_merchant',
                firstName: 'Tech',
                lastName: 'Store',
                phoneNumber: '+1234567893',
                role: 'MERCHANT',
                status: 'ACTIVE',
                emailVerified: true,
                kycVerified: true,
                profile: {
                    create: {
                        address: '999 Commerce Blvd',
                        city: 'San Francisco',
                        state: 'CA',
                        country: 'USA',
                        postalCode: '94102',
                        occupation: 'Retail',
                    }
                }
            }
        }),

        // Admin
        prisma.user.create({
            data: {
                email: 'admin@fintech.com',
                password: 'hashed_password_admin',
                firstName: 'Admin',
                lastName: 'User',
                phoneNumber: '+1234567894',
                role: 'ADMIN',
                status: 'ACTIVE',
                emailVerified: true,
                kycVerified: true,
                lastLoginAt: new Date(),
            }
        }),
    ]);

    console.log(`✅ Created ${users.length} users`);

    // ============================================
    // CREATE ACCOUNTS
    // ============================================
    console.log('💰 Creating accounts...');

    const accounts = [];

    // John's accounts
    const johnCheckingAccount = await prisma.account.create({
        data: {
            userId: users[0].id,
            accountNumber: generateAccountNumber(),
            accountType: 'CHECKING',
            currency: 'USD',
            balance: 15000.00,
            availableBalance: 15000.00,
            isDefault: true,
            status: 'ACTIVE',
        }
    });
    accounts.push(johnCheckingAccount);

    const johnSavingsAccount = await prisma.account.create({
        data: {
            userId: users[0].id,
            accountNumber: generateAccountNumber(),
            accountType: 'SAVINGS',
            currency: 'USD',
            balance: 50000.00,
            availableBalance: 50000.00,
            isDefault: false,
            status: 'ACTIVE',
        }
    });
    accounts.push(johnSavingsAccount);

    const johnCryptoAccount = await prisma.account.create({
        data: {
            userId: users[0].id,
            accountNumber: generateAccountNumber(),
            accountType: 'CRYPTO',
            currency: 'BTC',
            balance: 0.5,
            availableBalance: 0.5,
            isDefault: false,
            status: 'ACTIVE',
        }
    });
    accounts.push(johnCryptoAccount);

    // Jane's accounts
    const janeCheckingAccount = await prisma.account.create({
        data: {
            userId: users[1].id,
            accountNumber: generateAccountNumber(),
            accountType: 'CHECKING',
            currency: 'USD',
            balance: 8500.00,
            availableBalance: 8500.00,
            isDefault: true,
            status: 'ACTIVE',
        }
    });
    accounts.push(janeCheckingAccount);

    const janeInvestmentAccount = await prisma.account.create({
        data: {
            userId: users[1].id,
            accountNumber: generateAccountNumber(),
            accountType: 'INVESTMENT',
            currency: 'USD',
            balance: 75000.00,
            availableBalance: 75000.00,
            isDefault: false,
            status: 'ACTIVE',
        }
    });
    accounts.push(janeInvestmentAccount);

    // Mike's accounts
    const mikeCheckingAccount = await prisma.account.create({
        data: {
            userId: users[2].id,
            accountNumber: generateAccountNumber(),
            accountType: 'CHECKING',
            currency: 'USD',
            balance: 25000.00,
            availableBalance: 25000.00,
            isDefault: true,
            status: 'ACTIVE',
        }
    });
    accounts.push(mikeCheckingAccount);

    // Merchant account
    const merchantAccount = await prisma.account.create({
        data: {
            userId: users[3].id,
            accountNumber: generateAccountNumber(),
            accountType: 'CHECKING',
            currency: 'USD',
            balance: 250000.00,
            availableBalance: 250000.00,
            isDefault: true,
            status: 'ACTIVE',
        }
    });
    accounts.push(merchantAccount);

    console.log(`✅ Created ${accounts.length} accounts`);

    // ============================================
    // CREATE CARDS
    // ============================================
    console.log('💳 Creating cards...');

    const cards = await Promise.all([
        // John's debit card
        prisma.card.create({
            data: {
                userId: users[0].id,
                cardNumber: generateCardNumber(),
                cardHolderName: 'JOHN DOE',
                cardType: 'DEBIT',
                status: 'ACTIVE',
                expiryMonth: 12,
                expiryYear: 2027,
                cvv: '123',
                isVirtual: false,
            }
        }),

        // John's credit card
        prisma.card.create({
            data: {
                userId: users[0].id,
                cardNumber: generateCardNumber(),
                cardHolderName: 'JOHN DOE',
                cardType: 'CREDIT',
                status: 'ACTIVE',
                expiryMonth: 6,
                expiryYear: 2028,
                cvv: '456',
                creditLimit: 10000.00,
                availableCredit: 7500.00,
                isVirtual: false,
            }
        }),

        // Jane's virtual card
        prisma.card.create({
            data: {
                userId: users[1].id,
                cardNumber: generateCardNumber(),
                cardHolderName: 'JANE SMITH',
                cardType: 'VIRTUAL',
                status: 'ACTIVE',
                expiryMonth: 3,
                expiryYear: 2027,
                cvv: '789',
                isVirtual: true,
            }
        }),

        // Mike's prepaid card
        prisma.card.create({
            data: {
                userId: users[2].id,
                cardNumber: generateCardNumber(),
                cardHolderName: 'MIKE JOHNSON',
                cardType: 'PREPAID',
                status: 'ACTIVE',
                expiryMonth: 9,
                expiryYear: 2026,
                cvv: '321',
                isVirtual: false,
            }
        }),
    ]);

    console.log(`✅ Created ${cards.length} cards`);

    // ============================================
    // CREATE TRANSACTIONS
    // ============================================
    console.log('💸 Creating transactions...');

    const transactions = await Promise.all([
        // John deposits money
        prisma.transaction.create({
            data: {
                userId: users[0].id,
                toAccountId: johnCheckingAccount.id,
                type: 'DEPOSIT',
                status: 'COMPLETED',
                amount: 5000.00,
                currency: 'USD',
                fee: 0,
                description: 'Salary deposit',
                reference: generateReference(),
                processedAt: new Date('2026-01-15'),
                createdAt: new Date('2026-01-15'),
            }
        }),

        // John transfers to Jane
        prisma.transaction.create({
            data: {
                userId: users[0].id,
                fromAccountId: johnCheckingAccount.id,
                toAccountId: janeCheckingAccount.id,
                type: 'TRANSFER',
                status: 'COMPLETED',
                amount: 500.00,
                currency: 'USD',
                fee: 2.50,
                description: 'Dinner split payment',
                reference: generateReference(),
                processedAt: new Date('2026-01-18'),
                createdAt: new Date('2026-01-18'),
            }
        }),

        // Jane makes a payment to merchant
        prisma.transaction.create({
            data: {
                userId: users[1].id,
                fromAccountId: janeCheckingAccount.id,
                toAccountId: merchantAccount.id,
                type: 'PAYMENT',
                status: 'COMPLETED',
                amount: 299.99,
                currency: 'USD',
                fee: 0,
                description: 'Purchase - Laptop',
                reference: generateReference(),
                metadata: {
                    merchantName: 'Tech Store',
                    orderId: 'ORD-12345',
                    items: ['MacBook Pro 14"']
                },
                processedAt: new Date('2026-01-19'),
                createdAt: new Date('2026-01-19'),
            }
        }),

        // Mike withdraws cash
        prisma.transaction.create({
            data: {
                userId: users[2].id,
                fromAccountId: mikeCheckingAccount.id,
                type: 'WITHDRAWAL',
                status: 'COMPLETED',
                amount: 1000.00,
                currency: 'USD',
                fee: 5.00,
                description: 'ATM withdrawal',
                reference: generateReference(),
                processedAt: new Date('2026-01-20'),
                createdAt: new Date('2026-01-20'),
            }
        }),

        // Pending transaction
        prisma.transaction.create({
            data: {
                userId: users[0].id,
                fromAccountId: johnCheckingAccount.id,
                toAccountId: mikeCheckingAccount.id,
                type: 'TRANSFER',
                status: 'PENDING',
                amount: 750.00,
                currency: 'USD',
                fee: 2.00,
                description: 'Loan repayment',
                reference: generateReference(),
                createdAt: new Date(),
            }
        }),

        // Failed transaction
        prisma.transaction.create({
            data: {
                userId: users[1].id,
                fromAccountId: janeCheckingAccount.id,
                type: 'PAYMENT',
                status: 'FAILED',
                amount: 10000.00,
                currency: 'USD',
                fee: 0,
                description: 'Insufficient funds',
                reference: generateReference(),
                createdAt: new Date('2026-01-17'),
            }
        }),

        // Refund transaction
        prisma.transaction.create({
            data: {
                userId: users[1].id,
                toAccountId: janeCheckingAccount.id,
                type: 'REFUND',
                status: 'COMPLETED',
                amount: 49.99,
                currency: 'USD',
                fee: 0,
                description: 'Product return refund',
                reference: generateReference(),
                processedAt: new Date('2026-01-16'),
                createdAt: new Date('2026-01-16'),
            }
        }),
    ]);

    console.log(`✅ Created ${transactions.length} transactions`);

    // ============================================
    // CREATE BENEFICIARIES
    // ============================================
    console.log('👤 Creating beneficiaries...');

    const beneficiaries = await Promise.all([
        // John's beneficiaries
        prisma.beneficiary.create({
            data: {
                userId: users[0].id,
                name: 'Jane Smith',
                accountNumber: janeCheckingAccount.accountNumber,
                bankName: 'FinTech Bank',
                bankCode: 'FTB001',
                email: 'jane.smith@example.com',
                phoneNumber: '+1234567891',
                isVerified: true,
            }
        }),

        prisma.beneficiary.create({
            data: {
                userId: users[0].id,
                name: 'Sarah Williams',
                accountNumber: 'ACC9876543210',
                bankName: 'Global Bank',
                bankCode: 'GLB002',
                email: 'sarah.w@example.com',
                isVerified: false,
            }
        }),

        // Jane's beneficiaries
        prisma.beneficiary.create({
            data: {
                userId: users[1].id,
                name: 'John Doe',
                accountNumber: johnCheckingAccount.accountNumber,
                bankName: 'FinTech Bank',
                bankCode: 'FTB001',
                email: 'john.doe@example.com',
                phoneNumber: '+1234567890',
                isVerified: true,
            }
        }),

        prisma.beneficiary.create({
            data: {
                userId: users[1].id,
                name: 'Electric Company',
                accountNumber: 'ACC5555555555',
                bankName: 'Utility Bank',
                bankCode: 'UTL003',
                isVerified: true,
            }
        }),
    ]);

    console.log(`✅ Created ${beneficiaries.length} beneficiaries`);

    // ============================================
    // CREATE SESSIONS
    // ============================================
    console.log('🔐 Creating sessions...');

    const sessions = await Promise.all([
        prisma.session.create({
            data: {
                userId: users[0].id,
                token: `token_${Date.now()}_${Math.random()}`,
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            }
        }),

        prisma.session.create({
            data: {
                userId: users[1].id,
                token: `token_${Date.now()}_${Math.random()}`,
                ipAddress: '192.168.1.101',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }
        }),

        prisma.session.create({
            data: {
                userId: users[4].id, // Admin
                token: `token_${Date.now()}_${Math.random()}`,
                ipAddress: '10.0.0.50',
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
                expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
            }
        }),
    ]);

    console.log(`✅ Created ${sessions.length} sessions`);

    // ============================================
    // CREATE NOTIFICATIONS
    // ============================================
    console.log('🔔 Creating notifications...');

    const notifications = await Promise.all([
        // John's notifications
        prisma.notification.create({
            data: {
                userId: users[0].id,
                type: 'TRANSACTION',
                status: 'READ',
                title: 'Payment Received',
                message: 'You received $5,000.00 from Salary deposit',
                metadata: {
                    transactionId: transactions[0].id,
                    amount: 5000.00,
                },
                readAt: new Date(),
                createdAt: new Date('2026-01-15'),
            }
        }),

        prisma.notification.create({
            data: {
                userId: users[0].id,
                type: 'TRANSACTION',
                status: 'UNREAD',
                title: 'Transfer Sent',
                message: 'You sent $500.00 to Jane Smith',
                metadata: {
                    transactionId: transactions[1].id,
                    amount: 500.00,
                },
                createdAt: new Date('2026-01-18'),
            }
        }),

        prisma.notification.create({
            data: {
                userId: users[0].id,
                type: 'SECURITY',
                status: 'UNREAD',
                title: 'New Login Detected',
                message: 'A new login was detected from Windows device',
                metadata: {
                    ipAddress: '192.168.1.100',
                    device: 'Windows PC',
                },
                createdAt: new Date(),
            }
        }),

        // Jane's notifications
        prisma.notification.create({
            data: {
                userId: users[1].id,
                type: 'TRANSACTION',
                status: 'READ',
                title: 'Payment Successful',
                message: 'Your payment of $299.99 to Tech Store was successful',
                metadata: {
                    transactionId: transactions[2].id,
                    merchant: 'Tech Store',
                },
                readAt: new Date(),
                createdAt: new Date('2026-01-19'),
            }
        }),

        prisma.notification.create({
            data: {
                userId: users[1].id,
                type: 'ACCOUNT',
                status: 'UNREAD',
                title: 'Monthly Statement Ready',
                message: 'Your January statement is now available',
                createdAt: new Date(),
            }
        }),

        prisma.notification.create({
            data: {
                userId: users[1].id,
                type: 'PROMOTIONAL',
                status: 'UNREAD',
                title: 'Special Offer',
                message: 'Get 2% cashback on all purchases this month!',
                createdAt: new Date(),
            }
        }),

        // Mike's notifications
        prisma.notification.create({
            data: {
                userId: users[2].id,
                type: 'SECURITY',
                status: 'UNREAD',
                title: 'KYC Verification Required',
                message: 'Please complete your KYC verification to unlock all features',
                createdAt: new Date(),
            }
        }),

        // System notification for all
        prisma.notification.create({
            data: {
                userId: users[0].id,
                type: 'SYSTEM',
                status: 'UNREAD',
                title: 'System Maintenance',
                message: 'Scheduled maintenance on Jan 25, 2026 from 2 AM - 4 AM EST',
                createdAt: new Date(),
            }
        }),
    ]);

    console.log(`✅ Created ${notifications.length} notifications`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n✨ Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   💰 Accounts: ${accounts.length}`);
    console.log(`   💳 Cards: ${cards.length}`);
    console.log(`   💸 Transactions: ${transactions.length}`);
    console.log(`   👤 Beneficiaries: ${beneficiaries.length}`);
    console.log(`   🔐 Sessions: ${sessions.length}`);
    console.log(`   🔔 Notifications: ${notifications.length}`);
    console.log('\n🎉 Database is ready for testing!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
