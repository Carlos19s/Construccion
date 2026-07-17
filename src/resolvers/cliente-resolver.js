import { db } from '../config/db-connection.js';

const clienteResolver = {
    Query: {
        async clientes() {
            return await db.any('SELECT * FROM clientes ORDER BY id_cliente');
        },
        async cliente(_, { id_cliente }) {
            return await db.oneOrNone('SELECT * FROM clientes WHERE id_cliente = $1', [id_cliente]);
        },
        async clientePorIdentificacion(_, { identificacion }) {
            return await db.oneOrNone('SELECT * FROM clientes WHERE identificacion = $1', [identificacion]);
        }
    },

    Mutation: {
        async createCliente(_, { input }) {
            const { nombre, telefono, identificacion } = input;

            const existing = await db.oneOrNone(
                'SELECT id_cliente FROM clientes WHERE identificacion = $1', [identificacion]
            );
            if (existing) {
                throw new Error('La identificación ya está registrada.');
            }

            return await db.one(
                'INSERT INTO clientes (nombre, telefono, identificacion) VALUES ($1, $2, $3) RETURNING *',
                [nombre, telefono || null, identificacion]
            );
        },

        async updateCliente(_, { input }) {
            const { id_cliente, nombre, telefono } = input;
            return await db.one(
                'UPDATE clientes SET nombre=$2, telefono=$3 WHERE id_cliente=$1 RETURNING *',
                [id_cliente, nombre, telefono]
            );
        },

        async deleteCliente(_, { id_cliente }) {
            const result = await db.result('DELETE FROM clientes WHERE id_cliente = $1', [id_cliente]);
            return result.rowCount > 0;
        }
    }
};

export default clienteResolver;
