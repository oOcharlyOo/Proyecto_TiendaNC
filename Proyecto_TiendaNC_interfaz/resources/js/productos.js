        // --- CONFIGURACIÓN Y ESTADO GLOBAL ---
        const API_BASE_URL = 'http://192.168.0.248:8080'; 
        let products = []; // Array para almacenar la lista local de productos

        // Variables del DOM
        const productsTableBody = document.getElementById('productsTableBody');
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.getElementById('submitBtn');
        const deleteBtn = document.getElementById('deleteBtn'); // Nuevo botón
        const productForm = document.getElementById('productForm');
        const clearSelectionBtn = document.getElementById('clearSelectionBtn');
        
        // Formulario Inputs
        const productIdInput = document.getElementById('productId');
        const codigoBarrasInput = document.getElementById('codigoBarras');
        const nombreProductoInput = document.getElementById('nombreProducto');
        const precioVentaInput = document.getElementById('precioVenta');
        const precioMayoreoInput = document.getElementById('precioMayoreoInput'); // NUEVO
        const precioCostoInput = document.getElementById('precioCosto');
        const stockActualInput = document.getElementById('stockActual');
        const cantidadMinInput = document.getElementById('cantidadMin');
        const cantidadMaxInput = document.getElementById('cantidadMax');
        const isGramajeInput = document.getElementById('isGramaje'); // NEW: Gramaje checkbox
        
        // Labels for dynamic text
        const precioVentaLabel = document.querySelector('label[for="precioVenta"]');
        const precioCostoLabel = document.querySelector('label[for="precioCosto"]');
        const stockActualLabel = document.querySelector('label[for="stockActual"]');

        function updateGramajeLabels(isGramaje) {
            if (isGramaje) {
                precioVentaLabel.textContent = 'Precio de Venta (por Kg)';
                precioCostoLabel.textContent = 'Precio de Costo (por Kg)';
                stockActualLabel.textContent = 'Stock/Existencia (en gramos)';
            } else {
                precioVentaLabel.textContent = 'Precio de Venta ($)';
                precioCostoLabel.textContent = 'Precio de Costo ($)';
                stockActualLabel.textContent = 'Stock/Existencia';
            }
        }
        // const categoriaInput = document.getElementById('categoria'); // Eliminado


        // --- FUNCIONES DE UTILIDAD ---

        /**
         * Función para realizar llamadas reales a la API de Quarkus.
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
                console.log(`[API Call] ${method} ${url}`);
                const response = await fetch(url, options);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.mensaje || `Error en la solicitud: ${response.status}`);
                }
                // Si la respuesta DELETE no tiene contenido, no intentar parsear JSON
                if (method === 'DELETE') {
                    return { mensaje: 'Operación exitosa' }; // Simular una respuesta exitosa
                }
                return response.json().then(response => response.datos || response); // La API real devuelve un objeto con la clave "datos" o directamente el objeto
                
            } catch (error) {
                console.error("Error en la llamada a la API:", error.message);
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
                alertDiv.classList.add('bg-danger'); // Changed from bg-red-500
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
         * Carga los productos de la API y renderiza la tabla.
         */
        async function loadProducts() {
            try {
                productsTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-gray-500">Cargando productos del servidor...</td></tr>`; // Updated colspan
                
                // 1. LLAMADA API REAL: GET /productos/listarProductos
                products = await fetchApi('/productos/listarProductos', 'GET');
                // Sort products by idProducto
                products.sort((a, b) => a.idProducto - b.idProducto);
                
                renderProductsTable();

            } catch (error) {
                alertUser(`Error al cargar productos: ${error.message}`, 'error');
                productsTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-red-500">Error de conexión. No se pudo cargar el catálogo.</td></tr>`; // Updated colspan
            }
        }

        /**
         * Renderiza el estado local de productos en la tabla.
         */
        function renderProductsTable(selectedId = null) {
            productsTableBody.innerHTML = ''; 

            if (products.length === 0) {
                 productsTableBody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-gray-500">No hay productos en el catálogo.</td></tr>`; // Updated colspan
                 return;
            }

            products.forEach(product => {
                const isSelected = (product.idProducto == selectedId);
                const row = document.createElement('tr');
                row.className = `border-b ${isSelected ? 'row-selected' : 'bg-white'}`;
                row.dataset.id = product.idProducto;

                row.innerHTML = `
                    <td class="p-3">${product.idProducto}</td>
                    <td class="p-3 font-medium">${product.nombre}</td>
                    <td class="p-3 text-right text-primary font-semibold">$${(product.precio_venta || 0).toFixed(2)}</td>
                    <td class="p-3 text-right">${(product.precio_mayoreo !== null && product.precio_mayoreo !== undefined && product.precio_mayoreo > 0) ? '$' + product.precio_mayoreo.toFixed(2) : ''}</td>
                    <td class="p-3 text-right text-gray-500">$${(product.precio_costo || 0).toFixed(2)}</td>
                    <td class="p-3 text-center">${product.stock}</td>
                `;
                
                productsTableBody.appendChild(row);
            });
        }
        
        // --- MANEJO DE SELECCIÓN Y FORMULARIO ---

        /**
         * Carga los datos de un producto seleccionado en el formulario.
         */
        function loadProductForEditing(product) {
            productIdInput.value = product.idProducto;
            codigoBarrasInput.value = product.idProducto;
            nombreProductoInput.value = product.nombre;
            precioVentaInput.value = product.precio_venta;
            precioMayoreoInput.value = product.precio_mayoreo !== null && product.precio_mayoreo !== undefined ? product.precio_mayoreo : ''; // NEW
            precioCostoInput.value = product.precio_costo;
            stockActualInput.value = product.stock;
            cantidadMinInput.value = product.cantidad_min;
            cantidadMaxInput.value = product.cantidad_max;
            isGramajeInput.checked = product.is_gramaje || false; // NEW: Set gramaje checkbox
            updateGramajeLabels(product.is_gramaje || false); // Update labels based on gramaje status
            // La asignación de categoría ha sido eliminada
            
            formTitle.textContent = `Modificar Producto #${product.idProducto}`;
            submitBtn.textContent = 'Guardar Cambios';
            deleteBtn.classList.remove('hidden'); // Mostrar botón de eliminar
            renderProductsTable(product.idProducto); // Marcar la fila seleccionada
        }

        /**
         * Limpia el formulario para agregar un nuevo producto.
         */
        function resetForm() {
            productForm.reset();
            productIdInput.value = '';
            formTitle.textContent = 'Agregar Nuevo Producto';
            submitBtn.textContent = 'Guardar Producto';
            deleteBtn.classList.add('hidden'); // Ocultar botón de eliminar
            renderProductsTable(null); // Deseleccionar filas
            
            // Clear new input
            precioMayoreoInput.value = ''; // NEW
            isGramajeInput.checked = false; // NEW: Reset gramaje checkbox
            updateGramajeLabels(false); // Reset labels to default
        }

        // Event listener para seleccionar una fila en la tabla
        productsTableBody.addEventListener('click', (e) => {
            let row = e.target.closest('tr');
            if (row && row.dataset.id) {
                const id = parseInt(row.dataset.id);
                const product = products.find(p => p.idProducto === id);
                if (product) {
                    loadProductForEditing(product);
                }
            }
        });

        // Event listener para el botón de "Nuevo Producto"
        clearSelectionBtn.addEventListener('click', resetForm);

        // Event listener para el checkbox de gramaje
        isGramajeInput.addEventListener('change', () => {
            updateGramajeLabels(isGramajeInput.checked);
        });

        // --- MANEJO DE SUBMIT DEL FORMULARIO ---

        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.textContent = 'Procesando...';

            const data = {
                nombre: nombreProductoInput.value,
                precio_venta: parseFloat(precioVentaInput.value),
                precio_mayoreo: precioMayoreoInput.value !== '' ? parseFloat(precioMayoreoInput.value) : null, // NEW
                precio_costo: parseFloat(precioCostoInput.value),
                stock: parseInt(stockActualInput.value),
                cantidad_min: parseInt(cantidadMinInput.value),
                cantidad_max: parseInt(cantidadMaxInput.value),
                is_gramaje: isGramajeInput.checked // NEW: Include gramaje status
                // idCategoria ha sido eliminado de la carga útil
            };

            const isEditing = !!productIdInput.value; // Checks if a product is being edited

            // El idProducto debe venir siempre de codigoBarrasInput si se considera el ID
            // Para productos nuevos, este será el ID introducido por el usuario.
            // Para productos existentes, este será el ID mostrado en el campo de entrada.
            data.idProducto = parseInt(codigoBarrasInput.value);

            let result;

            try {
                if (isEditing) {
                    // MODIFICACIÓN
                    // Usar productIdInput.value para la URL para identificar el producto a actualizar
                    // Usar data.idProducto (de codigoBarrasInput) para los datos del payload
                    result = await fetchApi(`/productos/actualizarProducto/${productIdInput.value}`, 'PUT', data); 
                    
                    // Actualizar el estado local
                    const index = products.findIndex(p => p.idProducto === parseInt(productIdInput.value)); // FIX: Use original ID
                    if (index !== -1) {
                        products[index] = result;
                    }
                    alertUser(`Producto #${result.idProducto} modificado con éxito.`, 'success');
                    renderProductsTable(result.idProducto);

                } else {
                    // AGREGAR NUEVO
                    // El objeto 'data' ya contiene data.idProducto de codigoBarrasInput
                    result = await fetchApi('/productos/agregarProducto', 'POST', data); 
                    
                    // Actualizar el estado local
                    products.push(result);
                    resetForm();
                    alertUser(`Nuevo producto #${result.idProducto} agregado con éxito.`, 'success');
                    renderProductsTable(result.idProducto);
                }

                
            } catch (error) {
                alertUser(`Error al guardar: ${error.message}`, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = isEditing ? 'Guardar Cambios' : 'Guardar Producto';
            }
        });

        /**
         * Maneja la eliminación de un producto.
         */
        deleteBtn.addEventListener('click', async () => {
            const productId = productIdInput.value;
            if (!productId) {
                alertUser('No hay ningún producto seleccionado para eliminar.', 'info');
                return;
            }

            if (!confirm(`¿Estás seguro de que deseas eliminar el producto #${productId}? Esta acción es irreversible.`)) {
                return;
            }

            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Eliminando...';

            try {
                await fetchApi(`/productos/eliminarProducto/${productId}`, 'DELETE');
                alertUser(`Producto #${productId} eliminado con éxito.`, 'success');
                
                // Eliminar el producto del estado local
                products = products.filter(p => p.idProducto !== parseInt(productId));
                renderProductsTable();
                resetForm();

            } catch (error) {
                alertUser(`Error al eliminar el producto: ${error.message}`, 'error');
            } finally {
                deleteBtn.disabled = false;
                deleteBtn.textContent = 'Eliminar Producto';
            }
        });


        // --- INICIALIZACIÓN ---
        document.addEventListener('DOMContentLoaded', () => {
            loadProducts();
            resetForm();
            updateGramajeLabels(false); // Set initial state of labels
        });