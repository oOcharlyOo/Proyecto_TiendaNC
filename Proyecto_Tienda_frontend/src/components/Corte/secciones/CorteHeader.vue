<script setup lang="ts">
defineProps<{ mensaje: string; mensajeTipo: 'ok' | 'error' | 'info' }>();
defineEmits<{ 'cerrar-mensaje': [] }>();
</script>
<template>
  <Teleport to="body">
    <div v-if="mensaje" class="mensaje-flash" :class="mensajeTipo">
      <span class="mensaje-icono">{{ mensajeTipo === 'ok' ? '✓' : mensajeTipo === 'error' ? '✕' : 'ℹ' }}</span>
      <span class="mensaje-texto">{{ mensaje }}</span>
      <button class="mensaje-cerrar" @click="$emit('cerrar-mensaje')">✕</button>
    </div>
  </Teleport>
  <section class="hero-section">
    <div class="bg-fog"></div>
    <div class="bg-scanlines"></div>
    <div class="hero-decoration left">❧</div>
    <div class="hero-content">
      <h1 class="hero-title">Corte de Caja</h1>
      <p class="hero-subtitle">Administración de ingresos, egresos y reportes</p>
    </div>
    <div class="hero-decoration right">❧</div>
  </section>
</template>

<style scoped>
.hero-section{text-align:center;padding:2rem 1rem 1.2rem;position:relative;z-index:1}
.hero-decoration{font-size:2rem;color:var(--color-accent);opacity:.3;position:absolute;top:50%;transform:translateY(-50%)}.hero-decoration.left{left:5%}.hero-decoration.right{right:5%}
.hero-title{font-size:2rem;color:var(--color-accent);margin:0;letter-spacing:2px;font-weight:800}
.hero-subtitle{color:var(--color-text-secondary);margin-top:.4rem;font-size:.9rem}
.mensaje-flash{position:fixed;top:1.2rem;left:50%;transform:translateX(-50%);z-index:9999;padding:.85rem 1.5rem;border-radius:14px;display:flex;align-items:center;gap:.85rem;font-size:.9rem;font-weight:600;animation:slideDown .35s ease;border:none;box-shadow:10px 10px 25px rgba(0,0,0,.3)}
.mensaje-icono{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:900;flex-shrink:0}
.mensaje-flash.ok .mensaje-icono{background:color-mix(in srgb,var(--color-success) 25%,transparent);color:var(--color-success)}
.mensaje-flash.error .mensaje-icono{background:color-mix(in srgb,var(--color-error) 25%,transparent);color:var(--color-error)}
.mensaje-flash.info .mensaje-icono{background:color-mix(in srgb,var(--color-info) 25%,transparent);color:var(--color-info)}
.mensaje-flash.ok{background:color-mix(in srgb,var(--color-success) 18%,var(--color-bg-panel));color:var(--color-success);box-shadow:10px 10px 25px rgba(0,0,0,.3),0 0 0 1px color-mix(in srgb,var(--color-success) 30%,transparent)}
.mensaje-flash.error{background:color-mix(in srgb,var(--color-error) 18%,var(--color-bg-panel));color:var(--color-error);box-shadow:10px 10px 25px rgba(0,0,0,.3),0 0 0 1px color-mix(in srgb,var(--color-error) 30%,transparent)}
.mensaje-flash.info{background:color-mix(in srgb,var(--color-info) 18%,var(--color-bg-panel));color:var(--color-info);box-shadow:10px 10px 25px rgba(0,0,0,.3),0 0 0 1px color-mix(in srgb,var(--color-info) 30%,transparent)}
.mensaje-cerrar{background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;opacity:.7;padding:0;line-height:1}.mensaje-cerrar:hover{opacity:1}
@keyframes slideDown{from{transform:translateX(-50%) translateY(-120%);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
@media(max-width:768px){.hero-section{padding:1.5rem .5rem}.hero-title{font-size:1.3rem}.hero-decoration{display:none}}
@media(max-width:480px){.hero-title{font-size:1.1rem}.hero-subtitle{font-size:.8rem}}
</style>
