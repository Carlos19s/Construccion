import { db } from '../config/db-connection.js';

const platoResolver = {
    Query: {
        // HU-05: Listar todos los platos (admin)
        async platos() {
            return await db.any('SELECT * FROM platos ORDER BY id_plato');
        },
        async plato(_, { id_plato }) {
            return await db.oneOrNone('SELECT * FROM platos WHERE id_plato = $1', [id_plato]);
        },
        // HU-06: Catálogo de platos activos (cliente)
        async platosActivos() {
            return await db.any("SELECT * FROM platos WHERE estado = 'Activo' AND stock > 0 ORDER BY nombre");
        }
    },

    Mutation: {
        // HU-05: Crear plato
        async createPlato(_, { input }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede gestionar platos.');
            }
            const { nombre, descripcion, precio, stock, imagen_url } = input;

            if (precio <= 0) {
                throw new Error('El precio debe ser mayor a 0.');
            }

            return await db.one(
                "INSERT INTO platos (nombre, descripcion, precio, stock, estado, imagen_url) VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING *",
                [nombre, descripcion || null, precio, stock, imagen_url || null]
            );
        },

        // HU-05: Actualizar plato
        async updatePlato(_, { input }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede gestionar platos.');
            }
            const { id_plato, nombre, descripcion, precio, stock, estado, imagen_url } = input;

            const plato = await db.oneOrNone('SELECT * FROM platos WHERE id_plato = $1', [id_plato]);
            if (!plato) {
                throw new Error('Plato no encontrado.');
            }

            if (precio !== undefined && precio !== null && precio <= 0) {
                throw new Error('El precio debe ser mayor a 0.');
            }

            return await db.one(
                `UPDATE platos SET 
                    nombre = COALESCE($2, nombre), 
                    descripcion = COALESCE($3, descripcion), 
                    precio = COALESCE($4, precio), 
                    stock = COALESCE($5, stock),
                    estado = COALESCE($6, estado),
                    imagen_url = COALESCE($7, imagen_url)
                WHERE id_plato = $1 RETURNING *`,
                [id_plato, nombre || null, descripcion, precio || null, stock !== undefined ? stock : null, estado || null, imagen_url !== undefined ? imagen_url : null]
            );
        },

        // HU-05: Eliminar plato
        async deletePlato(_, { id_plato }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede gestionar platos.');
            }
            const result = await db.result('DELETE FROM platos WHERE id_plato = $1', [id_plato]);
            return result.rowCount > 0;
        }
    }
};

export default platoResolver;
