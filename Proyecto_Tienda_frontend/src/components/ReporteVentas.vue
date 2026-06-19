<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Line } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

type VentasDetalleListDTO = {
  idVentaDetalle: number;
  idVenta: number;
  idProducto: number;
  productoNombre: string;
  productoPrecioCosto: number;
  productoIsGramaje: boolean;
  productoCategoria: string;
  productoSubcategoria: string;
  cantidad: number;
  precioUnitarioVenta: number;
  tipoPrecioAplicado: string;
  cobroEnvase?: boolean;
  cantidadEnvase?: number;
  cobroEnvaseTotal?: number;
  Venta: {
    idVenta?: number;
    fechaVenta: string;
    metodoPago: string;
    montoTotal: number;
    estatus: string;
  };
};

type ProductoStats = {
  nombre: string;
  cantidadTotal: number;
  montoTotal: number;
  costoTotal: number;
  gananciaTotal: number;
  isGramaje: boolean;
};

type MetodoStats = {
  metodo: string;
  cantidad: number;
  monto: number;
};

type CategoriaStats = {
  categoria: string;
  subcategoria: string;
  cantidad: number;
  monto: number;
  ganancia: number;
};

type CategoriaJerarquica = {
  categoria: string;
  totalMonto: number;
  totalCantidad: number;
  totalGanancia: number;
  subcategorias: { nombre: string; monto: number; cantidad: number; ganancia: number }[];
};

type DiaStats = {
  fecha: string;
  label: string;
  ventas: number;
  monto: number;
  ganancia: number;
};

type MovimientoCaja = {
  idCaja: number;
  fechaMovimiento: string;
  tipoMovimiento: string;
  monto: number;
  descripcion: string;
  saldoResultante: number;
  montoInicial?: number;
};

const entradasCaja = ref<MovimientoCaja[]>([]);
const salidasCaja = ref<MovimientoCaja[]>([]);
const montoInicialPeriodo = ref<number>(0);
const aperturasPorDia = ref<Map<string, number>>(new Map());

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const periodo = ref<'dia' | 'semana' | 'mes' | 'anio'>('mes');
const fechaSeleccionada = ref('');
const detalles = ref<VentasDetalleListDTO[]>([]);
const cargando = ref(false);
const modalCategoriaOpen = ref(false);
const categoriaSeleccionada = ref('');
const subCategoriaSeleccionada = ref('');

const ventasMap = computed(() => {
  const map = new Map<number, { 
    idVenta: number; 
    fecha: string; 
    metodoPago: string; 
    montoTotal: number; 
    detalles: VentasDetalleListDTO[] 
  }>();
  
  for (const d of detalles.value) {
    const ventaId = d.Venta?.idVenta || d.idVenta;
    if (!ventaId) continue;
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    
    if (!map.has(ventaId)) {
      map.set(ventaId, {
        idVenta: ventaId,
        fecha: d.Venta.fechaVenta || '',
        metodoPago: d.Venta.metodoPago || 'N/D',
        montoTotal: Number(d.Venta.montoTotal || 0),
        detalles: []
      });
    }
    map.get(ventaId)!.detalles.push(d);
  }
  return map;
});

const productosTop = computed<ProductoStats[]>(() => {
  const map = new Map<string, ProductoStats>();
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    
    const key = d.productoNombre || 'Sin nombre';
    const existing = map.get(key);
    const cantidad = Number(d.cantidad || 0);
    const precioVenta = Number(d.precioUnitarioVenta || 0);
    const precioCostoKg = Number(d.productoPrecioCosto || 0);
    
    let monto: number;
    let costo: number;
    
    if (d.productoIsGramaje) {
      monto = precioVenta * (cantidad / 1000);
      costo = (precioCostoKg / 1000) * cantidad;
    } else {
      monto = precioVenta * cantidad;
      costo = precioCostoKg * cantidad;
    }
    
    const ganancia = monto - costo;
    
    if (existing) {
      existing.cantidadTotal += cantidad;
      existing.montoTotal += monto;
      existing.costoTotal += costo;
      existing.gananciaTotal += ganancia;
    } else {
      map.set(key, {
        nombre: key,
        cantidadTotal: cantidad,
        montoTotal: monto,
        costoTotal: costo,
        gananciaTotal: ganancia,
        isGramaje: d.productoIsGramaje || false
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.montoTotal - a.montoTotal).slice(0, 15);
});

const productosUnitarios = computed<ProductoStats[]>(() => {
  return productosTop.value.filter(p => !p.isGramaje).slice(0, 10);
});

const productosGramaje = computed<ProductoStats[]>(() => {
  return productosTop.value.filter(p => p.isGramaje).slice(0, 10);
});

const productosTopGanancia = computed<ProductoStats[]>(() => {
  return [...productosTop.value].sort((a, b) => b.gananciaTotal - a.gananciaTotal).slice(0, 10);
});

const productosUnitariosGanancia = computed<ProductoStats[]>(() => {
  return productosTopGanancia.value.filter(p => !p.isGramaje).slice(0, 10);
});

const productosGramajeGanancia = computed<ProductoStats[]>(() => {
  return productosTopGanancia.value.filter(p => p.isGramaje).slice(0, 10);
});

const metodosStats = computed<MetodoStats[]>(() => {
  const map = new Map<string, MetodoStats>();
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    const metodo = d.Venta.metodoPago || 'N/D';
    const monto = d.tipoPrecioAplicado === 'VENTA_GRAMAJE'
      ? Number(d.precioUnitarioVenta || 0)
      : Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0);
    const existing = map.get(metodo);
    if (existing) {
      existing.cantidad += 1;
      existing.monto += monto;
    } else {
      map.set(metodo, { metodo, cantidad: 1, monto });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.monto - a.monto);
});

const categoriasJerarquicas = computed<CategoriaJerarquica[]>(() => {
  const catMap = new Map<string, CategoriaJerarquica>();
  const subMap = new Map<string, Map<string, { nombre: string; monto: number; cantidad: number; ganancia: number }>>();
  
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    const cat = d.productoCategoria || 'Sin categoría';
    const subRaw = d.productoSubcategoria || '';
    const sub = (!subRaw || subRaw === '-' || subRaw.toLowerCase() === 'general') ? 'Sin subcategoría' : subRaw;
    const cantidad = Number(d.cantidad || 0);
    const precioCostoKg = Number(d.productoPrecioCosto || 0);
    const precioVenta = Number(d.precioUnitarioVenta || 0);
    
    let monto: number;
    let costo: number;
    
    if (d.tipoPrecioAplicado === 'VENTA_GRAMAJE') {
      monto = precioVenta;
      costo = (precioCostoKg / 1000) * cantidad;
    } else {
      monto = precioVenta * cantidad;
      costo = precioCostoKg * cantidad;
    }
    
    const ganancia = monto - costo;
    
    if (!catMap.has(cat)) {
      catMap.set(cat, { categoria: cat, totalMonto: 0, totalCantidad: 0, totalGanancia: 0, subcategorias: [] });
      subMap.set(cat, new Map());
    }
    
    const catEntry = catMap.get(cat)!;
    catEntry.totalMonto += monto;
    catEntry.totalCantidad += cantidad;
    catEntry.totalGanancia += ganancia;
    
    const subCatMap = subMap.get(cat)!;
    if (!subCatMap.has(sub)) {
      subCatMap.set(sub, { nombre: sub, monto: 0, cantidad: 0, ganancia: 0 });
    }
    const subEntry = subCatMap.get(sub)!;
    subEntry.monto += monto;
    subEntry.cantidad += cantidad;
    subEntry.ganancia += ganancia;
  }
  
  for (const [cat, subCatMap] of subMap.entries()) {
    const catEntry = catMap.get(cat)!;
    catEntry.subcategorias = Array.from(subCatMap.values()).sort((a, b) => b.monto - a.monto);
  }
  
  return Array.from(catMap.values()).sort((a, b) => b.totalMonto - a.totalMonto);
});

