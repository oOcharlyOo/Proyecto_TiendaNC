-- Migración 021: Configuración de asistencia
-- Fecha: 2026-10-27
-- @idempotente
-- Descripción:
--   Guarda el tope de horas de la jornada laboral usado por el módulo de
--   asistencia. Cada negocio configura el suyo (por ejemplo 13h); el valor
--   0 significa "sin tope" y las horas se muestran tal cual resultan del
--   rango apertura -> cierre.
--
--   Una sola fila por sucursal (esquema): id_config = 1.

CREATE TABLE IF NOT EXISTS tiendadb.config_asistencia (
    id_config           INT PRIMARY KEY,
    horas_max_jornada   NUMERIC(4,1) NOT NULL DEFAULT 12.0,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO tiendadb.config_asistencia (id_config, horas_max_jornada)
VALUES (1, 12.0)
ON CONFLICT (id_config) DO NOTHING;

CREATE TABLE IF NOT EXISTS tiendadb_abarrotera.config_asistencia (
    id_config           INT PRIMARY KEY,
    horas_max_jornada   NUMERIC(4,1) NOT NULL DEFAULT 12.0,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO tiendadb_abarrotera.config_asistencia (id_config, horas_max_jornada)
VALUES (1, 12.0)
ON CONFLICT (id_config) DO NOTHING;
