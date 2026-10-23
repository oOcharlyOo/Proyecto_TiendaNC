-- Migración 014: Tabla ajuste_precio (recargo por día de la semana)
-- Fecha: 2026-08-14
-- Descripción: Permite aumentar el precio de venta de todos los productos en $1 a $2
--              en días específicos de la semana, por sucursal, sin modificar el costo.
--              dia_semana usa formato ISO: 1 = Lunes ... 7 = Domingo.

-- Sucursal Dulcería
CREATE TABLE IF NOT EXISTS tiendadb.ajuste_precio (
    id_ajuste SERIAL PRIMARY KEY,
    dia_semana INT NOT NULL UNIQUE,
    monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO tiendadb.ajuste_precio (dia_semana, monto, activo)
SELECT d.dia, 0, FALSE
FROM (VALUES (1), (2), (3), (4), (5), (6), (7)) AS d(dia)
ON CONFLICT (dia_semana) DO NOTHING;

-- Sucursal Abarrotera
CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.ajuste_precio (
    id_ajuste SERIAL PRIMARY KEY,
    dia_semana INT NOT NULL UNIQUE,
    monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO tiendadb_abarrotera.ajuste_precio (dia_semana, monto, activo)
SELECT d.dia, 0, FALSE
FROM (VALUES (1), (2), (3), (4), (5), (6), (7)) AS d(dia)
ON CONFLICT (dia_semana) DO NOTHING;
