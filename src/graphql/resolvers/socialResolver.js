const prisma = require('../../lib/prisma');
const { GraphQLError } = require('graphql');

const socialResolver = {
    Query: {
        connections: async (_, { userId }) => {
            return await prisma.connection.findMany({
                where: {
                    OR: [
                        { userId, status: 'ACCEPTED' },
                        { targetUserId: userId, status: 'ACCEPTED' },
                    ],
                },
                orderBy: { createdAt: 'desc' },
            });
        },
        pendingRequests: async (_, { userId }) => {
            return await prisma.connection.findMany({
                where: { targetUserId: userId, status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
            });
        },
        suggestedConnections: async (_, { userId }) => {
            // Very simple suggestion logic: users not connected yet
            const existingConnections = await prisma.connection.findMany({
                where: {
                    OR: [{ userId }, { targetUserId: userId }],
                },
            });
            const connectedUserIds = [
                userId,
                ...existingConnections.map((c) => (c.userId === userId ? c.targetUserId : c.userId)),
            ];

            return await prisma.user.findMany({
                where: { id: { notIn: connectedUserIds } },
                take: 5,
                orderBy: { createdAt: 'desc' },
            });
        },
    },

    Mutation: {
        sendConnectionRequest: async (_, { userId, targetUserId }) => {
            if (userId === targetUserId) throw new GraphQLError('Cannot connect to yourself');

            const existing = await prisma.connection.findFirst({
                where: {
                    OR: [
                        { userId, targetUserId },
                        { userId: targetUserId, targetUserId: userId },
                    ],
                },
            });

            if (existing) throw new GraphQLError('Connection already exists or requested');

            return await prisma.connection.create({
                data: {
                    userId,
                    targetUserId,
                    status: 'PENDING',
                },
            });
        },

        acceptConnectionRequest: async (_, { id }) => {
            return await prisma.connection.update({
                where: { id },
                data: { status: 'ACCEPTED' },
            });
        },

        removeConnection: async (_, { id }) => {
            await prisma.connection.delete({ where: { id } });
            return true;
        },
    },

    Connection: {
        user: async (parent) => {
            return await prisma.user.findUnique({ where: { id: parent.userId } });
        },
        targetUser: async (parent) => {
            return await prisma.user.findUnique({ where: { id: parent.targetUserId } });
        },
    },
};

module.exports = socialResolver;
