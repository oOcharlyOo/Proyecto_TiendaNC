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
};

type MovimientoCaja = {
  idCaja: number;
  fechaMovimiento: string;
  tipoMovimiento: string;
  monto: number;
  descripcion: string;
  saldoResultante: number;
};

const entradasCaja = ref<MovimientoCaja[]>([]);
const salidasCaja = ref<MovimientoCaja[]>([]);

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const periodo = ref<'dia' | 'semana' | 'mes' | 'anio'>('mes');
const fechaSeleccionada = ref('');
const detalles = ref<VentasDetalleListDTO[]>([]);
const cargando = ref(false);

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
    const sub = d.productoSubcategoria || 'Sin subcategoría';
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
    
    const monto = d.tipoPrecioAplicado === 'VENTA_GRAMAJE' 
      ? Number(d.precioUnitarioVenta || 0) 
      : Number(d.precioUnitarioVenta || 0) * Number(d.cantidad || 0);
    
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
    } else {
      map.set(key, { fecha: key, label, ventas: 1, monto });
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
        monto: 0
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
        monto: 0
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
    if (d.tipoPrecioAplicado === 'VENTA_GRAMAJE') {
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

const flujoDineroPorDia = computed(() => {
  const map = new Map<string, { entradas: number; salidas: number; label: string }>();
  
  for (const dia of ventasPorDia.value) {
    const key = dia.fecha;
    if (!map.has(key)) {
      map.set(key, { entradas: 0, salidas: 0, label: dia.label });
    }
  }
  
  for (const entrada of entradasCaja.value) {
    if (!entrada.fechaMovimiento) continue;
    const fecha = new Date(entrada.fechaMovimiento);
    if (isNaN(fecha.getTime())) continue;
    
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
      existing.entradas += Number(entrada.monto || 0);
    }
  }
  
  for (const salida of salidasCaja.value) {
    if (!salida.fechaMovimiento) continue;
    const fecha = new Date(salida.fechaMovimiento);
    if (isNaN(fecha.getTime())) continue;
    
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
      existing.salidas += Number(salida.monto || 0);
    }
  }
  
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({
      fecha: key,
      label: val.label,
      entradas: Math.round(val.entradas * 100) / 100,
      salidas: Math.round(val.salidas * 100) / 100
    }));
});

const totalEntradas = computed(() => {
  return entradasCaja.value.reduce((sum, e) => sum + Number(e.monto || 0), 0);
});

const totalSalidas = computed(() => {
  return salidasCaja.value.reduce((sum, s) => sum + Number(s.monto || 0), 0);
});

const flujoNeto = computed(() => totalEntradas.value - totalSalidas.value);

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
      label: 'Ventas',
      data: ventasPorDia.value.map(d => d.ventas),
      borderColor: '#28a745',
      backgroundColor: '#28a74522',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      yAxisID: 'y1'
    }
  ]
}));

const chartFlujoDinero = computed(() => ({
  labels: flujoDineroPorDia.value.map(d => d.label),
  datasets: [
    {
      label: 'Entradas ($)',
      data: flujoDineroPorDia.value.map(d => d.entradas),
      borderColor: '#28a745',
      backgroundColor: '#28a74522',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    },
    {
      label: 'Salidas ($)',
      data: flujoDineroPorDia.value.map(d => d.salidas),
      borderColor: '#dc3545',
      backgroundColor: '#dc354522',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }
  ]
}));

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
        label: (ctx: any) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-MX')}`
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
      title: { display: true, text: 'Monto ($)', color: '#c99234' }
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      ticks: { color: '#28a745', font: { size: 11 } },
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

const chartOptionsCategoria = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
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

const chartOptionsFlujo = {
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
        label: (ctx: any) => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString('es-MX')}`
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
      ticks: { color: '#888', font: { size: 11 }, callback: (v: any) => `$${v}` },
      grid: { color: '#33333344' },
      beginAtZero: true,
      title: { display: true, text: 'Monto ($)', color: '#888' }
    }
  },
  interaction: {
    mode: 'index' as const,
    intersect: false
  }
};

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
    
    const [resEntradas, resSalidas] = await Promise.all([
      fetch(urlEntradas),
      fetch(urlSalidas)
    ]);
    
    const dataEntradas = await resEntradas.json();
    const dataSalidas = await resSalidas.json();
    
    if (dataEntradas.codigo === 200) {
      entradasCaja.value = dataEntradas.datos || [];
    }
    if (dataSalidas.codigo === 200) {
      salidasCaja.value = dataSalidas.datos || [];
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
        <div class="summary-card highlight">
          <span class="summary-icon">📥</span>
          <div class="summary-info">
            <span class="summary-label">Total Entradas</span>
            <span class="summary-value">{{ formatoMoneda(totalEntradas) }}</span>
          </div>
        </div>
        <div class="summary-card">
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
          <h3 class="chart-title">💹 Flujo de Dinero (Entradas vs Salidas)</h3>
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
</style>
