-- Tabla para acumulación de ganancias similar a bóveda
CREATE TABLE IF NOT EXISTS tiendadb.ganancias_acumuladas (
    id_ganancia BIGSERIAL PRIMARY KEY,
    fecha_movimiento TIMESTAMP NOT NULL DEFAULT NOW(),
    monto_total DECIMAL(12, 2) NOT NULL,
    monto_ajuste DECIMAL(12, 2) NOT NULL,
    tipo_movimiento VARCHAR(50) NOT NULL,
    descripcion TEXT,
    id_usuario BIGINT NOT NULL REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE INDEX idx_ganancias_fecha ON tiendadb.ganancias_acumuladas(fecha_movimiento DESC);
