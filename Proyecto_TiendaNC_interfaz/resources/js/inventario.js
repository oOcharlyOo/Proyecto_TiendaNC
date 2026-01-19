        // --- CONFIGURACIÓN Y ESTADO GLOBAL ---
        const API_BASE_URL = 'http://localhost:8080/'; 
        let allProducts = []; // Array para almacenar la lista completa de productos
        let lowStockProducts = []; // Array para almacenar productos con bajo stock

        // Variables del DOM
        const lowStockTableBody = document.getElementById('lowStockTableBody');
        const allProductsTableBody = document.getElementById('allProductsTableBody');
        const lowStockCount = document.getElementById('lowStockCount');
        const totalProductCount = document.getElementById('totalProductCount');
        const totalInventoryCostDisplay = document.getElementById('totalInventoryCostDisplay');

        // --- FUNCIONES DE UTILIDAD ---

        /**
         * Función para realizar llamadas a la API de Quarkus.
         */
        async function fetchApi(endpoint, method = 'GET', data = null) {
            const url = `${API_BASE_URL}${endpoint}`;
            const options = {
                method: method,
                headers: { 'Content-Type': 'application/json' },
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            try {
                //console.log(`[API Call] ${method} ${url}`);
                const response = await fetch(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                
                if (result.codigo === 200 && result.datos) {
                    return result.datos;
                } else {
                    throw new Error(`API returned an error: ${result.mensaje || 'Unknown error'}`);
                }
                
            } catch (error) {
                console.error("Error en la llamada a la API:", error.message);
                
                // *** SIMULACIÓN DE RESPUESTA PARA FUNCIONAMIENTO EN EL EDITOR ***
                if (endpoint.includes('listarProductos')) {
                    console.log("Usando datos de simulación.");
                    return [
                        { idProducto: 1, nombre: "Laptop Modelo X", precio_costo: 800, precio_venta: 1200.5, cantidad_min: 5, cantidad_max: 50, stock: 20 },
                        { idProducto: 2, nombre: "Mouse Inalámbrico", precio_costo: 15.5, precio_venta: 25, cantidad_min: 20, cantidad_max: 200, stock: 150 },
                        { idProducto: 3, nombre: "Teclado Mecánico RGB", precio_costo: 60, precio_venta: 95.75, cantidad_min: 10, cantidad_max: 100, stock: 4 }, // Bajo stock
                        { idProducto: 4, nombre: "Takis Fuego", precio_costo: 15, precio_venta: 19, cantidad_min: 3, cantidad_max: 20, stock: 10 },
                        { idProducto: 5, nombre: "Monitor Curvo 27\"", precio_costo: 250, precio_venta: 400, cantidad_min: 10, cantidad_max: 50, stock: 8 }, // Bajo stock
                        { idProducto: 6, nombre: "Cable HDMI 2m", precio_costo: 5, precio_venta: 10, cantidad_min: 50, cantidad_max: 300, stock: 45 }, // Bajo stock
                        { idProducto: 7, nombre: "Café Molido Premium", precio_costo: 8, precio_venta: 12.50, cantidad_min: 15, cantidad_max: 100, stock: 30 },
                    ];
                }
                throw new Error(`Fallo de conexión o API: ${error.message}`); 
            }
        }

        /**
         * Muestra una notificación temporal.
         */
        function alertUser(message, type = 'info') {
            let existingAlert = document.getElementById('tempAlert');
            if (existingAlert) existingAlert.remove();
            
            const alertDiv = document.createElement('div');
            alertDiv.id = 'tempAlert';
            alertDiv.textContent = message;
            alertDiv.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-50 transition-all duration-300 transform`;

            if (type === 'success') {
                alertDiv.classList.add('bg-primary'); // Changed from bg-green-500
            } else if (type === 'error') {
                alertDiv.classList.add('bg-danger');
            } else { // type === 'info'
                alertDiv.classList.add('bg-profit-color'); // Changed from bg-blue-500
            }

            document.body.appendChild(alertDiv);

            setTimeout(() => {
                alertDiv.classList.add('opacity-0', 'translate-y-4');
                setTimeout(() => alertDiv.remove(), 300);
            }, 3000);
        }

        // --- MANEJO DE LA LISTA DE PRODUCTOS ---

        /**
         * Carga los productos de la API, los clasifica y renderiza ambas tablas.
         */
        async function loadInventory() {
            try {
                // Mensajes de carga inicial
                const loadingHtml = `<tr><td colspan="6" class="text-center p-8 text-gray-500">Cargando productos del servidor...</td></tr>`;
                allProductsTableBody.innerHTML = loadingHtml;
                lowStockTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">Filtrando bajo stock...</td></tr>`;
                
                // 1. LLAMADA API REAL: GET /productos/listarProductos
                const rawProducts = await fetchApi('/productos/listarProductos', 'GET');
                
                allProducts = rawProducts;
                // Sort allProducts by idProducto
                allProducts.sort((a, b) => a.idProducto - b.idProducto);
                
                // 2. Filtrar productos con bajo inventario (stock < cantidad_min)
                lowStockProducts = allProducts.filter(p => p.stock < p.cantidad_min);

                renderAllProductsTable();
                renderLowStockProductsTable();
                
                totalProductCount.textContent = allProducts.length;
                lowStockCount.textContent = lowStockProducts.length;

                const totalInventoryCost = allProducts.reduce((sum, product) => {
                    let cost = 0;
                    if (product.is_gramaje) {
                        // Assuming product.stock is in grams and product.precio_costo is per kilo
                        cost = (product.stock / 1000) * product.precio_costo;
                    } else {
                        // For regular products, stock is in units
                        cost = product.precio_costo * product.stock;
                    }
                    return sum + cost;
                }, 0);
                totalInventoryCostDisplay.textContent = `$${totalInventoryCost.toFixed(2)}`;

            } catch (error) {
                alertUser(`Error al cargar el inventario: ${error.message}`, 'error');
                const errorHtml = `<tr><td colspan="6" class="text-center p-8 text-red-500">Error de conexión.</td></tr>`;
                allProductsTableBody.innerHTML = errorHtml;
                lowStockTableBody.innerHTML = errorHtml;
            }
        }

        /**
         * Renderiza la tabla completa de productos.
         */
        function renderAllProductsTable() {
            allProductsTableBody.innerHTML = ''; 

            if (allProducts.length === 0) {
                 allProductsTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-gray-500">No hay productos en el catálogo.</td></tr>`;
                 return;
            }

            allProducts.forEach(product => {
                const isLowStock = product.stock < product.cantidad_min;
                
                const row = document.createElement('tr');
                row.className = `border-b bg-white ${isLowStock ? 'low-stock-row' : ''}`;
                row.innerHTML = `
                    <td class="p-3">${product.idProducto}</td>
                    <td class="p-3 font-medium">${product.nombre}</td>
                    <td class="p-3 text-right text-gray-500">$${product.precio_costo.toFixed(2)}</td>
                    <td class="p-3 text-right text-primary font-semibold">$${product.precio_venta.toFixed(2)}</td>
                    <td class="p-3 text-center">${product.cantidad_min}${product.is_gramaje ? 'g' : ''}</td>
                    <td class="p-3 text-center">${product.stock}${product.is_gramaje ? 'g' : ''}</td>
                `;
                
                allProductsTableBody.appendChild(row);
            });
        }
        
        /**
         * Renderiza la tabla de productos con bajo inventario.
         */
        function renderLowStockProductsTable() {
            lowStockTableBody.innerHTML = ''; 

            if (lowStockProducts.length === 0) {
                 lowStockTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">¡Inventario OK! Ningún producto por debajo del mínimo.</td></tr>`;
                 return;
            }

            lowStockProducts.forEach(product => {
                const row = document.createElement('tr');
                // Usamos la clase low-stock-row definida en CSS para resaltarlo
                row.className = `border-b low-stock-row`; 
                row.innerHTML = `
                    <td class="p-3">${product.idProducto}</td>
                    <td class="p-3 font-semibold">${product.nombre}</td>
                    <td class="p-3 text-center text-danger">${product.cantidad_min}${product.is_gramaje ? 'g' : ''}</td>
                    <td class="p-3 text-center text-danger font-extrabold">${product.stock}${product.is_gramaje ? 'g' : ''}</td>
                `;
                
                lowStockTableBody.appendChild(row);
            });
        }


        // --- INICIALIZACIÓN ---
        document.addEventListener('DOMContentLoaded', () => {
            loadInventory();
        });
