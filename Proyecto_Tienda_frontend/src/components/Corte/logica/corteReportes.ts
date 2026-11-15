import type { VentaDetalleDTO, ReporteAnualDTO } from './useCorte';

/**
 * Cálculos de los reportes Mensual y Anual del Corte. Son funciones puras (sin estado):
 * reciben los datos ya cargados y devuelven filas listas para las tablas de detalle.
 */

const n = (v: unknown) => Number(v || 0);
const pct = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : 0);

export type DiaRow = {
  fecha: string; dia: string; tickets: number; ventas: number; costo: number;
  ganancia: number; margen: number; efectivo: number; transferencia: number; tarjeta: number;
};
export type MetodoRow = { metodo: string; tickets: number; monto: number; porcentaje: number; ticketPromedio: number };
export type ProductoRow = {
  nombre: string; cantidad: number; cantidadTxt: string; venta: number; costo: number;
  ganancia: number; margen: number; porcentaje: number; isGramaje: boolean;
};
export type KpisMensual = {
  ventas: number; costo: number; ganancia: number; margen: number; tickets: number;
  ticketPromedio: number; diasConVenta: number; promedioDiario: number;
  mejorDia: DiaRow | null; peorDia: DiaRow | null;
};
export type ResumenMensual = {
  dias: DiaRow[]; metodos: MetodoRow[]; unitarios: ProductoRow[]; granel: ProductoRow[]; kpis: KpisMensual;
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

function etiquetaDia(fecha: string): { fecha: string; dia: string } {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return { fecha: `${String(d).padStart(2, '0')} ${MESES_CORTOS[(m || 1) - 1]}`, dia: DIAS_SEMANA[date.getDay()] };
}

export function nombreMetodo(m: string | undefined): string {
  const u = String(m || 'EFECTIVO').toUpperCase();
  if (u === 'TRANSFERENCIA') return 'Transferencia';
  if (u === 'TARJETA') return 'Tarjeta';
  if (u === 'EFECTIVO') return 'Efectivo';
  return u.charAt(0) + u.slice(1).toLowerCase();
}

/** Misma regla que el reporte mensual: gramaje se cobra por precioUnitarioVenta; piezas por precio × cantidad. */
export function resumenMensual(
  detalles: VentaDetalleDTO[],
  formatearCantidad: (c: number, g: boolean) => string,
): ResumenMensual {
  type Venta = { dia: string; metodo: string; total: number; costo: number };
  const ventas = new Map<number, Venta>();
  const productos = new Map<string, { cantidad: number; venta: number; costo: number; isGramaje: boolean }>();

  for (const d of detalles || []) {
    const v = d.venta || (d as unknown as { Venta?: VentaDetalleDTO['Venta'] }).Venta;
    const idVenta = n(v?.idVenta);
    if (!idVenta || !['C', 'F'].includes(String(v?.estatus || ''))) continue;

    const tipoPrecio = String(d.tipoPrecioAplicado || '').trim().toUpperCase();
    const isGramaje = tipoPrecio === 'VENTA_GRAMAJE' || d.productoIsGramaje === true;
    const cantidad = n(d.cantidad);
    const importe = isGramaje ? n(d.precioUnitarioVenta) : n(d.precioUnitarioVenta) * cantidad;
    const costo = (isGramaje ? cantidad / 1000 : cantidad) * n(d.productoPrecioCosto);

    if (!ventas.has(idVenta)) {
      ventas.set(idVenta, {
        dia: String(v?.fechaVenta || '').slice(0, 10),
        metodo: nombreMetodo(v?.metodoPago),
        total: n(v?.montoTotal),
        costo: 0,
      });
    }
    ventas.get(idVenta)!.costo += costo;

    const nombre = d.productoNombre || 'Producto eliminado';
    const p = productos.get(nombre) || { cantidad: 0, venta: 0, costo: 0, isGramaje };
    p.cantidad += cantidad; p.venta += importe; p.costo += costo;
    if (isGramaje) p.isGramaje = true;
    productos.set(nombre, p);
  }

  // --- por día ---
  const porDia = new Map<string, DiaRow>();
  const porMetodo = new Map<string, { tickets: number; monto: number }>();
  let totalVentas = 0, totalCosto = 0;
  for (const s of ventas.values()) {
    totalVentas += s.total; totalCosto += s.costo;
    const m = porMetodo.get(s.metodo) || { tickets: 0, monto: 0 };
    m.tickets++; m.monto += s.total; porMetodo.set(s.metodo, m);
    if (!s.dia) continue;
    const fila = porDia.get(s.dia) || {
      ...etiquetaDia(s.dia), tickets: 0, ventas: 0, costo: 0, ganancia: 0, margen: 0, efectivo: 0, transferencia: 0, tarjeta: 0,
    };
    fila.tickets++; fila.ventas += s.total; fila.costo += s.costo;
    if (s.metodo === 'Transferencia') fila.transferencia += s.total;
    else if (s.metodo === 'Tarjeta') fila.tarjeta += s.total;
    else fila.efectivo += s.total;
    porDia.set(s.dia, fila);
  }
  const dias = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, f]) => {
    f.ganancia = f.ventas - f.costo; f.margen = pct(f.ganancia, f.ventas); return f;
  });

  const metodos: MetodoRow[] = [...porMetodo.entries()]
    .map(([metodo, m]) => ({
      metodo, tickets: m.tickets, monto: m.monto,
      porcentaje: pct(m.monto, totalVentas), ticketPromedio: m.tickets ? m.monto / m.tickets : 0,
    }))
    .sort((a, b) => b.monto - a.monto);

  // --- por producto ---
  const filas = (g: boolean): ProductoRow[] => {
    const lista = [...productos.entries()].filter(([, p]) => p.isGramaje === g);
    const total = lista.reduce((s, [, p]) => s + p.venta, 0);
    return lista
      .map(([nombre, p]) => ({
        nombre, cantidad: p.cantidad, cantidadTxt: formatearCantidad(p.cantidad, g), venta: p.venta, costo: p.costo,
        ganancia: p.venta - p.costo, margen: pct(p.venta - p.costo, p.venta), porcentaje: pct(p.venta, total), isGramaje: g,
      }))
      .sort((a, b) => b.venta - a.venta);
  };

  const conVenta = dias.filter(d => d.ventas > 0);
  const mejorDia = conVenta.length ? conVenta.reduce((a, b) => (b.ventas > a.ventas ? b : a)) : null;
  const peorDia = conVenta.length ? conVenta.reduce((a, b) => (b.ventas < a.ventas ? b : a)) : null;
  const tickets = ventas.size;

  return {
    dias, metodos, unitarios: filas(false), granel: filas(true),
    kpis: {
      ventas: totalVentas, costo: totalCosto, ganancia: totalVentas - totalCosto,
      margen: pct(totalVentas - totalCosto, totalVentas), tickets,
      ticketPromedio: tickets ? totalVentas / tickets : 0,
      diasConVenta: conVenta.length, promedioDiario: conVenta.length ? totalVentas / conVenta.length : 0,
      mejorDia, peorDia,
    },
  };
}

