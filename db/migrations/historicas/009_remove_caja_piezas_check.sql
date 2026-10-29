-- Migration: 009_remove_caja_piezas_check
-- Removes the CHECK constraint limiting piezas to (4,6,8,12,24)
-- so custom sizes like 20 can be used.

ALTER TABLE tiendadb.producto_presentacion_caja DROP CONSTRAINT IF EXISTS producto_presentacion_caja_piezas_check;
ALTER TABLE tiendadb.producto_presentacion_caja ADD CONSTRAINT producto_presentacion_caja_piezas_check CHECK (piezas > 0);

ALTER TABLE tiendadb_abarrotera.producto_presentacion_caja DROP CONSTRAINT IF EXISTS producto_presentacion_caja_piezas_check;
ALTER TABLE tiendadb_abarrotera.producto_presentacion_caja ADD CONSTRAINT producto_presentacion_caja_piezas_check CHECK (piezas > 0);
