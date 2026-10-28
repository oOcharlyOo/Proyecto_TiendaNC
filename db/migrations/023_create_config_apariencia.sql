-- Migración 023: configuración de apariencia de la sucursal
-- Fecha: 2026-10-28
-- @idempotente
-- Descripción:
--   Guarda la personalización que el dueño elige en el asistente de primer
--   arranque (wizard): tema base y color de acento. La tabla es por
--   ESQUEMA (sin calificar a propósito): cada sucursal —la principal, la
--   hermana y las ramas dinámicas b3..b6— almacena su propia apariencia en
--   su base, y apply.sh/resolver la resuelve con el search_path de la base
--   destino. El nombre visible de la sucursal NO vive aquí: está en el
--   registro de control (tiendadb_control.sucursales, base principal).
--
--   tema_base: una de las 4 paletas del puente de tokens.
--   acento:    hex "#rrggbb" que el frontend convierte en las variables
--              --accent-color / --accent-hover / --gradient-btn-*.
--   Una única fila por sucursal (id = 1).

CREATE TABLE IF NOT EXISTS config_apariencia (
    id                  INT PRIMARY KEY DEFAULT 1,
    tema_base           VARCHAR(20),
    acento              VARCHAR(9),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_apariencia_id CHECK (id = 1),
    CONSTRAINT ck_apariencia_tema CHECK (tema_base IS NULL OR tema_base IN ('classic', 'modern', 'ocean', 'forest')),
    CONSTRAINT ck_apariencia_acento CHECK (acento IS NULL OR acento ~ '^#[0-9a-fA-F]{6}$')
);
