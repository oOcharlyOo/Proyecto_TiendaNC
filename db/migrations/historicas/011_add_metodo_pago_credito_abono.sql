-- Migración 011: Agregar columna metodo_pago a tabla credito_abono
-- Fecha: 2026-06-18
-- Descripción: Permite registrar el método de pago utilizado en los abonos a créditos

ALTER TABLE credito_abono ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20);

-- Actualizar registros existentes sin método de pago
UPDATE credito_abono SET metodo_pago = 'EFECTIVO' WHERE metodo_pago IS NULL;
