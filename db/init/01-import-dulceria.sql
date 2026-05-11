-- ==========================================
-- Script de inicializacion - Sucursal Dulceria
-- ==========================================

-- Crea el esquema si no existe.
CREATE SCHEMA IF NOT EXISTS tiendadb;

-- Borra las tablas en orden inverso a su creacion para evitar problemas con las claves foraneas.
DROP TABLE IF EXISTS tiendadb.apartado_pago;
DROP TABLE IF EXISTS tiendadb.apartado;
DROP TABLE IF EXISTS tiendadb.ventas_detalle;
DROP TABLE IF EXISTS tiendadb.ventas;
DROP TABLE IF EXISTS tiendadb.productos CASCADE;
DROP TABLE IF EXISTS tiendadb.categorias CASCADE;
DROP TABLE IF EXISTS tiendadb.caja;
DROP TABLE IF EXISTS tiendadb.boveda;
DROP TABLE IF EXISTS tiendadb.ganancias_acumuladas;
DROP TABLE IF EXISTS tiendadb.promocion_detalles;
DROP TABLE IF EXISTS tiendadb.promociones;
DROP TABLE IF EXISTS tiendadb.usuarios;
DROP TABLE IF EXISTS tiendadb.tipos_usuario;

-- Borrar la funcion del trigger si ya existe
DROP FUNCTION IF EXISTS tiendadb.fn_limpiar_codigo_barras();

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
    usuario VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_tipo_usuario INTEGER NOT NULL,
    avatar TEXT,
    sueldo_hora DECIMAL(10, 2) DEFAULT 0.00,
    dias_semana INT DEFAULT 6,
    horas_trabajadas INT DEFAULT 8,

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
    tipo_movimiento VARCHAR(50) NOT NULL,
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

