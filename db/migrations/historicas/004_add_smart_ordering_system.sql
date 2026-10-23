-- Migration: 004_add_smart_ordering_system
-- Adds supplier type, delivery days, and product-supplier mapping

-- Add new columns to proveedores
ALTER TABLE tiendadb.proveedores ADD COLUMN IF NOT EXISTS tipo_proveedor VARCHAR(20) DEFAULT 'DIRECTA';
ALTER TABLE tiendadb.proveedores ADD COLUMN IF NOT EXISTS dias_entrega VARCHAR(100) DEFAULT '';

-- Create producto_proveedor mapping table
CREATE TABLE IF NOT EXISTS tiendadb.producto_proveedor (
    id SERIAL PRIMARY KEY,
    id_producto INT NOT NULL,
    id_proveedor INT NOT NULL,
    precio_acordado DECIMAL(10, 2),
    CONSTRAINT fk_pp_producto FOREIGN KEY (id_producto) REFERENCES tiendadb.productos(id_producto) ON DELETE CASCADE,
    CONSTRAINT fk_pp_proveedor FOREIGN KEY (id_proveedor) REFERENCES tiendadb.proveedores(id_proveedor) ON DELETE CASCADE,
    CONSTRAINT uq_producto_proveedor UNIQUE (id_producto, id_proveedor)
);

-- Add id_subcategoria to productos if not exists
ALTER TABLE tiendadb.productos ADD COLUMN IF NOT EXISTS id_subcategoria INT;
