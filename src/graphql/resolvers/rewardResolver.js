const prisma = require('../../lib/prisma');
const { GraphQLError } = require('graphql');

const rewardResolver = {
    Query: {
        rewardBalance: async (_, { userId }) => {
            const result = await prisma.rewardPoint.aggregate({
                where: { userId },
                _sum: { points: true },
            });
            return result._sum.points || 0;
        },
        rewardHistory: async (_, { userId }) => {
            return await prisma.rewardPoint.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        },
        redemptions: async (_, { userId }) => {
            return await prisma.rewardRedemption.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            });
        },
    },

    Mutation: {
        redeemPoints: async (_, { userId, points, description }) => {
            const balanceResult = await prisma.rewardPoint.aggregate({
                where: { userId },
                _sum: { points: true },
            });
            const balance = balanceResult._sum.points || 0;

            if (balance < points) {
                throw new GraphQLError('Insufficient reward points');
            }

            // 100 points = $1
            const valueAmount = points / 100;

            return await prisma.$transaction(async (tx) => {
                // Record spending points
                await tx.rewardPoint.create({
                    data: {
                        userId,
                        points: -points,
                        action: 'SPENT',
                        reason: description || 'Redemption',
                    },
                });

                // Record redemption
                return await tx.rewardRedemption.create({
                    data: {
                        userId,
                        pointsSpent: points,
                        valueAmount,
                        description,
                    },
                });
            });
        },
    },
};

module.exports = rewardResolver;
