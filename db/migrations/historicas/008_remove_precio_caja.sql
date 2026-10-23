-- Migration 008: Remove precio_caja column (auto-calculated as precio_costo * piezas)

ALTER TABLE tiendadb.productos DROP COLUMN IF EXISTS precio_caja;
ALTER TABLE tiendadb_abarrotera.productos DROP COLUMN IF EXISTS precio_caja;

ALTER TABLE tiendadb.producto_presentacion_caja DROP COLUMN IF EXISTS precio_caja;
ALTER TABLE tiendadb_abarrotera.producto_presentacion_caja DROP COLUMN IF EXISTS precio_caja;
