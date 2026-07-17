import { db } from '../config/db-connection.js';

const rolResolver = {
    Query: {
        async roles() {
            return await db.any('SELECT * FROM roles ORDER BY id_rol');
        },
        async rol(_, { id_rol }) {
            return await db.oneOrNone('SELECT * FROM roles WHERE id_rol = $1', [id_rol]);
        },
        async funciones() {
            return await db.any('SELECT * FROM funciones ORDER BY id_funcion');
        },
        async rolesFunciones(_, { id_rol }) {
            return await db.any(`
                SELECT f.* FROM funciones f
                INNER JOIN rolesfunciones rf ON f.id_funcion = rf.id_funcion
                WHERE rf.id_rol = $1
                ORDER BY f.id_funcion
            `, [id_rol]);
        }
    },

    Rol: {
        async funciones(parent) {
            return await db.any(`
                SELECT f.* FROM funciones f
                INNER JOIN rolesfunciones rf ON f.id_funcion = rf.id_funcion
                WHERE rf.id_rol = $1
            `, [parent.id_rol]);
        }
    },

    Mutation: {
        async createRol(_, { nombre }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede crear roles.');
            }
            return await db.one(
                'INSERT INTO roles (nombre) VALUES ($1) RETURNING *',
                [nombre]
            );
        },
        async assignFuncion(_, { id_rol, id_funcion }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede asignar funciones.');
            }
            try {
                await db.none(
                    'INSERT INTO rolesfunciones (id_rol, id_funcion) VALUES ($1, $2)',
                    [id_rol, id_funcion]
                );
                return true;
            } catch (error) {
                console.error('Error asignando función:', error);
                return false;
            }
        }
    }
};

export default rolResolver;
