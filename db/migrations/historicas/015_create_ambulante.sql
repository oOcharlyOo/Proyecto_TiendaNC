-- Migración 015: Sistema de ventas ambulante
-- Fecha: 2026-09-04
-- Descripción:
--   1. Tabla ambulante_inventario (inventario persistente del vendedor ambulante)
--   2. Columnas en ventas para marcar ventas ambulantes y su origen
-- Se aplica en ambas bases: dulcesnc (tiendadb) y dulcesnc_abarrotera (tiendadb_abarrotera)

-- ============================================================
-- BASE DULCESNC (esquema tiendadb)
-- ============================================================

-- 1) Inventario ambulante persistente
CREATE TABLE IF NOT EXISTS tiendadb.ambulante_inventario (
    id BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_producto INT,
    nombre_producto VARCHAR(255) NOT NULL,
    id_sucursal_origen VARCHAR(20) NOT NULL,       -- 'dulceria' | 'abarrotera'
    cantidad INT NOT NULL,
    unidad VARCHAR(10) NOT NULL DEFAULT 'PIEZA',   -- 'PIEZA' | 'GRAMOS'
    precio_costo DECIMAL(12, 4) NOT NULL,          -- costo en sucursal origen (por unidad o por gramo)
    estatus VARCHAR(20) NOT NULL DEFAULT 'CARGADO',-- CARGADO | VENDIDO | DEVUELTO
    fecha_carga TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_venta TIMESTAMP,
    id_venta INT,
    CONSTRAINT fk_amb_usuario FOREIGN KEY (id_usuario)
        REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_amb_inventario_usuario ON tiendadb.ambulante_inventario(id_usuario, estatus);
CREATE INDEX IF NOT EXISTS idx_amb_inventario_venta ON tiendadb.ambulante_inventario(id_venta);

-- 2) Columnas ambulante en ventas
ALTER TABLE tiendadb.ventas
    ADD COLUMN IF NOT EXISTS es_ambulante BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS id_sucursal_origen VARCHAR(20),
    ADD COLUMN IF NOT EXISTS precio_costo_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ventas_ambulante ON tiendadb.ventas(es_ambulante, fecha_venta);

-- ============================================================
-- BASE DULCESNC_ABARROTERA (esquema tiendadb_abarrotera)
-- ============================================================

-- 1) Inventario ambulante persistente
CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.ambulante_inventario (
    id BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_producto INT,
    nombre_producto VARCHAR(255) NOT NULL,
    id_sucursal_origen VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL,
    unidad VARCHAR(10) NOT NULL DEFAULT 'PIEZA',
    precio_costo DECIMAL(12, 4) NOT NULL,
    estatus VARCHAR(20) NOT NULL DEFAULT 'CARGADO',
    fecha_carga TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_venta TIMESTAMP,
    id_venta INT,
    CONSTRAINT fk_amb_usuario FOREIGN KEY (id_usuario)
        REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
);

CREATE INDEX IF NOT EXISTS idx_amb_inventario_usuario ON tiendadb_abarrotera.ambulante_inventario(id_usuario, estatus);
CREATE INDEX IF NOT EXISTS idx_amb_inventario_venta ON tiendadb_abarrotera.ambulante_inventario(id_venta);

-- 2) Columnas ambulante en ventas
ALTER TABLE tiendadb_abarrotera.ventas
    ADD COLUMN IF NOT EXISTS es_ambulante BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS id_sucursal_origen VARCHAR(20),
    ADD COLUMN IF NOT EXISTS precio_costo_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ventas_ambulante ON tiendadb_abarrotera.ventas(es_ambulante, fecha_venta);
