-- Tabla de Promociones (Combos)
CREATE TABLE IF NOT EXISTS tiendadb.promociones (
    id_promocion BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio_original DECIMAL(10,2) NOT NULL,
    precio_promocion DECIMAL(10,2) NOT NULL,
    imagen_url VARCHAR(500),
    activa BOOLEAN DEFAULT TRUE,
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Detalles de Promocion
CREATE TABLE IF NOT EXISTS tiendadb.promocion_detalles (
    id_detalle BIGSERIAL PRIMARY KEY,
    id_promocion BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_promocion FOREIGN KEY (id_promocion) REFERENCES tiendadb.promociones(id_promocion) ON DELETE CASCADE,
    CONSTRAINT fk_producto FOREIGN KEY (id_producto) REFERENCES tiendadb.productos(id_producto) ON DELETE CASCADE
);

-- Indices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_promociones_activa ON tiendadb.promociones(activa);
CREATE INDEX IF NOT EXISTS idx_promociones_fechas ON tiendadb.promociones(fecha_inicio, fecha_fin);
CREATE INDEX IF NOT EXISTS idx_promocion_detalles_promocion ON tiendadb.promocion_detalles(id_promocion);
