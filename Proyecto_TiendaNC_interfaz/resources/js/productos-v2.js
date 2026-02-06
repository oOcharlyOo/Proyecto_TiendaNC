// --- CONFIGURACIÓN Y ESTADO GLOBAL ---
        const API_BASE_URL = 'http://localhost:8080'; 
        let products = []; // Array para almacenar la lista local de productos

        // Variables del DOM
        const productsTableBody = document.getElementById('productsTableBody');
        const modalTitle = document.getElementById('modalTitle'); // Updated from formTitle
        const submitBtn = document.getElementById('submitBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const productForm = document.getElementById('productForm');
        const addOrEditProductBtn = document.getElementById('addOrEditProductBtn'); // Updated from clearSelectionBtn
        const cancelBtn = document.getElementById('cancelBtn'); // New button
        const productModal = document.getElementById('productModal'); // New: Reference to the modal container
        console.log('productModal element:', productModal);
        console.log('productModal initial classes:', productModal ? productModal.classList.value : 'N/A');
        console.log('productModal initial hidden attribute:', productModal ? productModal.hasAttribute('hidden') : 'N/A');
        
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

        // Scanner DOM elements
        const startScannerProductoBtn = document.getElementById('startScannerProductoBtn');
        const productScannerModal = document.getElementById('productScannerModal');
        const interactiveProductScanner = document.getElementById('interactive-product-scanner');
        const stopProductScannerBtn = document.getElementById('stopProductScannerBtn');
        const scanFeedbackProducto = document.getElementById('scanFeedbackProducto');
        const detectedIdProducto = document.getElementById('detectedIdProducto');
        
        // Search Inputs
        const productSearchInput = document.getElementById('productSearchInput');
        const searchProductBtn = document.getElementById('searchProductBtn');
        
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
                //console.log(`[API Call] ${method} ${url}`);
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
            console.log('loadProducts() called.'); // Log start of function
            try {
                productsTableBody.innerHTML = `<div class="text-center p-8 text-dark-ink hylian-font">Cargando productos del servidor...</div>`;
                console.log('Fetching products from API...'); // Log before fetch
                products = await fetchApi('/productos/listarProductos', 'GET');
                console.log('Products fetched successfully:', products); // Log success
                products.sort((a, b) => a.idProducto - b.idProducto);
                renderProductsTable(products);
                console.log('Products rendered.'); // Log after rendering
            } catch (error) {
                console.error('Error in loadProducts:', error); // Explicitly log the error object
                alertUser(`Error al cargar productos: ${error.message}`, 'error'); // Ensure alert is shown
                productsTableBody.innerHTML = `<div class="text-center p-8 text-zelda-red hylian-font">Error de conexión. No se pudo cargar el catálogo.</div>`; // Thematic error message
            }
        }

        /**
         * Renderiza el estado local de productos en la tabla.
         * @param {Array} productsToDisplay - Array de productos a mostrar. Si es null o undefined, usa el array 'products' global.
         */
        function renderProductsTable(productsToDisplay = products, selectedId = null) {
            productsTableBody.innerHTML = ''; 

            const listToRender = productsToDisplay;

            if (listToRender.length === 0) {
                 productsTableBody.innerHTML = `<div class="text-center p-8 text-dark-ink hylian-font">No hay productos que coincidan con la búsqueda.</div>`;
                 return;
            }

            listToRender.forEach(product => {
                const productElement = document.createElement('div');
                productElement.className = `product-item block p-4 border-b border-yellow-800/10 md:grid md:grid-cols-12 md:gap-x-4 md:items-center hover:bg-yellow-800/5 transition-colors duration-150`;
                productElement.dataset.id = product.idProducto;
                
                const isLowStock = product.stock <= product.cantidad_min;

                productElement.innerHTML = `
                    <!-- Mobile View -->
                    <div class="md:hidden">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-bold text-lg hylian-font" style="color: rgb(72, 211, 8);">${product.nombre}</p>
                                <p class="text-sm text-gray-500">ID: ${product.idProducto} | Cód: ${product.codigoBarras || 'N/A'}</p>
                            </div>
                            <div class="text-right flex-shrink-0 ml-4">
                                <p class="text-lg font-semibold hylian-font" style="color: rgb(22, 101, 52);">$${(product.precio_venta || 0).toFixed(2)}</p>
                                <p class="text-sm font-medium hylian-font ${isLowStock ? '' : 'text-gray-500'}" ${isLowStock ? 'style="color: rgb(255, 0, 0);"' : ''}>
                                    Stock: ${product.stock}${product.is_gramaje ? 'g' : ''}
                                </p>
                            </div>
                        </div>
                        <div class="mt-4 flex justify-end space-x-3">
                            <button class="edit-btn btn-wood-aesthetic text-neutral-800 font-semibold py-2 px-4 rounded-lg text-sm flex items-center gap-2" data-id="${product.idProducto}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neutral-800" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.829z" /></svg>
                                Modificar
                            </button>
                            <button class="delete-btn btn-wood-aesthetic is-danger text-neutral-800 font-semibold py-2 px-4 rounded-lg text-sm flex items-center gap-2" data-id="${product.idProducto}" data-nombre="${product.nombre}">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-neutral-800" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm6 10a1 1 0 100-2v-6a1 1 0 100-2h-2a1 1 0 100 2v6a1 1 0 100 2h2z" clip-rule="evenodd" /></svg>
                                Eliminar
                            </button>
                        </div>
                    </div>
                    
                    <!-- Desktop View -->
                    <div class="hidden md:contents">
                        <div class="col-span-1 text-sm text-gray-500">${product.idProducto}</div>
                        <div class="col-span-2 text-sm text-gray-500 truncate" title="${product.codigoBarras || ''}">${product.codigoBarras || ''}</div>
                        <div class="col-span-3 font-medium hylian-font truncate" title="${product.nombre}" style="color: rgb(72, 211, 8);">${product.nombre}</div>
                        <div class="col-span-1 text-right font-semibold hylian-font" style="color: rgb(22, 101, 52);">$${(product.precio_venta || 0).toFixed(2)}</div>
                        <div class="col-span-1 text-right text-sm hylian-font" style="color: rgb(22, 101, 52);">${(product.precio_mayoreo > 0) ? '$' + product.precio_mayoreo.toFixed(2) : ''}</div>
                        <div class="col-span-1 text-center text-sm font-medium hylian-font ${isLowStock ? '' : 'text-gray-500'}" ${isLowStock ? 'style="color: rgb(255, 0, 0);"' : ''}>
                            ${product.stock}${product.is_gramaje ? 'g' : ''}
                        </div>
                        <div class="col-span-3 text-center flex justify-center items-center space-x-2">
                            <button class="edit-btn btn-wood-aesthetic p-1 rounded-full w-8 h-8 transition-colors duration-150" data-id="${product.idProducto}" title="Modificar">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto text-neutral-800" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.38-2.828-2.829z" /></svg>
                            </button>
                            <button class="delete-btn btn-wood-aesthetic is-danger p-1 rounded-full w-8 h-8 transition-colors duration-150" data-id="${product.idProducto}" data-nombre="${product.nombre}" title="Eliminar">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mx-auto text-neutral-800" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm6 10a1 1 0 100-2v-6a1 1 0 100-2h-2a1 1 0 100 2v6a1 1 0 100 2h2z" clip-rule="evenodd" /></svg>
                            </button>
                        </div>
                    </div>
                `;
                
                productsTableBody.appendChild(productElement);
            });
        }

        /**
         * Filtra los productos basados en el término de búsqueda y renderiza la tabla.
         */
        function filterAndRenderProducts() {
            const searchTerm = productSearchInput.value.toLowerCase().trim();
            let filteredProducts = [];

            if (searchTerm === '') {
                filteredProducts = products; // Show all products if search is empty
            } else {
                filteredProducts = products.filter(product => {
                    const matchesName = product.nombre.toLowerCase().includes(searchTerm);
                    const matchesBarcode = product.codigoBarras ? product.codigoBarras.toLowerCase().includes(searchTerm) : false;
                    return matchesName || matchesBarcode;
                });
            }
            renderProductsTable(filteredProducts);
        }
        
        // --- MANEJO DE SELECCIÓN Y FORMULARIO ---

        // --- MANEJO DE MODAL ---
        function openModal(isEditing) {
            console.log('openModal() called. isEditing:', isEditing);
            productModal.style.display = 'flex'; // Explicitly set display to flex
            productModal.classList.add('modal-active'); // Keep for transition effect
            console.log('productModal initial hidden attribute:', productModal ? productModal.hasAttribute('hidden') : 'N/A');
            if (isEditing) {
                deleteBtn.classList.remove('hidden'); // Show delete button for editing
            } else {
                deleteBtn.classList.add('hidden'); // Hide delete button for new product
            }
            // Pequeño retardo para asegurar que el modal es visible antes de intentar enfocar
            setTimeout(() => {
                codigoBarrasInput.focus();
            }, 100);
        }

        function closeModal() {
            productModal.classList.remove('modal-active');
            productModal.style.display = 'none'; // Explicitly set display to none
            productForm.reset(); // Clear form on close
            productIdInput.value = ''; // Ensure hidden ID is cleared
            updateGramajeLabels(false); // Reset labels
            loadProducts(); // Reload products to reflect any changes and close modal
        }

        /**
         * Carga los datos de un producto seleccionado en el formulario.
         */
        function loadProductForEditing(product) {
            productIdInput.value = product.idProducto;
            codigoBarrasInput.value = product.codigoBarras;
            nombreProductoInput.value = product.nombre;
            precioVentaInput.value = product.precio_venta;
            precioMayoreoInput.value = product.precio_mayoreo !== null && product.precio_mayoreo !== undefined ? product.precio_mayoreo : '';
            precioCostoInput.value = product.precio_costo;
            stockActualInput.value = product.stock;
            cantidadMinInput.value = product.cantidad_min;
            cantidadMaxInput.value = product.cantidad_max;
            isGramajeInput.checked = product.is_gramaje || false;
            updateGramajeLabels(product.is_gramaje || false);
            
            modalTitle.textContent = `Modificar Producto #${product.idProducto}`;
            submitBtn.textContent = 'Guardar Cambios';
            openModal(true); // Open modal for editing
        }

        /**
         * Limpia el formulario para agregar un nuevo producto.
         */
        function resetForm() {
            productForm.reset();
            productIdInput.value = '';
            modalTitle.textContent = 'Agregar Nuevo Producto';
            submitBtn.textContent = 'Guardar Producto';
            deleteBtn.classList.add('hidden'); // Ocultar botón de eliminar para nuevo producto
            updateGramajeLabels(false); // Reset labels to default
            openModal(false); // Open modal for adding
        }
        
        // Event listener para los botones de acción en la tabla de productos
        productsTableBody.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn')) {
                const id = parseInt(e.target.closest('.edit-btn').dataset.id);
                const product = products.find(p => p.idProducto === id);
                if (product) {
                    loadProductForEditing(product);
                }
            } else if (e.target.closest('.delete-btn')) {
                const id = parseInt(e.target.closest('.delete-btn').dataset.id);
                const name = e.target.closest('.delete-btn').dataset.nombre;
                handleDeleteProduct(id, name);
            }
        });

        // Event listener para el botón de "Nuevo Producto" (addOrEditProductBtn)
        addOrEditProductBtn.addEventListener('click', resetForm);

        // Event listener para el botón "Cancelar" en el modal
        cancelBtn.addEventListener('click', closeModal);

        // Event listener para el checkbox de gramaje
        isGramajeInput.addEventListener('change', () => {
            updateGramajeLabels(isGramajeInput.checked);
        });

        async function handleDeleteProduct(productId, productName) {
            if (!productId) {
                alertUser('No hay ningún producto seleccionado para eliminar.', 'info');
                return;
            }

            if (!confirm(`¿Estás seguro de que deseas eliminar el producto "${productName}" (#${productId})? Esta acción es irreversible.`)) {
                return;
            }

            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Eliminando...';

            try {
                await fetchApi(`/productos/eliminarProducto/${productId}`, 'DELETE');
                alertUser(`Producto "${productName}" eliminado con éxito.`, 'success');
                
                // Eliminar el producto del estado local
                products = products.filter(p => p.idProducto !== parseInt(productId));
                loadProducts(); // Reload the list to refresh the table
                // No need to call closeModal here as this is for direct table deletion
            } catch (error) {
                alertUser(`Error al eliminar el producto: ${error.message}`, 'error');
            }
            finally {
                deleteBtn.disabled = false;
                deleteBtn.textContent = 'Eliminar Producto';
            }
        };


                // --- INICIALIZACIÓN ---


                document.addEventListener('DOMContentLoaded', () => {


                    console.log('DOMContentLoaded event fired in productos.js');


                    loadProducts();


                    // resetForm(); // No longer called here, as the modal opens via button click


                                updateGramajeLabels(false); // Set initial state of labels


                            });


                    


                            // Event listener para prevenir el envío del formulario al presionar Enter en el campo de código de barras


                            codigoBarrasInput.addEventListener('keydown', (e) => {


                                if (e.key === 'Enter') {


                                    e.preventDefault();


                                    // Opcional: mover el foco al siguiente campo o realizar alguna otra acción


                                    nombreProductoInput.focus(); 


                                }


                            });


        


                // Event listeners para el buscador


                productSearchInput.addEventListener('keyup', filterAndRenderProducts);


                searchProductBtn.addEventListener('click', filterAndRenderProducts);


        


                // Event listener para limpiar la búsqueda y mostrar todos los productos


                productSearchInput.addEventListener('change', (e) => {


                    if (e.target.value === '') {


                        renderProductsTable(products);


                    }


                });

            // --- BARCODE SCANNER LOGIC FOR PRODUCTOS ---
            let isProcessingScanProducto = false;

            function processScannedCodeProducto(code) {
                codigoBarrasInput.value = code; // Populate the product barcode input
                
                scanFeedbackProducto.classList.remove('hidden');
                detectedIdProducto.innerText = `ID: ${code}`;
    
                setTimeout(() => scanFeedbackProducto.classList.add('hidden'), 3000);

                stopScannerProducto(); // Stop scanner after successful scan
                openModal(true); // Re-open the product form modal if it was hidden
            }

            function handleDetectionProducto(data) {
                if (isProcessingScanProducto) return;

                const code = data.codeResult.code;
                if (code) {
                    isProcessingScanProducto = true;
                    // Play a sound if desired, similar to interfaz.js but adapted for this context
                    // playSuccessBeep(); // If playSuccessBeep is available and desired here
                    processScannedCodeProducto(code);
                }
            }

            function stopScannerProducto() {
                if (typeof Quagga !== 'undefined' && Quagga.initialized) { // Check if Quagga was initialized
                    Quagga.stop();
                    Quagga.initialized = false; // Reset flag
                }
                productScannerModal.classList.remove('modal-active');
                productScannerModal.style.display = 'none'; // Explicitly set display to none
                isProcessingScanProducto = false;
                // Re-show the product form modal
                productModal.style.display = 'flex';
                productModal.classList.add('modal-active');
            }

            function startScannerProducto() {
                isProcessingScanProducto = false; // Reset flag on new scan session
                
                // Show the scanner modal
                productScannerModal.removeAttribute('hidden');
                productScannerModal.classList.remove('hidden');
                productScannerModal.classList.add('modal-active');
                productScannerModal.style.display = 'flex'; // Explicitly set display to flex


                // Hide the product form modal while scanner is active
                productModal.classList.remove('modal-active');
                productModal.style.display = 'none'; // Correct way to hide
    
                if (typeof Quagga === 'undefined') {
                    alert("La librería QuaggaJS no está cargada. Asegúrate de que el CDN está incluido.");
                    stopScannerProducto();
                    return;
                }

                Quagga.init({
                    inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: interactiveProductScanner, // Target the specific scanner container for products
                        constraints: {
                            facingMode: "environment" // Use back camera
                        },
                    },
                    decoder: {
                        readers: [
                            "code_128_reader",
                            "ean_reader",
                            "ean_8_reader",
                            "code_39_reader",
                            "upc_reader"
                        ]
                    }
                }, function(err) {
                    if (err) {
                        console.error(err);
                        alert("Error al iniciar la cámara. Asegúrate de dar permisos y que no esté en uso por otra aplicación.");
                        stopScannerProducto(); // Ensure UI is cleaned up if it fails
                        return;
                    }
                    Quagga.start();
                    // Mark Quagga as initialized to prevent stopping an uninitialized scanner
                    Quagga.initialized = true; 
                });
    
                Quagga.onDetected(handleDetectionProducto);
            }

            // Event Listeners for the scanner buttons
            startScannerProductoBtn.addEventListener('click', () => {
                // Before starting scanner, ensure product modal is hidden
                productModal.classList.remove('modal-active');
                productModal.style.display = 'none'; // Use style.display for consistency
                startScannerProducto();
            });
            stopProductScannerBtn.addEventListener('click', stopScannerProducto);
