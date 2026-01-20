const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

// ISSUE FIX: Prisma 7 requires using a database adapter instead of datasources configuration
// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

// Configure PrismaClient with the adapter
const prismaConfig = {
  adapter
};

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaConfig);
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient(prismaConfig);
  }
  prisma = global.prisma;
}

module.exports = prisma;