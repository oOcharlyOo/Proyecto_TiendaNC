import { ref, computed, shallowRef } from 'vue';
import { useSucursal } from '@/composables/useSucursal';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';

export interface ProductoAmbulante {
  idProducto: number;
  nombre: string;
  precio_costo: number;
  precio_venta: number;
  stock: number;
  is_gramaje: boolean;
}

export interface ItemCarga {
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioCosto: number;
  isGramaje: boolean;
  gramosPorPieza?: number | null;
}

export interface ItemVenta {
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioVenta: number;
  gramosPorPieza?: number | null;
}

export interface InventarioItem {
  id: number;
  idUsuario: number;
  idProducto: number | null;
  nombreProducto: string;
  idSucursalOrigen: string;
  cantidad: number;
  gramosPorPieza: number | null;
  unidad: string;
  precioCosto: number;
  estatus: string;
  fechaCarga: string | null;
  fechaVenta: string | null;
  idVenta: number | null;
}

export interface CorteDetalle {
  idVenta: number;
  idUsuario: number | null;
  nombreUsuario: string | null;
  fechaVenta: string;
  montoTotal: number;
  precioCostoTotal: number;
  ganancia: number;
  metodoPago: string;
  idSucursalOrigen: string;
}

export interface CorteReporte {
  totalVentas: number;
  totalCosto: number;
  totalGanancia: number;
  totalVentasCount: number;
  detalle: CorteDetalle[];
}

const tabActivo = ref<'cargar' | 'inventario' | 'vender' | 'corte'>('inventario');
const cargando = ref(false);
const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error'>('ok');

const productosCatalogo = shallowRef<ProductoAmbulante[]>([]);
const terminoBusqueda = ref('');
const itemsCarga = ref<ItemCarga[]>([]);
const idSucursalOrigen = ref<string>('dulceria');

const inventario = ref<InventarioItem[]>([]);
const itemsVenta = ref<ItemVenta[]>([]);
const metodoPago = ref('EFECTIVO');
const ventaPrecioCambiado = ref(false);

const corteReporte = ref<CorteReporte | null>(null);
const fechaCorte = ref(new Date().toISOString().slice(0, 10));

