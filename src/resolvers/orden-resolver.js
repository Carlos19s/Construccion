import { db } from '../config/db-connection.js';

const ordenResolver = {
    Query: {
        // Listar todas las órdenes
        async ordenes() {
            return await db.any('SELECT * FROM ordenes ORDER BY fecha_hora DESC');
        },

        // Obtener una orden por ID
        async orden(_, { id_orden }) {
            return await db.oneOrNone('SELECT * FROM ordenes WHERE id_orden = $1', [id_orden]);
        },

        // HU-09: Órdenes activas (Pendiente o En Preparacion)
        async ordenesActivas() {
            return await db.any(
                "SELECT * FROM ordenes WHERE estado IN ('Pendiente', 'En Preparacion') ORDER BY fecha_hora ASC"
            );
        },

        // HU-10: Reporte de ventas del día
        async reporteVentasDia(_, { fecha }) {
            const ordenes = await db.any(
                "SELECT * FROM ordenes WHERE DATE(fecha_hora) = $1 AND estado = 'Pagada' ORDER BY fecha_hora DESC",
                [fecha]
            );

            const totales = await db.oneOrNone(
                "SELECT COALESCE(SUM(total), 0) as total_ventas, COUNT(*) as total_ordenes FROM ordenes WHERE DATE(fecha_hora) = $1 AND estado = 'Pagada'",
                [fecha]
            );

            return {
                fecha,
                total_ventas: parseFloat(totales?.total_ventas || 0),
                total_ordenes: parseInt(totales?.total_ordenes || 0),
                ordenes
            };
        },

        // HU-10: Top platos más vendidos
        async topPlatosVendidos(_, { limit }) {
            const topLimit = limit || 5;
            return await db.any(`
                SELECT 
                    p.id_plato,
                    p.nombre,
                    COALESCE(SUM(d.cantidad), 0) as total_vendido,
                    COALESCE(SUM(d.subtotal), 0) as total_ingresos
                FROM platos p
                LEFT JOIN detalle_ordenes d ON p.id_plato = d.id_plato
                LEFT JOIN ordenes o ON d.id_orden = o.id_orden AND o.estado = 'Pagada'
                GROUP BY p.id_plato, p.nombre
                ORDER BY total_vendido DESC
                LIMIT $1
            `, [topLimit]);
        }
    },

    Orden: {
        async mesa(parent) {
            if (!parent.id_mesa) return null;
            return await db.oneOrNone('SELECT * FROM mesas WHERE id_mesa = $1', [parent.id_mesa]);
        },
        async cliente(parent) {
            if (!parent.id_cliente) return null;
            return await db.oneOrNone('SELECT * FROM clientes WHERE id_cliente = $1', [parent.id_cliente]);
        },
        async usuario(parent) {
            return await db.oneOrNone(
                'SELECT id_usuario, nombre, email, id_rol FROM usuarios WHERE id_usuario = $1',
                [parent.id_usuario]
            );
        },
        async detalles(parent) {
            return await db.any(
                'SELECT * FROM detalle_ordenes WHERE id_orden = $1 ORDER BY id_detalle',
                [parent.id_orden]
            );
        }
    },

    DetalleOrden: {
        async plato(parent) {
            return await db.oneOrNone('SELECT * FROM platos WHERE id_plato = $1', [parent.id_plato]);
        }
    },

    Mutation: {
        // HU-08: Crear orden con detalles
        async createOrden(_, { input }, context) {

            const { id_mesa, id_cliente, detalles } = input;

            if (!detalles || detalles.length === 0) {
                throw new Error('La orden debe tener al menos un plato.');
            }

            // Validar cantidades y stock
            for (const detalle of detalles) {
                if (detalle.cantidad <= 0) {
                    throw new Error('La cantidad debe ser mayor a 0.');
                }

                const plato = await db.oneOrNone(
                    "SELECT * FROM platos WHERE id_plato = $1 AND estado = 'Activo'",
                    [detalle.id_plato]
                );
                if (!plato) {
                    throw new Error(`Plato con id ${detalle.id_plato} no encontrado o no está activo.`);
                }
                if (plato.stock < detalle.cantidad) {
                    throw new Error(`Stock insuficiente para "${plato.nombre}". Disponible: ${plato.stock}`);
                }
            }
            let idUsuario = context.user?.id_usuario;
            if (!idUsuario && id_cliente) {
                const cliente = await db.oneOrNone('SELECT nombre FROM clientes WHERE id_cliente = $1', [id_cliente]);
                if (cliente) {
                    const usuario = await db.oneOrNone('SELECT id_usuario FROM usuarios WHERE nombre = $1 LIMIT 1', [cliente.nombre]);
                    if (usuario) idUsuario = usuario.id_usuario;
                }
            }
            if (!idUsuario) idUsuario = 1; // Default fallback to system/admin for web orders

            // Crear la orden
            const orden = await db.one(
                "INSERT INTO ordenes (id_mesa, id_cliente, id_usuario, estado) VALUES ($1, $2, $3, 'Pendiente') RETURNING *",
                [id_mesa || null, id_cliente || null, idUsuario]
            );

            // Insertar detalles y restar stock
            for (const detalle of detalles) {
                const plato = await db.one('SELECT precio FROM platos WHERE id_plato = $1', [detalle.id_plato]);

                await db.none(
                    'INSERT INTO detalle_ordenes (id_orden, id_plato, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)',
                    [orden.id_orden, detalle.id_plato, detalle.cantidad, plato.precio]
                );

                // Restar stock
                await db.none(
                    'UPDATE platos SET stock = stock - $2 WHERE id_plato = $1',
                    [detalle.id_plato, detalle.cantidad]
                );

                // Si stock llega a 0, cambiar estado a Agotado
                await db.none(
                    "UPDATE platos SET estado = 'Agotado' WHERE id_plato = $1 AND stock <= 0",
                    [detalle.id_plato]
                );
            }

            // Refrescar la orden con el total calculado por el trigger
            return await db.one('SELECT * FROM ordenes WHERE id_orden = $1', [orden.id_orden]);
        },

        // HU-09: Actualizar estado de la orden
        async actualizarEstadoOrden(_, { id_orden, estado }, context) {
            if (!context.user || ![1, 2].includes(context.user.id_rol)) {
                throw new Error('No autorizado. Solo Admin u Operativo pueden actualizar órdenes.');
            }

            const estadosValidos = ['Pendiente', 'En Preparacion', 'Servida', 'Pagada', 'Cancelada'];
            if (!estadosValidos.includes(estado)) {
                throw new Error(`Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`);
            }

            const orden = await db.oneOrNone('SELECT * FROM ordenes WHERE id_orden = $1', [id_orden]);
            if (!orden) {
                throw new Error('Orden no encontrada.');
            }

            // Si la orden pasa a Pagada, liberar la mesa
            if (estado === 'Pagada' && orden.id_mesa) {
                await db.none(
                    "UPDATE mesas SET estado = 'Disponible' WHERE id_mesa = $1",
                    [orden.id_mesa]
                );
            }

            return await db.one(
                'UPDATE ordenes SET estado = $2 WHERE id_orden = $1 RETURNING *',
                [id_orden, estado]
            );
        },

        // Cancelar orden — restaurar stock
        async cancelarOrden(_, { id_orden }, context) {
            if (!context.user || ![1, 2].includes(context.user.id_rol)) {
                throw new Error('No autorizado. Solo Admin u Operativo pueden cancelar órdenes.');
            }

            const orden = await db.oneOrNone('SELECT * FROM ordenes WHERE id_orden = $1', [id_orden]);
            if (!orden) {
                throw new Error('Orden no encontrada.');
            }

            if (orden.estado === 'Pagada') {
                throw new Error('No se puede cancelar una orden ya pagada.');
            }

            // Restaurar stock de cada plato
            const detalles = await db.any(
                'SELECT id_plato, cantidad FROM detalle_ordenes WHERE id_orden = $1', [id_orden]
            );
            for (const det of detalles) {
                await db.none(
                    "UPDATE platos SET stock = stock + $2, estado = 'Activo' WHERE id_plato = $1",
                    [det.id_plato, det.cantidad]
                );
            }

            // Liberar mesa si aplica
            if (orden.id_mesa) {
                await db.none(
                    "UPDATE mesas SET estado = 'Disponible' WHERE id_mesa = $1",
                    [orden.id_mesa]
                );
            }

            return await db.one(
                "UPDATE ordenes SET estado = 'Cancelada' WHERE id_orden = $1 RETURNING *",
                [id_orden]
            );
        }
    }
};

export default ordenResolver;
