import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db-connection.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pizzeria_secret_key_2026';

const authResolver = {
    Mutation: {
        // HU-01: Registro de Usuarios
        async register(_, { input }) {
            try {
                const { nombre, email, password, telefono, identificacion } = input;

                // Verificar si el email ya existe
                const existingUser = await db.oneOrNone(
                    'SELECT id_usuario FROM usuarios WHERE email = $1', [email]
                );
                if (existingUser) {
                    throw new Error('El email ya está registrado.');
                }

                // Verificar si la identificación ya existe
                const existingCliente = await db.oneOrNone(
                    'SELECT id_cliente FROM clientes WHERE identificacion = $1', [identificacion]
                );
                if (existingCliente) {
                    throw new Error('La identificación ya está registrada.');
                }

                // Encriptar contraseña
                const salt = await bcrypt.genSalt(10);
                const password_hash = await bcrypt.hash(password, salt);

                // Obtener rol "Cliente" (id=3 por defecto)
                let rolCliente = await db.oneOrNone(
                    "SELECT id_rol FROM roles WHERE nombre = 'Cliente'"
                );
                if (!rolCliente) {
                    rolCliente = await db.one(
                        "INSERT INTO roles (nombre) VALUES ('Cliente') RETURNING id_rol"
                    );
                }

                // Crear cliente
                const cliente = await db.one(
                    'INSERT INTO clientes (nombre, telefono, identificacion) VALUES ($1, $2, $3) RETURNING *',
                    [nombre, telefono || null, identificacion]
                );

                // Crear usuario
                const usuario = await db.one(
                    'INSERT INTO usuarios (nombre, email, password_hash, id_rol) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nombre, email, id_rol',
                    [nombre, email, password_hash, rolCliente.id_rol]
                );

                // Generar JWT
                const token = jwt.sign(
                    { id_usuario: usuario.id_usuario, id_rol: usuario.id_rol, nombre: usuario.nombre },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                return { token, usuario };
            } catch (error) {
                console.error('Error en register:', error);
                throw error;
            }
        },

        // HU-02: Login
        async login(_, { input }) {
            try {
                const { email, password } = input;

                // Buscar usuario
                const usuario = await db.oneOrNone(
                    'SELECT id_usuario, nombre, email, password_hash, id_rol FROM usuarios WHERE email = $1',
                    [email]
                );
                if (!usuario) {
                    throw new Error('Credenciales inválidas');
                }

                // Verificar contraseña
                const validPassword = await bcrypt.compare(password, usuario.password_hash);
                if (!validPassword) {
                    throw new Error('Credenciales inválidas');
                }

                // Generar JWT
                const token = jwt.sign(
                    { id_usuario: usuario.id_usuario, id_rol: usuario.id_rol, nombre: usuario.nombre },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                return {
                    token,
                    usuario: {
                        id_usuario: usuario.id_usuario,
                        nombre: usuario.nombre,
                        email: usuario.email,
                        id_rol: usuario.id_rol
                    }
                };
            } catch (error) {
                console.error('Error en login:', error);
                throw error;
            }
        }
    },

    Query: {
        // Obtener usuario actual desde el token
        async me(_, __, context) {
            if (!context.user) {
                throw new Error('No autenticado');
            }
            return await db.oneOrNone(
                'SELECT id_usuario, nombre, email, id_rol FROM usuarios WHERE id_usuario = $1',
                [context.user.id_usuario]
            );
        }
    }
};

export default authResolver;
