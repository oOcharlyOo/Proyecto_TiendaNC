-- Migración 018: el stock de un producto no puede ser negativo
-- Fecha: 2026-10-23
-- Descripción:
--   El stock se descontaba en ventas, ajustes y salidas de ambulante sin tope,
--   por lo que podía quedar en negativo. La aplicación ahora se detiene en 0 y
--   esta migración:
--     1) corrige los registros existentes con stock < 0 (los deja en 0),
--     2) agrega una restricción CHECK para que la base también lo impida.
--
--   Se aplica en ambas bases: dulcesnc (tiendadb) y dulcesnc_abarrotera
--   (tiendadb_abarrotera).

-- ============================================================
-- BASE DULCESNC (esquema tiendadb)
-- ============================================================
UPDATE tiendadb.productos SET stock = 0 WHERE stock < 0;

ALTER TABLE tiendadb.productos
    DROP CONSTRAINT IF EXISTS chk_productos_stock_no_negativo;

ALTER TABLE tiendadb.productos
    ADD CONSTRAINT chk_productos_stock_no_negativo
    CHECK (stock IS NULL OR stock >= 0);

-- ============================================================
-- BASE DULCESNC_ABARROTERA (esquema tiendadb_abarrotera)
-- ============================================================
UPDATE tiendadb_abarrotera.productos SET stock = 0 WHERE stock < 0;

ALTER TABLE tiendadb_abarrotera.productos
    DROP CONSTRAINT IF EXISTS chk_productos_stock_no_negativo;

ALTER TABLE tiendadb_abarrotera.productos
    ADD CONSTRAINT chk_productos_stock_no_negativo
    CHECK (stock IS NULL OR stock >= 0);
