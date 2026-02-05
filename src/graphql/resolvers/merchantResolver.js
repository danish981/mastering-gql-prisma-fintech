const prisma = require('../../lib/prisma');
const { GraphQLError } = require('graphql');

const merchantResolver = {
    Query: {
        merchants: async (_, { category }) => {
            const where = category ? { category } : {};
            return await prisma.merchant.findMany({ where, orderBy: { businessName: 'asc' } });
        },
        merchant: async (_, { id }) => {
            return await prisma.merchant.findUnique({ where: { id } });
        },
        products: async (_, { merchantId }) => {
            return await prisma.product.findMany({ where: { merchantId }, orderBy: { name: 'asc' } });
        },
        product: async (_, { id }) => {
            return await prisma.product.findUnique({ where: { id } });
        },
        orders: async (_, { userId, merchantId }) => {
            const where = {};
            if (userId) where.userId = userId;
            if (merchantId) where.merchantId = merchantId;
            return await prisma.order.findMany({ where, orderBy: { createdAt: 'desc' } });
        },
        order: async (_, { id }) => {
            return await prisma.order.findUnique({ where: { id } });
        },
    },

    Mutation: {
        registerMerchant: async (_, { input }) => {
            const { userId, businessName, category, taxId, website } = input;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user) throw new GraphQLError('User not found');

            return await prisma.merchant.create({
                data: {
                    userId,
                    businessName,
                    category,
                    taxId,
                    website,
                    isVerified: false,
                },
            });
        },

        createProduct: async (_, { input }) => {
            return await prisma.product.create({
                data: { ...input },
            });
        },

        placeOrder: async (_, { input }) => {
            const { userId, merchantId, items } = input;

            // Calculate total amount
            let totalAmount = 0;
            const productIds = items.map(i => i.productId);
            const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

            items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    totalAmount += parseFloat(product.price) * item.quantity;
                }
            });

            return await prisma.order.create({
                data: {
                    userId,
                    merchantId,
                    totalAmount,
                    status: 'PENDING',
                    items: {
                        create: items.map(item => {
                            const product = products.find(p => p.id === item.productId);
                            return {
                                productId: item.productId,
                                quantity: item.quantity,
                                price: product.price,
                            };
                        }),
                    },
                },
            });
        },

        updateOrderStatus: async (_, { id, status }) => {
            return await prisma.order.update({
                where: { id },
                data: { status },
            });
        },
    },

    Merchant: {
        user: async (parent) => {
            return await prisma.user.findUnique({ where: { id: parent.userId } });
        },
        products: async (parent) => {
            return await prisma.product.findMany({ where: { merchantId: parent.id } });
        },
        orders: async (parent) => {
            return await prisma.order.findMany({ where: { merchantId: parent.id } });
        },
    },

    Product: {
        merchant: async (parent) => {
            return await prisma.merchant.findUnique({ where: { id: parent.merchantId } });
        },
    },

    Order: {
        merchant: async (parent) => {
            return await prisma.merchant.findUnique({ where: { id: parent.merchantId } });
        },
        user: async (parent) => {
            return await prisma.user.findUnique({ where: { id: parent.userId } });
        },
        items: async (parent) => {
            return await prisma.orderItem.findMany({ where: { orderId: parent.id } });
        },
        transaction: async (parent) => {
            return await prisma.transaction.findUnique({ where: { orderId: parent.id } });
        },
    },

    OrderItem: {
        product: async (parent) => {
            return await prisma.product.findUnique({ where: { id: parent.productId } });
        },
    },
};

module.exports = merchantResolver;