/** Semanas del mes con margen y variación contra la semana anterior. */
export function filasSemanas(semanas: { semana: number; ventas: number; ganancia: number; dias: string }[]) {
  return semanas.map((w, i) => {
    const previa = i > 0 ? semanas[i - 1].ventas : 0;
    return {
      semana: `Semana ${w.semana}`, dias: w.dias, ventas: w.ventas, ganancia: w.ganancia,
      margen: pct(w.ganancia, w.ventas), variacion: i > 0 && previa > 0 ? ((w.ventas - previa) / previa) * 100 : null,
    };
  });
}

// ------------------------------------------------------------------ Anual

export type ResumenAnual = {
  kpis: {
    ventas: number; ganancia: number; margen: number; tickets: number; ticketPromedio: number;
    promedioMensual: number; mejorMes: { nombre: string; ventas: number } | null; peorMes: { nombre: string; ventas: number } | null;
  };
  meses: {
    mes: string; tickets: number; ventas: number; ganancia: number; margen: number;
    ticketPromedio: number; participacion: number; variacion: number | null;
  }[];
  metodos: { metodo: string; monto: number; porcentaje: number }[];
  horarios: { horario: string; tickets: number; ventas: number; ticketPromedio: number; porcentaje: number }[];
  liderPorHorario: { horario: string; unitario: string; unitarioQty: string; granel: string; granelQty: string }[];
  topUnitarios: TopRow[];
  topGranel: TopRow[];
};
export type TopRow = { pos: number; nombre: string; cantidadTxt: string; total: number; porcentaje: number };

