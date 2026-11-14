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

/** Se muestran pocas al inicio para no abrumar; "Ver más" va descubriendo el resto. */
const POR_PAGINA = 4;
const visibles = ref(POR_PAGINA);
const filtro = ref('');

watch(ofertasActuales, () => { visibles.value = POR_PAGINA; filtro.value = ''; });

const quitarAcentos = (s: string) => s.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase();

const filtradas = computed(() => {
  const q = quitarAcentos(filtro.value.trim());
  if (!q) return ofertasActuales.value;
  return ofertasActuales.value.filter(o => quitarAcentos(`${o.nombre} ${o.etiqueta}`).includes(q));
});

const mostradas = computed(() => (filtro.value.trim() ? filtradas.value : filtradas.value.slice(0, visibles.value)));
const restantes = computed(() => filtradas.value.length - mostradas.value.length);
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

        <div v-if="ofertasActuales.length > POR_PAGINA" class="oferta-buscar">
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
            <div class="oferta-etiqueta">{{ o.etiqueta }}</div>
            <div class="oferta-info">
              <h3>{{ o.titulo }}</h3>
              <p>{{ o.descripcion }}</p>
              <div class="oferta-total">
                <span class="oferta-total-cuenta">
                  Total {{ fmt(totalActual) }} + {{ o.nombre }}
                  {{ o.precioOferta > 0 ? fmt(o.precioOferta) : 'gratis' }}
                </span>
                <strong class="oferta-total-nuevo">= {{ fmt(totalCon(o.precioOferta)) }}</strong>
              </div>
              <span class="oferta-ahorro">El cliente ahorra {{ fmt(o.ahorro) }}</span>
            </div>
            <button type="button" class="oferta-btn-aceptar" :disabled="aplicandoOferta" @click="aceptarOferta(o)">
              {{ aplicandoOferta ? '...' : 'Aceptar' }}
            </button>
          </article>
          <button
            v-if="restantes > 0"
            type="button"
            class="oferta-btn-mas"
            @click="visibles += POR_PAGINA"
          >
            Ver más ofertas ({{ restantes }})
          </button>
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
  max-width: 34rem;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  animation: oferta-entrada 0.18s ease-out;
}

@keyframes oferta-entrada {
  from { transform: scale(0.96); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.oferta-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.1rem 1.25rem 0.9rem;
  border-bottom: 1px solid var(--border-color);
}

.oferta-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--accent-color);
}

.oferta-sub {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.oferta-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.1rem 0.4rem;
  border-radius: 6px;
}

.oferta-close:hover { color: var(--text-primary); background: var(--bg-secondary); }

.oferta-lista {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  overflow-y: auto;
}

.oferta-buscar {
  padding: 0.85rem 1.25rem 0;
}

.oferta-buscar-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.85rem;
  outline: none;
}

.oferta-buscar-input:focus { border-color: var(--accent-color); }

.oferta-vacio {
  margin: 0.5rem 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.oferta-btn-mas {
  padding: 0.6rem;
  border: 1px dashed var(--border-color);
  border-radius: 10px;
  background: transparent;
  color: var(--accent-color);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.oferta-btn-mas:hover { border-color: var(--accent-color); background: var(--bg-secondary); }

.oferta-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-secondary);
}

.oferta-etiqueta {
  min-width: 4.2rem;
  padding: 0.5rem 0.4rem;
  border-radius: 8px;
  text-align: center;
  font-weight: 800;
  font-size: 1.05rem;
  white-space: nowrap;
  color: #fff;
  background: var(--accent-color);
}

.oferta-card.is-otro .oferta-etiqueta { background: var(--success-color, #2e9d5b); }

.oferta-info h3 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
}

.oferta-info p {
  margin: 0.15rem 0 0.25rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.oferta-total {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem;
  margin: 0.1rem 0 0.25rem;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  background: var(--bg-primary);
  font-size: 0.8rem;
}

.oferta-total-cuenta {
  color: var(--text-secondary);
  min-width: 0;
  overflow-wrap: anywhere;
}

.oferta-total-nuevo {
  font-size: 0.95rem;
  color: var(--text-primary);
  white-space: nowrap;
}

.oferta-ahorro {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--success-color, #2e9d5b);
}

.oferta-btn-aceptar,
.oferta-btn-rechazar {
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.85rem;
  transition: filter 0.15s, border-color 0.15s;
}

.oferta-btn-aceptar {
  padding: 0.55rem 1rem;
  border: none;
  background: var(--accent-color);
  color: var(--text-primary);
}

.oferta-btn-aceptar:hover:not(:disabled) { filter: brightness(1.15); }

.oferta-footer {
  display: flex;
  justify-content: flex-end;
  padding: 0.9rem 1.25rem;
  border-top: 1px solid var(--border-color);
}

.oferta-btn-rechazar {
  padding: 0.6rem 1.1rem;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.oferta-btn-rechazar:hover:not(:disabled) { border-color: var(--accent-color); }

.oferta-btn-aceptar:disabled,
.oferta-btn-rechazar:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 480px) {
  .oferta-card { grid-template-columns: auto minmax(0, 1fr); }
  .oferta-btn-aceptar { grid-column: 1 / -1; width: 100%; }
  .oferta-btn-rechazar { width: 100%; }
}
</style>
