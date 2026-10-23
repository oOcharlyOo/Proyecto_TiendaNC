-- Migración 019: columnas del sistema ambulante en ventas
-- Fecha: 2026-10-23
-- @idempotente
--
-- Descripción:
--   Estas columnas (es_ambulante, id_sucursal_origen, precio_costo_total) y la
--   tabla ambulante_inventario vivían SOLO en db/init/init.sh. Al restaurar un
--   respaldo desde la interfaz (Corte.vue) se reemplazan las tablas productos y
--   ventas, y esas columnas desaparecen: el backend falla con
--   "column v1_0.es_ambulante does not exist".
--
--   Esta migración las vuelve a crear de forma idempotente y está marcada como
--   @idempotente para que db/migrations/reparar.sh la re-aplique en cada
--   "docker compose up" y repare la base después de cualquier restauración.
--
--   Se aplica en ambas bases: dulcesnc (tiendadb) y dulcesnc_abarrotera
--   (tiendadb_abarrotera).

-- ============================================================
-- BASE DULCESNC (esquema tiendadb)
-- ============================================================
CREATE TABLE IF NOT EXISTS tiendadb.ambulante_inventario (
    id BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_producto INT,
    nombre_producto VARCHAR(255) NOT NULL,
    id_sucursal_origen VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL,
    gramos_por_pieza INT,
    unidad VARCHAR(10) NOT NULL DEFAULT 'PIEZA',
    precio_costo DECIMAL(12, 4) NOT NULL,
    estatus VARCHAR(20) NOT NULL DEFAULT 'CARGADO',
    fecha_carga TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_venta TIMESTAMP,
    id_venta INT
);

CREATE INDEX IF NOT EXISTS idx_amb_inventario_usuario
    ON tiendadb.ambulante_inventario (id_usuario, estatus);

CREATE INDEX IF NOT EXISTS idx_amb_inventario_venta
    ON tiendadb.ambulante_inventario (id_venta);

ALTER TABLE tiendadb.ventas
    ADD COLUMN IF NOT EXISTS es_ambulante BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS id_sucursal_origen VARCHAR(20),
    ADD COLUMN IF NOT EXISTS precio_costo_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ventas_ambulante
    ON tiendadb.ventas (es_ambulante, fecha_venta);

-- ============================================================
-- BASE DULCESNC_ABARROTERA (esquema tiendadb_abarrotera)
-- ============================================================
CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.ambulante_inventario (
    id BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_producto INT,
    nombre_producto VARCHAR(255) NOT NULL,
    id_sucursal_origen VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL,
    gramos_por_pieza INT,
    unidad VARCHAR(10) NOT NULL DEFAULT 'PIEZA',
    precio_costo DECIMAL(12, 4) NOT NULL,
    estatus VARCHAR(20) NOT NULL DEFAULT 'CARGADO',
    fecha_carga TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_venta TIMESTAMP,
    id_venta INT
);

CREATE INDEX IF NOT EXISTS idx_amb_inventario_usuario
    ON tiendadb_abarrotera.ambulante_inventario (id_usuario, estatus);

CREATE INDEX IF NOT EXISTS idx_amb_inventario_venta
    ON tiendadb_abarrotera.ambulante_inventario (id_venta);

ALTER TABLE tiendadb_abarrotera.ventas
    ADD COLUMN IF NOT EXISTS es_ambulante BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS id_sucursal_origen VARCHAR(20),
    ADD COLUMN IF NOT EXISTS precio_costo_total DECIMAL(12, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ventas_ambulante
    ON tiendadb_abarrotera.ventas (es_ambulante, fecha_venta);