const categoriasStats = computed<CategoriaStats[]>(() => {
  const result: CategoriaStats[] = [];
  for (const cat of categoriasJerarquicas.value) {
    result.push({
      categoria: cat.categoria,
      subcategoria: '',
      cantidad: cat.totalCantidad,
      monto: cat.totalMonto,
      ganancia: cat.totalGanancia
    });
    for (const sub of cat.subcategorias) {
      result.push({
        categoria: cat.categoria,
        subcategoria: sub.nombre,
        cantidad: sub.cantidad,
        monto: sub.monto,
        ganancia: sub.ganancia
      });
    }
  }
  return result;
});

const ventasPorDia = computed<DiaStats[]>(() => {
  const map = new Map<string, DiaStats>();
  
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    if (!d.Venta.fechaVenta) continue;
    
    const fechaStr = d.Venta.fechaVenta;
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) continue;
    
    const precioVenta = Number(d.precioUnitarioVenta || 0);
    const cantidad = Number(d.cantidad || 0);
    const precioCostoKg = Number(d.productoPrecioCosto || 0);
    
    let monto: number;
    let costo: number;
    
    // Monto: usa tipoPrecioAplicado (como el backend)
    if (d.tipoPrecioAplicado === 'VENTA_GRAMAJE') {
      monto = precioVenta;
    } else {
      monto = precioVenta * cantidad;
    }
    
    // Costo: usa productoIsGramaje (como el backend)
    if (d.productoIsGramaje) {
      costo = (precioCostoKg / 1000) * cantidad;
    } else {
      costo = precioCostoKg * cantidad;
    }
    const ganancia = monto - costo;
    
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const h = fecha.getHours();
    
    let key: string;
    let label: string;
    
    if (periodo.value === 'dia') {
      key = `${y}-${m}-${day}-${String(h).padStart(2, '0')}`;
      label = `${h.toString().padStart(2, '0')}:00`;
    } else if (periodo.value === 'semana') {
      key = `${y}-${m}-${day}`;
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      label = `${dias[fecha.getDay()]} ${fecha.getDate()}`;
    } else if (periodo.value === 'mes') {
      key = `${y}-${m}-${day}`;
      label = `${fecha.getDate()}`;
    } else {
      key = `${y}-${m}`;
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      label = meses[fecha.getMonth()];
    }
    
    const existing = map.get(key);
    if (existing) {
      existing.ventas += 1;
      existing.monto += monto;
      existing.ganancia += ganancia;
    } else {
      map.set(key, { fecha: key, label, ventas: 1, monto, ganancia });
    }
  }
  
  const sorted = Array.from(map.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  
  if (periodo.value === 'dia' && sorted.length > 0) {
    const firstParts = sorted[0].fecha.split('-');
    const baseHour = parseInt(firstParts[3], 10);
    const lastParts = sorted[sorted.length - 1].fecha.split('-');
    const lastHour = parseInt(lastParts[3], 10);
    const baseDate = `${firstParts[0]}-${firstParts[1]}-${firstParts[2]}`;
    
    const result: DiaStats[] = [];
    for (let hour = baseHour; hour <= lastHour; hour++) {
      const key = `${baseDate}-${String(hour).padStart(2, '0')}`;
      const existing = map.get(key);
      result.push(existing || {
        fecha: key,
        label: `${hour.toString().padStart(2, '0')}:00`,
        ventas: 0,
        monto: 0,
        ganancia: 0
      });
    }
    return result;
  }
  
  if (periodo.value === 'semana' && sorted.length > 0) {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const firstParts = sorted[0].fecha.split('-');
    const firstDate = new Date(parseInt(firstParts[0]), parseInt(firstParts[1]) - 1, parseInt(firstParts[2]));
    const result: DiaStats[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(firstDate);
      day.setDate(firstDate.getDate() + i);
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      const existing = map.get(key);
      result.push(existing || {
        fecha: key,
        label: `${dias[day.getDay()]} ${day.getDate()}`,
        ventas: 0,
        monto: 0,
        ganancia: 0
      });
    }
    return result;
  }
  
  return sorted;
});

const totalVentas = computed(() => ventasMap.value.size);
const totalMonto = computed(() => {
  let sum = 0;
  for (const v of ventasMap.value.values()) {
    sum += v.montoTotal;
  }
  return sum;
});
const totalCosto = computed(() => {
  let sum = 0;
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    const cantidad = Number(d.cantidad || 0);
    const precioCostoKg = Number(d.productoPrecioCosto || 0);
    if (d.productoIsGramaje) {
      sum += (precioCostoKg / 1000) * cantidad;
    } else {
      sum += precioCostoKg * cantidad;
    }
  }
  return sum;
});
const totalGanancia = computed(() => totalMonto.value - totalCosto.value);
const ticketPromedio = computed(() => {
  if (totalVentas.value === 0) return 0;
  return Math.round((totalMonto.value / totalVentas.value) * 100) / 100;
});

const diasEnPeriodo = computed(() => {
  const now = new Date();
  if (periodo.value === 'dia') return 1;
  if (periodo.value === 'semana') return 7;
  if (periodo.value === 'anio') return 365;
  
  // Mes
  const mesStr = fechaSeleccionada.value || now.toISOString().slice(0, 7);
  const [y, m] = mesStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
});

const etiquetaPromedio = computed(() => {
  if (periodo.value === 'dia') return 'Ventas del Día';
  if (periodo.value === 'anio') return 'Promedio Mensual';
  return 'Promedio Diario';
});

const valorPromedio = computed(() => {
  if (periodo.value === 'anio') {
    return Math.round((totalVentas.value / 12) * 10) / 10;
  }
  if (diasEnPeriodo.value === 0) return 0;
  return Math.round((totalVentas.value / diasEnPeriodo.value) * 10) / 10;
});
const productosUnicos = computed(() => new Set(detalles.value.map(d => d.idProducto)).size);

const gananciaPromedioDia = computed(() => {
  if (diasEnPeriodo.value === 0) return 0;
  return Math.round((totalGanancia.value / diasEnPeriodo.value) * 100) / 100;
});

const ventasPromedioDia = computed(() => {
  if (diasEnPeriodo.value === 0) return 0;
  return Math.round((totalMonto.value / diasEnPeriodo.value) * 100) / 100;
});

const totalAbonos = computed(() => {
  let sum = 0;
  for (const v of ventasMap.value.values()) {
    if (v.metodoPago?.startsWith('ABONO/')) sum += v.montoTotal;
  }
  return Math.round(sum * 100) / 100;
});

const totalTransferencias = computed(() => {
  let sum = 0;
  for (const v of ventasMap.value.values()) {
    if (v.metodoPago === 'TRANSFERENCIA') sum += v.montoTotal;
  }
  return Math.round(sum * 100) / 100;
});

const totalTarjetas = computed(() => {
  let sum = 0;
  for (const v of ventasMap.value.values()) {
    if (v.metodoPago === 'TARJETA') sum += v.montoTotal;
  }
  return Math.round(sum * 100) / 100;
});

const totalEnvases = computed(() => {
  let sum = 0;
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    sum += Number(d.cobroEnvaseTotal || 0);
  }
  return Math.round(sum * 100) / 100;
});

const modalMovimientosOpen = ref(false);
const movimientosTitulo = ref('');
const movimientosLista = ref<MovimientoCaja[]>([]);
const editandoMovimientoId = ref<number | null>(null);
const editandoDescripcion = ref('');
const guardandoDescripcion = ref(false);

function abrirMovimientos(tipo: 'entradas' | 'salidas') {
  editandoMovimientoId.value = null;
  movimientosTitulo.value = tipo === 'entradas' ? 'Entradas de Efectivo' : 'Salidas de Efectivo';
  const datos = tipo === 'entradas' ? entradasCaja.value : salidasCaja.value;
  movimientosLista.value = [...datos].sort((a, b) =>
    new Date(b.fechaMovimiento).getTime() - new Date(a.fechaMovimiento).getTime()
  );
  modalMovimientosOpen.value = true;
}

