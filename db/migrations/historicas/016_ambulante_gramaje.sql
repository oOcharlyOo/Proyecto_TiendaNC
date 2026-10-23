-- Migración 016: Gramaje en inventario ambulante (bolsitas pre-armadas)
-- Fecha: 2026-09-04
-- Descripción:
--   Para productos de gramaje el ambulante arma bolsitas de cierto tamaño (ej. 30g).
--   Se agrega la columna gramos_por_pieza a ambulante_inventario:
--     - cantidad          = numero de piezas/bolsitas cargadas (ej. 5)
--     - gramos_por_pieza  = gramos de cada bolsita (ej. 30)
--     - precio_costo      = costo de UNA bolsita = (precio_kg/1000) * gramos_por_pieza
--   El stock de la sucursal origen se descuenta en gramos: cantidad * gramos_por_pieza.
-- Se aplica en ambas bases: dulcesnc (tiendadb) y dulcesnc_abarrotera (tiendadb_abarrotera)

-- ============================================================
-- BASE DULCESNC (esquema tiendadb)
-- ============================================================
ALTER TABLE tiendadb.ambulante_inventario
    ADD COLUMN IF NOT EXISTS gramos_por_pieza INT;

-- ============================================================
-- BASE DULCESNC_ABARROTERA (esquema tiendadb_abarrotera)
-- ============================================================
ALTER TABLE tiendadb_abarrotera.ambulante_inventario
    ADD COLUMN IF NOT EXISTS gramos_por_pieza INT;
