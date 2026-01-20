const prisma = require('../../lib/prisma');

const userResolver = {
  Query: {
    user: async (_, { id }) => {
      return prisma.user.findUnique({
        where: { id },
        include: { posts: true }
      });
    },
    users: async () => {
      return prisma.user.findMany({
        include: { posts: true }
      });
    }
  },
  Mutation: {
    createUser: async (_, { email, name }) => {
      return prisma.user.create({
        data: { email, name },
        include: { posts: true }
      });
    },
    deleteUser: async (_, { id }) => {
      return prisma.user.delete({
        where: { id }
      });
    }
  }
};

module.exports = userResolver;