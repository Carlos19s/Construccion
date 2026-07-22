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
            if (!context.user) throw new Error('No autenticado');
            
            // Verificamos si el usuario actual tiene el permiso 'permitir_asignar_funciones' a través de SU rol
            const hasPermission = await db.oneOrNone(`
                SELECT 1 FROM rolesfunciones rf
                JOIN funciones f ON rf.id_funcion = f.id_funcion
                WHERE rf.id_rol = $1 AND f.nombre = 'permitir_asignar_funciones'
            `, [context.user.id_rol]);
            
            if (!hasPermission && context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo alguien con permitir_asignar_funciones puede hacer esto.');
            }
            try {
                await db.none(
                    'INSERT INTO rolesfunciones (id_rol, id_funcion) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [id_rol, id_funcion]
                );
                return true;
            } catch (error) {
                console.error('Error asignando función:', error);
                return false;
            }
        },
        async removeFuncion(_, { id_rol, id_funcion }, context) {
            if (!context.user) throw new Error('No autenticado');
            
            // Verificamos permiso
            const hasPermission = await db.oneOrNone(`
                SELECT 1 FROM rolesfunciones rf
                JOIN funciones f ON rf.id_funcion = f.id_funcion
                WHERE rf.id_rol = $1 AND f.nombre = 'permitir_asignar_funciones'
            `, [context.user.id_rol]);
            
            if (!hasPermission && context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo alguien con permitir_asignar_funciones puede hacer esto.');
            }
            try {
                await db.none(
                    'DELETE FROM rolesfunciones WHERE id_rol = $1 AND id_funcion = $2',
                    [id_rol, id_funcion]
                );
                return true;
            } catch (error) {
                console.error('Error quitando función:', error);
                return false;
            }
        }
    }
};

export default rolResolver;