function formatearFechaHora(fecha?: string) {
  if (!fecha) return 'N/A';
  const d = new Date(fecha);
  return d.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function iniciarEdicionDescripcion(m: MovimientoCaja) {
  editandoMovimientoId.value = m.idCaja;
  editandoDescripcion.value = m.descripcion || '';
}

function cancelarEdicionDescripcion() {
  editandoMovimientoId.value = null;
  editandoDescripcion.value = '';
}

async function guardarDescripcion(id: number) {
  guardandoDescripcion.value = true;
  try {
    const res = await fetch(`${API_BASE}/caja/${id}/descripcion`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descripcion: editandoDescripcion.value })
    });
    const json = await res.json();
    if (json.codigo === 200) {
      const idx = movimientosLista.value.findIndex(m => m.idCaja === id);
      if (idx !== -1) movimientosLista.value[idx].descripcion = editandoDescripcion.value;
      editandoMovimientoId.value = null;
    } else {
      alert('Error al guardar: ' + json.mensaje);
    }
  } catch (e) {
    alert('Error de red al actualizar descripción');
  } finally {
    guardandoDescripcion.value = false;
  }
}

const flujoDineroPorDia = computed(() => {
  const map = new Map<string, { entradas: number; salidas: number; ventas: number; label: string }>();
  
  for (const dia of ventasPorDia.value) {
    const key = dia.fecha;
    if (!map.has(key)) {
      map.set(key, { entradas: 0, salidas: 0, ventas: 0, label: dia.label });
    }
    const existing = map.get(key);
    if (existing) {
      existing.ventas += Number(dia.monto || 0);
    }
  }
  
  function getKeyAndLabel(fecha: Date): { key: string; label: string } {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const h = fecha.getHours();
    
    if (periodo.value === 'dia') {
      return { key: `${y}-${m}-${day}-${String(h).padStart(2, '0')}`, label: `${h.toString().padStart(2, '0')}:00` };
    } else if (periodo.value === 'semana') {
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return { key: `${y}-${m}-${day}`, label: `${dias[fecha.getDay()]} ${fecha.getDate()}` };
    } else if (periodo.value === 'mes') {
      return { key: `${y}-${m}-${day}`, label: `${fecha.getDate()}` };
    } else {
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return { key: `${y}-${m}`, label: meses[fecha.getMonth()] };
    }
  }
  
  for (const entrada of entradasCaja.value) {
    if (!entrada.fechaMovimiento) continue;
    const fecha = new Date(entrada.fechaMovimiento);
    if (isNaN(fecha.getTime())) continue;
    
    const { key, label } = getKeyAndLabel(fecha);
    if (!map.has(key)) {
      map.set(key, { entradas: 0, salidas: 0, ventas: 0, label });
    }
    const existing = map.get(key);
    if (existing) {
      existing.entradas += Number(entrada.monto || 0);
    }
  }
  
  for (const salida of salidasCaja.value) {
    if (!salida.fechaMovimiento) continue;
    const fecha = new Date(salida.fechaMovimiento);
    if (isNaN(fecha.getTime())) continue;
    
    const { key, label } = getKeyAndLabel(fecha);
    if (!map.has(key)) {
      map.set(key, { entradas: 0, salidas: 0, ventas: 0, label });
    }
    const existing = map.get(key);
    if (existing) {
      existing.salidas += Number(salida.monto || 0);
    }
  }
  
  const sorted = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b));
  
  const totalVentasPeriodo = sorted.reduce((sum, [, val]) => sum + val.ventas, 0);
  const totalEntradasCajaPeriodo = sorted.reduce((sum, [, val]) => sum + val.entradas, 0);
  const totalSalidasPeriodo = sorted.reduce((sum, [, val]) => sum + val.salidas, 0);
  const disponibleReal = montoInicialPeriodo.value + totalVentasPeriodo + totalEntradasCajaPeriodo;
  
  const resultado = [];
  let saldoEnCaja = montoInicialPeriodo.value;
  
  for (const [key, val] of sorted) {
    const aperturaDia = aperturasPorDia.value.get(key) ?? saldoEnCaja;
    const montoInicialDia = periodo.value === 'dia' ? saldoEnCaja : aperturaDia;
    
    const ventasDia = val.ventas;
    const entradasManualesDia = val.entradas;
    const salidasDia = val.salidas;
    const totalIngresosDia = ventasDia + entradasManualesDia;
    
    const saldoInicio = montoInicialDia;
    const saldoFinal = saldoInicio + totalIngresosDia - salidasDia;
    
    if (periodo.value === 'dia') {
      saldoEnCaja = saldoFinal;
    }
    
    resultado.push({
      fecha: key,
      label: val.label,
      montoInicial: resultado.length === 0 ? montoInicialPeriodo.value : 0,
      ventas: Math.round(ventasDia * 100) / 100,
      entradasManuales: Math.round(entradasManualesDia * 100) / 100,
      salidas: Math.round(salidasDia * 100) / 100,
      saldoInicio: Math.round(saldoInicio * 100) / 100,
      saldoFinal: Math.round(saldoFinal * 100) / 100,
      apertura: Math.round(montoInicialDia * 100) / 100
    });
  }
  
  return resultado;
});

const totalEntradas = computed(() => {
  return entradasCaja.value.reduce((sum, e) => sum + Number(e.monto || 0), 0);
});

const totalSalidas = computed(() => {
  return salidasCaja.value.reduce((sum, s) => sum + Number(s.monto || 0), 0);
});

const totalVentasPeriodo = computed(() => {
  return ventasPorDia.value.reduce((sum, d) => sum + d.monto, 0);
});

const flujoNeto = computed(() => {
  return montoInicialPeriodo.value + totalVentasPeriodo.value + totalEntradas.value - totalSalidas.value;
});

const chartColors = ['#c99234', '#28a745', '#17a2b8', '#dc3545', '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#007bff', '#ffc107', '#6610f2', '#e83e8c', '#20c997', '#fd7e14', '#17a2b8', '#6c757d'];

const chartVentasCategoria = computed(() => {
  const categorias = categoriasJerarquicas.value;
  const allSubs = new Set<string>();
  for (const cat of categorias) {
    for (const sub of cat.subcategorias) {
      allSubs.add(sub.nombre);
    }
  }
  const subNames = Array.from(allSubs).sort();
  
  const datasets = subNames.map((subName, idx) => ({
    label: subName,
    data: categorias.map(cat => {
      const sub = cat.subcategorias.find(s => s.nombre === subName);
      return sub ? Math.round(sub.monto * 100) / 100 : 0;
    }),
    backgroundColor: chartColors[idx % chartColors.length],
    borderRadius: 4,
    borderSkipped: false
  }));
  
  return {
    labels: categorias.map(c => c.categoria),
    datasets
  };
});

const chartGananciaCategoria = computed(() => {
  const categorias = categoriasJerarquicas.value;
  const allSubs = new Set<string>();
  for (const cat of categorias) {
    for (const sub of cat.subcategorias) {
      allSubs.add(sub.nombre);
    }
  }
  const subNames = Array.from(allSubs).sort();
  
  const datasets = subNames.map((subName, idx) => ({
    label: subName,
    data: categorias.map(cat => {
      const sub = cat.subcategorias.find(s => s.nombre === subName);
      return sub ? Math.round(sub.ganancia * 100) / 100 : 0;
    }),
    backgroundColor: chartColors[idx % chartColors.length] + '99',
    borderColor: chartColors[idx % chartColors.length],
    borderWidth: 1,
    borderRadius: 4,
    borderSkipped: false
  }));
  
  return {
    labels: categorias.map(c => c.categoria),
    datasets
  };
});

const chartTopProductos = computed(() => ({
  labels: productosTop.value.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 20) + '...' : p.nombre),
  datasets: [{
    label: 'Monto ($)',
    data: productosTop.value.map(p => Math.round(p.montoTotal * 100) / 100),
    backgroundColor: chartColors.slice(0, productosTop.value.length),
    borderRadius: 6,
    borderSkipped: false
  }]
}));

