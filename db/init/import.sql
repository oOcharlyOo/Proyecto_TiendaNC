
-- Función para limpiar registros de caja con monto 0 que tienen más de 3 horas
CREATE OR REPLACE FUNCTION tiendadb.cleanup_caja_movimientos_cero()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tiendadb.caja
    WHERE monto = 0
      AND fecha_movimiento < NOW() - INTERVAL '3 hours';
END;
$$;

-- Función para limpiar ventas con estatus 'I' o monto_total = 0 que tienen más de 3 horas
CREATE OR REPLACE FUNCTION tiendadb.cleanup_ventas_invalidas()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM tiendadb.ventas
    WHERE (estatus = 'I' OR monto_total = 0)
      AND fecha_venta < NOW() - INTERVAL '3 hours';
END;
$$;
