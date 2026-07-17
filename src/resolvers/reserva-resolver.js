import { db } from '../config/db-connection.js';

const reservaResolver = {
    Query: {
        async reservas() {
            return await db.any('SELECT * FROM reservas ORDER BY fecha_reserva DESC, hora_reserva DESC');
        },
        async reserva(_, { id_reserva }) {
            return await db.oneOrNone('SELECT * FROM reservas WHERE id_reserva = $1', [id_reserva]);
        },
        async reservasPorCliente(_, { id_cliente }) {
            return await db.any(
                'SELECT * FROM reservas WHERE id_cliente = $1 ORDER BY fecha_reserva DESC',
                [id_cliente]
            );
        }
    },

    Reserva: {
        async cliente(parent) {
            return await db.oneOrNone('SELECT * FROM clientes WHERE id_cliente = $1', [parent.id_cliente]);
        },
        async mesa(parent) {
            return await db.oneOrNone('SELECT * FROM mesas WHERE id_mesa = $1', [parent.id_mesa]);
        }
    },

    Mutation: {
        // HU-07: Crear reserva
        async createReserva(_, { input }) {
            const { id_cliente, id_mesa, fecha_reserva, hora_reserva } = input;

            // Verificar que la mesa esté disponible
            const mesa = await db.oneOrNone(
                "SELECT * FROM mesas WHERE id_mesa = $1 AND estado = 'Disponible'",
                [id_mesa]
            );
            if (!mesa) {
                throw new Error('La mesa no está disponible para reserva.');
            }

            // Verificar que el cliente exista
            const cliente = await db.oneOrNone(
                'SELECT id_cliente FROM clientes WHERE id_cliente = $1', [id_cliente]
            );
            if (!cliente) {
                throw new Error('Cliente no encontrado.');
            }

            // Crear la reserva
            const reserva = await db.one(
                "INSERT INTO reservas (id_cliente, id_mesa, fecha_reserva, hora_reserva, estado) VALUES ($1, $2, $3, $4, 'Pendiente') RETURNING *",
                [id_cliente, id_mesa, fecha_reserva, hora_reserva]
            );

            // Cambiar estado de la mesa a 'Ocupada'
            await db.none(
                "UPDATE mesas SET estado = 'Ocupada' WHERE id_mesa = $1",
                [id_mesa]
            );

            return reserva;
        },

        // Confirmar reserva
        async confirmarReserva(_, { id_reserva }) {
            const reserva = await db.oneOrNone(
                'SELECT * FROM reservas WHERE id_reserva = $1', [id_reserva]
            );
            if (!reserva) {
                throw new Error('Reserva no encontrada.');
            }

            return await db.one(
                "UPDATE reservas SET estado = 'Confirmada' WHERE id_reserva = $1 RETURNING *",
                [id_reserva]
            );
        },

        // Cancelar reserva — liberar la mesa
        async cancelarReserva(_, { id_reserva }) {
            const reserva = await db.oneOrNone(
                'SELECT * FROM reservas WHERE id_reserva = $1', [id_reserva]
            );
            if (!reserva) {
                throw new Error('Reserva no encontrada.');
            }

            // Liberar la mesa
            await db.none(
                "UPDATE mesas SET estado = 'Disponible' WHERE id_mesa = $1",
                [reserva.id_mesa]
            );

            return await db.one(
                "UPDATE reservas SET estado = 'Cancelada' WHERE id_reserva = $1 RETURNING *",
                [id_reserva]
            );
        }
    }
};

export default reservaResolver;
