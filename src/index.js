import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import {loadFilesSync} from '@graphql-tools/load-files';
import { mergeTypeDefs,mergeResolvers } from '@graphql-tools/merge';
// The GraphQL schema

const typeDefs =  mergeTypeDefs(
    loadFilesSync ('./src/type-system/*.graphql')
);

// A map of functions which return data for the schema.
const resolvers = mergeResolvers(
    loadFilesSync ('./src/resolvers/*.js')
);

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server,{
    listen: {port:4001}
});
console.log(`🚀 Server ready at ${url}`);