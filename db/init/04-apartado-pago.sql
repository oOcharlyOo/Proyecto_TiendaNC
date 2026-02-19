-- Tabla para registrar pagos de apartados
CREATE TABLE IF NOT EXISTS tiendadb.apartado_pago (
    id_pago SERIAL PRIMARY KEY,
    id_apartado INTEGER NOT NULL REFERENCES tiendadb.apartado(id_apartado),
    monto DECIMAL(12,2) NOT NULL,
    fecha_pago TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES tiendadb.usuarios(id_usuario)
);

CREATE INDEX idx_apartado_pago_apartado ON tiendadb.apartado_pago(id_apartado);
CREATE INDEX idx_apartado_pago_usuario ON tiendadb.apartado_pago(id_usuario);
