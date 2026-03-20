// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login.vue';
import Ventas from '../components/Ventas.vue';
import Productos from "@/components/Productos.vue";
import Inventario from "@/components/Inventario.vue";
import Corte from "@/components/Corte.vue";
import Usuarios from "@/components/Usuarios.vue";
import Finanzas from "@/components/Finanzas.vue";

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
