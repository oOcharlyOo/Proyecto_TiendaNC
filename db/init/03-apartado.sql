-- Tabla para apartados de productos a crédito
CREATE TABLE IF NOT EXISTS tiendadb.apartado (
    id_apartado SERIAL PRIMARY KEY,
    nombre_producto VARCHAR(255) NOT NULL,
    monto_total DECIMAL(12,2) NOT NULL,
    monto_pagado DECIMAL(12,2) NOT NULL DEFAULT 0,
    frecuencia_pago VARCHAR(20) NOT NULL,
    monto_por_periodo DECIMAL(12,2) NOT NULL,
    monto_diario DECIMAL(12,2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estatus VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
    id_usuario INTEGER NOT NULL REFERENCES tiendadb.usuarios(id_usuario),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_apartado_usuario ON tiendadb.apartado(id_usuario);
CREATE INDEX idx_apartado_estatus ON tiendadb.apartado(estatus);
