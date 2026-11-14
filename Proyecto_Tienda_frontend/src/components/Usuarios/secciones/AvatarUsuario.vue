<script setup lang="ts">
import { computed, ref, watch } from 'vue';

/**
 * Avatar del usuario: muestra la foto y, si no tiene o no carga (404, MinIO caído…),
 * muestra sus iniciales. El elemento raíz recibe los estilos del componente padre,
 * así que cada vista conserva su diseño con `img-class` / `placeholder-class`.
 */
const props = defineProps<{
  src?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  imgClass?: string;
  placeholderClass?: string;
}>();

const fallo = ref(false);
watch(() => props.src, () => { fallo.value = false; });

const iniciales = computed(() => {
  const palabras = `${props.nombre ?? ''} ${props.apellido ?? ''}`
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!palabras.length) return '?';
  const primera = palabras[0].charAt(0);
  const segunda = palabras.length > 1 ? palabras[1].charAt(0) : '';
  return (primera + segunda).toUpperCase();
});

const textoAlt = computed(() => `${props.nombre ?? ''} ${props.apellido ?? ''}`.trim() || 'Usuario');
</script>

<template>
  <img
    v-if="src && !fallo"
    :src="src"
    :alt="textoAlt"
    :class="imgClass"
    @error="fallo = true"
  />
  <div v-else :class="placeholderClass" :title="textoAlt" role="img" :aria-label="textoAlt">
    {{ iniciales }}
  </div>
</template>
