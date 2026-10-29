-- Migration: 005_add_dias_pedido_to_proveedores
-- Adds dias_pedido column to store order days for preventa suppliers

ALTER TABLE tiendadb.proveedores ADD COLUMN IF NOT EXISTS dias_pedido VARCHAR(100) DEFAULT '';
