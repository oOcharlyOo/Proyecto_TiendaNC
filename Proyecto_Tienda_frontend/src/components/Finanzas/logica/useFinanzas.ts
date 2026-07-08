import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com';
const idUsuario = ref<number>(Number(localStorage.getItem('idUsuario') || 0));

const mensaje = ref('');
const mensajeTipo = ref<'ok' | 'error' | 'info'>('info');
const cargando = ref(false);
const modalEntradaAbierto = ref(false);
const modalSalidaAbierto = ref(false);
const modalAjusteAbierto = ref(false);
const pestañaActiva = ref<'boveda' | 'ganancias'>('boveda');

const saldoBovedaReal = ref(0);
const historialBoveda = ref<any[]>([]);

const gananciasTotales = ref(0);
const gananciasDelDia = ref(0);
const gananciasEditadas = ref(0);
const historialGanancias = ref<any[]>([]);
const gananciaPaginaActual = ref(0);
const gananciaTotalPaginas = ref(0);
const modalEditarGananciasAbierto = ref(false);

const paginaActual = ref(0);
const totalPaginas = ref(0);
const tamanoPagina = ref(10);

const historialUnico = computed(() => {
  const ids = new Set();
  return historialBoveda.value.filter((item: any) => {
    if (ids.has(item.idBoveda)) return false;
    ids.add(item.idBoveda);
    return true;
  });
});

const saldoRealCalculado = computed(() => saldoBovedaReal.value);

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
}

function mostrarMensaje(texto: string, tipo: 'ok' | 'error' | 'info') {
  mensaje.value = texto;
  mensajeTipo.value = tipo;
  setTimeout(() => mensaje.value = '', 5000);
}

async function cargarDatos(pagina = 0) {
  cargando.value = true;
  paginaActual.value = pagina;
  try {
    const resBoveda = await fetch(`${API_BASE}/boveda/estado`);
    const dataBoveda = await resBoveda.json();
    if (resBoveda.ok && dataBoveda.datos) {
      saldoBovedaReal.value = dataBoveda.datos.montoTotal;
    }

    const resHist = await fetch(`${API_BASE}/boveda/historial?page=${pagina}&size=${tamanoPagina.value}`);
    const dataHist = await resHist.json();
    if (resHist.ok && dataHist.datos) {
      historialBoveda.value = dataHist.datos.contenido;
      totalPaginas.value = dataHist.datos.totalPaginas;
    }
  } catch (err) {
    mostrarMensaje("Error al sincronizar con la bóveda real.", "error");
  } finally {
    cargando.value = false;
  }
}

async function cargarGanancias(pagina = 0) {
  cargando.value = true;
  gananciaPaginaActual.value = pagina;
  try {
    const ahora = new Date();
    const hoy = ahora.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

    try {
      const resVentas = await fetch(`${API_BASE}/ventas/obtenerVentaPorDia/${hoy}`);
      if (resVentas.ok) {
        const dataVentas = await resVentas.json();
        const gananciaDia = Number(dataVentas.datos?.gananciaTotal) || 0;
        gananciasDelDia.value = isNaN(gananciaDia) ? 0 : gananciaDia;
      }
    } catch (e) {
      console.log("No se pudieron obtener ventas del día", e);
    }

    try {
      const resGanancias = await fetch(`${API_BASE}/gananciasAcumuladas/estado`);
      if (resGanancias.ok) {
        const dataGanancias = await resGanancias.json();
        const montoTotal = Number(dataGanancias.datos?.montoTotal) || 0;
        gananciasTotales.value = isNaN(montoTotal) ? 0 : montoTotal;
      }
    } catch (e) {
      console.log("No se pudieron obtener ganancias acumuladas", e);
    }

    try {
      const resHistorial = await fetch(`${API_BASE}/gananciasAcumuladas/historial?page=${pagina}&size=${tamanoPagina.value}`);
      if (resHistorial.ok) {
        const dataHistorial = await resHistorial.json();
        if (dataHistorial.datos) {
          historialGanancias.value = dataHistorial.datos.contenido.map((g: any) => ({
            id: g.idGanancia,
            monto: g.montoTotal,
            descripcion: g.descripcion,
            fecha: new Date(g.fechaMovimiento).toLocaleString('es-MX'),
            idUsuario: g.usuario?.idUsuario
          }));
          gananciaTotalPaginas.value = dataHistorial.datos.totalPaginas;
        }
      }
    } catch (e) {
      console.log("No se pudo obtener historial de ganancias", e);
    }

    gananciaTotalPaginas.value = 1;
  } catch (err) {
    console.error("Error cargando ganancias:", err);
  } finally {
    cargando.value = false;
  }
}

