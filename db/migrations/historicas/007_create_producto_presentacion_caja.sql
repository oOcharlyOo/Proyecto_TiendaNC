-- Migration: 007_create_producto_presentacion_caja
-- Creates table for multiple box presentations per product

CREATE TABLE IF NOT EXISTS tiendadb.producto_presentacion_caja (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES tiendadb.productos(id_producto) ON DELETE CASCADE,
    piezas INT NOT NULL CHECK (piezas IN (4, 6, 8, 12, 24)),
    precio_caja DECIMAL(10, 2),
    UNIQUE(id_producto, piezas)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.producto_presentacion_caja (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES tiendadb_abarrotera.productos(id_producto) ON DELETE CASCADE,
    piezas INT NOT NULL CHECK (piezas IN (4, 6, 8, 12, 24)),
    precio_caja DECIMAL(10, 2),
    UNIQUE(id_producto, piezas)
);

-- Drop old columns if they exist (from previous migration)
ALTER TABLE tiendadb.productos DROP COLUMN IF EXISTS presentacion_caja;
ALTER TABLE tiendadb.productos DROP COLUMN IF EXISTS precio_caja;

ALTER TABLE tiendadb_abarrotera.productos DROP COLUMN IF EXISTS presentacion_caja;
ALTER TABLE tiendadb_abarrotera.productos DROP COLUMN IF EXISTS precio_caja;
