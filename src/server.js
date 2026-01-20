const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const fs = require('fs');
const path = require('path');
const userResolver = require('./graphql/resolvers/userResolver');
const fintechResolver = require('./graphql/resolvers/fintechResolver');
require('dotenv').config();

const app = express();

// Load GraphQL type definitions
const baseTypeDefs = fs.readFileSync(
  path.join(__dirname, 'graphql/typeDefs/base.graphql'),
  'utf8'
);
const userTypeDefs = fs.readFileSync(
  path.join(__dirname, 'graphql/typeDefs/user.graphql'),
  'utf8'
);
const fintechTypeDefs = fs.readFileSync(
  path.join(__dirname, 'graphql/typeDefs/fintech.graphql'),
  'utf8'
);

const typeDefs = [baseTypeDefs, userTypeDefs, fintechTypeDefs];
const resolvers = [userResolver, fintechResolver];

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: (error) => {
    console.error(error);
    return error;
  }
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});