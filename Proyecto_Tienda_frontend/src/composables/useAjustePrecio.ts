import { ref, computed } from 'vue'

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.laleyendadeldulce.com'

export interface AjustePrecioDTO {
  dia_semana: number
  monto: number
  activo: boolean
}

const ajustes = ref<AjustePrecioDTO[]>([])
const cargandoAjustes = ref(false)

function obtenerDiaSemanaHoy(): number {
  const jsDay = new Date().getDay() // 0=Domingo .. 6=Sábado
  return ((jsDay + 6) % 7) + 1 // ISO: 1=Lunes .. 7=Domingo
}

const montoHoy = computed<number>(() => {
  const dia = obtenerDiaSemanaHoy()
  const ajuste = ajustes.value.find((a) => a.dia_semana === dia)
  return ajuste && ajuste.activo ? Number(ajuste.monto || 0) : 0
})

const hayAjusteHoy = computed<boolean>(() => montoHoy.value > 0)

async function cargarAjustes(): Promise<boolean> {
  cargandoAjustes.value = true
  try {
    const res = await fetch(`${API_BASE}/ajustePrecio`)
    const data = await res.json()
    if (data.codigo === 200 && Array.isArray(data.datos)) {
      ajustes.value = data.datos
      return true
    }
  } catch (e) {
    console.error('Error al cargar ajustes de precio:', e)
  } finally {
    cargandoAjustes.value = false
  }
  return false
}

async function guardarAjustes(lista: AjustePrecioDTO[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/ajustePrecio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lista)
    })
    const data = await res.json()
    if (data.codigo === 200 && Array.isArray(data.datos)) {
      ajustes.value = data.datos
      return true
    }
  } catch (e) {
    console.error('Error al guardar ajustes de precio:', e)
  }
  return false
}

export {
  ajustes, cargandoAjustes, montoHoy, hayAjusteHoy,
  cargarAjustes, guardarAjustes, obtenerDiaSemanaHoy
}
