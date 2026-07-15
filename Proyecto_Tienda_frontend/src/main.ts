// src/main.ts
import './interceptors/sucursal';
import { createApp } from 'vue';
import './components/styles/themes.css';
import './components/styles/base.css';
import './components/styles/utilities.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);
app.mount('#app');