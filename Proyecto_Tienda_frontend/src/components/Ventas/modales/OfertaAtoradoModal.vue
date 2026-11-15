<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  modalOfertaAbierto, ofertasActuales, productoOferta, aplicandoOferta,
  aceptarOferta, cerrarOferta,
} from '../logica/usePosOfertas';

import { totalVenta } from '../logica/usePosTicket';

const fmt = (v: number) => (Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`);
/** Total del ticket redondeado a centavos (evita "$34.999999"). */
const totalActual = computed(() => Math.round(Number(totalVenta.value || 0) * 100) / 100);
const totalCon = (precioOferta: number) => Math.round((totalActual.value + precioOferta) * 100) / 100;

const filtro = ref('');

watch(ofertasActuales, () => { filtro.value = ''; });

const quitarAcentos = (s: string) => s.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();

const filtradas = computed(() => {
  const q = quitarAcentos(filtro.value.trim());
  if (!q) return ofertasActuales.value;
  return ofertasActuales.value.filter(o => quitarAcentos(`${o.nombre} ${o.etiqueta}`).includes(q));
});

const mostradas = filtradas;
</script>

<template>
  <Teleport to="body">
    <div v-if="modalOfertaAbierto" class="oferta-overlay" @click.self="cerrarOferta">
      <div class="oferta-modal" role="dialog" aria-modal="true" aria-labelledby="oferta-titulo">
        <header class="oferta-header">
          <div>
            <h2 id="oferta-titulo">🔥 ¡Este producto tiene oferta!</h2>
            <p class="oferta-sub">
              <strong>{{ productoOferta?.nombre }}</strong> no se ha movido
              <template v-if="productoOferta?.diasSinMovimiento">en {{ productoOferta.diasSinMovimiento }} días</template>
              <template v-else>en mucho tiempo</template>.
              Ofrécele al cliente:
            </p>
          </div>
          <button class="oferta-close" type="button" aria-label="Cerrar" @click="cerrarOferta">&times;</button>
        </header>

        <div v-if="ofertasActuales.length > 4" class="oferta-buscar">
          <input
            v-model="filtro"
            type="search"
            class="oferta-buscar-input"
            :placeholder="`Buscar entre ${ofertasActuales.length} ofertas (ej. chocolate)`"
            aria-label="Buscar oferta"
          />
        </div>

        <div class="oferta-lista">
          <p v-if="!mostradas.length" class="oferta-vacio">Ninguna oferta coincide con "{{ filtro.trim() }}".</p>
          <article v-for="o in mostradas" :key="o.id" class="oferta-card" :class="o.tipo === 'MISMO' ? 'is-mismo' : 'is-otro'">
            <div class="oc-top">
              <span class="oc-tipo">{{ o.tipo === 'MISMO' ? '🔁 Otra pieza igual' : '🎁 Agrega otro producto' }}</span>
              <span class="oc-ahorro">Ahorra {{ fmt(o.ahorro) }}</span>
            </div>

            <div class="oc-producto">
              <div class="oc-etiqueta">{{ o.etiqueta }}</div>
              <div class="oc-nombre-wrap">
                <h3 class="oc-nombre">{{ o.nombre }}</h3>
                <p class="oc-desc">{{ o.descripcion }}</p>
              </div>
              <div class="oc-precios">
                <span v-if="o.precioNormal > o.precioOferta" class="oc-normal">{{ fmt(o.precioNormal) }}</span>
                <span class="oc-oferta">{{ o.precioOferta > 0 ? fmt(o.precioOferta) : 'Gratis' }}</span>
              </div>
            </div>

            <div class="oc-cuenta" aria-label="Total de la cuenta con la oferta">
              <span class="oc-cuenta-txt">Cuenta {{ fmt(totalActual) }} + {{ o.precioOferta > 0 ? fmt(o.precioOferta) : '$0' }}</span>
              <span class="oc-cuenta-total">Total <strong>{{ fmt(totalCon(o.precioOferta)) }}</strong></span>
            </div>

            <button type="button" class="oferta-btn-aceptar" :disabled="aplicandoOferta" @click="aceptarOferta(o)">
              {{ aplicandoOferta ? 'Agregando…' : '✓ Agregar a la cuenta' }}
            </button>
          </article>
        </div>

        <footer class="oferta-footer">
          <button type="button" class="oferta-btn-rechazar" :disabled="aplicandoOferta" @click="cerrarOferta">
            No, solo cobrar la pieza
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.oferta-overlay {
  position: fixed;
  inset: 0;
  z-index: 450;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--perg-bg, #000) 80%, transparent);
  backdrop-filter: blur(4px);
}

.oferta-modal {
  width: 100%;
  max-width: 36rem;
  max-height: 92vh;
  max-height: 92dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  animation: oferta-entrada 0.18s ease-out;
}

@keyframes oferta-entrada {
  from { transform: translateY(8px) scale(0.98); opacity: 0; }
  to { transform: none; opacity: 1; }
}

/* ---------- Encabezado ---------- */
.oferta-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem 0.85rem;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--accent-color) 14%, transparent), transparent);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.oferta-header h2 {
  margin: 0;
  font-size: 1.15rem;
  line-height: 1.25;
  color: var(--accent-color);
}

.oferta-sub {
  margin: 0.4rem 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

.oferta-sub strong { color: var(--text-primary); }

.oferta-close {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  font-size: 1.4rem;
  line-height: 1;
  color: var(--text-secondary);
  cursor: pointer;
}

.oferta-close:hover { color: var(--text-primary); border-color: var(--accent-color); }

/* ---------- Buscador ---------- */
.oferta-buscar { padding: 0.75rem 1.25rem 0; flex-shrink: 0; }

.oferta-buscar-input {
  width: 100%;
  box-sizing: border-box;
  min-height: 2.6rem;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
}

.oferta-buscar-input:focus { border-color: var(--accent-color); }

/* ---------- Lista ---------- */
.oferta-lista {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem 1.25rem;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}

.oferta-vacio {
  margin: 0.5rem 0;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

/* ---------- Tarjeta de oferta ---------- */
.oferta-card {
  --oc-color: var(--accent-color);
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0.85rem;
  border: 1px solid var(--border-color);
  border-left: 4px solid var(--oc-color);
  border-radius: 12px;
  background: var(--bg-secondary);
}

.oferta-card.is-otro { --oc-color: var(--success-color, #2e9d5b); }

.oc-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.oc-tipo {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--oc-color);
}

.oc-ahorro {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  color: #fff;
  background: var(--success-color, #2e9d5b);
  white-space: nowrap;
}

/* Producto que se ofrece: etiqueta | nombre | precio */
.oc-producto {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
}

.oc-etiqueta {
  min-width: 4rem;
  padding: 0.55rem 0.5rem;
  border-radius: 10px;
  text-align: center;
  font-weight: 800;
  font-size: 1.05rem;
  line-height: 1.1;
  white-space: nowrap;
  color: #fff;
  background: var(--oc-color);
}

.oc-nombre-wrap { min-width: 0; }

.oc-nombre {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.oc-desc {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--text-secondary);
}

.oc-precios {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
}

.oc-normal {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-decoration: line-through;
}

.oc-oferta {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--oc-color);
  white-space: nowrap;
}

/* Resumen de la cuenta */
.oc-cuenta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--bg-primary);
  font-size: 0.85rem;
}

.oc-cuenta-txt { color: var(--text-secondary); }
.oc-cuenta-total { color: var(--text-primary); }
.oc-cuenta-total strong { font-size: 1.15rem; margin-left: 0.2rem; }

/* ---------- Botones ---------- */
.oferta-btn-aceptar,
.oferta-btn-rechazar {
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.95rem;
  min-height: 2.9rem;
  transition: filter 0.15s, border-color 0.15s;
}

.oferta-btn-aceptar {
  width: 100%;
  padding: 0.6rem 1rem;
  border: none;
  background: var(--oc-color, var(--accent-color));
  color: #fff;
}

.oferta-btn-aceptar:hover:not(:disabled) { filter: brightness(1.12); }
.oferta-btn-aceptar:active:not(:disabled) { transform: scale(0.99); }

.oferta-footer {
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
  flex-shrink: 0;
}

.oferta-btn-rechazar {
  width: 100%;
  padding: 0.6rem 1.1rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.oferta-btn-rechazar:hover:not(:disabled) { border-color: var(--accent-color); }

.oferta-btn-aceptar:disabled,
.oferta-btn-rechazar:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- Celular ---------- */
@media (max-width: 560px) {
  .oferta-overlay { padding: 0; align-items: end; }
  .oferta-modal { max-width: none; max-height: 94dvh; border-radius: 18px 18px 0 0; border-bottom: none; }
  .oferta-header { padding: 0.85rem 1rem 0.7rem; }
  .oferta-header h2 { font-size: 1.05rem; }
  .oferta-buscar { padding: 0.6rem 1rem 0; }
  .oferta-lista { padding: 0.85rem 1rem; gap: 0.75rem; }
  .oferta-footer { padding: 0.7rem 1rem calc(0.7rem + env(safe-area-inset-bottom, 0px)); }
  /* Etiqueta y precio arriba, nombre completo debajo para que se lea entero. */
  .oc-producto { grid-template-columns: auto minmax(0, 1fr); grid-template-areas: "etq precio" "nom nom"; row-gap: 0.5rem; }
  .oc-etiqueta { grid-area: etq; justify-self: start; }
  .oc-precios { grid-area: precio; flex-direction: row-reverse; align-items: baseline; justify-content: flex-start; gap: 0.5rem; justify-self: end; }
  .oc-nombre-wrap { grid-area: nom; }
  .oc-nombre { -webkit-line-clamp: 4; line-clamp: 4; }
}
</style>