export function resumenAnual(
  data: ReporteAnualDTO | null,
  formatearCantidad: (c: number, g: boolean) => string,
): ResumenAnual | null {
  if (!data) return null;
  const meses = data.meses || [];
  const ventas = n(data.ventasTotales);
  const tickets = meses.reduce((s, m) => s + n(m.numeroVentas), 0);
  const conVenta = meses.filter(m => n(m.ventas) > 0);
  const mejor = conVenta.length ? conVenta.reduce((a, b) => (n(b.ventas) > n(a.ventas) ? b : a)) : null;
  const peor = conVenta.length ? conVenta.reduce((a, b) => (n(b.ventas) < n(a.ventas) ? b : a)) : null;

  const metodos = [
    { metodo: 'Efectivo', monto: n(data.ventasEfectivo) },
    { metodo: 'Transferencia', monto: n(data.ventasTransferencia) },
    { metodo: 'Tarjeta', monto: n(data.ventasTarjeta) },
  ].map(m => ({ ...m, porcentaje: pct(m.monto, ventas) }));

  const totalHorarios = (data.ventasPorHorario || []).reduce((s, h) => s + n(h.totalVentas), 0);
  const horarios = (data.ventasPorHorario || []).map(h => ({
    horario: h.horario, tickets: n(h.numeroVentas), ventas: n(h.totalVentas),
    ticketPromedio: n(h.numeroVentas) ? n(h.totalVentas) / n(h.numeroVentas) : 0,
    porcentaje: pct(n(h.totalVentas), totalHorarios),
  }));

  const lider = (horario: string, g: boolean) =>
    (data.productosPorHorario || [])
      .filter(p => p.horario === horario && p.isGramaje === g)
      .sort((a, b) => n(b.cantidadVendida) - n(a.cantidadVendida))[0];
  const liderPorHorario = [...new Set((data.productosPorHorario || []).map(p => p.horario))].map(h => {
    const u = lider(h, false), g = lider(h, true);
    return {
      horario: h,
      unitario: u?.nombreProducto || '—', unitarioQty: u ? formatearCantidad(n(u.cantidadVendida), false) : '',
      granel: g?.nombreProducto || '—', granelQty: g ? formatearCantidad(n(g.cantidadVendida), true) : '',
    };
  });

  const top = (lista: ReporteAnualDTO['topProductosUnitarios'] | undefined, g: boolean): TopRow[] =>
    (lista || []).map((p, i) => ({
      pos: i + 1, nombre: p.nombreProducto, cantidadTxt: formatearCantidad(n(p.cantidadVendida), g),
      total: n(p.totalVendido), porcentaje: pct(n(p.totalVendido), ventas),
    }));

  return {
    kpis: {
      ventas, ganancia: n(data.gananciaTotal), margen: pct(n(data.gananciaTotal), ventas), tickets,
      ticketPromedio: tickets ? ventas / tickets : 0,
      promedioMensual: conVenta.length ? ventas / conVenta.length : 0,
      mejorMes: mejor ? { nombre: mejor.nombreMes, ventas: n(mejor.ventas) } : null,
      peorMes: peor ? { nombre: peor.nombreMes, ventas: n(peor.ventas) } : null,
    },
    meses: meses.map(m => ({
      mes: m.nombreMes, tickets: n(m.numeroVentas), ventas: n(m.ventas), ganancia: n(m.ganancia),
      margen: pct(n(m.ganancia), n(m.ventas)), ticketPromedio: n(m.numeroVentas) ? n(m.ventas) / n(m.numeroVentas) : 0,
      participacion: pct(n(m.ventas), ventas), variacion: n(m.ventas) > 0 || n(m.porcentajeCambio) !== 0 ? n(m.porcentajeCambio) : null,
    })),
    metodos, horarios, liderPorHorario,
    topUnitarios: top(data.topProductosUnitarios, false),
    topGranel: top(data.topProductosGranel, true),
  };
}
