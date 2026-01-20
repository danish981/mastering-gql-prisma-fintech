const prisma = require('../../lib/prisma');
const { GraphQLError } = require('graphql');

const userResolver = {
  Query: {
    // Get current user (requires authentication in production)
    me: async (_, __, context) => {
      // In production, get userId from context.user (from auth middleware)
      // For now, return first user as example
      return await prisma.user.findFirst();
    },

    // Login user
    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // In production, verify password with bcrypt
      // const isValid = await bcrypt.compare(password, user.password);
      // if (!isValid) throw new GraphQLError('Invalid credentials');

      // Create session
      const token = `token_${Date.now()}_${Math.random()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        token,
        user,
        expiresAt: expiresAt.toISOString(),
      };
    },

    // Get all users with optional filters
    users: async (_, { role, status }) => {
      const where = {};
      if (role) where.role = role;
      if (status) where.status = status;

      return await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
    },

    // Get user by ID
    user: async (_, { id }) => {
      return await prisma.user.findUnique({
        where: { id },
      });
    },

    // Get user profile
    userProfile: async (_, { userId }) => {
      return await prisma.userProfile.findUnique({
        where: { userId },
      });
    },
  },

  Mutation: {
    // Register new user
    register: async (_, { input }) => {
      const { email, password, firstName, lastName, phoneNumber, dateOfBirth } = input;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new GraphQLError('User with this email already exists', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // In production, hash password with bcrypt
      // const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password, // Use hashedPassword in production
          firstName,
          lastName,
          phoneNumber,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        },
      });

      // Create session
      const token = `token_${Date.now()}_${Math.random()}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      return {
        token,
        user,
        expiresAt: expiresAt.toISOString(),
      };
    },

    // Logout user
    logout: async (_, { token }) => {
      await prisma.session.delete({
        where: { token },
      });
      return true;
    },

    // Verify email
    verifyEmail: async (_, { userId }) => {
      return await prisma.user.update({
        where: { id: userId },
        data: { emailVerified: true },
      });
    },

    // Update user
    updateUser: async (_, { id, input }) => {
      const updateData = {};
      if (input.firstName) updateData.firstName = input.firstName;
      if (input.lastName) updateData.lastName = input.lastName;
      if (input.phoneNumber) updateData.phoneNumber = input.phoneNumber;
      if (input.dateOfBirth) updateData.dateOfBirth = new Date(input.dateOfBirth);

      return await prisma.user.update({
        where: { id },
        data: updateData,
      });
    },

    // Update user profile
    updateUserProfile: async (_, { userId, input }) => {
      // Check if profile exists
      const existingProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        return await prisma.userProfile.update({
          where: { userId },
          data: input,
        });
      } else {
        return await prisma.userProfile.create({
          data: {
            userId,
            ...input,
          },
        });
      }
    },

    // Change password
    changePassword: async (_, { userId, oldPassword, newPassword }) => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new GraphQLError('User not found');
      }

      // In production, verify old password with bcrypt
      // const isValid = await bcrypt.compare(oldPassword, user.password);
      // if (!isValid) throw new GraphQLError('Invalid old password');

      // In production, hash new password
      // const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: userId },
        data: { password: newPassword }, // Use hashedPassword in production
      });

      return true;
    },
  },

  // Field resolvers
  User: {
    fullName: (parent) => {
      return `${parent.firstName} ${parent.lastName}`;
    },

    profile: async (parent) => {
      return await prisma.userProfile.findUnique({
        where: { userId: parent.id },
      });
    },

    accounts: async (parent) => {
      return await prisma.account.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    cards: async (parent) => {
      return await prisma.card.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    transactions: async (parent) => {
      return await prisma.transaction.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    beneficiaries: async (parent) => {
      return await prisma.beneficiary.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },

    notifications: async (parent) => {
      return await prisma.notification.findMany({
        where: { userId: parent.id },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  UserProfile: {
    user: async (parent) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
  },

  Session: {
    user: async (parent) => {
      return await prisma.user.findUnique({
        where: { id: parent.userId },
      });
    },
  },
};

module.exports = userResolver;