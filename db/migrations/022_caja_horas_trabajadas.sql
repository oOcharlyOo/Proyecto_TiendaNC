-- Migración 022: caja.horas_trabajadas en instalaciones nuevas
-- Fecha: 2026-10-28
-- @idempotente
-- Descripción:
--   La entidad Caja mapea la columna horas_trabajadas (string "HH:MM" que
--   el corte escribe al cerrar y el módulo de asistencia lee para calcular
--   el tiempo trabajado). En las instalaciones originales de La Leyenda la
--   columna existe desde los primeros respaldos, pero el init.sh unificado
--   nunca la incluyó en el CREATE TABLE de caja: toda instalación nueva
--   (incluidas las ramas dinámicas del proyecto genérico) nacía sin ella y
--   el alta de caja / la asistencia fallaban con
--   "column c1_0.horas_trabajadas does not exist".

ALTER TABLE tiendadb.caja ADD COLUMN IF NOT EXISTS horas_trabajadas VARCHAR(10);

ALTER TABLE tiendadb_abarrotera.caja ADD COLUMN IF NOT EXISTS horas_trabajadas VARCHAR(10);
