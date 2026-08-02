<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ open: boolean; data: any }>();
const emit = defineEmits<{ (e: 'seleccionar', opcion: any): void; (e: 'cancelar'): void }>();

const formatoMoneda = (v: any) =>
  v != null && !isNaN(Number(v)) ? `$${Number(v).toFixed(2)}` : '';

watch(() => props.open, (val) => {
  if (!val) return;
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="vo-modal-overlay" @click.self="emit('cancelar')">
      <div class="vo-modal">
        <div class="vo-modal-header">
          <h2>🎤 ¿Cuál quisiste?</h2>
          <button class="vo-close-btn" @click="emit('cancelar')">&times;</button>
        </div>
        <div class="vo-modal-body">
          <p class="vo-mensaje">
            {{ data?.mensaje || 'Se encontraron varios productos, elige uno:' }}
            <span v-if="data?.monto" class="vo-monto">
              ({{ data.tipo === 'PESO' ? data.monto + (data.unidad || 'g') : data.tipo === 'PRECIO' ? formatoMoneda(data.monto) : data.monto + ' unidad(es)' }})
            </span>
          </p>
          <div class="vo-lista">
            <button
              v-for="op in data?.opciones || []"
              :key="op.productoId"
              class="vo-opcion"
              @click="emit('seleccionar', op)"
            >
              <span class="vo-opcion-nombre">{{ op.nombreProducto }}</span>
              <span class="vo-opcion-precio">{{ formatoMoneda(op.precio) }}</span>
            </button>
          </div>
        </div>
        <div class="vo-modal-footer">
          <button class="vo-btn vo-btn-secondary" @click="emit('cancelar')">Cancelar</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.vo-modal-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--perg-bg) 85%, var(--bg-primary));
  backdrop-filter: blur(5px);
  z-index: 400;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.vo-modal {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.vo-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.vo-modal-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--accent-color);
}

.vo-modal-body {
  padding: 1.2rem 1.5rem;
}

.vo-modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.vo-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.vo-close-btn:hover { color: var(--text-primary); background: var(--bg-secondary); }

.vo-mensaje {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.vo-monto {
  color: var(--accent-color);
  font-weight: 600;
}

.vo-lista {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 50vh;
  overflow-y: auto;
}

.vo-opcion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.vo-opcion:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, var(--bg-secondary));
}

.vo-opcion-nombre { font-weight: 600; }
.vo-opcion-precio { color: var(--accent-color); font-weight: 700; white-space: nowrap; }

.vo-btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.vo-btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.vo-btn-secondary:hover { border-color: var(--accent-color); }
</style>
