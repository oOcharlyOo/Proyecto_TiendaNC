// src/main.ts
import { createApp } from 'vue';
import './components/styles/estilos.css';
import App from './App.vue';
import router from './router'; // Import the router instance

const app = createApp(App); // Create the app instance
app.use(router); // Tell the app to use the router
app.mount('#app'); // Mount the app