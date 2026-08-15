<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { AjustePrecioDTO } from '@/composables/useAjustePrecio';
import { ajustes, cargarAjustes, guardarAjustes } from '@/composables/useAjustePrecio';

const dias = [
  { dia: 1, nombre: 'Lunes' },
  { dia: 2, nombre: 'Martes' },
  { dia: 3, nombre: 'Miércoles' },
  { dia: 4, nombre: 'Jueves' },
  { dia: 5, nombre: 'Viernes' },
  { dia: 6, nombre: 'Sábado' },
  { dia: 7, nombre: 'Domingo' }
];

const filas = ref<AjustePrecioDTO[]>(dias.map((d) => ({ dia_semana: d.dia, monto: 0, activo: false })));
const cargando = ref(true);
const guardando = ref(false);
const mensaje = ref('');
const mensajeError = ref('');

const diasActivos = computed(() => filas.value.filter((f) => f.activo).length);
const montoValido = computed(() => filas.value.every((f) => !f.activo || (Number(f.monto) >= 1 && Number(f.monto) <= 2)));

function aplicarDesdeServidor() {
  for (const f of filas.value) {
    const servido = ajustes.value.find((a) => a.dia_semana === f.dia_semana);
    if (servido) {
      f.monto = Number(servido.monto || 0);
      f.activo = Boolean(servido.activo);
    }
  }
}

onMounted(async () => {
  cargando.value = true;
  await cargarAjustes();
  aplicarDesdeServidor();
  cargando.value = false;
});

function toggleActivo(fila: AjustePrecioDTO) {
  fila.activo = !fila.activo;
  if (fila.activo && (!Number(fila.monto) || Number(fila.monto) < 1)) fila.monto = 1;
  if (!fila.activo) fila.monto = 0;
}

async function guardar() {
  mensaje.value = '';
  mensajeError.value = '';
  if (!montoValido.value) {
    mensajeError.value = 'Los días activos deben tener un monto entre $1 y $2.';
    return;
  }
  guardando.value = true;
  const ok = await guardarAjustes(filas.value);
  guardando.value = false;
  if (ok) {
    aplicarDesdeServidor();
    mensaje.value = 'Ajustes guardados correctamente.';
  } else {
    mensajeError.value = 'Error al guardar los ajustes.';
  }
}
</script>

