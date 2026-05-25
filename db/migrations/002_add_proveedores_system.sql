-- Migration: 002_add_proveedores_system
-- Creates tables for supplier management and order tracking

-- Proveedores table
CREATE TABLE IF NOT EXISTS tiendadb.proveedores (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    contacto VARCHAR(255),
    telefono VARCHAR(50),
    email VARCHAR(255),
    direccion VARCHAR(500),
    notas TEXT,
    estatus VARCHAR(1) DEFAULT 'A'
);

-- Pedidos de proveedor table
CREATE TABLE IF NOT EXISTS tiendadb.pedidos_proveedor (
    id_pedido SERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_entrega_esperada DATE NOT NULL,
    monto_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    monto_apartado DECIMAL(10, 2) NOT NULL DEFAULT 0,
    estatus VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    notas TEXT,
    CONSTRAINT fk_pedido_proveedor FOREIGN KEY (id_proveedor) REFERENCES tiendadb.proveedores(id_proveedor)
);

-- Detalle de pedidos table
CREATE TABLE IF NOT EXISTS tiendadb.pedido_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido) REFERENCES tiendadb.pedidos_proveedor(id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES tiendadb.productos(id_producto)
);
