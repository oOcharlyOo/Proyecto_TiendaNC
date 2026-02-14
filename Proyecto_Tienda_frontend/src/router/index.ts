// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login.vue';
import Ventas from '../components/Ventas.vue';
import Productos from "@/components/Productos.vue";
import Inventario from "@/components/Inventario.vue";
import Corte from "@/components/Corte.vue";

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
    meta: { requiresAuth: true }, // Example meta field for protected routes
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
    meta: { requiresAuth: true },
  },
  {
    path: '/corte',
    name: 'Corte',
    component: Corte,
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

  if (requiresAuth && !isAuthenticated) {
    next({ path: '/' });
    return;
  }

  if (to.path === '/' && isAuthenticated) {
    next({ path: '/ventas' });
    return;
  }

  next();
});

export default router;