<template>
  <div class="ap-admin">
    <div class="ap-head">
      <h3 class="ap-title"><span class="ap-icon">📈</span> Ajuste de Precio por Día</h3>
      <p class="ap-subtitle">
        En los días activos, el precio de venta de todos los productos aumenta el monto indicado (sin modificar el costo).
        <strong>El mayoreo no se ve afectado.</strong>
      </p>
    </div>

    <div v-if="cargando" class="ap-loading">
      <div class="ap-spin"></div>
      <span>Cargando configuración...</span>
    </div>

    <template v-else>
      <div class="ap-list">
        <div v-for="fila in filas" :key="fila.dia_semana" class="ap-row" :class="{ 'ap-row-on': fila.activo }">
          <label class="ap-toggle">
            <input type="checkbox" :checked="fila.activo" @change="toggleActivo(fila)" />
            <span class="ap-toggle-t"><span class="ap-toggle-d"></span></span>
          </label>
          <span class="ap-dia">{{ dias.find((d) => d.dia === fila.dia_semana)?.nombre }}</span>
          <div class="ap-monto-wrap">
            <span class="ap-moneda">$</span>
            <input
              v-model.number="fila.monto"
              type="number"
              min="1"
              max="2"
              step="0.01"
              :disabled="!fila.activo"
              class="ap-monto"
              placeholder="0.00"
            />
          </div>
          <span v-if="fila.activo" class="ap-estado ap-on">Activo</span>
          <span v-else class="ap-estado">Inactivo</span>
        </div>
      </div>

      <div class="ap-summary">
        <span class="ap-summary-text">
          {{ diasActivos }} día{{ diasActivos === 1 ? '' : 's' }} activo{{ diasActivos === 1 ? '' : 's' }}
          <template v-if="diasActivos > 0">— el POS mostrará el precio incrementado ese día</template>
        </span>
        <button class="ap-guardar" @click="guardar" :disabled="guardando">
          {{ guardando ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>

      <p v-if="mensaje" class="ap-msg ap-msg-ok">✓ {{ mensaje }}</p>
      <p v-if="mensajeError" class="ap-msg ap-msg-err">✕ {{ mensajeError }}</p>
    </template>
  </div>
</template>

<style scoped>
.ap-admin{display:flex;flex-direction:column;gap:1rem;padding:1rem;max-width:560px;margin:0 auto}
.ap-head{display:flex;flex-direction:column;gap:.35rem}
.ap-title{margin:0;font-size:1.05rem;font-weight:800;color:var(--color-accent);display:flex;align-items:center;gap:.5rem}
.ap-icon{font-size:1.2rem}
.ap-subtitle{margin:0;font-size:.78rem;color:var(--color-text-secondary);line-height:1.45}
.ap-loading{display:flex;align-items:center;gap:.6rem;color:var(--color-text-secondary);font-size:.8rem;padding:1.5rem;justify-content:center}
.ap-spin{width:20px;height:20px;border:2px solid var(--color-border);border-top-color:var(--color-accent);border-radius:50%;animation:apSpin .7s linear infinite}
@keyframes apSpin{to{transform:rotate(360deg)}}
.ap-list{display:flex;flex-direction:column;gap:.45rem}
.ap-row{display:flex;align-items:center;gap:.75rem;padding:.55rem .75rem;background:var(--color-bg-panel);border:none;border-radius:10px;box-shadow:3px 3px 6px rgba(0,0,0,.08),-1px -1px 3px rgba(255,255,255,.02);transition:all .15s}
.ap-row-on{box-shadow:3px 3px 6px rgba(0,0,0,.08),0 0 0 1px color-mix(in srgb,var(--color-accent) 35%,transparent)}
.ap-toggle{display:flex;align-items:center;cursor:pointer;user-select:none}
.ap-toggle input{display:none}
.ap-toggle-t{width:34px;height:18px;background:var(--color-bg-secondary);border:none;border-radius:9px;position:relative;transition:all .2s;box-shadow:inset 2px 2px 3px rgba(0,0,0,.12);flex-shrink:0}
.ap-toggle-d{position:absolute;top:2px;left:2px;width:14px;height:14px;background:var(--color-text-secondary);border-radius:50%;transition:all .2s;box-shadow:1px 1px 2px rgba(0,0,0,.1)}
.ap-toggle input:checked+.ap-toggle-t{background:var(--color-accent);box-shadow:inset 2px 2px 3px rgba(0,0,0,.15)}
.ap-toggle input:checked+.ap-toggle-t .ap-toggle-d{left:18px;background:var(--color-on-brand)}
.ap-dia{flex:1;font-size:.85rem;font-weight:700;color:var(--color-text-primary)}
.ap-monto-wrap{display:flex;align-items:center;background:var(--color-bg-primary);border:none;border-radius:7px;overflow:hidden;box-shadow:inset 2px 2px 4px rgba(0,0,0,.1)}
.ap-moneda{padding:0 .3rem 0 .5rem;color:var(--color-text-secondary);font-size:.8rem;font-weight:700}
.ap-monto{width:70px;padding:.35rem .4rem;background:transparent;border:none;color:var(--color-text-primary);font-size:.85rem;font-family:'Courier New',monospace;font-weight:700;outline:none}
.ap-monto:disabled{opacity:.45;cursor:not-allowed}
.ap-estado{font-size:.62rem;text-transform:uppercase;letter-spacing:.04em;color:var(--color-text-secondary);padding:.15rem .45rem;background:var(--color-bg-secondary);border-radius:5px;font-weight:700;min-width:64px;text-align:center}
.ap-on{color:var(--color-success);background:color-mix(in srgb,var(--color-success) 12%,transparent)}
.ap-summary{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.6rem .75rem;background:var(--color-bg-panel);border:none;border-radius:10px;box-shadow:inset 2px 2px 4px rgba(0,0,0,.06);flex-wrap:wrap}
.ap-summary-text{font-size:.75rem;color:var(--color-text-secondary)}
.ap-guardar{border:none;padding:.5rem 1.1rem;font-size:.78rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em;font-family:var(--font-body);color:var(--color-on-brand);background:var(--color-accent);cursor:pointer;border-radius:8px;box-shadow:3px 3px 8px rgba(0,0,0,.2),-1px -1px 4px rgba(255,255,255,.04);transition:all .2s;flex-shrink:0}
.ap-guardar:hover:not(:disabled){transform:translateY(-2px);box-shadow:5px 5px 14px rgba(0,0,0,.28)}
.ap-guardar:disabled{opacity:.5;cursor:not-allowed;transform:none}
.ap-msg{font-size:.8rem;font-weight:700;padding:.5rem .75rem;border-radius:8px;margin:0}
.ap-msg-ok{color:var(--color-success);background:color-mix(in srgb,var(--color-success) 10%,transparent)}
.ap-msg-err{color:var(--color-error);background:color-mix(in srgb,var(--color-error) 10%,transparent)}
@media(max-width:480px){.ap-row{flex-wrap:wrap}.ap-estado{min-width:0}}
</style>
