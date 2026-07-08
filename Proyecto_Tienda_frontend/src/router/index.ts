// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login/Login.vue';
import Ventas from '../components/Ventas/Ventas.vue';
import Productos from "@/components/Productos/Productos.vue";
import Inventario from "@/components/Inventario/Inventario.vue";
import Corte from "@/components/Corte/Corte.vue";
import Finanzas from "@/components/Finanzas/Finanzas.vue";
import Rental from "@/components/Rental/Rental.vue";
import Usuarios from "@/components/Usuarios/Usuarios.vue";

const AUTH_KEY = 'isAuth';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login,
  },
  {
    path: '/ventas',
    name: 'Ventas',
    component: Ventas,
    meta: { requiresAuth: true },
  },
  {
    path: '/productos',
    name: 'Productos',
    component: Productos,
    meta: { requiresAuth: true },
  },
  {
    path: '/inventario',
    name: 'Inventario',
    component: Inventario,
    meta: { requiresAuth: true, adminOnly: true },
  },
  {
    path: '/corte',
    name: 'Corte',
    component: Corte,
    meta: { requiresAuth: true },
  },
  {
    path: '/usuarios',
    name: 'Usuarios',
    component: Usuarios,
    meta: { requiresAuth: true },
  },
  {
    path: '/finanzas',
    name: 'Finanzas',
    component: Finanzas,
    meta: { requiresAuth: true, adminOnly: true },
  },
  {
    path: '/rental',
    name: 'Rental',
    component: Rental,
    meta: { requiresAuth: true },
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const isAuthenticated = localStorage.getItem(AUTH_KEY) === 'true';
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth);
  const tipoUsuario = Number(localStorage.getItem('tipoUsuario') || 2);
  const esAdmin = tipoUsuario === 1;
  const adminOnly = to.matched.some((record) => record.meta?.adminOnly);

  if (requiresAuth && !isAuthenticated) {
    next({ path: '/' });
    return;
  }

  if (adminOnly && !esAdmin) {
    next({ path: '/ventas' });
    return;
  }

  if (to.path === '/' && isAuthenticated) {
    next({ path: '/ventas' });
    return;
  }

  next();
});

export default router;
