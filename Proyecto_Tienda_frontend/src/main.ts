// src/main.ts
import './interceptors/sucursal';
import { createApp } from 'vue';
import './components/styles/themes.css';
import './components/styles/base.css';
import './components/styles/utilities.css';
import './components/styles/responsive.css';
import App from './App.vue';
import router from './router';
import { vSubmenu } from './directives/submenu';

const app = createApp(App);
app.use(router);
app.directive('submenu', vSubmenu);
app.mount('#app');