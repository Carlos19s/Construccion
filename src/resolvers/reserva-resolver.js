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
        async createReserva(_, { input }, context) {
            if (!context.user) {
                throw new Error('No autenticado. Debes iniciar sesión para crear una reserva.');
            }
            const { id_cliente, id_mesa, fecha_reserva, hora_reserva } = input;

            // 1. Verificar disponibilidad de la mesa
            const mesa = await db.oneOrNone(
                "SELECT * FROM mesas WHERE id_mesa = $1 AND estado = 'Disponible'",
                [id_mesa]
            );
            if (!mesa) {
                throw new Error('La mesa no está disponible para reserva.');
            }

            // 2. Verificar que exista el cliente
            const cliente = await db.oneOrNone(
                'SELECT id_cliente FROM clientes WHERE id_cliente = $1', 
                [id_cliente]
            );
            if (!cliente) {
                throw new Error('Cliente no encontrado.');
            }

            // 3. Crear la reserva
            const reserva = await db.one(
                "INSERT INTO reservas (id_cliente, id_mesa, fecha_reserva, hora_reserva, estado) VALUES ($1, $2, $3, $4, 'Pendiente') RETURNING *",
                [id_cliente, id_mesa, fecha_reserva, hora_reserva]
            );

            // 4. Cambiar estado de la mesa a 'Ocupada' (permite que siga ocupada mientras comen)
            await db.none(
                "UPDATE mesas SET estado = 'Ocupada' WHERE id_mesa = $1",
                [id_mesa]
            );

            return reserva;
        },

        // Cambiar estado manual por operario (Coincide con HU-04 y soporte de flujo de atención)
        async cambiarEstadoMesa(_, { id_mesa, nuevo_estado }) {
            const mesa = await db.oneOrNone(
                'SELECT * FROM mesas WHERE id_mesa = $1', 
                [id_mesa]
            );
            if (!mesa) {
                throw new Error('Mesa no encontrada.');
            }

            return await db.one(
                "UPDATE mesas SET estado = $1 WHERE id_mesa = $2 RETURNING *",
                [nuevo_estado, id_mesa]
            );
        },

        // Confirmar reserva
        async confirmarReserva(_, { id_reserva }, context) {
            if (!context.user || ![1, 2].includes(context.user.id_rol)) {
                throw new Error('No autorizado. Solo Admin u Operativo pueden confirmar reservas.');
            }
            const reserva = await db.oneOrNone(
                'SELECT * FROM reservas WHERE id_reserva = $1', 
                [id_reserva]
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
        async cancelarReserva(_, { id_reserva }, context) {
            if (!context.user || ![1, 2].includes(context.user.id_rol)) {
                throw new Error('No autorizado. Solo Admin u Operativo pueden cancelar reservas.');
            }
            const reserva = await db.oneOrNone(
                'SELECT * FROM reservas WHERE id_reserva = $1', 
                [id_reserva]
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