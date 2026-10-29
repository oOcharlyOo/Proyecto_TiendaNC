-- Migration: Add envase (container/deposit) fields to productos and ventas_detalle
-- Date: 2026-05-25

ALTER TABLE productos ADD COLUMN IF NOT EXISTS requiere_envase BOOLEAN DEFAULT FALSE;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_envase NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE ventas_detalle ADD COLUMN IF NOT EXISTS cobro_envase NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE ventas_detalle ADD COLUMN IF NOT EXISTS cantidad_envase INTEGER DEFAULT 0;
