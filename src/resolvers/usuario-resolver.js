import bcrypt from 'bcryptjs';
import { db } from '../config/db-connection.js';

const checkAdminOrPermission = async (context) => {
    if (!context.user) throw new Error('No autorizado.');
    if (context.user.id_rol === 1) return true; // Admin always allowed

    const hasPerm = await db.oneOrNone(`
        SELECT 1 FROM rolesfunciones rf
        JOIN funciones f ON rf.id_funcion = f.id_funcion
        WHERE rf.id_rol = $1 AND f.nombre = 'permitir_asignar_funciones'
    `, [context.user.id_rol]);

    if (!hasPerm) throw new Error('No autorizado. Se requiere permiso especial.');
    return true;
};

const usuarioResolver = {
    Query: {
        async usuarios(_, __, context) {
            await checkAdminOrPermission(context);
            return await db.any('SELECT id_usuario, nombre, email, id_rol FROM usuarios ORDER BY id_usuario');
        },
        async usuario(_, { id_usuario }) {
            return await db.oneOrNone(
                'SELECT id_usuario, nombre, email, id_rol FROM usuarios WHERE id_usuario = $1',
                [id_usuario]
            );
        }
    },

    Usuario: {
        async rol(parent) {
            return await db.oneOrNone(
                'SELECT * FROM roles WHERE id_rol = $1',
                [parent.id_rol]
            );
        },
        async identificacion(parent) {
            const cliente = await db.oneOrNone('SELECT identificacion FROM clientes WHERE nombre = $1 LIMIT 1', [parent.nombre]);
            return cliente ? cliente.identificacion : null;
        },
        async telefono(parent) {
            const cliente = await db.oneOrNone('SELECT telefono FROM clientes WHERE nombre = $1 LIMIT 1', [parent.nombre]);
            return cliente ? cliente.telefono : null;
        },
        async funciones(parent) {
            return await db.any(`
                SELECT f.* FROM funciones f
                INNER JOIN rolesfunciones rf ON f.id_funcion = rf.id_funcion
                WHERE rf.id_rol = $1
            `, [parent.id_rol]);
        }
    },

    Mutation: {
        async createUsuario(_, { input }, context) {
            await checkAdminOrPermission(context);
            const { nombre, email, password, id_rol } = input;

            const existing = await db.oneOrNone('SELECT id_usuario FROM usuarios WHERE email = $1', [email]);
            if (existing) {
                throw new Error('El email ya está registrado.');
            }

            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            return await db.one(
                'INSERT INTO usuarios (nombre, email, password_hash, id_rol) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nombre, email, id_rol',
                [nombre, email, password_hash, id_rol]
            );
        },

        async updateUsuario(_, { input }, context) {
            await checkAdminOrPermission(context);
            const { id_usuario, nombre, email, id_rol } = input;
            return await db.one(
                'UPDATE usuarios SET nombre=$2, email=$3, id_rol=$4 WHERE id_usuario=$1 RETURNING id_usuario, nombre, email, id_rol',
                [id_usuario, nombre, email, id_rol]
            );
        },

        async deleteUsuario(_, { id_usuario }, context) {
            await checkAdminOrPermission(context);
            const result = await db.result('DELETE FROM usuarios WHERE id_usuario = $1', [id_usuario]);
            return result.rowCount > 0;
        }
    }
};

export default usuarioResolver;