export function useAmbulante() {
  const { getSucursal } = useSucursal();

  function notificar(msg: string, tipo: 'ok' | 'error' = 'ok') {
    mensaje.value = msg;
    mensajeTipo.value = tipo;
    setTimeout(() => { mensaje.value = ''; }, 3500);
  }

  function obtenerIdUsuario(): number {
    return Number(localStorage.getItem('idUsuario') || 0);
  }

  async function cargarCatalogo() {
    cargando.value = true;
    try {
      const res = await fetch(`${API_BASE}/productos/listarProductos`);
      const data = await res.json();
      const lista: any[] = data?.datos ?? data ?? [];
      productosCatalogo.value = lista
        .map((p: any) => ({
          idProducto: Number(p?.idProducto ?? 0),
          nombre: String(p?.nombre ?? '').trim(),
          precio_costo: Number(p?.precio_costo ?? 0),
          precio_venta: Number(p?.precio_venta ?? 0),
          stock: Number(p?.stock ?? 0),
          is_gramaje: Boolean(p?.is_gramaje)
        }))
        .filter((p) => p.idProducto > 0 && p.nombre.length > 0);
    } catch {
      notificar('No se pudo cargar el catálogo de productos.', 'error');
    } finally {
      cargando.value = false;
    }
  }

  const productosFiltrados = computed(() => {
    const t = terminoBusqueda.value.toLowerCase().replace(/[-\s–—]/g, '');
    if (!t) return productosCatalogo.value;
    return productosCatalogo.value.filter((p) =>
      p.nombre.toLowerCase().replace(/[-\s–—]/g, '').includes(t)
    );
  });

  function agregarItemCarga(prod: ProductoAmbulante) {
    const existente = itemsCarga.value.find((i) => i.idProducto === prod.idProducto);
    if (existente) {
      if (existente.cantidad + 1 > maxPiezas(prod, existente.gramosPorPieza)) {
        notificar(`Stock insuficiente para ${prod.nombre}`, 'error');
        return;
      }
      existente.cantidad += 1;
    } else {
      if (prod.stock <= 0) {
        notificar(`Sin stock: ${prod.nombre}`, 'error');
        return;
      }
      itemsCarga.value.push({
        idProducto: prod.idProducto,
        nombreProducto: prod.nombre,
        cantidad: 1,
        unidad: prod.is_gramaje ? 'GRAMOS' : 'PIEZA',
        precioCosto: prod.is_gramaje ? 0 : prod.precio_costo,
        isGramaje: prod.is_gramaje,
        gramosPorPieza: prod.is_gramaje ? null : undefined
      });
    }
  }

  function gramosDesdeCosto(precioVentaKg: number, costoBolsita: number): number {
    if (!costoBolsita || costoBolsita <= 0 || !precioVentaKg || precioVentaKg <= 0) return 0;
    const gramos = Math.round((costoBolsita / (precioVentaKg / 1000)));
    return gramos >= 1 ? gramos : 1;
  }

  function maxPiezas(prod: ProductoAmbulante, gramosPorPieza?: number | null): number {
    if (prod.is_gramaje && gramosPorPieza && gramosPorPieza > 0) {
      return Math.max(0, Math.floor(prod.stock / gramosPorPieza));
    }
    return Math.max(0, prod.stock);
  }

  function quitarItemCarga(index: number) {
    itemsCarga.value.splice(index, 1);
  }

  function setCantidadCarga(index: number, cantidad: number) {
    if (cantidad < 1) cantidad = 1;
    const it = itemsCarga.value[index];
    const prod = productosCatalogo.value.find((p) => p.idProducto === it.idProducto);
    const stockMax = prod ? maxPiezas(prod, it.gramosPorPieza) : Infinity;
    if (cantidad > stockMax) cantidad = stockMax;
    it.cantidad = cantidad;
  }

  function setCostoBolsitaCarga(index: number, costo: number) {
    if (costo < 0) costo = 0;
    const it = itemsCarga.value[index];
    const prod = productosCatalogo.value.find((p) => p.idProducto === it.idProducto);
    it.precioCosto = costo;
    if (prod) {
      const gramos = gramosDesdeCosto(prod.precio_venta, costo);
      it.gramosPorPieza = gramos > 0 ? gramos : null;
      const max = maxPiezas(prod, it.gramosPorPieza);
      if (it.cantidad > max) it.cantidad = Math.max(1, max);
    }
  }

  async function enviarCarga() {
    if (itemsCarga.value.length === 0) {
      notificar('No hay productos para cargar.', 'error');
      return;
    }
    const sinCosto = itemsCarga.value.find((i) => i.isGramaje && (!i.precioCosto || i.precioCosto <= 0));
    if (sinCosto) {
      notificar(`Indica el costo de la bolsita de ${sinCosto.nombreProducto}.`, 'error');
      return;
    }
    const idUsuario = obtenerIdUsuario();
    if (!idUsuario) {
      notificar('Usuario no identificado.', 'error');
      return;
    }
    cargando.value = true;
    try {
      const res = await fetch(`${API_BASE}/ventasAmbulante/cargar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUsuario,
          idSucursalOrigen: idSucursalOrigen.value,
          items: itemsCarga.value.map((i) => ({
            idProducto: i.idProducto,
            cantidad: i.cantidad,
            ...(i.isGramaje ? { precioCostoUnitario: i.precioCosto } : {})
          }))
        })
      });
      const data = await res.json();
      if (data.codigo === 200) {
        notificar('Productos cargados al inventario ambulante.');
        itemsCarga.value = [];
        await cargarInventario();
      } else {
        notificar(data.mensaje || 'Error al cargar productos.', 'error');
      }
    } catch {
      notificar('Error de conexión al cargar.', 'error');
    } finally {
      cargando.value = false;
    }
  }

  async function cargarInventario(estatus?: string) {
    const idUsuario = obtenerIdUsuario();
    if (!idUsuario) return;
    cargando.value = true;
    try {
      const q = estatus ? `&estatus=${estatus}` : '';
      const res = await fetch(`${API_BASE}/ventasAmbulante/inventario?idUsuario=${idUsuario}${q}`);
      const data = await res.json();
      if (data.codigo === 200) {
        inventario.value = (data.datos ?? []).map((it: any) => ({
          id: it.id,
          idUsuario: it.idUsuario,
          idProducto: it.idProducto,
          nombreProducto: it.nombreProducto,
          idSucursalOrigen: it.idSucursalOrigen,
          cantidad: it.cantidad,
          gramosPorPieza: it.gramosPorPieza ?? null,
          unidad: it.unidad,
          precioCosto: Number(it.precioCosto ?? 0),
          estatus: it.estatus,
          fechaCarga: it.fechaCarga,
          fechaVenta: it.fechaVenta,
          idVenta: it.idVenta
        }));
      } else {
        inventario.value = [];
      }
    } catch {
      notificar('Error al obtener inventario.', 'error');
    } finally {
      cargando.value = false;
    }
  }

  const inventarioCargado = computed(() => inventario.value.filter((i) => i.estatus === 'CARGADO'));

  async function cargarCortes() {
    cargando.value = true;
    try {
      let url = `${API_BASE}/ventasAmbulante/reporte?fecha=${fechaCorte.value}`;
      const idUsuario = obtenerIdUsuario();
      if (idUsuario) url += `&idUsuario=${idUsuario}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.codigo === 200) {
        corteReporte.value = data.datos;
      } else {
        corteReporte.value = null;
      }
    } catch {
      notificar('Error al obtener el corte.', 'error');
    } finally {
      cargando.value = false;
    }
  }

  function agregarAVenta(it: InventarioItem) {
    const existente = itemsVenta.value.find((x) => x.idProducto === it.idProducto);
    if (existente) {
      if (existente.cantidad + 1 > it.cantidad) {
        notificar('Cantidad supera lo cargado.', 'error');
        return;
      }
      existente.cantidad += 1;
      ventaPrecioCambiado.value = false;
    } else {
      itemsVenta.value.push({
        idProducto: it.idProducto ?? 0,
        nombreProducto: it.nombreProducto,
        cantidad: 1,
        precioVenta: it.precioCosto,
        gramosPorPieza: it.gramosPorPieza
      });
      ventaPrecioCambiado.value = false;
    }
  }

  function quitarDeVenta(index: number) {
    itemsVenta.value.splice(index, 1);
  }

  function setCantidadVenta(index: number, cantidad: number) {
    if (cantidad < 1) cantidad = 1;
    const it = itemsVenta.value[index];
    const inv = inventario.value.find((x) => x.idProducto === it.idProducto) ?? { cantidad: Infinity } as any;
    const max = inv.cantidad;
    if (cantidad > max) cantidad = max;
    itemsVenta.value[index].cantidad = cantidad;
  }

  const totalVenta = computed(() =>
    itemsVenta.value.reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0)
  );

  async function registrarVenta() {
    if (itemsVenta.value.length === 0) {
      notificar('No hay productos en la venta.', 'error');
      return;
    }
    const idUsuario = obtenerIdUsuario();
    if (!idUsuario) {
      notificar('Usuario no identificado.', 'error');
      return;
    }
    cargando.value = true;
    try {
      const res = await fetch(`${API_BASE}/ventasAmbulante/vender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUsuario,
          idSucursalOrigen: idSucursalOrigen.value,
          metodoPago: metodoPago.value,
          items: itemsVenta.value.map((i) => ({
            idProducto: i.idProducto,
            cantidad: i.cantidad,
            precioVenta: i.precioVenta
          }))
        })
      });
      const data = await res.json();
      if (data.codigo === 200) {
        notificar('Venta registrada correctamente.');
        itemsVenta.value = [];
        ventaPrecioCambiado.value = false;
        await cargarInventario('CARGADO');
      } else {
        notificar(data.mensaje || 'Error al registrar la venta.', 'error');
      }
    } catch {
      notificar('Error de conexión al vender.', 'error');
    } finally {
      cargando.value = false;
    }
  }

  async function devolverProductos(ids: number[]) {
    if (ids.length === 0) {
      notificar('Selecciona productos a devolver.', 'error');
      return;
    }
    const idUsuario = obtenerIdUsuario();
    if (!idUsuario) return;
    cargando.value = true;
    try {
      const res = await fetch(`${API_BASE}/ventasAmbulante/devolver?idUsuario=${idUsuario}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids)
      });
      const data = await res.json();
      if (data.codigo === 200) {
        notificar('Productos devueltos a la sucursal.');
        devolucionIds.value = [];
        await cargarInventario();
      } else {
        notificar(data.mensaje || 'Error al devolver.', 'error');
      }
    } catch {
      notificar('Error de conexión al devolver.', 'error');
    } finally {
      cargando.value = false;
    }
  }

  const devolucionIds = ref<number[]>([]);
  const toggleDevolucion = (id: number) => {
    const i = devolucionIds.value.indexOf(id);
    if (i >= 0) devolucionIds.value.splice(i, 1);
    else devolucionIds.value.push(id);
  };

  function seleccionarTab(tab: typeof tabActivo.value) {
    tabActivo.value = tab;
    if (tab === 'cargar') void cargarCatalogo();
    if (tab === 'inventario') void cargarInventario();
    if (tab === 'corte') void cargarCortes();
  }

  async function inicializar() {
    const s = getSucursal();
    idSucursalOrigen.value = s === 'ambulante_abarrotera' ? 'abarrotera' : 'dulceria';
    await cargarInventario();
    await cargarCatalogo();
  }

  function formatoMoneda(valor: number): string {
    return '$' + Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return {
    tabActivo, cargando, mensaje, mensajeTipo,
    terminoBusqueda, productosFiltrados, itemsCarga, idSucursalOrigen,
    inventario, inventarioCargado, itemsVenta, metodoPago,
    totalVenta, ventaPrecioCambiado, corteReporte, fechaCorte,
    devolucionIds,
    seleccionarTab, inicializar, cargarCatalogo, cargarInventario, cargarCortes,
    agregarItemCarga, quitarItemCarga, setCantidadCarga, setCostoBolsitaCarga, enviarCarga,
    agregarAVenta, quitarDeVenta, setCantidadVenta, registrarVenta,
    devolverProductos, toggleDevolucion, formatoMoneda
  };
}
