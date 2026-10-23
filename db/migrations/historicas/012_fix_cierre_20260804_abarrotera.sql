-- Migración 012: Crear cierre faltante del 04-08-2026 (Abarrotera, usuario 21)
-- Fecha: 2026-08-11
-- Descripción: El turno del 04-08-2026 (apertura id 1179) quedó sin cierre por un bug
--              en guardarHora (la búsqueda de cierre cruzaba de día). Se crea el cierre
--              a las 21:00 (apertura 14:30 + jornada 6:30) con horas trabajadas.

INSERT INTO tiendadb_abarrotera.caja (
    fecha_movimiento,
    tipo_movimiento,
    monto,
    descripcion,
    saldo_resultante,
    id_usuario,
    estatus,
    horas_trabajadas
)
SELECT
    '2026-08-04 21:00:00',
    'cierre',
    0,
    'Cierre registrado manualmente.',
    saldo_resultante,
    id_usuario,
    'F',
    '06:30'
FROM tiendadb_abarrotera.caja
WHERE id_caja = 1179
  AND NOT EXISTS (
      SELECT 1
      FROM tiendadb_abarrotera.caja
      WHERE id_usuario = 21
        AND tipo_movimiento = 'cierre'
        AND fecha_movimiento >= '2026-08-04 00:00:00'
        AND fecha_movimiento <  '2026-08-05 00:00:00'
  );
