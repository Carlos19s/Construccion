-- Eliminar tablas si existen (útil para reiniciar)
DROP TABLE IF EXISTS Detalle_Ordenes CASCADE;
DROP TABLE IF EXISTS Ordenes CASCADE;
DROP TABLE IF EXISTS Reservas CASCADE;
DROP TABLE IF EXISTS Platos CASCADE;
DROP TABLE IF EXISTS Mesas CASCADE;
DROP TABLE IF EXISTS Clientes CASCADE;
DROP TABLE IF EXISTS Usuarios CASCADE;
DROP TABLE IF EXISTS RolesFunciones CASCADE;
DROP TABLE IF EXISTS Funciones CASCADE;
DROP TABLE IF EXISTS Roles CASCADE;

-- Crear esquema
CREATE TABLE Roles (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);
COMMENT ON COLUMN Roles.nombre IS 'Admin, Operativo, etc.';

CREATE TABLE Funciones (
    id_funcion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE RolesFunciones (
    id_rol_funcion SERIAL PRIMARY KEY,
    id_rol INT NOT NULL,
    id_funcion INT NOT NULL,
    CONSTRAINT fk_roles_funciones_rol FOREIGN KEY (id_rol) REFERENCES Roles(id_rol) ON DELETE CASCADE,
    CONSTRAINT fk_roles_funciones_funcion FOREIGN KEY (id_funcion) REFERENCES Funciones(id_funcion) ON DELETE CASCADE,
    CONSTRAINT uq_rol_funcion UNIQUE (id_rol, id_funcion)
);

CREATE TABLE Usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES Roles(id_rol) ON DELETE RESTRICT
);

CREATE TABLE Clientes (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    identificacion VARCHAR(20) UNIQUE
);

CREATE TABLE Mesas (
    id_mesa SERIAL PRIMARY KEY,
    numero_mesa INT NOT NULL UNIQUE,
    capacidad INT NOT NULL,
    estado VARCHAR(20) DEFAULT 'Disponible' CHECK (estado IN ('Disponible', 'Ocupada', 'Mantenimiento'))
);

CREATE TABLE Platos (
    id_plato SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL CHECK (precio > 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Agotado'))
);

CREATE TABLE Reservas (
    id_reserva SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_mesa INT NOT NULL,
    fecha_reserva DATE NOT NULL,
    hora_reserva TIME NOT NULL,
    estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Confirmada', 'Cancelada')),
    CONSTRAINT fk_reservas_cliente FOREIGN KEY (id_cliente) REFERENCES Clientes(id_cliente) ON DELETE CASCADE,
    CONSTRAINT fk_reservas_mesa FOREIGN KEY (id_mesa) REFERENCES Mesas(id_mesa) ON DELETE CASCADE
);

CREATE TABLE Ordenes (
    id_orden SERIAL PRIMARY KEY,
    id_mesa INT,
    id_cliente INT,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10, 2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En Preparacion', 'Servida', 'Pagada', 'Cancelada')),
    id_usuario INT,
    CONSTRAINT fk_ordenes_mesa FOREIGN KEY (id_mesa) REFERENCES Mesas(id_mesa) ON DELETE SET NULL,
    CONSTRAINT fk_ordenes_cliente FOREIGN KEY (id_cliente) REFERENCES Clientes(id_cliente) ON DELETE SET NULL,
    CONSTRAINT fk_ordenes_usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE Detalle_Ordenes (
    id_detalle SERIAL PRIMARY KEY,
    id_orden INT NOT NULL,
    id_plato INT NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    CONSTRAINT fk_detalle_orden FOREIGN KEY (id_orden) REFERENCES Ordenes(id_orden) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_plato FOREIGN KEY (id_plato) REFERENCES Platos(id_plato) ON DELETE RESTRICT
);

-- Insertar roles básicos
INSERT INTO Roles (nombre) VALUES ('Admin'), ('Operativo');

-- Insertar usuario admin por defecto (Password: admin123)
INSERT INTO Usuarios (nombre, email, password_hash, id_rol) 
VALUES ('Administrador', 'carlos.admin@restaurante.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- Insertar usuario admin por defecto (Password: admin123) - Para el login de prueba actual
INSERT INTO Usuarios (nombre, email, password_hash, id_rol) 
VALUES ('Carlos', 'admin@restaurante.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1);

-- Algunos platos de prueba
INSERT INTO Platos (nombre, descripcion, precio, stock, estado) VALUES
('Lomo Saltado', 'Trozos de lomo fino salteados con cebolla y tomate', 15.50, 20, 'Activo'),
('Ceviche Mixto', 'Pescado y mariscos frescos curtidos en limón', 12.00, 15, 'Activo'),
('Aji de Gallina', 'Pollo desmenuzado en crema de ají amarillo', 10.50, 10, 'Activo'),
('Chicha Morada', 'Bebida tradicional de maíz morado', 2.50, 50, 'Activo');

-- Algunas mesas de prueba
INSERT INTO Mesas (numero_mesa, capacidad, estado) VALUES
(1, 4, 'Disponible'), (2, 4, 'Disponible'), (3, 2, 'Disponible'), (4, 6, 'Disponible');
