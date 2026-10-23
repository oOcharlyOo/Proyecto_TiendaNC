-- Migración 013: Tabla renta_local (configuración de renta mensual del local)
-- Fecha: 2026-08-11
-- Descripción: Permite guardar el monto mensual de la renta del local por sucursal.
--              El Reporte de Ventas lo descuenta en la vista de mes (x1) y de año (x12).

-- Sucursal Dulcería
CREATE TABLE IF NOT EXISTS tiendadb.renta_local (
    id_renta SERIAL PRIMARY KEY,
    monto_mensual DECIMAL(10, 2) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP DEFAULT NOW()
);

INSERT INTO tiendadb.renta_local (id_renta, monto_mensual)
VALUES (1, 0)
ON CONFLICT (id_renta) DO NOTHING;

-- Sucursal Abarrotera
CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.renta_local (
    id_renta SERIAL PRIMARY KEY,
    monto_mensual DECIMAL(10, 2) NOT NULL DEFAULT 0,
    actualizado_en TIMESTAMP DEFAULT NOW()
);

INSERT INTO tiendadb_abarrotera.renta_local (id_renta, monto_mensual)
VALUES (1, 0)
ON CONFLICT (id_renta) DO NOTHING;
