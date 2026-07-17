import { db } from '../config/db-connection.js';

const mesaResolver = {
    Query: {
        // HU-04: Listar todas las mesas
        async mesas() {
            return await db.any('SELECT * FROM mesas ORDER BY numero_mesa');
        },
        async mesa(_, { id_mesa }) {
            return await db.oneOrNone('SELECT * FROM mesas WHERE id_mesa = $1', [id_mesa]);
        },
        // HU-07: Mesas disponibles para reserva
        async mesasDisponibles() {
            return await db.any("SELECT * FROM mesas WHERE estado = 'Disponible' ORDER BY numero_mesa");
        }
    },

    Mutation: {
        // HU-04: Crear mesa
        async createMesa(_, { input }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede gestionar mesas.');
            }
            const { numero_mesa, capacidad } = input;

            // Validar que no exista otra mesa con el mismo número
            const existing = await db.oneOrNone(
                'SELECT id_mesa FROM mesas WHERE numero_mesa = $1', [numero_mesa]
            );
            if (existing) {
                throw new Error(`Ya existe una mesa con el número ${numero_mesa}.`);
            }

            return await db.one(
                "INSERT INTO mesas (numero_mesa, capacidad, estado) VALUES ($1, $2, 'Disponible') RETURNING *",
                [numero_mesa, capacidad]
            );
        },

        // HU-04: Actualizar mesa
        async updateMesa(_, { input }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede gestionar mesas.');
            }
            const { id_mesa, numero_mesa, capacidad, estado } = input;

            const mesa = await db.oneOrNone('SELECT * FROM mesas WHERE id_mesa = $1', [id_mesa]);
            if (!mesa) {
                throw new Error('Mesa no encontrada.');
            }

            return await db.one(
                'UPDATE mesas SET numero_mesa=COALESCE($2, numero_mesa), capacidad=COALESCE($3, capacidad), estado=COALESCE($4, estado) WHERE id_mesa=$1 RETURNING *',
                [id_mesa, numero_mesa || null, capacidad || null, estado || null]
            );
        },

        // HU-04: Eliminar mesa
        async deleteMesa(_, { id_mesa }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede gestionar mesas.');
            }
            const result = await db.result('DELETE FROM mesas WHERE id_mesa = $1', [id_mesa]);
            return result.rowCount > 0;
        }
    }
};

export default mesaResolver;
