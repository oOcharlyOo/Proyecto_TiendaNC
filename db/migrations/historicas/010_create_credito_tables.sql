-- Migration: 010_create_credito_tables
-- Creates credit system tables: credito_persona, credito_venta, credito_abono

-- tabla: credito_persona
CREATE TABLE IF NOT EXISTS tiendadb.credito_persona (
    id_persona SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    direccion TEXT,
    correo VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.credito_persona (
    id_persona SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    direccion TEXT,
    correo VARCHAR(255),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tabla: credito_venta
CREATE TABLE IF NOT EXISTS tiendadb.credito_venta (
    id_credito_venta SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL REFERENCES tiendadb.credito_persona(id_persona),
    id_venta INTEGER REFERENCES tiendadb.ventas(id_venta),
    monto_total DECIMAL(12,2) NOT NULL,
    monto_pagado DECIMAL(12,2) NOT NULL DEFAULT 0,
    estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.credito_venta (
    id_credito_venta SERIAL PRIMARY KEY,
    id_persona INTEGER NOT NULL REFERENCES tiendadb_abarrotera.credito_persona(id_persona),
    id_venta INTEGER REFERENCES tiendadb_abarrotera.ventas(id_venta),
    monto_total DECIMAL(12,2) NOT NULL,
    monto_pagado DECIMAL(12,2) NOT NULL DEFAULT 0,
    estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notas TEXT
);

-- tabla: credito_abono
CREATE TABLE IF NOT EXISTS tiendadb.credito_abono (
    id_abono SERIAL PRIMARY KEY,
    id_credito_venta INTEGER NOT NULL REFERENCES tiendadb.credito_venta(id_credito_venta),
    monto DECIMAL(12,2) NOT NULL,
    fecha_abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.credito_abono (
    id_abono SERIAL PRIMARY KEY,
    id_credito_venta INTEGER NOT NULL REFERENCES tiendadb_abarrotera.credito_venta(id_credito_venta),
    monto DECIMAL(12,2) NOT NULL,
    fecha_abono TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES tiendadb_abarrotera.usuarios(id_usuario)
);
