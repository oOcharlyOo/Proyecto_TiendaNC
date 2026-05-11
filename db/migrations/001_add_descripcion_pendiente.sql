-- Migración: Agregar columna descripcion_pendiente a tabla ventas
-- Fecha: 2026-05-10
-- Propósito: Guardar la razón por la que una venta quedó pendiente (estatus 'E')

ALTER TABLE tiendadb.ventas ADD COLUMN IF NOT EXISTS descripcion_pendiente TEXT;
