-- Este archivo permite escribir comandos SQL que se ejecutarán en los modos de desarrollo y prueba.
-- Se borran y recrean las tablas para asegurar un estado limpio en cada reinicio.

-- Crea el esquema si no existe.
CREATE SCHEMA IF NOT EXISTS tiendaDB;

-- Borra las tablas en orden inverso a su creación para evitar problemas con las claves foráneas.
-- CASCADE se encarga de eliminar automáticamente las restricciones dependientes.
DROP TABLE IF EXISTS tiendaDB.ventas_detalle;
DROP TABLE IF EXISTS tiendaDB.ventas;
DROP TABLE IF EXISTS tiendaDB.productos;
DROP TABLE IF EXISTS tiendaDB.usuarios;
DROP TABLE IF EXISTS tiendaDB.tipos_usuario;
DROP TABLE IF EXISTS tiendaDB.caja;

-- 1. Tabla de Tipos de Usuario (Roles)
CREATE TABLE tiendadb.tipos_usuario (
    id_tipo_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

-- 2. Tabla de Usuarios
CREATE TABLE tiendadb.usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    apellido_p VARCHAR(255) NOT NULL,
    apellido_m VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Columna para el HASH de la contraseña
    id_tipo_usuario INTEGER NOT NULL,

    CONSTRAINT fk_tipo_usuario
        FOREIGN KEY(id_tipo_usuario) 
        REFERENCES tiendadb.tipos_usuario(id_tipo_usuario)
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- Tabla para manejar el dinero en caja
CREATE TABLE tiendadb.caja (
    id_caja SERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_movimiento VARCHAR(50) NOT NULL, -- 'apertura', 'cierre', 'ingreso', 'egreso'
    monto DECIMAL(12, 2) NOT NULL,
    descripcion TEXT,
    saldo_resultante DECIMAL(12, 2) NOT NULL,
    id_usuario INT NOT NULL,
    estatus VARCHAR(1) DEFAULT 'P',

    CONSTRAINT fk_usuario_caja
        FOREIGN KEY(id_usuario) 
        REFERENCES tiendadb.usuarios(id_usuario)
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- 3. Tabla de Productos
CREATE TABLE tiendadb.productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    precio_costo DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    cantidad_min INT NOT NULL,
    cantidad_max INT NOT NULL,
    stock INT NOT NULL,
    precio_mayoreo DECIMAL(10, 2),
    is_gramaje BOOLEAN DEFAULT FALSE
);

-- 4. Tabla Maestra de Ventas (una fila por cada transacción/carrito)
CREATE TABLE tiendadb.ventas (
    id_venta SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(12, 2) NOT NULL,
    estatus VARCHAR(1) DEFAULT 'P',
    numero_ticket INT NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(50) DEFAULT 'EFECTIVO',

    CONSTRAINT fk_usuario_venta
        FOREIGN KEY(id_usuario) 
        REFERENCES tiendadb.usuarios(id_usuario)
);

-- 5. Tabla de Detalles de Venta (una fila por cada producto en el carrito)
CREATE TABLE tiendadb.ventas_detalle (
    id_venta_detalle SERIAL PRIMARY KEY,
    id_venta INT NOT NULL, -- Vincula este detalle con la venta maestra.
    id_producto INT NOT NULL, -- El producto que se vendió.
    cantidad INT NOT NULL,
    precio_unitario_venta DECIMAL(10, 2) NOT NULL, -- Precio al momento de la venta.
    tipo_precio_aplicado VARCHAR(50) DEFAULT 'VENTA',

    CONSTRAINT fk_venta_detalle
        FOREIGN KEY(id_venta)
        REFERENCES tiendadb.ventas(id_venta)
        ON DELETE CASCADE, -- Si se borra la venta, se borran sus detalles.

    CONSTRAINT fk_producto_detalle
        FOREIGN KEY(id_producto)
        REFERENCES tiendadb.productos(id_producto)
);
-- Reiniciar las secuencias para futuras inserciones automáticas
Insert into tiendaDB.tipos_usuario (nombre, descripcion) values 
('Administrador', 'Usuario con todos los privilegios'),
('Cajero', 'Usuario encargado de las ventas y manejo de caja');