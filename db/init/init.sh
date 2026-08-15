#!/bin/bash
set -e

# ================================================================
# Script de inicializacion unificado - Sucursal Dulceria y Abarrotera
# Idempotente: se puede ejecutar multiples veces sin errores.
# ================================================================

echo "=== [1/3] Inicializando esquema tiendadb en base dulcesnc ==="

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'

-- ========================================
-- ESQUEMA
-- ========================================
CREATE SCHEMA IF NOT EXISTS tiendadb;

-- ========================================
-- TABLAS
-- ========================================

CREATE TABLE IF NOT EXISTS tiendadb.tipos_usuario (
    id_tipo_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS tiendadb.usuarios (
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
    CONSTRAINT fk_tipo_usuario FOREIGN KEY (id_tipo_usuario)
        REFERENCES tiendadb.tipos_usuario(id_tipo_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tiendadb.caja (
    id_caja SERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_movimiento VARCHAR(50) NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    descripcion TEXT,
    saldo_resultante DECIMAL(12, 2) NOT NULL,
    id_usuario INT NOT NULL,
    estatus VARCHAR(1) DEFAULT 'P',
    CONSTRAINT fk_usuario_caja FOREIGN KEY (id_usuario)
        REFERENCES tiendadb.usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tiendadb.boveda (
    id_boveda SERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_ajuste DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tipo_movimiento VARCHAR(50) NOT NULL,
    descripcion TEXT,
    id_usuario INT NOT NULL,
    CONSTRAINT fk_usuario_boveda FOREIGN KEY (id_usuario)
        REFERENCES tiendadb.usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tiendadb.ganancias_acumuladas (
    id_ganancia BIGSERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT NOW(),
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_ajuste DECIMAL(12, 2) NOT NULL,
    tipo_movimiento VARCHAR(50) NOT NULL,
    descripcion TEXT,
    id_usuario BIGINT NOT NULL,
    CONSTRAINT fk_usuario_ganancias FOREIGN KEY (id_usuario)
        REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb.categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    descripcion TEXT,
    estatus VARCHAR(1) DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS tiendadb.subcategorias (
    id_subcategoria SERIAL PRIMARY KEY,
    nombre VARCHAR(255),
    descripcion TEXT,
    id_categoria INT,
    estatus VARCHAR(1) DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS tiendadb.productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo_barras VARCHAR(255),
    id_categoria INT NOT NULL DEFAULT 1,
    id_subcategoria INT,
    precio_costo DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    cantidad_min INT NOT NULL,
    cantidad_max INT NOT NULL,
    stock INT NOT NULL,
    precio_mayoreo DECIMAL(10, 2),
    is_gramaje BOOLEAN DEFAULT FALSE,
    requiere_envase BOOLEAN DEFAULT FALSE,
    precio_envase DECIMAL(10, 2) DEFAULT 0,
    presentacion_caja VARCHAR(50) DEFAULT '',
    estatus VARCHAR(1) DEFAULT 'A',
    CONSTRAINT fk_categoria_producto FOREIGN KEY (id_categoria)
        REFERENCES tiendadb.categorias(id_categoria)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_productos_estatus ON tiendadb.productos(estatus);

CREATE TABLE IF NOT EXISTS tiendadb.ventas (
    id_venta SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(12, 2) NOT NULL,
    estatus VARCHAR(1) DEFAULT 'P',
    numero_ticket INT NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(50) DEFAULT 'EFECTIVO',
    descripcion_pendiente TEXT,
    CONSTRAINT fk_usuario_venta FOREIGN KEY (id_usuario)
        REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb.ventas_detalle (
    id_venta_detalle SERIAL PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario_venta DECIMAL(10, 2) NOT NULL,
    tipo_precio_aplicado VARCHAR(50) DEFAULT 'VENTA',
    cobro_envase DECIMAL(10, 2) DEFAULT 0,
    cantidad_envase INTEGER DEFAULT 0,
    CONSTRAINT fk_venta_detalle FOREIGN KEY (id_venta)
        REFERENCES tiendadb.ventas(id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_producto_detalle FOREIGN KEY (id_producto)
        REFERENCES tiendadb.productos(id_producto)
);

CREATE TABLE IF NOT EXISTS tiendadb.promociones (
    id_promocion BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_original DECIMAL(10, 2) NOT NULL,
    precio_promocion DECIMAL(10, 2) NOT NULL,
    imagen_url VARCHAR(500),
    activa BOOLEAN DEFAULT TRUE,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiendadb.promocion_detalles (
    id_detalle BIGSERIAL PRIMARY KEY,
    id_promocion BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_promocion FOREIGN KEY (id_promocion)
        REFERENCES tiendadb.promociones(id_promocion) ON DELETE CASCADE,
    CONSTRAINT fk_producto_promo FOREIGN KEY (id_producto)
        REFERENCES tiendadb.productos(id_producto) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tiendadb.apartado (
    id_apartado SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(255) NOT NULL,
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_pagado DECIMAL(12, 2) NOT NULL DEFAULT 0,
    frecuencia_pago VARCHAR(20) NOT NULL,
    monto_por_periodo DECIMAL(12, 2) NOT NULL,
    monto_diario DECIMAL(12, 2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estatus VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    id_usuario INTEGER NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apartado_usuario FOREIGN KEY (id_usuario)
        REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb.apartado_pago (
    id_pago SERIAL PRIMARY KEY,
    id_apartado INTEGER NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL,
    CONSTRAINT fk_pago_apartado FOREIGN KEY (id_apartado)
        REFERENCES tiendadb.apartado(id_apartado),
    CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario)
        REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb.proveedores (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion VARCHAR(500),
    notas TEXT,
    tipo_proveedor VARCHAR(20) DEFAULT 'DIRECTA',
    dias_entrega VARCHAR(100) DEFAULT '',
    dias_pedido VARCHAR(100) DEFAULT '',
    estatus VARCHAR(1) DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS tiendadb.pedidos_proveedor (
    id_pedido SERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_entrega_esperada DATE NOT NULL,
    monto_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monto_apartado DECIMAL(10, 2) NOT NULL DEFAULT 0,
    estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    notas TEXT,
    CONSTRAINT fk_pedido_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES tiendadb.proveedores(id_proveedor)
);

CREATE TABLE IF NOT EXISTS tiendadb.pedido_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido)
        REFERENCES tiendadb.pedidos_proveedor(id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto)
        REFERENCES tiendadb.productos(id_producto)
);

CREATE TABLE IF NOT EXISTS tiendadb.producto_proveedor (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    id_proveedor INT NOT NULL,
    precio_acordado DECIMAL(10, 2),
    CONSTRAINT fk_pp_producto FOREIGN KEY (id_producto)
        REFERENCES tiendadb.productos(id_producto) ON DELETE CASCADE,
    CONSTRAINT fk_pp_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES tiendadb.proveedores(id_proveedor) ON DELETE CASCADE,
    CONSTRAINT uq_producto_proveedor UNIQUE (id_producto, id_proveedor)
);

CREATE TABLE IF NOT EXISTS tiendadb.producto_presentacion_caja (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    piezas INT NOT NULL CHECK (piezas > 0),
    CONSTRAINT fk_ppc_producto FOREIGN KEY (id_producto)
        REFERENCES tiendadb.productos(id_producto) ON DELETE CASCADE,
    CONSTRAINT uq_producto_piezas UNIQUE (id_producto, piezas)
);

CREATE TABLE IF NOT EXISTS tiendadb.credito_persona (
    id_persona SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    direccion TEXT,
    correo VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiendadb.credito_venta (
    id_credito_venta SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL,
    id_venta INTEGER,
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_pagado DECIMAL(12, 2) NOT NULL DEFAULT 0,
    estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    CONSTRAINT fk_cv_persona FOREIGN KEY (id_persona)
        REFERENCES tiendadb.credito_persona(id_persona),
    CONSTRAINT fk_cv_venta FOREIGN KEY (id_venta)
        REFERENCES tiendadb.ventas(id_venta)
);

CREATE TABLE IF NOT EXISTS tiendadb.credito_abono (
    id_abono SERIAL PRIMARY KEY,
    id_credito_venta INTEGER NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    fecha_abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL,
    metodo_pago VARCHAR(20),
    CONSTRAINT fk_ca_credito FOREIGN KEY (id_credito_venta)
        REFERENCES tiendadb.credito_venta(id_credito_venta),
    CONSTRAINT fk_ca_usuario FOREIGN KEY (id_usuario)
        REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb.renta_local (
    id_renta SERIAL PRIMARY KEY,
    monto_mensual DECIMAL(10, 2) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP DEFAULT NOW()
);

INSERT INTO tiendadb.renta_local (id_renta, monto_mensual)
VALUES (1, 0)
ON CONFLICT (id_renta) DO NOTHING;

CREATE TABLE IF NOT EXISTS tiendadb.ajuste_precio (
    id_ajuste SERIAL PRIMARY KEY,
    dia_semana INT NOT NULL UNIQUE,
    monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO tiendadb.ajuste_precio (dia_semana, monto, activo)
SELECT d.dia, 0, FALSE
FROM (VALUES (1), (2), (3), (4), (5), (6), (7)) AS d(dia)
ON CONFLICT (dia_semana) DO NOTHING;

-- ========================================
-- INDICES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_ganancias_fecha ON tiendadb.ganancias_acumuladas(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_promociones_activa ON tiendadb.promociones(activa);
CREATE INDEX IF NOT EXISTS idx_promociones_fechas ON tiendadb.promociones(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_promocion_detalles_promocion ON tiendadb.promocion_detalles(id_promocion);
CREATE INDEX IF NOT EXISTS idx_apartado_usuario ON tiendadb.apartado(id_usuario);
CREATE INDEX IF NOT EXISTS idx_apartado_estatus ON tiendadb.apartado(estatus);
CREATE INDEX IF NOT EXISTS idx_apartado_pago_apartado ON tiendadb.apartado_pago(id_apartado);
CREATE INDEX IF NOT EXISTS idx_apartado_pago_usuario ON tiendadb.apartado_pago(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON tiendadb.ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_estatus ON tiendadb.ventas(estatus);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_venta ON tiendadb.ventas_detalle(id_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto ON tiendadb.ventas_detalle(id_producto);
CREATE INDEX IF NOT EXISTS idx_producto_proveedor_producto ON tiendadb.producto_proveedor(id_producto);
CREATE INDEX IF NOT EXISTS idx_presentacion_caja_producto ON tiendadb.producto_presentacion_caja(id_producto);

-- ========================================
-- FUNCIONES Y TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION tiendadb.fn_limpiar_codigo_barras()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_barras = '' THEN
        NEW.codigo_barras := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_productos_limpiar_codigo ON tiendadb.productos;
CREATE TRIGGER tr_productos_limpiar_codigo
BEFORE INSERT OR UPDATE ON tiendadb.productos
FOR EACH ROW
EXECUTE FUNCTION tiendadb.fn_limpiar_codigo_barras();

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

CREATE OR REPLACE FUNCTION tiendadb.cleanup_ventas_pendientes_huerfanas()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tiendadb.ventas
    WHERE estatus = 'P'
      AND fecha_venta < NOW() - INTERVAL '24 hours';
END;
$$;

-- ========================================
-- SEED DATA (idempotente)
-- ========================================
INSERT INTO tiendadb.tipos_usuario (nombre, descripcion)
VALUES ('Administrador', 'Usuario con todos los privilegios'),
       ('Cajero', 'Usuario encargado de las ventas y manejo de caja')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tiendadb.categorias (nombre, descripcion, estatus)
VALUES ('Sin asignar', 'Categoria por defecto', 'A')
ON CONFLICT (nombre) DO NOTHING;

EOSQL

echo "OK - Esquema tiendadb listo"

# ========================================
# BASE DE DATOS ABARROTERA
# ========================================
echo "=== [2/3] Creando base de datos dulcesnc_abarrotera (si no existe) ==="

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-'EOSQL'
SELECT 'CREATE DATABASE dulcesnc_abarrotera'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'dulcesnc_abarrotera')\gexec
EOSQL

echo "=== [3/3] Inicializando esquema tiendadb_abarrotera en base dulcesnc_abarrotera ==="

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "dulcesnc_abarrotera" <<-'EOSQL'

CREATE SCHEMA IF NOT EXISTS tiendadb_abarrotera;

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.tipos_usuario (
    id_tipo_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.usuarios (
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
    CONSTRAINT fk_tipo_usuario FOREIGN KEY (id_tipo_usuario)
        REFERENCES tiendadb_abarrotera.tipos_usuario(id_tipo_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.caja (
    id_caja SERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_movimiento VARCHAR(50) NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    descripcion TEXT,
    saldo_resultante DECIMAL(12, 2) NOT NULL,
    id_usuario INT NOT NULL,
    estatus VARCHAR(1) DEFAULT 'P',
    CONSTRAINT fk_usuario_caja FOREIGN KEY (id_usuario)
        REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.boveda (
    id_boveda SERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_ajuste DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tipo_movimiento VARCHAR(50) NOT NULL,
    descripcion TEXT,
    id_usuario INT NOT NULL,
    CONSTRAINT fk_usuario_boveda FOREIGN KEY (id_usuario)
        REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.ganancias_acumuladas (
    id_ganancia BIGSERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT NOW(),
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_ajuste DECIMAL(12, 2) NOT NULL,
    tipo_movimiento VARCHAR(50) NOT NULL,
    descripcion TEXT,
    id_usuario BIGINT NOT NULL,
    CONSTRAINT fk_usuario_ganancias FOREIGN KEY (id_usuario)
        REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE,
    descripcion TEXT,
    estatus VARCHAR(1) DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.subcategorias (
    id_subcategoria SERIAL PRIMARY KEY,
    nombre VARCHAR(255),
    descripcion TEXT,
    id_categoria INT,
    estatus VARCHAR(1) DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.productos (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo_barras VARCHAR(255),
    id_categoria INT NOT NULL DEFAULT 1,
    id_subcategoria INT,
    precio_costo DECIMAL(10, 2) NOT NULL,
    precio_venta DECIMAL(10, 2) NOT NULL,
    cantidad_min INT NOT NULL,
    cantidad_max INT NOT NULL,
    stock INT NOT NULL,
    precio_mayoreo DECIMAL(10, 2),
    is_gramaje BOOLEAN DEFAULT FALSE,
    requiere_envase BOOLEAN DEFAULT FALSE,
    precio_envase DECIMAL(10, 2) DEFAULT 0,
    presentacion_caja VARCHAR(50) DEFAULT '',
    estatus VARCHAR(1) DEFAULT 'A',
    CONSTRAINT fk_categoria_producto FOREIGN KEY (id_categoria)
        REFERENCES tiendadb_abarrotera.categorias(id_categoria)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_productos_estatus ON tiendadb_abarrotera.productos(estatus);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.ventas (
    id_venta SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    monto_total DECIMAL(12, 2) NOT NULL,
    estatus VARCHAR(1) DEFAULT 'P',
    numero_ticket INT NOT NULL DEFAULT 0,
    metodo_pago VARCHAR(50) DEFAULT 'EFECTIVO',
    descripcion_pendiente TEXT,
    CONSTRAINT fk_usuario_venta FOREIGN KEY (id_usuario)
        REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.ventas_detalle (
    id_venta_detalle SERIAL PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario_venta DECIMAL(10, 2) NOT NULL,
    tipo_precio_aplicado VARCHAR(50) DEFAULT 'VENTA',
    cobro_envase DECIMAL(10, 2) DEFAULT 0,
    cantidad_envase INTEGER DEFAULT 0,
    CONSTRAINT fk_venta_detalle FOREIGN KEY (id_venta)
        REFERENCES tiendadb_abarrotera.ventas(id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_producto_detalle FOREIGN KEY (id_producto)
        REFERENCES tiendadb_abarrotera.productos(id_producto)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.promociones (
    id_promocion BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_original DECIMAL(10, 2) NOT NULL,
    precio_promocion DECIMAL(10, 2) NOT NULL,
    imagen_url VARCHAR(500),
    activa BOOLEAN DEFAULT TRUE,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.promocion_detalles (
    id_detalle BIGSERIAL PRIMARY KEY,
    id_promocion BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_promocion FOREIGN KEY (id_promocion)
        REFERENCES tiendadb_abarrotera.promociones(id_promocion) ON DELETE CASCADE,
    CONSTRAINT fk_producto_promo FOREIGN KEY (id_producto)
        REFERENCES tiendadb_abarrotera.productos(id_producto) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.apartado (
    id_apartado SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(255) NOT NULL,
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_pagado DECIMAL(12, 2) NOT NULL DEFAULT 0,
    frecuencia_pago VARCHAR(20) NOT NULL,
    monto_por_periodo DECIMAL(12, 2) NOT NULL,
    monto_diario DECIMAL(12, 2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estatus VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    id_usuario INTEGER NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apartado_usuario FOREIGN KEY (id_usuario)
        REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.apartado_pago (
    id_pago SERIAL PRIMARY KEY,
    id_apartado INTEGER NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL,
    CONSTRAINT fk_pago_apartado FOREIGN KEY (id_apartado)
        REFERENCES tiendadb_abarrotera.apartado(id_apartado),
    CONSTRAINT fk_pago_usuario FOREIGN KEY (id_usuario)
        REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.proveedores (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion VARCHAR(500),
    notas TEXT,
    tipo_proveedor VARCHAR(20) DEFAULT 'DIRECTA',
    dias_entrega VARCHAR(100) DEFAULT '',
    dias_pedido VARCHAR(100) DEFAULT '',
    estatus VARCHAR(1) DEFAULT 'A'
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.pedidos_proveedor (
    id_pedido SERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_entrega_esperada DATE NOT NULL,
    monto_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monto_apartado DECIMAL(10, 2) NOT NULL DEFAULT 0,
    estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    notas TEXT,
    CONSTRAINT fk_pedido_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES tiendadb_abarrotera.proveedores(id_proveedor)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.pedido_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido)
        REFERENCES tiendadb_abarrotera.pedidos_proveedor(id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto)
        REFERENCES tiendadb_abarrotera.productos(id_producto)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.producto_proveedor (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    id_proveedor INT NOT NULL,
    precio_acordado DECIMAL(10, 2),
    CONSTRAINT fk_pp_producto FOREIGN KEY (id_producto)
        REFERENCES tiendadb_abarrotera.productos(id_producto) ON DELETE CASCADE,
    CONSTRAINT fk_pp_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES tiendadb_abarrotera.proveedores(id_proveedor) ON DELETE CASCADE,
    CONSTRAINT uq_producto_proveedor UNIQUE (id_producto, id_proveedor)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.producto_presentacion_caja (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    piezas INT NOT NULL CHECK (piezas > 0),
    CONSTRAINT fk_ppc_producto FOREIGN KEY (id_producto)
        REFERENCES tiendadb_abarrotera.productos(id_producto) ON DELETE CASCADE,
    CONSTRAINT uq_producto_piezas UNIQUE (id_producto, piezas)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.credito_persona (
    id_persona SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    direccion TEXT,
    correo VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.credito_venta (
    id_credito_venta SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL,
    id_venta INTEGER,
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_pagado DECIMAL(12, 2) NOT NULL DEFAULT 0,
    estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    CONSTRAINT fk_cv_persona FOREIGN KEY (id_persona)
        REFERENCES tiendadb_abarrotera.credito_persona(id_persona),
    CONSTRAINT fk_cv_venta FOREIGN KEY (id_venta)
        REFERENCES tiendadb_abarrotera.ventas(id_venta)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.credito_abono (
    id_abono SERIAL PRIMARY KEY,
    id_credito_venta INTEGER NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    fecha_abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL,
    metodo_pago VARCHAR(20),
    CONSTRAINT fk_ca_credito FOREIGN KEY (id_credito_venta)
        REFERENCES tiendadb_abarrotera.credito_venta(id_credito_venta),
    CONSTRAINT fk_ca_usuario FOREIGN KEY (id_usuario)
        REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.renta_local (
    id_renta SERIAL PRIMARY KEY,
    monto_mensual DECIMAL(10, 2) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP DEFAULT NOW()
);

INSERT INTO tiendadb_abarrotera.renta_local (id_renta, monto_mensual)
VALUES (1, 0)
ON CONFLICT (id_renta) DO NOTHING;

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.ajuste_precio (
    id_ajuste SERIAL PRIMARY KEY,
    dia_semana INT NOT NULL UNIQUE,
    monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO tiendadb_abarrotera.ajuste_precio (dia_semana, monto, activo)
SELECT d.dia, 0, FALSE
FROM (VALUES (1), (2), (3), (4), (5), (6), (7)) AS d(dia)
ON CONFLICT (dia_semana) DO NOTHING;

-- Indices
CREATE INDEX IF NOT EXISTS idx_ganancias_fecha ON tiendadb_abarrotera.ganancias_acumuladas(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_promociones_activa ON tiendadb_abarrotera.promociones(activa);
CREATE INDEX IF NOT EXISTS idx_promociones_fechas ON tiendadb_abarrotera.promociones(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_promocion_detalles_promocion ON tiendadb_abarrotera.promocion_detalles(id_promocion);
CREATE INDEX IF NOT EXISTS idx_apartado_usuario ON tiendadb_abarrotera.apartado(id_usuario);
CREATE INDEX IF NOT EXISTS idx_apartado_estatus ON tiendadb_abarrotera.apartado(estatus);
CREATE INDEX IF NOT EXISTS idx_apartado_pago_apartado ON tiendadb_abarrotera.apartado_pago(id_apartado);
CREATE INDEX IF NOT EXISTS idx_apartado_pago_usuario ON tiendadb_abarrotera.apartado_pago(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON tiendadb_abarrotera.ventas(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_estatus ON tiendadb_abarrotera.ventas(estatus);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_venta ON tiendadb_abarrotera.ventas_detalle(id_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_producto ON tiendadb_abarrotera.ventas_detalle(id_producto);
CREATE INDEX IF NOT EXISTS idx_producto_proveedor_producto ON tiendadb_abarrotera.producto_proveedor(id_producto);
CREATE INDEX IF NOT EXISTS idx_presentacion_caja_producto ON tiendadb_abarrotera.producto_presentacion_caja(id_producto);

-- Funciones
CREATE OR REPLACE FUNCTION tiendadb_abarrotera.fn_limpiar_codigo_barras()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_barras = '' THEN
        NEW.codigo_barras := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_productos_limpiar_codigo ON tiendadb_abarrotera.productos;
CREATE TRIGGER tr_productos_limpiar_codigo
BEFORE INSERT OR UPDATE ON tiendadb_abarrotera.productos
FOR EACH ROW
EXECUTE FUNCTION tiendadb_abarrotera.fn_limpiar_codigo_barras();

CREATE OR REPLACE FUNCTION tiendadb_abarrotera.cleanup_caja_movimientos_cero()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tiendadb_abarrotera.caja
    WHERE monto = 0
      AND fecha_movimiento < NOW() - INTERVAL '3 hours';
END;
$$;

CREATE OR REPLACE FUNCTION tiendadb_abarrotera.cleanup_ventas_invalidas()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tiendadb_abarrotera.ventas
    WHERE (estatus = 'I' OR monto_total = 0)
      AND fecha_venta < NOW() - INTERVAL '3 hours';
END;
$$;

CREATE OR REPLACE FUNCTION tiendadb_abarrotera.cleanup_ventas_pendientes_huerfanas()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tiendadb_abarrotera.ventas
    WHERE estatus = 'P'
      AND fecha_venta < NOW() - INTERVAL '24 hours';
END;
$$;

-- Seed data
INSERT INTO tiendadb_abarrotera.tipos_usuario (nombre, descripcion)
VALUES ('Administrador', 'Usuario con todos los privilegios'),
       ('Cajero', 'Usuario encargado de las ventas y manejo de caja')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tiendadb_abarrotera.categorias (nombre, descripcion, estatus)
VALUES ('Sin asignar', 'Categoria por defecto', 'A')
ON CONFLICT (nombre) DO NOTHING;

EOSQL

echo "=== Inicializacion completada exitosamente ==="
