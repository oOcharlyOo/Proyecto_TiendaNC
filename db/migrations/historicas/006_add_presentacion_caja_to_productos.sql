-- Migration: 006_add_presentacion_caja_to_productos
-- Adds box presentation support for smart purchase suggestions

ALTER TABLE tiendadb.productos ADD COLUMN IF NOT EXISTS presentacion_caja VARCHAR(50) DEFAULT '';
ALTER TABLE tiendadb.productos ADD COLUMN IF NOT EXISTS precio_caja DECIMAL(10, 2);

ALTER TABLE tiendadb_abarrotera.productos ADD COLUMN IF NOT EXISTS presentacion_caja VARCHAR(50) DEFAULT '';
ALTER TABLE tiendadb_abarrotera.productos ADD COLUMN IF NOT EXISTS precio_caja DECIMAL(10, 2);