const chartTopCantidad = computed(() => ({
  labels: productosUnitarios.value.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 20) + '...' : p.nombre),
  datasets: [{
    label: 'Cantidad (Unitarios)',
    data: productosUnitarios.value.map(p => p.cantidadTotal),
    backgroundColor: chartColors.slice(0, productosUnitarios.value.length).map(c => c + '99'),
    borderColor: chartColors.slice(0, productosUnitarios.value.length),
    borderWidth: 2,
    borderRadius: 6,
    borderSkipped: false
  }]
}));

const chartTopGramaje = computed(() => ({
  labels: productosGramaje.value.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 20) + '...' : p.nombre),
  datasets: [{
    label: 'Cantidad (Gramaje)',
    data: productosGramaje.value.map(p => p.cantidadTotal),
    backgroundColor: chartColors.slice(0, productosGramaje.value.length).map(c => c + '99'),
    borderColor: chartColors.slice(0, productosGramaje.value.length),
    borderWidth: 2,
    borderRadius: 6,
    borderSkipped: false
  }]
}));

const chartTopGanancia = computed(() => ({
  labels: productosTopGanancia.value.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 20) + '...' : p.nombre),
  datasets: [{
    label: 'Ganancia ($)',
    data: productosTopGanancia.value.map(p => Math.round(p.gananciaTotal * 100) / 100),
    backgroundColor: chartColors.slice(0, productosTopGanancia.value.length),
    borderRadius: 6,
    borderSkipped: false
  }]
}));

const chartGananciaUnitarios = computed(() => ({
  labels: productosUnitariosGanancia.value.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 20) + '...' : p.nombre),
  datasets: [{
    label: 'Ganancia Unitarios ($)',
    data: productosUnitariosGanancia.value.map(p => Math.round(p.gananciaTotal * 100) / 100),
    backgroundColor: '#28a745',
    borderRadius: 6,
    borderSkipped: false
  }]
}));

const chartGananciaGramaje = computed(() => ({
  labels: productosGramajeGanancia.value.map(p => p.nombre.length > 20 ? p.nombre.slice(0, 20) + '...' : p.nombre),
  datasets: [{
    label: 'Ganancia Gramaje ($)',
    data: productosGramajeGanancia.value.map(p => Math.round(p.gananciaTotal * 100) / 100),
    backgroundColor: '#17a2b8',
    borderRadius: 6,
    borderSkipped: false
  }]
}));

const rangoActual = computed(() => {
  const now = new Date();
  let fechaInicio: string;
  let fechaFin: string;
  
  if (periodo.value === 'dia') {
    fechaInicio = fechaSeleccionada.value || now.toISOString().slice(0, 10);
    fechaFin = fechaInicio;
  } else if (periodo.value === 'semana') {
    const start = fechaSeleccionada.value ? parseLocalDate(fechaSeleccionada.value) : new Date(now);
    const dayOfWeek = start.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    start.setDate(start.getDate() - daysToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    fechaInicio = start.toISOString().slice(0, 10);
    fechaFin = end.toISOString().slice(0, 10);
  } else if (periodo.value === 'mes') {
    const mesStr = fechaSeleccionada.value || now.toISOString().slice(0, 7);
    fechaInicio = `${mesStr}-01`;
    const [y, m] = mesStr.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    fechaFin = `${mesStr}-${lastDay}`;
  } else {
    const anio = fechaSeleccionada.value || now.getFullYear().toString();
    fechaInicio = `${anio}-01-01`;
    fechaFin = `${anio}-12-31`;
  }
  
  return { inicio: fechaInicio, fin: fechaFin };
});

const chartMetodos = computed(() => ({
  labels: metodosStats.value.map(m => m.metodo),
  datasets: [{
    data: metodosStats.value.map(m => Math.round(m.monto * 100) / 100),
    backgroundColor: chartColors.slice(0, metodosStats.value.length),
    borderWidth: 0
  }]
}));

const chartTendencia = computed(() => ({
  labels: ventasPorDia.value.map(d => d.label),
  datasets: [
    {
      label: 'Monto ($)',
      data: ventasPorDia.value.map(d => Math.round(d.monto * 100) / 100),
      borderColor: '#c99234',
      backgroundColor: '#c9923422',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    },
    {
      label: 'Ganancia ($)',
      data: ventasPorDia.value.map(d => Math.round(d.ganancia * 100) / 100),
      borderColor: '#28a745',
      backgroundColor: '#28a74522',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    },
    {
      label: 'Ventas',
      data: ventasPorDia.value.map(d => d.ventas),
      borderColor: '#4a90d9',
      backgroundColor: '#4a90d922',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: 'y1'
    }
  ]
}));

const chartFlujoDinero = computed(() => {
  const datos = flujoDineroPorDia.value;
  const saldos = datos.map(d => d.saldoFinal);
  const media = saldos.length > 0 ? saldos.reduce((a, b) => a + b, 0) / saldos.length : 0;

  return {
    labels: datos.map(d => d.label),
    datasets: [{
      type: 'line' as const,
      label: 'Saldo Final en Caja ($)',
      data: saldos,
      borderColor: '#c99234',
      backgroundColor: '#c9923415',
      fill: true,
      tension: 0.35,
      pointRadius: 14,
      pointHoverRadius: 18,
      pointBackgroundColor: 'transparent',
      pointBorderColor: 'transparent',
      pointBorderWidth: 0,
      borderWidth: 4,
      segment: {
        borderColor: (ctx: any) => {
          const y1 = ctx.p0.parsed.y;
          const y2 = ctx.p1.parsed.y;
          if (y1 > media && y2 > media) return '#28a745';
          if (y1 < media && y2 < media) return '#dc3545';
          return '#ffc107';
        }
      }
    }]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label || ''}: $${ctx.parsed.toLocaleString('es-MX')}`
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#888', maxRotation: 45, font: { size: 11 } },
      grid: { color: '#33333344' }
    },
    y: {
      ticks: { color: '#888', font: { size: 11 } },
      grid: { color: '#33333344' },
      beginAtZero: true
    },
    y1: {
      position: 'right' as const,
      ticks: { color: '#28a745', font: { size: 11 } },
      grid: { drawOnChartArea: false },
      beginAtZero: true
    }
  }
};

const chartOptionsTendencia = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const, labels: { color: '#f6f2de', font: { size: 12 }, padding: 16 } },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8,
      mode: 'index' as const,
      intersect: false,
      callbacks: {
        label: (ctx: any) => {
          const val = ctx.parsed.y;
          if (ctx.dataset.label.includes('$')) {
            return ` ${ctx.dataset.label}: $${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
          return ` ${ctx.dataset.label}: ${val}`;
        }
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#888', maxRotation: 45, font: { size: 11 } },
      grid: { color: '#33333344' }
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      ticks: { color: '#c99234', font: { size: 11 }, callback: (v: any) => `$${v}` },
      grid: { color: '#33333344' },
      beginAtZero: true,
      title: { display: true, text: 'Monto / Ganancia ($)', color: '#c99234' }
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      ticks: { color: '#4a90d9', font: { size: 11 } },
      grid: { drawOnChartArea: false },
      beginAtZero: true,
      title: { display: true, text: 'Cantidad', color: '#28a745' }
    }
  },
  interaction: {
    mode: 'index' as const,
    intersect: false
  }
};

