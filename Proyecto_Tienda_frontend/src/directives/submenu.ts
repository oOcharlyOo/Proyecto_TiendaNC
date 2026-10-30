import type { Directive } from 'vue';

/**
 * v-submenu: comportamiento comun para las barras de pestañas (submenus) de
 * los modulos. Cuando las pestañas no caben:
 *  - la barra se desplaza horizontalmente (tactil, rueda del mouse o teclado),
 *  - se desvanece el borde por el que hay mas pestañas ocultas,
 *  - la pestaña activa (.active) se trae a la vista al cambiar.
 * Los estilos viven en styles/responsive.css (.submenu-scroll).
 */

type Estado = {
  actualizar: () => void;
  onWheel: (e: WheelEvent) => void;
  resize: ResizeObserver;
  mutation: MutationObserver;
};

const estados = new WeakMap<HTMLElement, Estado>();

function actualizarBordes(el: HTMLElement) {
  const max = el.scrollWidth - el.clientWidth;
  el.toggleAttribute('data-fade-start', el.scrollLeft > 2);
  el.toggleAttribute('data-fade-end', max - el.scrollLeft > 2);
}

function centrarActiva(el: HTMLElement, suave: boolean) {
  if (el.scrollWidth <= el.clientWidth) return;
  const activa = el.querySelector<HTMLElement>(':scope > .active, :scope > .is-active, :scope > [aria-selected="true"]');
  if (!activa) return;
  // scrollTo sobre la barra (no scrollIntoView) para no mover la pagina en vertical.
  const destino = activa.offsetLeft - (el.clientWidth - activa.offsetWidth) / 2;
  el.scrollTo({ left: Math.max(0, destino), behavior: suave ? 'smooth' : 'auto' });
}

export const vSubmenu: Directive<HTMLElement> = {
  mounted(el) {
    el.classList.add('submenu-scroll');
    el.setAttribute('role', el.getAttribute('role') || 'tablist');

    const actualizar = () => actualizarBordes(el);
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };

    el.addEventListener('scroll', actualizar, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });

    const resize = new ResizeObserver(() => { actualizar(); centrarActiva(el, false); });
    resize.observe(el);

    // Reacciona al cambio de pestaña activa (cambio de clase en los hijos).
    const mutation = new MutationObserver(() => { centrarActiva(el, true); actualizar(); });
    mutation.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-selected'] });

    estados.set(el, { actualizar, onWheel, resize, mutation });
    requestAnimationFrame(() => { centrarActiva(el, false); actualizar(); });
  },
  unmounted(el) {
    const s = estados.get(el);
    if (!s) return;
    el.removeEventListener('scroll', s.actualizar);
    el.removeEventListener('wheel', s.onWheel);
    s.resize.disconnect();
    s.mutation.disconnect();
    estados.delete(el);
  }
};

declare module 'vue' {
  interface ComponentCustomProperties {
    vSubmenu: typeof vSubmenu;
  }
}
