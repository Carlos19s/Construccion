import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs, mergeResolvers } from '@graphql-tools/merge';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pizzeria_secret_key_2026';

// Cargar schema y resolvers
const typeDefs = mergeTypeDefs(
    loadFilesSync('./src/type-system/*.graphql')
);

const resolvers = mergeResolvers(
    loadFilesSync('./src/resolvers/*.js')
);

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

// Iniciar servidor con context para JWT
const { url } = await startStandaloneServer(server, {
    listen: { port: 4001 },
    context: async ({ req }) => {
        // Extraer token del header Authorization
        const authHeader = req.headers.authorization || '';
        let user = null;

        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            try {
                user = jwt.verify(token, JWT_SECRET);
            } catch (err) {
                // Token inválido o expirado — user queda null
                console.warn('Token inválido:', err.message);
            }
        }

        return { user };
    }
});

console.log(`🚀 Server ready at ${url}`);