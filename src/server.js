const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { ApolloServerPluginLandingPageLocalDefault } = require('apollo-server-core');
const fs = require('fs');
const path = require('path');
const userResolver = require('./graphql/resolvers/userResolver');
const fintechResolver = require('./graphql/resolvers/fintechResolver');
const merchantResolver = require('./graphql/resolvers/merchantResolver');
const rewardResolver = require('./graphql/resolvers/rewardResolver');
const socialResolver = require('./graphql/resolvers/socialResolver');
require('dotenv').config();

const app = express();

// Load GraphQL type definitions
const loadTypeDef = (name) => fs.readFileSync(path.join(__dirname, 'graphql/typeDefs', `${name}.graphql`), 'utf8');

const typeDefs = [
  loadTypeDef('base'),
  loadTypeDef('user'),
  loadTypeDef('fintech'),
  loadTypeDef('merchant'),
  loadTypeDef('rewards'),
  loadTypeDef('social')
].join('\n');

const resolvers = [
  userResolver,
  fintechResolver,
  merchantResolver,
  rewardResolver,
  socialResolver
];

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [
    ApolloServerPluginLandingPageLocalDefault({ embed: true }),
  ],
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