<script setup lang="ts">
import type { Estacion, Opcion, ProductoDTO } from '../logica/useRental';

defineProps<{
  open: boolean;
  estacion: Estacion | null;
  productosDisponibles: ProductoDTO[];
}>();

const emit = defineEmits<{
  'close': [];
  'guardar': [];
  'agregar-opcion': [];
  'eliminar-opcion': [idx: number];
  'agregar-producto': [opcion: Opcion];
  'eliminar-producto': [opcion: Opcion, idx: number];
}>();
</script>

<template>
  <div v-if="open && estacion" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content modal-opciones">
      <h2 class="modal-title">⚙️ Configurar - {{ estacion.nombreProducto }}</h2>

      <div class="opciones-config">
        <div class="opciones-list">
          <div v-for="(opt, idx) in estacion.opciones" :key="idx" class="opcion-item">
            <div class="opcion-header">
              <input v-model="opt.nombre" type="text" placeholder="Nombre opción" class="input-nombre" />
              <button class="btn-delete-opcion" @click="emit('eliminar-opcion', idx)">🗑️</button>
            </div>
            <div class="opcion-detalles">
              <div class="input-group">
                <label>Minutos</label>
                <input v-model.number="opt.minutos" type="number" min="1" class="input-mini" />
              </div>
              <div class="input-group">
                <label>Precio Total</label>
                <input v-model.number="opt.precio" type="number" min="0" class="input-mini" />
              </div>
            </div>
            <div class="opcion-productos">
              <div class="productos-header">
                <span>Productos incluidos:</span>
                <button class="btn-agregar-producto" @click="emit('agregar-producto', opt)">➕</button>
              </div>
              <ul class="productos-list">
                <li v-for="(prod, pIdx) in opt.productosIncluidos" :key="pIdx">
                  <span>{{ prod.cantidad }}x {{ prod.nombre }}</span>
                  <button class="btn-quitar" @click="emit('eliminar-producto', opt, pIdx)">✕</button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <button class="btn-agregar-opcion" @click="emit('agregar-opcion')">
          ➕ Agregar Opción de Tiempo
        </button>
      </div>

      <div class="modal-actions">
        <button class="btn-cancelar" @click="emit('close')">Cancelar</button>
        <button class="btn-confirmar" @click="emit('guardar')">Guardar</button>
      </div>
    </div>
  </div>
</template>