const chartOptionsBar = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label || 'Valor'}: ${ctx.parsed.x.toLocaleString('es-MX')}`
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#888', font: { size: 11 } },
      grid: { color: '#33333344' },
      beginAtZero: true
    },
    y: {
      ticks: { color: '#f6f2de', font: { size: 11 } },
      grid: { display: false }
    }
  }
};

const productosCategoriaSeleccionada = computed<ProductoStats[]>(() => {
  if (!categoriaSeleccionada.value) return [];
  const map = new Map<string, ProductoStats>();
  for (const d of detalles.value) {
    if (!d.Venta || !['C', 'F'].includes(d.Venta.estatus)) continue;
    if (d.productoCategoria !== categoriaSeleccionada.value) continue;
    
    const subCat = d.productoSubcategoria || '';
    const subCatNormalizada = (!subCat || subCat === '-' || subCat.toLowerCase() === 'general') ? 'Sin subcategoría' : subCat;
    const esSinSub = subCategoriaSeleccionada.value === 'Sin subcategoría';
    if (esSinSub) {
      if (subCatNormalizada !== 'Sin subcategoría') continue;
    } else if (subCategoriaSeleccionada.value && subCatNormalizada !== subCategoriaSeleccionada.value) {
      continue;
    }
    
    const key = d.productoNombre || 'Sin nombre';
    const existing = map.get(key);
    const cantidad = Number(d.cantidad || 0);
    const precioVenta = Number(d.precioUnitarioVenta || 0);
    const precioCostoKg = Number(d.productoPrecioCosto || 0);
    
    let monto: number;
    let costo: number;
    
    if (d.tipoPrecioAplicado === 'VENTA_GRAMAJE') {
      monto = precioVenta;
      costo = (precioCostoKg / 1000) * cantidad;
    } else {
      monto = precioVenta * cantidad;
      costo = precioCostoKg * cantidad;
    }
    
    const ganancia = monto - costo;
    
    if (existing) {
      existing.cantidadTotal += cantidad;
      existing.montoTotal += monto;
      existing.costoTotal += costo;
      existing.gananciaTotal += ganancia;
    } else {
      map.set(key, {
        nombre: key,
        cantidadTotal: cantidad,
        montoTotal: monto,
        costoTotal: costo,
        gananciaTotal: ganancia,
        isGramaje: d.productoIsGramaje || false
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.montoTotal - a.montoTotal);
});

const chartProductosCategoria = computed(() => ({
  labels: productosCategoriaSeleccionada.value.map(p => p.nombre.length > 25 ? p.nombre.slice(0, 25) + '...' : p.nombre),
  datasets: [
    {
      label: 'Monto ($)',
      data: productosCategoriaSeleccionada.value.map(p => Math.round(p.montoTotal * 100) / 100),
      backgroundColor: chartColors.slice(0, productosCategoriaSeleccionada.value.length),
      borderRadius: 6,
      borderSkipped: false
    },
    {
      label: 'Ganancia ($)',
      data: productosCategoriaSeleccionada.value.map(p => Math.round(p.gananciaTotal * 100) / 100),
      backgroundColor: chartColors.slice(0, productosCategoriaSeleccionada.value.length).map(c => c + '88'),
      borderColor: chartColors.slice(0, productosCategoriaSeleccionada.value.length),
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false
    }
  ]
}));

const chartOptionsProductosCategoria = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: {
    legend: { position: 'top' as const, labels: { color: '#f6f2de', font: { size: 11 }, padding: 12 } },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => ` ${ctx.dataset.label}: $${ctx.parsed.x.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#888', font: { size: 11 } },
      grid: { color: '#33333344' },
      beginAtZero: true
    },
    y: {
      stacked: true,
      ticks: { color: '#f6f2de', font: { size: 11 } },
      grid: { display: false }
    }
  }
};

function onCategoriaClick(event: any, elements: any[]) {
  if (elements.length > 0) {
    const el = elements[0];
    const catName = chartVentasCategoria.value.labels[el.index];
    const subName = chartVentasCategoria.value.datasets[el.datasetIndex]?.label;
    if (catName) {
      categoriaSeleccionada.value = catName as string;
      subCategoriaSeleccionada.value = (subName as string) || '';
      modalCategoriaOpen.value = true;
    }
  }
}

function cerrarModalCategoria() {
  modalCategoriaOpen.value = false;
  categoriaSeleccionada.value = '';
  subCategoriaSeleccionada.value = '';
}

const chartOptionsCategoria = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  onClick: onCategoriaClick,
  plugins: {
    legend: { position: 'top' as const, labels: { color: '#f6f2de', font: { size: 11 }, padding: 12, boxWidth: 14 } },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8,
      mode: 'nearest' as const,
      intersect: true,
      callbacks: {
        title: (items: any[]) => {
          if (!items.length) return '';
          const catName = items[0].label;
          const catData = categoriasJerarquicas.value.find(c => c.categoria === catName);
          return `${catName} — Total: $${catData ? Math.round(catData.totalMonto * 100) / 100 : 0}`;
        },
        label: (ctx: any) => {
          if (ctx.raw === 0) return '';
          return ` ${ctx.dataset.label}: $${ctx.parsed.x.toLocaleString('es-MX')}`;
        },
        labelColor: (ctx: any) => ({
          borderColor: ctx.dataset.borderColor || ctx.dataset.backgroundColor,
          backgroundColor: ctx.dataset.backgroundColor,
          borderWidth: 2
        }),
        filter: (item: any) => item.raw > 0
      }
    }
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#888', font: { size: 11 } },
      grid: { color: '#33333344' },
      beginAtZero: true
    },
    y: {
      stacked: true,
      ticks: { color: '#f6f2de', font: { size: 12, weight: 'bold' } },
      grid: { display: false }
    }
  }
};

const chartPieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { color: '#f6f2de', font: { size: 12 }, padding: 12 } },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: any) => ` ${ctx.label}: $${ctx.parsed.toLocaleString('es-MX')}`
      }
    }
  }
};

