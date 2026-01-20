const prisma = require('../../lib/prisma');
const { GraphQLError } = require('graphql');
const { GraphQLJSON } = require('graphql-type-json');

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

const fintechResolver = {
    JSON: GraphQLJSON,

    Query: {
        // ============================================
        // ACCOUNT QUERIES
        // ============================================
        accounts: async (_, { userId }) => {
            return await prisma.account.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        },

        account: async (_, { id }) => {
            return await prisma.account.findUnique({
                where: { id },
            });
        },

        accountByNumber: async (_, { accountNumber }) => {
            return await prisma.account.findUnique({
                where: { accountNumber },
            });
        },

        // ============================================
        // TRANSACTION QUERIES
        // ============================================
        transactions: async (_, { userId, status, type, limit = 50 }) => {
            const where = { userId };
            if (status) where.status = status;
            if (type) where.type = type;

            return await prisma.transaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
        },

        transaction: async (_, { id }) => {
            return await prisma.transaction.findUnique({
                where: { id },
            });
        },

        transactionByReference: async (_, { reference }) => {
            return await prisma.transaction.findUnique({
                where: { reference },
            });
        },

        // ============================================
        // CARD QUERIES
        // ============================================
        cards: async (_, { userId }) => {
            return await prisma.card.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        },

        card: async (_, { id }) => {
            return await prisma.card.findUnique({
                where: { id },
            });
        },

        // ============================================
        // BENEFICIARY QUERIES
        // ============================================
        beneficiaries: async (_, { userId }) => {
            return await prisma.beneficiary.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        },

        beneficiary: async (_, { id }) => {
            return await prisma.beneficiary.findUnique({
                where: { id },
            });
        },

        // ============================================
        // NOTIFICATION QUERIES
        // ============================================
        notifications: async (_, { userId, status }) => {
            const where = { userId };
            if (status) where.status = status;

            return await prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
            });
        },

        unreadNotificationCount: async (_, { userId }) => {
            return await prisma.notification.count({
                where: {
                    userId,
                    status: 'UNREAD',
                },
            });
        },
    },

    Mutation: {
        // ============================================
        // ACCOUNT MUTATIONS
        // ============================================
        createAccount: async (_, { input }) => {
            const { userId, accountType, currency = 'USD' } = input;

            // Check if user exists
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new GraphQLError('User not found');
            }

            // Generate unique account number
            const accountNumber = generateAccountNumber();

            // Check if this is the user's first account
            const existingAccounts = await prisma.account.count({
                where: { userId },
            });

            return await prisma.account.create({
                data: {
                    userId,
                    accountNumber,
                    accountType,
                    currency,
                    isDefault: existingAccounts === 0, // First account is default
                },
            });
        },

        updateAccountStatus: async (_, { id, status }) => {
            return await prisma.account.update({
                where: { id },
                data: { status },
            });
        },

        setDefaultAccount: async (_, { id, userId }) => {
            // Remove default from all user accounts
            await prisma.account.updateMany({
                where: { userId },
                data: { isDefault: false },
            });

            // Set new default
            return await prisma.account.update({
                where: { id },
                data: { isDefault: true },
            });
        },

        // ============================================
        // TRANSACTION MUTATIONS
        // ============================================
        createTransaction: async (_, { input }) => {
            const { userId, fromAccountId, toAccountId, type, amount, currency = 'USD', description, metadata } = input;

            // Validate accounts
            if (fromAccountId) {
                const fromAccount = await prisma.account.findUnique({
                    where: { id: fromAccountId },
                });

                if (!fromAccount) {
                    throw new GraphQLError('Source account not found');
                }

                // Check sufficient balance for transfers/withdrawals/payments
                if (['TRANSFER', 'WITHDRAWAL', 'PAYMENT'].includes(type)) {
                    if (fromAccount.availableBalance < amount) {
                        throw new GraphQLError('Insufficient funds');
                    }
                }
            }

            if (toAccountId) {
                const toAccount = await prisma.account.findUnique({
                    where: { id: toAccountId },
                });

                if (!toAccount) {
                    throw new GraphQLError('Destination account not found');
                }
            }

            // Calculate fee (2.5 for transfers, 5 for withdrawals, 0 for others)
            let fee = 0;
            if (type === 'TRANSFER') fee = 2.50;
            if (type === 'WITHDRAWAL') fee = 5.00;

            // Generate unique reference
            const reference = generateReference();

            // Create transaction
            return await prisma.transaction.create({
                data: {
                    userId,
                    fromAccountId,
                    toAccountId,
                    type,
                    amount,
                    currency,
                    fee,
                    description,
                    reference,
                    metadata,
                },
            });
        },

        processTransaction: async (_, { id }) => {
            const transaction = await prisma.transaction.findUnique({
                where: { id },
            });

            if (!transaction) {
                throw new GraphQLError('Transaction not found');
            }

            if (transaction.status !== 'PENDING') {
                throw new GraphQLError('Transaction cannot be processed');
            }

            // Update account balances
            if (transaction.fromAccountId) {
                await prisma.account.update({
                    where: { id: transaction.fromAccountId },
                    data: {
                        balance: { decrement: transaction.amount + transaction.fee },
                        availableBalance: { decrement: transaction.amount + transaction.fee },
                    },
                });
            }

            if (transaction.toAccountId) {
                await prisma.account.update({
                    where: { id: transaction.toAccountId },
                    data: {
                        balance: { increment: transaction.amount },
                        availableBalance: { increment: transaction.amount },
                    },
                });
            }

            // Update transaction status
            const updatedTransaction = await prisma.transaction.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    processedAt: new Date(),
                },
            });

            // Create notification
            await prisma.notification.create({
                data: {
                    userId: transaction.userId,
                    type: 'TRANSACTION',
                    title: 'Transaction Completed',
                    message: `Your ${transaction.type.toLowerCase()} of $${transaction.amount} was successful`,
                    metadata: {
                        transactionId: transaction.id,
                        amount: transaction.amount,
                    },
                },
            });

            return updatedTransaction;
        },

        cancelTransaction: async (_, { id }) => {
            const transaction = await prisma.transaction.findUnique({
                where: { id },
            });

            if (!transaction) {
                throw new GraphQLError('Transaction not found');
            }

            if (transaction.status !== 'PENDING') {
                throw new GraphQLError('Only pending transactions can be cancelled');
            }

            return await prisma.transaction.update({
                where: { id },
                data: { status: 'CANCELLED' },
            });
        },

        // ============================================
        // CARD MUTATIONS
        // ============================================
        createCard: async (_, { input }) => {
            const { userId, cardHolderName, cardType, expiryMonth, expiryYear, isVirtual = false, creditLimit } = input;

            // Validate user
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new GraphQLError('User not found');
            }

            // Generate card number
            const cardNumber = generateCardNumber();

            // Generate CVV
            const cvv = Math.floor(100 + Math.random() * 900).toString();

            return await prisma.card.create({
                data: {
                    userId,
                    cardNumber,
                    cardHolderName,
                    cardType,
                    expiryMonth,
                    expiryYear,
                    cvv,
                    isVirtual,
                    creditLimit,
                    availableCredit: creditLimit,
                },
            });
        },

        blockCard: async (_, { id }) => {
            return await prisma.card.update({
                where: { id },
                data: { status: 'BLOCKED' },
            });
        },

        unblockCard: async (_, { id }) => {
            return await prisma.card.update({
                where: { id },
                data: { status: 'ACTIVE' },
            });
        },

        // ============================================
        // BENEFICIARY MUTATIONS
        // ============================================
        addBeneficiary: async (_, { input }) => {
            const { userId, name, accountNumber, bankName, bankCode, email, phoneNumber } = input;

            // Validate user
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                throw new GraphQLError('User not found');
            }

            return await prisma.beneficiary.create({
                data: {
                    userId,
                    name,
                    accountNumber,
                    bankName,
                    bankCode,
                    email,
                    phoneNumber,
                },
            });
        },

        verifyBeneficiary: async (_, { id }) => {
            return await prisma.beneficiary.update({
                where: { id },
                data: { isVerified: true },
            });
        },

        removeBeneficiary: async (_, { id }) => {
            await prisma.beneficiary.delete({
                where: { id },
            });
            return true;
        },

        // ============================================
        // NOTIFICATION MUTATIONS
        // ============================================
        markNotificationAsRead: async (_, { id }) => {
            return await prisma.notification.update({
                where: { id },
                data: {
                    status: 'READ',
                    readAt: new Date(),
                },
            });
        },

        markAllNotificationsAsRead: async (_, { userId }) => {
            await prisma.notification.updateMany({
                where: {
                    userId,
                    status: 'UNREAD',
                },
                data: {
                    status: 'READ',
                    readAt: new Date(),
                },
            });
            return true;
        },

        deleteNotification: async (_, { id }) => {
            await prisma.notification.delete({
                where: { id },
            });
            return true;
        },
    },

    // ============================================
    // FIELD RESOLVERS
    // ============================================
    Account: {
        user: async (parent) => {
            return await prisma.user.findUnique({
                where: { id: parent.userId },
            });
        },

        transactionsFrom: async (parent) => {
            return await prisma.transaction.findMany({
                where: { fromAccountId: parent.id },
                orderBy: { createdAt: 'desc' },
            });
        },

        transactionsTo: async (parent) => {
            return await prisma.transaction.findMany({
                where: { toAccountId: parent.id },
                orderBy: { createdAt: 'desc' },
            });
        },
    },

    Transaction: {
        user: async (parent) => {
            return await prisma.user.findUnique({
                where: { id: parent.userId },
            });
        },

        fromAccount: async (parent) => {
            if (!parent.fromAccountId) return null;
            return await prisma.account.findUnique({
                where: { id: parent.fromAccountId },
            });
        },

        toAccount: async (parent) => {
            if (!parent.toAccountId) return null;
            return await prisma.account.findUnique({
                where: { id: parent.toAccountId },
            });
        },
    },

    Card: {
        user: async (parent) => {
            return await prisma.user.findUnique({
                where: { id: parent.userId },
            });
        },
    },

    Beneficiary: {
        user: async (parent) => {
            return await prisma.user.findUnique({
                where: { id: parent.userId },
            });
        },
    },

    Notification: {
        user: async (parent) => {
            return await prisma.user.findUnique({
                where: { id: parent.userId },
            });
        },
    },
};

module.exports = fintechResolver;