function cambiarPagina(nuevaPagina: number) {
  if (pestañaActiva.value === 'boveda') {
    if (nuevaPagina >= 0 && nuevaPagina < totalPaginas.value) {
      cargarDatos(nuevaPagina);
    }
  } else {
    if (nuevaPagina >= 0 && nuevaPagina < gananciaTotalPaginas.value) {
      cargarGanancias(nuevaPagina);
    }
  }
}

async function handleAjusteBase(payload: { montoInicial: number }) {
  try {
    const res = await fetch(`${API_BASE}/boveda/ajuste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idUsuario: idUsuario.value,
        montoEoS: payload.montoInicial,
        descripcion: "Ajuste manual de bóveda (Conteo físico semanal)"
      })
    });

    if (res.ok) {
      modalAjusteAbierto.value = false;
      mostrarMensaje("Saldo de Bóveda sincronizado con éxito.", "ok");
      await cargarDatos();
    } else {
      mostrarMensaje("Error al procesar el ajuste.", "error");
    }
  } catch (e) {
    mostrarMensaje("Error de conexión.", "error");
  }
}

const editarGanancias = () => {
  gananciasEditadas.value = Number(gananciasTotales.value) || 0;
  modalEditarGananciasAbierto.value = true;
};

async function handleEditarGanancias(payload: any) {
  const monto = payload?.monto ?? payload?.montoInicial ?? Number(gananciasEditadas.value) ?? 0;

  try {
    const res = await fetch(`${API_BASE}/gananciasAcumuladas/ajuste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idUsuario: idUsuario.value,
        monto: monto,
        descripcion: "Ajuste manual de ganancias"
      })
    });

    if (res.ok) {
      modalEditarGananciasAbierto.value = false;
      mostrarMensaje("Ganancias actualizadas con éxito.", "ok");
      await cargarGanancias();
    } else {
      mostrarMensaje("Error al ajustar ganancias.", "error");
    }
  } catch (e) {
    mostrarMensaje("Error de conexión.", "error");
  }
}

async function registrarMovimiento(payload: { montoEoS: number, descripcion: string }, tipo: 'entrada' | 'salida') {
  try {
    const endpoint = tipo === 'entrada' ? 'entrada' : 'salida';
    const res = await fetch(`${API_BASE}/caja/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idUsuario: idUsuario.value })
    });
    if (res.ok) {
      mostrarMensaje("Movimiento registrado.", "ok");
      tipo === 'entrada' ? modalEntradaAbierto.value = false : modalSalidaAbierto.value = false;
      await cargarDatos();
    }
  } catch (e) { mostrarMensaje("Error en la operación.", "error"); }
}

function cambiarPestaña(pestaña: 'boveda' | 'ganancias') {
  pestañaActiva.value = pestaña;
  if (pestaña === 'ganancias') {
    cargarGanancias();
  } else {
    cargarDatos();
  }
}

export function useFinanzas() {
  let refreshHandler: (() => void) | null = null;

  onMounted(() => {
    if (pestañaActiva.value === 'ganancias') {
      cargarGanancias();
    } else {
      cargarDatos();
    }

    refreshHandler = () => {
      if (pestañaActiva.value === 'ganancias') {
        cargarGanancias();
      } else {
        cargarDatos();
      }
    };
    window.addEventListener('venta-completada', refreshHandler);
  });

  onBeforeUnmount(() => {
    if (refreshHandler) {
      window.removeEventListener('venta-completada', refreshHandler);
    }
  });

  return {
    idUsuario, mensaje, mensajeTipo, cargando,
    modalEntradaAbierto, modalSalidaAbierto, modalAjusteAbierto, modalEditarGananciasAbierto,
    pestañaActiva,
    saldoBovedaReal, historialBoveda,
    gananciasTotales, gananciasDelDia, gananciasEditadas, historialGanancias,
    gananciaPaginaActual, gananciaTotalPaginas,
    paginaActual, totalPaginas, tamanoPagina,
    historialUnico, saldoRealCalculado,
    formatoMoneda, mostrarMensaje,
    cargarDatos, cargarGanancias, cambiarPagina,
    handleAjusteBase, editarGanancias, handleEditarGanancias,
    registrarMovimiento, cambiarPestaña
  };
}