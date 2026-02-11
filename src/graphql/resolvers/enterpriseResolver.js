const prisma = require('../../lib/prisma');
const { GraphQLError } = require('graphql');

const enterpriseResolver = {
    Query: {
        kycStatus: async (_, { userId }) => {
            return await prisma.kycDocument.findUnique({ where: { userId } });
        },
        verificationHistory: async (_, { userId }) => {
            return await prisma.kycVerification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
        },
        loans: async (_, { userId }) => {
            return await prisma.loan.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
        },
        loanApplications: async (_, { userId }) => {
            return await prisma.loanApplication.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
        },
        loan: async (_, { id }) => {
            return await prisma.loan.findUnique({ where: { id } });
        },
        policies: async (_, { userId }) => {
            return await prisma.insurancePolicy.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
        },
        claims: async (_, { policyId }) => {
            return await prisma.insuranceClaim.findMany({ where: { policyId }, orderBy: { createdAt: 'desc' } });
        },
        billers: async () => {
            return await prisma.biller.findMany({ orderBy: { name: 'asc' } });
        },
        bills: async (_, { userId }) => {
            // Find all accounts of the user, then find transactions linked to bills
            const userAccounts = await prisma.account.findMany({ where: { userId } });
            const accountIds = userAccounts.map(a => a.id);
            return await prisma.bill.findMany({
                where: {
                    transactions: {
                        some: {
                            OR: [
                                { fromAccountId: { in: accountIds } },
                                { toAccountId: { in: accountIds } }
                            ]
                        }
                    }
                },
                orderBy: { dueDate: 'asc' }
            });
        },
        budgets: async (_, { userId }) => {
            return await prisma.budget.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
        },
        categories: async () => {
            return await prisma.category.findMany({ orderBy: { name: 'asc' } });
        },
        plans: async () => {
            return await prisma.subscriptionPlan.findMany({ where: { isActive: true } });
        },
        userSubscription: async (_, { userId }) => {
            return await prisma.userSubscription.findFirst({
                where: { userId, status: 'ACTIVE' },
                orderBy: { createdAt: 'desc' }
            });
        },
        branches: async (_, { city }) => {
            const where = city ? { city } : {};
            return await prisma.branch.findMany({ where, orderBy: { name: 'asc' } });
        },
        atms: async (_, { city }) => {
            const where = city ? { city } : {};
            return await prisma.atm.findMany({ where, orderBy: { atmNumber: 'asc' } });
        },
        referrals: async (_, { userId }) => {
            return await prisma.referral.findMany({ where: { referrerId: userId }, orderBy: { createdAt: 'desc' } });
        },
        vouchers: async () => {
            return await prisma.voucher.findMany({ where: { isActive: true }, orderBy: { expiryDate: 'asc' } });
        },
        loginHistory: async (_, { userId }) => {
            return await prisma.loginHistory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
        },
        apiKeys: async (_, { userId }) => {
            return await prisma.apiKey.findMany({ where: { userId, isActive: true }, orderBy: { createdAt: 'desc' } });
        },
        taxReports: async (_, { userId }) => {
            return await prisma.taxReport.findMany({ where: { userId }, orderBy: { year: 'desc' } });
        },
    },

    Mutation: {
        submitKyc: async (_, { input }) => {
            return await prisma.kycDocument.create({ data: { ...input, status: 'SUBMITTED' } });
        },
        verifyKyc: async (_, { id, status, notes }) => {
            return await prisma.kycVerification.create({
                data: { userId: id, status, notes }
            });
        },
        applyForLoan: async (_, { input }) => {
            return await prisma.loanApplication.create({ data: { ...input, status: 'APPLIED' } });
        },
        purchasePolicy: async (_, { input }) => {
            const { userId, type, premiumAmount, coverageAmount } = input;
            return await prisma.insurancePolicy.create({
                data: {
                    userId,
                    type,
                    premiumAmount,
                    coverageAmount,
                    policyNumber: `POL${Date.now()}`,
                    startDate: new Date(),
                    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                    status: 'ACTIVE'
                }
            });
        },
        setBudget: async (_, { input }) => {
            const { userId, categoryId, limitAmount, period } = input;
            return await prisma.budget.upsert({
                where: { id: -1 }, // Simple upsert placeholder (in real world use unique constraint)
                update: { limitAmount, period },
                create: { userId, categoryId, limitAmount, period }
            });
        },
        createApiKey: async (_, { userId, name }) => {
            return await prisma.apiKey.create({
                data: {
                    userId,
                    name,
                    key: `key_${Math.random().toString(36).substring(7)}`,
                    scopes: ['read']
                }
            });
        },
    },

    Loan: {
        repayments: async (parent) => {
            return await prisma.repayment.findMany({ where: { loanId: parent.id } });
        }
    },

    InsurancePolicy: {
        claims: async (parent) => {
            return await prisma.insuranceClaim.findMany({ where: { policyId: parent.id } });
        }
    },

    Bill: {
        biller: async (parent) => {
            return await prisma.biller.findUnique({ where: { id: parent.billerId } });
        }
    },

    Budget: {
        category: async (parent) => {
            return await prisma.category.findUnique({ where: { id: parent.categoryId } });
        }
    },

    UserSubscription: {
        plan: async (parent) => {
            return await prisma.subscriptionPlan.findUnique({ where: { id: parent.planId } });
        }
    },

    Branch: {
        atms: async (parent) => {
            return await prisma.atm.findMany({ where: { branchId: parent.id } });
        }
    }
};

module.exports = enterpriseResolver;
