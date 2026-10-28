-- Migración 024: tema base personalizable con hex en config_apariencia
-- Fecha: 2026-10-28
-- @idempotente
-- Descripción:
--   Complementa la 023. Ademas de los 4 temas preset, el dueno puede pintar
--   el tema base con un color hexadecimal propio:
--     - tema_base pasa a aceptar tambien 'custom'
--     - nueva columna fondo: hex "#rrggbb" del color de fondo elegido cuando
--       tema_base = 'custom'. El frontend deriva de el los demas tonos
--       (secondary, panel, bordes, gradientes) con mezclas claras/oscuras.

ALTER TABLE config_apariencia DROP CONSTRAINT IF EXISTS ck_apariencia_tema;

ALTER TABLE config_apariencia
    ADD CONSTRAINT ck_apariencia_tema
    CHECK (tema_base IS NULL OR tema_base IN ('classic', 'modern', 'ocean', 'forest', 'custom'));

ALTER TABLE config_apariencia ADD COLUMN IF NOT EXISTS fondo VARCHAR(9);