-- Tabla especifica para la Boveda (Tesoreria Real)
CREATE TABLE tiendadb.boveda (
    id_boveda SERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_ajuste DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tipo_movimiento VARCHAR(50) NOT NULL,
    descripcion TEXT,
    id_usuario INT NOT NULL,

    CONSTRAINT fk_usuario_boveda
        FOREIGN KEY(id_usuario) 
        REFERENCES tiendadb.usuarios(id_usuario)
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- Tabla para acumulacion de ganancias
CREATE TABLE tiendadb.ganancias_acumuladas (
    id_ganancia BIGSERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT NOW(),
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_ajuste DECIMAL(12, 2) NOT NULL,
    tipo_movimiento VARCHAR(50) NOT NULL,
    descripcion TEXT,
    id_usuario BIGINT NOT NULL REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE INDEX idx_ganancias_fecha ON tiendadb.ganancias_acumuladas(fecha_movimiento DESC);

-- 3. Tabla de Categorias
CREATE TABLE tiendadb.categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    descripcion TEXT,
    estatus VARCHAR(1) DEFAULT 'A'
);

-- Insertar categoria por defecto
INSERT INTO tiendadb.categorias (nombre, descripcion, estatus) VALUES 
('Sin asignar', 'Categoria por defecto', 'A');

-- 4. Tabla de Productos
CREATE TABLE tiendadb.productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo_barras VARCHAR(255),
    id_categoria INT NOT NULL DEFAULT 1,
    precio_costo DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    cantidad_min INT NOT NULL,
    cantidad_max INT NOT NULL,
    stock INT NOT NULL,
    precio_mayoreo DECIMAL(10, 2),
    is_gramaje BOOLEAN DEFAULT FALSE,
    estatus VARCHAR(1) DEFAULT 'A',

    CONSTRAINT fk_categoria_producto
        FOREIGN KEY(id_categoria) 
        REFERENCES tiendadb.categorias(id_categoria)
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- FUNCION Y TRIGGER PARA PRODUCTOS
CREATE OR REPLACE FUNCTION tiendadb.fn_limpiar_codigo_barras()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_barras = '' THEN
        NEW.codigo_barras := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_productos_limpiar_codigo
BEFORE INSERT OR UPDATE ON tiendadb.productos
FOR EACH ROW
EXECUTE FUNCTION tiendadb.fn_limpiar_codigo_barras();

-- 5. Tabla Maestra de Ventas
CREATE TABLE tiendadb.ventas (
    id_venta SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(12, 2) NOT NULL,
    estatus VARCHAR(1) DEFAULT 'P',
    numero_ticket INT NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(50) DEFAULT 'EFECTIVO',
    descripcion_pendiente TEXT,

    CONSTRAINT fk_usuario_venta
        FOREIGN KEY(id_usuario) 
        REFERENCES tiendadb.usuarios(id_usuario)
);

-- 6. Tabla de Detalles de Venta
CREATE TABLE tiendadb.ventas_detalle (
    id_venta_detalle SERIAL PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario_venta DECIMAL(10, 2) NOT NULL,
    tipo_precio_aplicado VARCHAR(50) DEFAULT 'VENTA',

    CONSTRAINT fk_venta_detalle
        FOREIGN KEY(id_venta)
        REFERENCES tiendadb.ventas(id_venta)
        ON DELETE CASCADE,

    CONSTRAINT fk_producto_detalle
        FOREIGN KEY(id_producto)
        REFERENCES tiendadb.productos(id_producto)
);

-- 7. Tabla de Promociones (Combos)
CREATE TABLE tiendadb.promociones (
    id_promocion BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_original DECIMAL(10,2) NOT NULL,
    precio_promocion DECIMAL(10,2) NOT NULL,
    imagen_url VARCHAR(500),
    activa BOOLEAN DEFAULT TRUE,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabla de Detalles de Promocion
CREATE TABLE tiendadb.promocion_detalles (
    id_detalle BIGSERIAL PRIMARY KEY,
    id_promocion BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_promocion FOREIGN KEY (id_promocion) REFERENCES tiendadb.promociones(id_promocion) ON DELETE CASCADE,
    CONSTRAINT fk_producto FOREIGN KEY (id_producto) REFERENCES tiendadb.productos(id_producto) ON DELETE CASCADE
);

-- Indices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_promociones_activa ON tiendadb.promociones(activa);
CREATE INDEX IF NOT EXISTS idx_promociones_fechas ON tiendadb.promociones(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_promocion_detalles_promocion ON tiendadb.promocion_detalles(id_promocion);

-- 9. Tabla de Apartados
CREATE TABLE tiendadb.apartado (
    id_apartado SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(255) NOT NULL,
    monto_total DECIMAL(12,2) NOT NULL,
    monto_pagado DECIMAL(12,2) NOT NULL DEFAULT 0,
    frecuencia_pago VARCHAR(20) NOT NULL,
    monto_por_periodo DECIMAL(12,2) NOT NULL,
    monto_diario DECIMAL(12,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estatus VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    id_usuario INTEGER NOT NULL REFERENCES tiendadb.usuarios(id_usuario),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_apartado_usuario ON tiendadb.apartado(id_usuario);
CREATE INDEX idx_apartado_estatus ON tiendadb.apartado(estatus);

-- 10. Tabla de Pagos de Apartado
CREATE TABLE tiendadb.apartado_pago (
    id_pago SERIAL PRIMARY KEY,
    id_apartado INTEGER NOT NULL REFERENCES tiendadb.apartado(id_apartado),
    monto DECIMAL(12,2) NOT NULL,
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE INDEX idx_apartado_pago_apartado ON tiendadb.apartado_pago(id_apartado);
CREATE INDEX idx_apartado_pago_usuario ON tiendadb.apartado_pago(id_usuario);

-- Funciones de limpieza programada
CREATE OR REPLACE FUNCTION tiendadb.cleanup_caja_movimientos_cero()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tiendadb.caja
    WHERE monto = 0
      AND fecha_movimiento < NOW() - INTERVAL '3 hours';
END;
$$;

CREATE OR REPLACE FUNCTION tiendadb.cleanup_ventas_invalidas()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tiendadb.ventas
    WHERE (estatus = 'I' OR monto_total = 0)
      AND fecha_venta < NOW() - INTERVAL '3 hours';
END;
$$;

-- Inserciones iniciales
INSERT INTO tiendadb.tipos_usuario (nombre, descripcion) VALUES 
('Administrador', 'Usuario con todos los privilegios'),
('Cajero', 'Usuario encargado de las ventas y manejo de caja');