const chartOptionsFlujo = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#c99234',
      bodyColor: '#f6f2de',
      borderColor: '#c99234',
      borderWidth: 1,
      cornerRadius: 8,
      callbacks: {
        title: (items: any) => `📅 ${items[0].label}`,
        label: (ctx: any) => {
          const d = flujoDineroPorDia.value[ctx.dataIndex];
          if (!d) return '';
          const saldos = flujoDineroPorDia.value.map(x => x.saldoFinal);
          const media = saldos.length > 0 ? saldos.reduce((a, b) => a + b, 0) / saldos.length : 0;
          const diff = d.saldoFinal - media;
          const signo = diff >= 0 ? '+' : '';
          const estado = diff > 0 ? '📈 Sobre la media' : diff < 0 ? '📉 Bajo la media' : '➡️ En la media';
          return [
            ` Saldo: $${d.saldoFinal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            ` ${estado} (${signo}$${Math.abs(diff).toLocaleString('es-MX', { minimumFractionDigits: 2 })})`
          ];
        },
        afterBody: (items: any) => {
          const d = flujoDineroPorDia.value[items[0].dataIndex];
          if (!d) return '';
          return [
            '',
            `  Inicio: $${d.saldoInicio.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `  +Ventas: $${d.ventas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `  +Entradas: $${d.entradasManuales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `  -Salidas: -$${d.salidas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
          ];
        }
      }
    },
    afterDraw: (chart: any) => {
      const ctx = chart.ctx;
      const saldos = flujoDineroPorDia.value.map(d => d.saldoFinal);
      const media = saldos.length > 0 ? saldos.reduce((a, b) => a + b, 0) / saldos.length : 0;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '18px serif';

      const meta = chart.getDatasetMeta(0);
      meta.data.forEach((point: any, index: number) => {
        const saldo = saldos[index];
        const diff = saldo - media;
        let color;
        if (diff > media * 0.02) color = '#28a745';
        else if (diff < -media * 0.02) color = '#dc3545';
        else color = '#ffc107';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1a1a2e';
        ctx.font = 'bold 10px Courier New';
        ctx.fillText('$', point.x, point.y + 1);
      });

      ctx.restore();
    }
  },
  scales: {
    x: {
      ticks: { color: '#888', maxRotation: 45, font: { size: 11 } },
      grid: { color: '#33333344' }
    },
    y: {
      beginAtZero: false,
      ticks: { color: '#888', font: { size: 11 }, callback: (v: any) => `$${v}` },
      grid: { color: '#33333344' },
      title: { display: true, text: 'Saldo en Caja ($)', color: '#c99234' }
    }
  },
  interaction: {
    mode: 'index' as const,
    intersect: false
  }
}));

function inicializarFecha() {
  const now = new Date();
  if (periodo.value === 'dia') {
    fechaSeleccionada.value = now.toISOString().slice(0, 10);
  } else if (periodo.value === 'semana') {
    const startOfWeek = new Date(now);
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(now.getDate() - daysToMonday);
    fechaSeleccionada.value = startOfWeek.toISOString().slice(0, 10);
  } else if (periodo.value === 'mes') {
    fechaSeleccionada.value = now.toISOString().slice(0, 7);
  } else {
    fechaSeleccionada.value = now.getFullYear().toString();
  }
}

async function cargarDatos() {
  cargando.value = true;
  try {
    let fechaInicio: string;
    let fechaFin: string;
    const now = new Date();
    
    if (periodo.value === 'dia') {
      fechaInicio = fechaSeleccionada.value || now.toISOString().slice(0, 10);
      fechaFin = fechaInicio;
    } else if (periodo.value === 'semana') {
      const start = fechaSeleccionada.value ? parseLocalDate(fechaSeleccionada.value) : new Date(now);
      const dayOfWeek = start.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start.setDate(start.getDate() - daysToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      fechaInicio = start.toISOString().slice(0, 10);
      fechaFin = end.toISOString().slice(0, 10);
    } else if (periodo.value === 'mes') {
      const mesStr = fechaSeleccionada.value || now.toISOString().slice(0, 7);
      fechaInicio = `${mesStr}-01`;
      const [y, m] = mesStr.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      fechaFin = `${mesStr}-${lastDay}`;
    } else {
      const anio = fechaSeleccionada.value || now.getFullYear().toString();
      fechaInicio = `${anio}-01-01`;
      fechaFin = `${anio}-12-31`;
    }
    
    const url = `${API_BASE}/ventasDetalle/porPeriodo?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    console.log('ReporteVentas API call:', url);
    
    const res = await fetch(url);
    const data = await res.json();
    console.log('ReporteVentas response:', data.codigo, data.datos?.length || 0, 'detalles');
    if (data.codigo === 200) {
      detalles.value = data.datos || [];
    }
    
    const urlEntradas = `${API_BASE}/caja/entradas/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    const urlSalidas = `${API_BASE}/caja/egresos/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    const urlReporte = periodo.value === 'dia'
      ? `${API_BASE}/caja/reporteDiario/${fechaInicio}`
      : `${API_BASE}/caja/reporteDiario/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    const urlAperturas = `${API_BASE}/caja/aperturas/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
    
    const [resEntradas, resSalidas, resReporte, resAperturas] = await Promise.all([
      fetch(urlEntradas),
      fetch(urlSalidas),
      fetch(urlReporte),
      fetch(urlAperturas)
    ]);
    
    const dataEntradas = await resEntradas.json();
    const dataSalidas = await resSalidas.json();
    const dataReporte = await resReporte.json();
    const dataAperturas = await resAperturas.json();
    
    if (dataEntradas.codigo === 200) {
      entradasCaja.value = dataEntradas.datos || [];
    }
    if (dataSalidas.codigo === 200) {
      salidasCaja.value = dataSalidas.datos || [];
    }
    if (dataReporte.codigo === 200 && dataReporte.datos) {
      montoInicialPeriodo.value = Number(dataReporte.datos.montoInicial || 0);
    }
    if (dataAperturas.codigo === 200 && dataAperturas.datos) {
      const map = new Map<string, number>();
      for (const a of dataAperturas.datos) {
        map.set(a.fecha, Number(a.montoInicial || 0));
      }
      aperturasPorDia.value = map;
    }
  } catch (e) {
    console.error('Error al cargar reporte:', e);
  } finally {
    cargando.value = false;
  }
}

watch(periodo, () => {
  inicializarFecha();
  cargarDatos();
});

onMounted(() => {
  inicializarFecha();
  cargarDatos();
});

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function formatoCantidad(cantidad: number, isGramaje: boolean) {
  if (!isGramaje) return `${cantidad} pza`;
  if (cantidad >= 1000) {
    const kg = cantidad / 1000;
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg`;
  }
  return `${cantidad} g`;
}
</script>

<template>
  <div class="reporte-ventas">
    <header class="reporte-header">
      <h2 class="reporte-title">
        <span class="title-icon">📊</span>
        Reporte de Ventas
      </h2>
      <div class="reporte-controls">
        <div class="periodo-selector">
          <button 
            v-for="p in ['dia', 'semana', 'mes', 'anio']" 
            :key="p"
            :class="['periodo-btn', { active: periodo === p }]"
            @click="periodo = p as any"
          >
            {{ p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Año' }}
          </button>
        </div>
        <div class="fecha-selector">
          <input 
            v-if="periodo === 'dia'" 
            v-model="fechaSeleccionada" 
            type="date" 
            @change="cargarDatos"
          />
          <input 
            v-else-if="periodo === 'semana'" 
            v-model="fechaSeleccionada" 
            type="date" 
            @change="cargarDatos"
          />
          <input 
            v-else-if="periodo === 'mes'" 
            v-model="fechaSeleccionada" 
            type="month" 
            @change="cargarDatos"
          />
          <input 
            v-else 
            v-model="fechaSeleccionada" 
            type="number" 
            min="2020" 
            max="2030" 
            @change="cargarDatos"
          />
          <button class="btn-cargar" @click="cargarDatos" :disabled="cargando">
            {{ cargando ? '...' : 'Cargar' }}
          </button>
        </div>
      </div>
    </header>

    <div class="rango-actual">
      <span class="rango-label">📅 Rango consultado:</span>
      <span class="rango-fechas">{{ rangoActual.inicio }} → {{ rangoActual.fin }}</span>
      <span class="rango-detalle">({{ detalles.length }} detalles, {{ ventasMap.size }} ventas únicas)</span>
    </div>

    <div v-if="cargando" class="loading-state">
      <div class="loading-spinner"></div>
      <span>Cargando reporte...</span>
    </div>

    <template v-else>
      <div class="summary-cards">
        <div class="summary-card">
          <span class="summary-icon">🧾</span>
          <div class="summary-info">
            <span class="summary-label">Total Ventas</span>
            <span class="summary-value">{{ totalVentas }}</span>
          </div>
        </div>
        <div class="summary-card highlight">
          <span class="summary-icon">💰</span>
          <div class="summary-info">
            <span class="summary-label">Total Cobrado</span>
            <span class="summary-value">{{ formatoMoneda(totalMonto) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📉</span>
          <div class="summary-info">
            <span class="summary-label">Costo Total</span>
            <span class="summary-value">{{ formatoMoneda(totalCosto) }}</span>
          </div>
        </div>
        <div class="summary-card highlight ganancia">
          <span class="summary-icon">💵</span>
          <div class="summary-info">
            <span class="summary-label">Ganancia Neta</span>
            <span class="summary-value">{{ formatoMoneda(totalGanancia) }}</span>
          </div>
        </div>
        <div class="summary-card highlight ganancia">
          <span class="summary-icon">📊</span>
          <div class="summary-info">
            <span class="summary-label">Ganancia Prom. por Día</span>
            <span class="summary-value">{{ formatoMoneda(gananciaPromedioDia) }}</span>
          </div>
        </div>
        <div class="summary-card highlight">
          <span class="summary-icon">📅</span>
          <div class="summary-info">
            <span class="summary-label">Ventas Prom. por Día</span>
            <span class="summary-value">{{ formatoMoneda(ventasPromedioDia) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📋</span>
          <div class="summary-info">
            <span class="summary-label">Abonos</span>
            <span class="summary-value">{{ formatoMoneda(totalAbonos) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">💳</span>
          <div class="summary-info">
            <span class="summary-label">Transferencias</span>
            <span class="summary-value">{{ formatoMoneda(totalTransferencias) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">💳</span>
          <div class="summary-info">
            <span class="summary-label">Tarjetas</span>
            <span class="summary-value">{{ formatoMoneda(totalTarjetas) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">🧴</span>
          <div class="summary-info">
            <span class="summary-label">Envases</span>
            <span class="summary-value">{{ formatoMoneda(totalEnvases) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📦</span>
          <div class="summary-info">
            <span class="summary-label">Productos Únicos</span>
            <span class="summary-value">{{ productosUnicos }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">🎯</span>
          <div class="summary-info">
            <span class="summary-label">Venta Promedio ($)</span>
            <span class="summary-value">{{ formatoMoneda(ticketPromedio) }}</span>
          </div>
        </div>
        <div class="summary-card">
          <span class="summary-icon">📈</span>
          <div class="summary-info">
            <span class="summary-label">{{ etiquetaPromedio }}</span>
            <span class="summary-value">{{ valorPromedio }}</span>
          </div>
        </div>
        <div class="summary-card highlight" style="cursor:pointer" @click="abrirMovimientos('entradas')">
          <span class="summary-icon">📥</span>
          <div class="summary-info">
            <span class="summary-label">Total Entradas</span>
            <span class="summary-value">{{ formatoMoneda(totalEntradas) }}</span>
          </div>
        </div>
        <div class="summary-card" style="cursor:pointer" @click="abrirMovimientos('salidas')">
          <span class="summary-icon">📤</span>
          <div class="summary-info">
            <span class="summary-label">Total Salidas</span>
            <span class="summary-value">{{ formatoMoneda(totalSalidas) }}</span>
          </div>
        </div>
        <div class="summary-card highlight" :class="{ 'ganancia': flujoNeto >= 0 }">
          <span class="summary-icon">💹</span>
          <div class="summary-info">
            <span class="summary-label">Flujo Neto</span>
            <span class="summary-value">{{ formatoMoneda(flujoNeto) }}</span>
          </div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card chart-wide">
          <h3 class="chart-title">📈 Tendencia de Ventas</h3>
          <div class="chart-container">
            <Line :data="chartTendencia" :options="chartOptionsTendencia" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">💹 Movimiento de Dinero en Caja</h3>
          <div class="chart-container">
            <Line :data="chartFlujoDinero" :options="chartOptionsFlujo" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">🏆 Top Productos por Monto</h3>
          <div class="chart-container">
            <Bar :data="chartTopProductos" :options="chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">📦 Top Unitarios por Cantidad</h3>
          <div class="chart-container">
            <Bar :data="chartTopCantidad" :options="chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">⚖️ Top Gramaje por Cantidad</h3>
          <div class="chart-container">
            <Bar :data="chartTopGramaje" :options="chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">💳 Ventas por Método de Pago</h3>
          <div class="chart-container chart-pie">
            <Pie :data="chartMetodos" :options="chartPieOptions" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">🏷️ Ventas por Categoría (Monto)</h3>
          <div class="chart-container">
            <Bar :data="chartVentasCategoria" :options="chartOptionsCategoria" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">🏷️ Ganancia por Categoría</h3>
          <div class="chart-container">
            <Bar :data="chartGananciaCategoria" :options="chartOptionsCategoria" />
          </div>
        </div>

        <div class="chart-card chart-wide">
          <h3 class="chart-title">💵 Top Productos por Ganancia</h3>
          <div class="chart-container">
            <Bar :data="chartTopGanancia" :options="chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">💵 Ganancia Unitarios</h3>
          <div class="chart-container">
            <Bar :data="chartGananciaUnitarios" :options="chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">💵 Ganancia Gramaje</h3>
          <div class="chart-container">
            <Bar :data="chartGananciaGramaje" :options="chartOptionsBar" />
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">📦 Detalle Unitarios</h3>
          <div class="tabla-container">
            <table class="tabla-productos">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Venta</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in productosUnitarios" :key="p.nombre">
                  <td>{{ p.nombre }}</td>
                  <td class="text-right">{{ formatoCantidad(p.cantidadTotal, p.isGramaje) }}</td>
                  <td class="text-right monto">{{ formatoMoneda(p.montoTotal) }}</td>
                  <td class="text-right costo">{{ formatoMoneda(p.costoTotal) }}</td>
                  <td class="text-right ganancia">{{ formatoMoneda(p.gananciaTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">⚖️ Detalle Gramaje</h3>
          <div class="tabla-container">
            <table class="tabla-productos">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th class="text-right">Cantidad</th>
                  <th class="text-right">Venta</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in productosGramaje" :key="p.nombre">
                  <td>{{ p.nombre }}</td>
                  <td class="text-right">{{ formatoCantidad(p.cantidadTotal, p.isGramaje) }}</td>
                  <td class="text-right monto">{{ formatoMoneda(p.montoTotal) }}</td>
                  <td class="text-right costo">{{ formatoMoneda(p.costoTotal) }}</td>
                  <td class="text-right ganancia">{{ formatoMoneda(p.gananciaTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- MODAL DETALLE CATEGORIA -->
    <div v-if="modalCategoriaOpen" class="modal-overlay-cat" @click.self="cerrarModalCategoria">
      <div class="modal-card-cat">
        <div class="modal-header-cat">
          <h3>📦 {{ categoriaSeleccionada }} → {{ subCategoriaSeleccionada }}</h3>
          <button class="modal-close-cat" @click="cerrarModalCategoria">✕</button>
        </div>
        <div class="modal-body-cat">
          <div v-if="productosCategoriaSeleccionada.length === 0" class="modal-empty">
            No hay productos para {{ categoriaSeleccionada }} / {{ subCategoriaSeleccionada }} en este periodo.
          </div>
          <template v-else>
            <div class="chart-container-modal">
              <Bar :data="chartProductosCategoria" :options="chartOptionsProductosCategoria" />
            </div>
            <div class="tabla-modal">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th class="text-right">Cantidad</th>
                    <th class="text-right">Venta</th>
                    <th class="text-right">Costo</th>
                    <th class="text-right">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in productosCategoriaSeleccionada" :key="p.nombre">
                    <td>{{ p.nombre }}</td>
                    <td class="text-right">{{ formatoCantidad(p.cantidadTotal, p.isGramaje) }}</td>
                    <td class="text-right monto">{{ formatoMoneda(p.montoTotal) }}</td>
                    <td class="text-right costo">{{ formatoMoneda(p.costoTotal) }}</td>
                    <td class="text-right ganancia">{{ formatoMoneda(p.gananciaTotal) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- MODAL MOVIMIENTOS CAJA -->
    <div v-if="modalMovimientosOpen" class="modal-overlay-cat" @click.self="modalMovimientosOpen = false">
      <div class="modal-card-cat modal-movimientos">
        <div class="modal-header-cat">
          <h3>{{ movimientosTitulo }}</h3>
          <button class="modal-close-cat" @click="modalMovimientosOpen = false">✕</button>
        </div>
        <div class="modal-body-cat">
          <div v-if="movimientosLista.length === 0" class="modal-empty">
            No hay {{ movimientosTitulo.toLowerCase() }} en este período.
          </div>
          <table v-else class="tabla-movimientos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th class="text-right">Monto</th>
                <th class="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in movimientosLista" :key="m.idCaja">
                <td class="fecha-col">{{ formatearFechaHora(m.fechaMovimiento) }}</td>
                <td>
                  <template v-if="editandoMovimientoId === m.idCaja">
                    <input v-model="editandoDescripcion" class="edit-desc-input" type="text" @keyup.enter="guardarDescripcion(m.idCaja)" @keyup.escape="cancelarEdicionDescripcion" />
                    <span class="edit-actions">
                      <button class="btn-edit-save" @click="guardarDescripcion(m.idCaja)" :disabled="guardandoDescripcion" title="Guardar">✓</button>
                      <button class="btn-edit-cancel" @click="cancelarEdicionDescripcion" title="Cancelar">✕</button>
                    </span>
                  </template>
                  <template v-else>
                    <span class="desc-text">{{ m.descripcion }}</span>
                    <button class="btn-edit-icon" @click="iniciarEdicionDescripcion(m)" title="Editar descripción">✎</button>
                  </template>
                </td>
                <td class="text-right" :class="movimientosTitulo.startsWith('Entradas') ? 'monto' : 'costo'">
                  {{ formatoMoneda(m.monto) }}
                </td>
                <td class="text-center"></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Total</strong></td>
                <td class="text-right"><strong>{{ formatoMoneda(movimientosLista.reduce((s, m) => s + Number(m.monto || 0), 0)) }}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reporte-ventas {
  padding: 1rem;
  overflow-y: auto;
  height: 100%;
}

.reporte-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--border-color);
}

.reporte-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.3rem;
  color: var(--accent-color);
  font-family: 'HyliaSerifBeta', 'Palatino Linotype', serif;
}

.title-icon {
  font-size: 1.4rem;
}

.rango-actual {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  background: var(--bg-panel);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.rango-label {
  color: var(--text-secondary);
  font-weight: 600;
}

.rango-fechas {
  color: var(--accent-color);
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.rango-detalle {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.reporte-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.periodo-selector {
  display: flex;
  gap: 0.25rem;
  background: var(--bg-primary);
  padding: 0.25rem;
  border-radius: 8px;
  border: 2px solid var(--border-color);
}

.periodo-btn {
  padding: 0.4rem 0.8rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.periodo-btn:hover {
  color: var(--text-primary);
}

.periodo-btn.active {
  background: var(--accent-color);
  color: var(--bg-primary);
}

.fecha-selector {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.fecha-selector input {
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.85rem;
}

.btn-cargar {
  padding: 0.5rem 1rem;
  border: 2px solid var(--accent-color);
  border-radius: 8px;
  background: var(--accent-color);
  color: var(--bg-primary);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cargar:hover:not(:disabled) {
  filter: brightness(1.15);
}

.btn-cargar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: var(--text-secondary);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.2s;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-color);
}

.summary-card.highlight {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-panel));
}

.summary-icon {
  font-size: 1.8rem;
}

.summary-info {
  display: flex;
  flex-direction: column;
}

.summary-label {
  font-size: 0.7rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.summary-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Courier New', monospace;
}

.summary-card.highlight .summary-value {
  color: var(--accent-color);
}

.summary-card.ganancia {
  border-color: var(--success-color);
  background: color-mix(in srgb, var(--success-color) 10%, var(--bg-panel));
}

.summary-card.ganancia .summary-value {
  color: var(--success-color);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.chart-card {
  background: var(--bg-panel);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.25rem;
  overflow: hidden;
}

.chart-wide {
  grid-column: 1 / -1;
}

.chart-title {
  margin: 0 0 1.25rem 0;
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 600;
}

.chart-container {
  height: 400px;
  position: relative;
}

.chart-pie {
  height: 350px;
}

.tabla-container {
  max-height: 400px;
  overflow-y: auto;
}

.tabla-productos {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.tabla-productos th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 700;
  color: var(--accent-color);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--accent-color);
  position: sticky;
  top: 0;
  background: var(--bg-panel);
}

.tabla-productos td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.tabla-productos tr:hover {
  background: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

.text-right {
  text-align: right;
}

.monto {
  color: var(--success-color);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.costo {
  color: var(--error-color);
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.ganancia {
  color: var(--infoBlueColor);
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

@media (max-width: 768px) {
  .reporte-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .reporte-controls {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  
  .periodo-selector {
    justify-content: center;
  }
  
  .fecha-selector {
    justify-content: center;
  }
  
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    height: 350px;
  }
}

@media (max-width: 480px) {
  .reporte-ventas {
    padding: 0.5rem;
  }
  
  .reporte-title {
    font-size: 1.1rem;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .summary-card {
    padding: 0.75rem;
  }
  
  .summary-icon {
    font-size: 1.4rem;
  }
  
  .summary-value {
    font-size: 1rem;
  }
  
  .chart-container {
    height: 300px;
  }
  
  .periodo-btn {
    padding: 0.3rem 0.6rem;
    font-size: 0.7rem;
  }
}

/* MODAL CATEGORIA */
.modal-overlay-cat {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-card-cat {
  background: var(--bg-primary, #1a1a2e);
  border: 2px solid var(--accent-color, #c99234);
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header-cat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color, #333);
}

.modal-header-cat h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary, #f6f2de);
}

.modal-close-cat {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--bg-secondary, #2a2a3e);
  color: var(--text-secondary, #888);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.15s;
}

.modal-close-cat:hover {
  background: #c75a5a;
  color: white;
}

.modal-body-cat {
  padding: 1.25rem;
  overflow-y: auto;
  flex: 1;
}

.modal-empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary, #888);
  font-style: italic;
}

.chart-container-modal {
  height: 300px;
  margin-bottom: 1.5rem;
}

.tabla-modal {
  overflow-x: auto;
}

.tabla-modal table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.tabla-modal th {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary, #2a2a3e);
  color: var(--text-secondary, #888);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--border-color, #333);
}

.tabla-modal td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color, #333);
  color: var(--text-primary, #f6f2de);
}

.tabla-modal tr:hover td {
  background: var(--bg-panel, #252538);
}

.modal-movimientos {
  max-width: 700px;
}

.tabla-movimientos {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.tabla-movimientos th {
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary, #2a2a3e);
  color: var(--text-secondary, #888);
  font-weight: 700;
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  border-bottom: 2px solid var(--border-color, #333);
  text-align: left;
}

.tabla-movimientos th.text-right {
  text-align: right;
}

.tabla-movimientos td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color, #333);
  color: var(--text-primary, #f6f2de);
}

.tabla-movimientos tr:hover td {
  background: var(--bg-panel, #252538);
}

.tabla-movimientos tfoot td {
  border-top: 2px solid var(--accent-color, #c99234);
  border-bottom: none;
  font-size: 0.85rem;
}

.fecha-col {
  white-space: nowrap;
  font-size: 0.8rem;
  color: var(--text-secondary, #888);
}

.tabla-movimientos .monto {
  color: var(--success-color, #4caf50);
  font-weight: 600;
}

.tabla-movimientos .costo {
  color: var(--danger-color, #e57373);
  font-weight: 600;
}

.desc-text {
  margin-right: 0.4rem;
}

.btn-edit-icon {
  background: none;
  border: none;
  color: var(--text-secondary, #888);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
}

.btn-edit-icon:hover {
  color: var(--accent-color, #c99234);
  background: var(--bg-panel, #252538);
}

.edit-desc-input {
  background: var(--bg-secondary, #2a2a3e);
  border: 1px solid var(--accent-color, #c99234);
  border-radius: 6px;
  color: var(--text-primary, #f6f2de);
  padding: 4px 8px;
  font-size: 0.85rem;
  width: 180px;
  outline: none;
}

.edit-desc-input:focus {
  border-color: #ffd700;
  box-shadow: 0 0 6px rgba(255, 215, 0, 0.3);
}

.edit-actions {
  display: inline-flex;
  gap: 4px;
  margin-left: 6px;
}

.btn-edit-save,
.btn-edit-cancel {
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 3px 8px;
  transition: all 0.15s;
}

.btn-edit-save {
  background: var(--success-color, #4caf50);
  color: white;
}

.btn-edit-save:hover:not(:disabled) {
  background: #45a049;
}

.btn-edit-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-edit-cancel {
  background: var(--danger-color, #e57373);
  color: white;
}

.btn-edit-cancel:hover {
  background: #d32f2f;
}

.text-center {
  text-align: center;
}

@media (max-width: 768px) {
  .modal-card-cat {
    max-width: 100%;
    max-height: 95vh;
  }
  
  .chart-container-modal {
    height: 250px;
  }
}
</style>
