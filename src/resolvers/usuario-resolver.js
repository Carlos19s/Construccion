import bcrypt from 'bcryptjs';
import { db } from '../config/db-connection.js';

const usuarioResolver = {
    Query: {
        async usuarios(_, __, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede listar usuarios.');
            }
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
        }
    },

    Mutation: {
        async createUsuario(_, { input }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede crear usuarios.');
            }
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
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede actualizar usuarios.');
            }
            const { id_usuario, nombre, email, id_rol } = input;
            return await db.one(
                'UPDATE usuarios SET nombre=$2, email=$3, id_rol=$4 WHERE id_usuario=$1 RETURNING id_usuario, nombre, email, id_rol',
                [id_usuario, nombre, email, id_rol]
            );
        },

        async deleteUsuario(_, { id_usuario }, context) {
            if (!context.user || context.user.id_rol !== 1) {
                throw new Error('No autorizado. Solo Admin puede eliminar usuarios.');
            }
            const result = await db.result('DELETE FROM usuarios WHERE id_usuario = $1', [id_usuario]);
            return result.rowCount > 0;
        }
    }
};

export default usuarioResolver;
