const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const fs = require('fs');
const path = require('path');
const userResolver = require('./graphql/resolvers/userResolver');
const postResolver = require('./graphql/resolvers/postResolver');
require('dotenv').config();

const app = express();

// Load GraphQL type definitions
const userTypeDefs = fs.readFileSync(
  path.join(__dirname, 'graphql/typeDefs/user.graphql'),
  'utf8'
);
const postTypeDefs = fs.readFileSync(
  path.join(__dirname, 'graphql/typeDefs/post.graphql'),
  'utf8'
);

const typeDefs = [userTypeDefs, postTypeDefs];
const resolvers = [userResolver, postResolver];

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