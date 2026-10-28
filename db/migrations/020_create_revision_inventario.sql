-- Migración 020: Revisión de inventario
-- Fecha: 2026-10-23
-- @idempotente
-- Descripción:
--   Guarda la decisión del usuario sobre los productos que llevan más de 60
--   días sin venderse (la "cola de revisión" de Inteligencia de Inventario).
--
--   Por qué existe:
--     El motor de rotación detecta productos atorados, pero el tendero necesita
--     dejar constancia de POR QUÉ siguen ahí (estacionalidad, stock físico mal
--     capturado, producto descontinuado, etc.) y marcar el caso como resuelto
--     para que deje de aparecer en la lista de pendientes.
--
--   estados:
--     PENDIENTE   -> detectado por el motor, sin decisión del usuario.
--     EN_REVISION -> el usuario lo está investigando.
--     RESUELTO    -> ya se tomó una decisión (promoción, devolución, baja, etc.).
--
--   motivos:
--     ESTACIONAL, SIN_DEMANDA, STOCK_FISICO, PROVEEDOR, DESCONTINUADO, OTRO.
--
--   La fila es opcional: si un producto no tiene fila, su estado es PENDIENTE.
--   Se aplica en ambas bases: dulcesnc (tiendadb) y dulcesnc_abarrotera
--   (tiendadb_abarrotera). La sucursal Ambulante comparte la revisión de su
--   sucursal origen.

-- ============================================================
-- BASE DULCESNC (esquema tiendadb)
-- ============================================================
CREATE TABLE IF NOT EXISTS tiendadb.revision_inventario (
    id_revision         SERIAL PRIMARY KEY,
    id_producto         INT NOT NULL UNIQUE,
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    motivo              VARCHAR(40),
    nota                TEXT,
    id_usuario          INT,
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_inventario_estado
    ON tiendadb.revision_inventario (estado);

-- ============================================================
-- BASE DULCESNC_ABARROTERA (esquema tiendadb_abarrotera)
-- ============================================================
CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.revision_inventario (
    id_revision         SERIAL PRIMARY KEY,
    id_producto         INT NOT NULL UNIQUE,
    estado              VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    motivo              VARCHAR(40),
    nota                TEXT,
    id_usuario          INT,
    fecha_creacion      TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revision_inventario_estado
    ON tiendadb_abarrotera.revision_inventario (estado);
