<script setup lang="ts">
import './estilos/finanzas-layout.css';
import './estilos/finanzas-history.css';
import './estilos/finanzas-ganancias.css';
import './estilos/finanzas-responsive.css';
import { useFinanzas } from './logica/useFinanzas';
const { mensaje, mensajeTipo, cargando, modalEntradaAbierto, modalSalidaAbierto, modalAjusteAbierto, modalEditarGananciasAbierto, pestañaActiva, saldoRealCalculado, historialBoveda, gananciasDelDia, gananciasTotales, gananciasEditadas, historialGanancias, gananciaPaginaActual, gananciaTotalPaginas, paginaActual, totalPaginas, historialUnico, formatoMoneda, cambiarPestaña, cambiarPagina, handleAjusteBase, editarGanancias, handleEditarGanancias, registrarMovimiento } = useFinanzas();
import EntradaEfectivoModal from '../modals/EntradaEfectivoModal.vue';
import SalidaEfectivoModal from '../modals/SalidaEfectivoModal.vue';
import MontoInicialModal from '../modals/MontoInicialModal.vue';
import FinanzasHeader from './secciones/FinanzasHeader.vue';
import FinanzasVaultCard from './secciones/FinanzasVaultCard.vue';
import FinanzasActions from './secciones/FinanzasActions.vue';
import FinanzasHistory from './secciones/FinanzasHistory.vue';
import FinanzasGanancias from './secciones/FinanzasGanancias.vue';

</script>

<template>
  <main class="finanzas-container">
    <div class="bg-fog"></div>

    <div class="content-wrapper">
      <FinanzasHeader
        :pestaña-activa="pestañaActiva"
        :mensaje="mensaje"
        :mensaje-tipo="mensajeTipo"
        @cambiar-pestana="cambiarPestaña"
      />

      <div class="dashboard-grid">
        <FinanzasVaultCard
          :saldo-real-calculado="saldoRealCalculado"
          :historial-boveda="historialBoveda"
          :formato-moneda="formatoMoneda"
          @ajustar="modalAjusteAbierto = true"
        />

        <FinanzasActions
          @entrada="modalEntradaAbierto = true"
          @salida="modalSalidaAbierto = true"
        />

        <FinanzasHistory
          :historial-unico="historialUnico"
          :cargando="cargando"
          :pestaña-activa="pestañaActiva"
          :pagina-actual="paginaActual"
          :total-paginas="totalPaginas"
          :formato-moneda="formatoMoneda"
          @cambiar-pagina="cambiarPagina"
        />

        <FinanzasGanancias
          :pestaña-activa="pestañaActiva"
          :cargando="cargando"
          :ganancias-del-dia="gananciasDelDia"
          :ganancias-totales="gananciasTotales"
          :historial-ganancias="historialGanancias"
          :ganancia-pagina-actual="gananciaPaginaActual"
          :ganancia-total-paginas="gananciaTotalPaginas"
          :formato-moneda="formatoMoneda"
          @editar-ganancias="editarGanancias"
          @cambiar-pagina="cambiarPagina"
        />
      </div>
    </div>

    <EntradaEfectivoModal :open="modalEntradaAbierto" @close="modalEntradaAbierto = false" @submit="(p: any) => registrarMovimiento(p, 'entrada')" />
    <SalidaEfectivoModal :open="modalSalidaAbierto" @close="modalSalidaAbierto = false" @submit="(p: any) => registrarMovimiento(p, 'salida')" />
    <MontoInicialModal
      :open="modalAjusteAbierto"
      title="Ajuste de Bóveda Real"
      subtitle="Ingresa el monto total físico que has contado en la bóveda"
      label="Saldo Real Contado"
      confirm-text="Actualizar Saldo de Bóveda"
      @close="modalAjusteAbierto = false"
      @submit="handleAjusteBase"
    />
    <MontoInicialModal
      :open="modalEditarGananciasAbierto"
      title="Ajuste de Ganancias"
      subtitle="Ingresa el monto total de ganancias registrado manualmente"
      label="Total Ganancias"
      confirm-text="Actualizar Ganancias"
      :initial-value="gananciasEditadas"
      @close="modalEditarGananciasAbierto = false"
      @submit="handleEditarGanancias"
    />
  </main>
</template>


