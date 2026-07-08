<script setup lang="ts">
import { useInventario } from './logica/useInventario';
const { cargando, mensaje, categorias, filtroBusqueda, filtroCategoria, ordenarPor, verSoloProblemas, modalFormOpen, modalProductoEditando, guardando, vistaLista, cargar, guardar, editar, productosFiltrados, bajoStock, productosAgotados, costoTotal, gananciaPot, totalItems, catsConTodas } = useInventario();

import InvHeader from './secciones/InvHeader.vue';
import InvKpisBar from './secciones/InvKpisBar.vue';
import InvToolbar from './secciones/InvToolbar.vue';
import InvTabla from './secciones/InvTabla.vue';
import InvGrilla from './secciones/InvGrilla.vue';
import ProductoFormModal from '../modals/Productos/ProductoFormModal.vue';
import './estilos/inv-layout.css';
import './estilos/inv-tabla.css';
import './estilos/inv-grilla.css';
import './estilos/inv-responsive.css';

</script>

<template>
  <div class="inv">
    <InvHeader :total-items="totalItems" :cargando="cargando" :vista-lista="vistaLista"
      @update:vista-lista="vistaLista = $event" @recargar="cargar" />

    <InvKpisBar :total-items="totalItems" :bajo-stock="bajoStock.length" :productos-agotados="productosAgotados.length"
      :costo-total="costoTotal" :ganancia-pot="gananciaPot" />

    <InvToolbar :filtro-busqueda="filtroBusqueda" :filtro-categoria="filtroCategoria" :ordenar-por="ordenarPor"
      :ver-solo-problemas="verSoloProblemas" :cats-con-todas="catsConTodas"
      @update:filtro-busqueda="filtroBusqueda = $event"
      @update:filtro-categoria="filtroCategoria = $event"
      @update:ordenar-por="ordenarPor = $event"
      @update:ver-solo-problemas="verSoloProblemas = $event" />

    <div class="inv__body">
      <div v-if="cargando" class="inv__wait"><div class="inv__spin"></div><p>Cargando inventario...</p></div>
      <p v-else-if="mensaje" class="inv__err">⚠️ {{ mensaje }}</p>
      <p v-else-if="productosFiltrados.length === 0" class="inv__nil">📭 {{ verSoloProblemas ? 'Sin alertas' : 'Sin resultados' }}</p>

      <InvTabla v-else-if="vistaLista" :productos="productosFiltrados" @editar="editar" />
      <InvGrilla v-else :productos="productosFiltrados" @editar="editar" />
    </div>

    <ProductoFormModal :open="modalFormOpen" :data="modalProductoEditando" :loading="guardando"
      :categorias="categorias" @close="modalFormOpen = false; modalProductoEditando = undefined"
      @submit="guardar" />
  </div>
</template>


