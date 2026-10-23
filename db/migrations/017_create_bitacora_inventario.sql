-- Migración 017: Bitácora de inventario
-- Fecha: 2026-10-22
-- @idempotente
-- Descripción:
--   Tabla de auditoría que registra CADA cambio de stock de un producto, con el
--   tipo de evento (venta, entrada de pedido, ajuste manual, vaciado, voz,
--   ambulante, alta/inactivación/restauración) y el stock antes/después.
--
--   Alimenta el motor de rotación de la Inteligencia de Productos y del Pedido
--   Sugerido para distinguir productos que se venden rápido (rellenar) de los
--   lentos o atorados (comprar menos o no reordenar).
--
--   delta se calcula en la aplicación (stock_nuevo - stock_anterior) para no
--   depender de columnas generadas y mantener portabilidad.
--
--   Se aplica en ambas bases: dulcesnc (tiendadb) y dulcesnc_abarrotera
--   (tiendadb_abarrotera). La sucursal Ambulante comparte la bitácora de su
--   sucursal origen (dulcería o abarrotera).

-- ============================================================
-- BASE DULCESNC (esquema tiendadb)
-- ============================================================
CREATE TABLE IF NOT EXISTS tiendadb.bitacora_inventario (
    id_bitacora     SERIAL PRIMARY KEY,
    id_producto     INT NOT NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo_evento     VARCHAR(30) NOT NULL,
    stock_anterior  INT,
    stock_nuevo     INT,
    delta           INT,
    referencia      VARCHAR(80),
    detalle         TEXT,
    id_usuario      INT
);

CREATE INDEX IF NOT EXISTS idx_bitacora_producto_fecha
    ON tiendadb.bitacora_inventario (id_producto, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_bitacora_tipo_fecha
    ON tiendadb.bitacora_inventario (tipo_evento, fecha DESC);

-- ============================================================
-- BASE DULCESNC_ABARROTERA (esquema tiendadb_abarrotera)
-- ============================================================
CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.bitacora_inventario (
    id_bitacora     SERIAL PRIMARY KEY,
    id_producto     INT NOT NULL,
    fecha           TIMESTAMP NOT NULL DEFAULT NOW(),
    tipo_evento     VARCHAR(30) NOT NULL,
    stock_anterior  INT,
    stock_nuevo     INT,
    delta           INT,
    referencia      VARCHAR(80),
    detalle         TEXT,
    id_usuario      INT
);

CREATE INDEX IF NOT EXISTS idx_bitacora_producto_fecha
    ON tiendadb_abarrotera.bitacora_inventario (id_producto, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_bitacora_tipo_fecha
    ON tiendadb_abarrotera.bitacora_inventario (tipo_evento, fecha DESC);
