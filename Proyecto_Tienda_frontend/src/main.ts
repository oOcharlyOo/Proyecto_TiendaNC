// src/main.ts
import { createApp } from 'vue';
import './components/styles/themes.css';
import './components/styles/inventario.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');