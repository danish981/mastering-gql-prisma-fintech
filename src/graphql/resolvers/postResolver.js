const prisma = require('../../lib/prisma');

const postResolver = {
  Query: {
    post: async (_, { id }) => {
      return prisma.post.findUnique({
        where: { id },
        include: { author: true }
      });
    },
    posts: async () => {
      return prisma.post.findMany({
        include: { author: true }
      });
    }
  },
  Mutation: {
    createPost: async (_, { title, content, authorId }) => {
      return prisma.post.create({
        data: { title, content, authorId },
        include: { author: true }
      });
    },
    updatePost: async (_, { id, title, content, published }) => {
      return prisma.post.update({
        where: { id },
        data: { title, content, published },
        include: { author: true }
      });
    },
    deletePost: async (_, { id }) => {
      return prisma.post.delete({
        where: { id }
      });
    }
  }
};

module.exports = postResolver;