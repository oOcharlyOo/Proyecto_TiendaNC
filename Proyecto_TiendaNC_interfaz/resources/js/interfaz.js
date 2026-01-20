        const API_BASE_URL = 'http://localhost:8080';
        const activeUser = JSON.parse(sessionStorage.getItem('activeUser'));
        const activeUserShift = JSON.parse(sessionStorage.getItem('activeUserShift'));

        // Only initialize page logic if a user is logged in.
        // The nav.js script handles redirection for unauthenticated users.
        function getTodayDate() {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }

        if (activeUser) {
            const ID_USUARIO = activeUser.idUsuario;
            const ID_CAJA = activeUserShift?.shiftId; // Get shift ID from sessionStorage

            if (!ID_CAJA) {
                alert('No se encontró un turno de caja activo. Por favor, inicie sesión de nuevo.');
                window.location.href = 'Login.html'; // Redirect to login page
                // No return statement needed here, as window.location.href will navigate away
            }

            let activeSaleId = null;
            let ticket = [];

            // Utility function to make API requests
            async function fetchApi(path, method = 'GET', body = null) {
                const headers = {
                    'Content-Type': 'application/json',
                };

                // Assuming activeUser might have a token for authentication
                // const activeUser = JSON.parse(sessionStorage.getItem('activeUser'));
                // if (activeUser && activeUser.token) {
                //     headers['Authorization'] = `Bearer ${activeUser.token}`;
                // }

                const config = {
                    method,
                    headers,
                };

                if (body) {
                    config.body = JSON.stringify(body);
                }

                try {
                    const response = await fetch(`${API_BASE_URL}${path}`, config);
                    


                    if (!response.ok) {
                        let errorMessage = `HTTP error! status: ${response.status}`;
                        try {
                            const contentType = response.headers.get("content-type");
                            if (contentType && contentType.includes("application/json")) {
                                const errorData = await response.json();
    
                                errorMessage = errorData.mensaje || errorData.message || errorMessage;
                            } else {
                                const textError = await response.text();
    
                                errorMessage = textError || errorMessage;
                            }
                        } catch (parseError) {
                            console.error('Failed to parse error response as JSON/Text:', parseError);
                        }
                        throw new Error(errorMessage);
                    }
                    
                    // Handle 204 No Content responses
                    if (response.status === 204) {
                        return null;
                    }

                    const jsonResponse = await response.json(); // Parse the JSON response
                    //console.log('API Parsed JSON:', jsonResponse); // Log the parsed JSON

                    // Check for the backend's APIResponse structure
                    if (jsonResponse.hasOwnProperty('codigo') && jsonResponse.hasOwnProperty('mensaje')) {
                        if (jsonResponse.codigo === 200) {
                            return jsonResponse.datos; // Success, return data
                        } else if (jsonResponse.codigo === 404 && path === '/ventas/buscarVentaPendiente') {
                            // Specific handling for "no pending sales found" for this endpoint
                            console.warn("No pending sales found for /ventas/buscarVentaPendiente, backend returned 404. Proceeding to create new sale.");
                            return null; // Signal to the caller that no pending sale was found, but it's not a critical error
                        }
                        else {
                            // General error from backend
                            throw new Error(jsonResponse.mensaje || 'API reported an error.');
                        }
                    }

                    return jsonResponse; // Fallback if it doesn't follow the APIResponse structure
                } catch (error) {
                    console.error('Error in fetchApi:', error);
                    throw error;
                }
            }

            // Moved function definitions outside DOMContentLoaded for broader scope if needed

            // Web Audio API context for sound generation
            let audioContext;

            function playBeep(frequency, duration, type) {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }

                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = frequency; // in Hz
                oscillator.type = type; // 'sine', 'square', 'sawtooth', 'triangle'

                gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Max volume
                gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration); // Fade out

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            }

            function playSuccessBeep() {
                playBeep(880, 0.1, 'sine'); // A high-pitched, short beep
            }

            function playErrorBeep() {
                playBeep(440, 0.2, 'triangle'); // A lower-pitched, slightly longer beep
            }

            function updateTotals() {
                const total = ticket.reduce((sum, item) => sum + (item.precioUnitarioVenta * item.cantidad), 0);
                subtotalDisplay.textContent = totalDisplay.textContent = `$${total.toFixed(2)}`;
            }

            // Moved function definitions outside DOMContentLoaded for broader scope if needed


            function getTodayDate() {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }

            // All other DOM-related variables and event listeners should be inside DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => { 
                console.log('DOMContentLoaded event fired in interfaz.js');
                const codigoProductoInput = document.getElementById('codigoProducto');
                const ventaMayoreoCheckbox = document.getElementById('ventaMayoreoCheckbox'); // NEW
                const agregarProductoBtn = document.getElementById('agregarProductoBtn');
                const ticketItemsTableBody = document.getElementById('ticketItems');
                const ticketIdDisplay = document.getElementById('ticketIdDisplay');
                const subtotalDisplay = document.getElementById('subtotalDisplay');
                const totalDisplay = document.getElementById('totalDisplay');
                const cobrarEfectivoBtn = document.getElementById('cobrarEfectivoBtn');
                
                const searchResultsContainer = document.getElementById('searchResultsContainer');
                let debounceTimer;

                const paymentModal = document.getElementById('paymentModal');
                const modalTotalAmount = document.getElementById('modalTotalAmount');
                const amountPaid = document.getElementById('amountPaid');
                const changeAmount = document.getElementById('changeAmount');
                const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
                const confirmPaymentSpeiBtn = document.getElementById('confirmPaymentSpeiBtn');
                const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');

                const ticketPanel = document.getElementById('ticketPanel'); // Nuevo: Referencia al panel principal del ticket

                // Initialize Gramaje Calculator Modal DOM elements inside DOMContentLoaded
                gramajeCalculatorModal = document.getElementById('gramajeCalculatorModal');
                calcProductName = document.getElementById('calcProductName');
                calcProductId = document.getElementById('calcProductId');
                calcProductPricePerKilo = document.getElementById('calcProductPricePerKilo'); // Hidden input for original product price_venta
                calcProductStock = document.getElementById('calcProductStock');

                // New visible elements
                gramajeInput = document.getElementById('gramajeInput');
                precioTotal = document.getElementById('precioTotal'); // This is a div, so .textContent
                precioBase = document.getElementById('precioBase'); // This is an input for the user to adjust price per kilo

                calcAddToCartBtn = document.getElementById('calcAddToCartBtn');
                calcCancelBtn = document.getElementById('calcCancelBtn');
                calcResetBtn = document.getElementById('calcResetBtn');
            
                // Sale Details Modal DOM elements
                const saleDetailsModal = document.getElementById('saleDetailsModal');
                const closeSaleDetailsModalBtn = document.getElementById('closeSaleDetailsModalBtn');
                const detailNumeroTicket = document.getElementById('detailNumeroTicket');
                const detailIdVenta = document.getElementById('detailIdVenta');
                const detailMontoTotal = document.getElementById('detailMontoTotal');
                const detailMetodoPago = document.getElementById('detailMetodoPago');
                const detailEstatus = document.getElementById('detailEstatus');
                const detailFechaVenta = document.getElementById('detailFechaVenta');
                const saleDetailsTableBody = document.getElementById('saleDetailsTableBody');

                let currentlySelectedSaleRow = null; // New variable to track selected row

                // Alert Modal DOM elements
                const alertModal = document.getElementById('alertModal');
                const alertModalTitle = document.getElementById('alertModalTitle');
                const alertModalMessage = document.getElementById('alertModalMessage');
                const alertModalCloseBtn = document.getElementById('alertModalCloseBtn');

                // --- Alert Modal Functions ---
                function showAlertModal(title, message) {
                    alertModalTitle.textContent = title;
                    alertModalMessage.textContent = message;
                    alertModal.removeAttribute('hidden');
                    alertModal.classList.add('modal-active');
                }

                function closeAlertModal() {
                    alertModal.classList.remove('modal-active');
                    alertModal.setAttribute('hidden', '');
                }

                alertModalCloseBtn.addEventListener('click', closeAlertModal);

                // --- Sale Details Modal Functions ---
                function closeSaleDetailsModal() {
                    saleDetailsModal.classList.remove('modal-active');
                    saleDetailsModal.classList.add('hidden'); // Also add Tailwind's hidden class back
                    saleDetailsModal.setAttribute('hidden', '');
                }

                async function openSaleDetailsModal(saleId, enumeratedTicketNumber) {
                    saleDetailsModal.removeAttribute('hidden');
                    saleDetailsModal.classList.remove('hidden'); // Also remove Tailwind's hidden class
                    saleDetailsModal.classList.add('modal-active');
                    // Clear previous details
                    detailNumeroTicket.textContent = enumeratedTicketNumber || ''; // Use the enumerated ticket number
                    detailIdVenta.textContent = '';
                    detailMontoTotal.textContent = '';
                    detailMetodoPago.textContent = '';
                    detailEstatus.textContent = '';
                    detailFechaVenta.textContent = '';
                    saleDetailsTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Cargando detalles...</td></tr>';

                    try {
                        // Use the provided endpoint to get all details at once
                        const allSaleDetails = await fetchApi(`/ventasDetalle/porVenta/${saleId}`); // Corrected endpoint

                        if (allSaleDetails && allSaleDetails.length > 0) {
                            const saleDetails = allSaleDetails[0].Venta; // Extract main sale info from the first detail item
                            
                            detailIdVenta.textContent = saleDetails.idVenta;
                            detailMontoTotal.textContent = `$${saleDetails.montoTotal.toFixed(2)}`;
                            detailMetodoPago.textContent = saleDetails.metodoPago;
                            detailEstatus.textContent = saleDetails.estatus;
                            detailFechaVenta.textContent = new Date(saleDetails.fechaVenta).toLocaleString();

                            // Populate items table
                            saleDetailsTableBody.innerHTML = '';
                            allSaleDetails.forEach(item => { // Iterate through all details
                                const row = document.createElement('tr');
                                row.innerHTML = `
                                    <td class="text-center">${item.Producto.codigoBarras || item.Producto.idProducto}</td>
                                    <td class="text-center">${item.Producto.nombre}</td>
                                    <td class="text-center">${item.cantidad}${item.Producto.is_gramaje ? 'g' : ''}</td>
                                    <td class="text-center">$${item.precioUnitarioVenta.toFixed(2)}</td>
                                    <td class="text-center">$${(item.cantidad * item.precioUnitarioVenta).toFixed(2)}</td>
                                `;
                                saleDetailsTableBody.appendChild(row);
                            });
                        } else {
                            // Handle case where no details are found for the sale
                            detailNumeroTicket.textContent = 'N/A';
                            detailIdVenta.textContent = saleId;
                            detailMontoTotal.textContent = '$0.00';
                            detailMetodoPago.textContent = 'N/A';
                            detailEstatus.textContent = 'N/A';
                            detailFechaVenta.textContent = 'N/A';
                            saleDetailsTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">No hay productos en esta venta o venta no encontrada.</td></tr>';
                        }

                    } catch (error) {
                        console.error('Error fetching sale details:', error);
                        saleDetailsTableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Error al cargar detalles: ${error.message}</td></tr>`;
                        window.showToast({ message: `Error al cargar detalles de la venta: ${error.message}`, type: 'error' });
                    }
                }




            function renderTicket() {
                // Update table header for new column
                const tableHeader = document.querySelector('#ticketTable thead tr');
                tableHeader.innerHTML = `
                    <th class="p-2 w-[8%] encabezado-ticket-th">Código</th>
                    <th class="p-2 w-[35%] whitespace-normal break-words encabezado-ticket-th">Descripción</th>
                    <th class="p-2 w-[10%] text-right encabezado-ticket-th">Precio</th>
                    <th class="p-2 w-[8%] text-center encabezado-ticket-th">Mayoreo</th>
                    <th class="p-2 w-[12%] text-center encabezado-ticket-th">Cantidad</th>
                    <th class="p-2 w-[15%] text-right encabezado-ticket-th">Importe</th>
                    <th class="p-2 w-[12%] text-center encabezado-ticket-th">Eliminar</th> <!-- New column -->
                `;

                ticketItemsTableBody.innerHTML = '';
                if (ticket.length === 0) {
                    ticketItemsTableBody.innerHTML = `<tr><td colspan="7" class="text-center p-8 text-gray-500">No hay productos</td></tr>`;
                    ticketPanel.classList.remove('has-products-bg');
                } else {
                    ticket.forEach((item, index) => {
                        const row = document.createElement('tr');
                        row.className = 'border-b encabezado-zelda-text';
                        const hasValidMayoreo = item.Producto.precio_mayoreo && item.Producto.precio_mayoreo > 0;
                        row.innerHTML = `
                            <td class="p-2">${item.codigoBarras || item.idProducto}</td>
                            <td class="p-2 whitespace-normal break-words">${item.nombreProducto || 'Cargando...'}</td>
                            <td class="p-2 text-right">$${(item.precioUnitarioVenta || 0).toFixed(2)}</td>
                            <td class="p-2 text-center">
                                <input type="checkbox" class="mayoreo-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary" data-index="${index}" ${item.isMayoreo ? 'checked' : ''} ${hasValidMayoreo ? '' : 'disabled'}>
                            </td>
                            <td class="p-2 text-center">
                                <button class="qty-btn btn-qty-minus" data-index="${index}">-</button>
                                <span class="mx-1 sm:mx-2">${item.cantidad}${item.Producto.is_gramaje ? 'g' : ''}</span>
                                <button class="qty-btn btn-qty-plus" data-index="${index}">+</button>
                            </td>
                            <td class="p-2 text-right importe-green">$${((item.precioUnitarioVenta || 0) * item.cantidad).toFixed(2)}</td>
                            <td class="p-2 text-center"> <!-- New column -->
                                <button class="btn-delete-item p-1 rounded-full hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" data-index="${index}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </td>
                        `;
                        ticketItemsTableBody.appendChild(row);
                    });
                    ticketPanel.classList.add('has-products-bg');
                }
                updateTotals();
            }

            async function updateQuantity(index, change) {
                const item = ticket[index];
                const newQuantity = item.cantidad + change;
                if (change > 0 && newQuantity > item.existence) {
                    window.showToast({ message: 'No se puede exceder la cantidad en inventario.', type: 'error' });
                    return;
                }
                if (newQuantity < 1) {
                    await fetchApi(`/ventasDetalle/eliminarVentaDetalle/${item.idVentaDetalle}`, 'DELETE');
                    ticket.splice(index, 1);
                } else {
                    const updatedItem = { ...item, cantidad: newQuantity };
                    await fetchApi(`/ventasDetalle/actualizarVentaDetalle/${item.idVentaDetalle}`, 'PUT', updatedItem);
                    ticket[index] = updatedItem;
                }
                renderTicket();
            }

            async function addProduct(code) {
                if (!code) return;
                codigoProductoInput.disabled = true;
                agregarProductoBtn.textContent = 'Buscando...';
                try {
                    let productData = null;
                    let trimmedCode = String(code).trim();

                    // 1. Intentar buscar por ID si es numérico
                    if (!isNaN(trimmedCode)) {
                        try {
                            productData = await fetchApi(`/productos/buscarProductoPorId/${trimmedCode}`);
                        } catch (e) {
                            console.warn(`Producto no encontrado por ID: ${trimmedCode}, intentando por Código de Barras.`);
                        }
                    }

                    // 2. Si no se encontró por ID o no era numérico, intentar buscar por Código de Barras
                    // Esto cubre casos donde un barcode es numérico pero no es un ID, o cuando el input no era numérico.
                    if (!productData) {
                        try {
                            productData = await fetchApi(`/productos/buscarPorCodigoBarras/${trimmedCode}`);
                        } catch (e) {
                            console.warn(`Producto no encontrado por Código de Barras: ${trimmedCode}`);
                        }
                    }
                    
                    if (!productData || !productData.idProducto) throw new Error("Producto no encontrado.");
                    
                    const existingItemIndex = ticket.findIndex(item => item.idProducto === productData.idProducto);

                    // Validar stock antes de continuar
                    if (existingItemIndex !== -1) {
                        // El producto ya está en el ticket
                        const itemInTicket = ticket[existingItemIndex];
                        if (itemInTicket.cantidad + 1 > productData.stock) {
                            showAlertModal('Stock Insuficiente', `Stock insuficiente para "${productData.nombre}".`);
                            return;
                        }
                    } else {
                        // El producto es nuevo en el ticket
                        if (!productData.stock || productData.stock <= 0) {
                            showAlertModal('Producto sin Existencias', `El producto "${productData.nombre}" no tiene existencias.`);
                            return;
                        }
                    }

                    if (productData.is_gramaje) {
                        openGramajeCalculator(productData);
                        return;
                    }

                    if (!activeSaleId) {
                        await createNewSale();
                    }

                    if (!activeSaleId) throw new Error("No se pudo crear una nueva venta.");

                    // Si ya existe, actualiza la cantidad. Si no, agrégalo.
                    if (existingItemIndex !== -1) {
                        await updateQuantity(existingItemIndex, 1);
                    } else {
                        const ventaData = await fetchApi(`/ventas/obtenerVentaPorId/${activeSaleId}`);
                        const detailPayload = {
                            cantidad: 1,
                            precioUnitarioVenta: productData.precio_venta, // Default to retail
                            Venta: ventaData,
                            Producto: productData,
                            tipoPrecioAplicado: "VENTA" // Default to VENTA
                        };
                        const newDetail = await fetchApi('/ventasDetalle/agregarVentaDetalle', 'POST', detailPayload);
                        ticket.push({
                            idProducto: productData.idProducto,
                            codigoBarras: productData.codigoBarras,
                            nombreProducto: productData.nombre,
                            cantidad: 1,
                            precioUnitarioVenta: productData.precio_venta, // Default to retail
                            existence: productData.stock,
                            idVentaDetalle: newDetail.idVentaDetalle,
                            Venta: ventaData,
                            Producto: productData,
                            isMayoreo: false // Add flag
                        });
                        renderTicket();
                        playSuccessBeep(); // Play success beep
                    }
                } catch (error) {
                    window.showToast({ message: `Error: ${error.message}`, type: 'error' });
                    playErrorBeep(); // Play error beep
                } finally {
                    codigoProductoInput.value = '';
                    codigoProductoInput.disabled = false;
                    agregarProductoBtn.textContent = 'ENTER - Agregar por Código';
                    codigoProductoInput.focus();
                }
            }

            async function removeProductFromTicket(index) {
                const itemToRemove = ticket[index];
                try {
                    await fetchApi(`/ventasDetalle/eliminarVentaDetalle/${itemToRemove.idVentaDetalle}`, 'DELETE');
                    ticket.splice(index, 1); // Remove from local array
                    renderTicket(); // Re-render the table
                    window.showToast({ message: `Producto "${itemToRemove.nombreProducto}" eliminado del ticket.`, type: 'success' });
                } catch (error) {
                    window.showToast({ message: `Error al eliminar producto: ${error.message}`, type: 'error' });
                }
            }


            async function createNewSale() {
                try {
                    const newSaleData = { usuario: { idUsuario: ID_USUARIO }, id: ID_CAJA, montoTotal: 0, estatus: 'P' }; // Add idCaja
                    const createdSale = await fetchApi('/ventas/agregarVenta', 'POST', newSaleData);
                    if (!createdSale || !createdSale.idVenta) throw new Error("La API no devolvió un ID de venta válido.");
                    if (!createdSale.numeroTicket) throw new Error("La API no devolvió el número de ticket para la nueva venta."); // Nuevo
                    activeSaleId = createdSale.idVenta;
                    ticket = [];
                    ticketIdDisplay.textContent = createdSale.numeroTicket;
                    renderTicket();
                    window.showToast({ message: `Nueva venta #${createdSale.numeroTicket} iniciada.`, type: 'success' });
                } catch (error) {
                    ticketIdDisplay.textContent = 'ERROR';
                    window.showToast({ message: `Error al crear nueva venta: ${error.message}`, type: 'error' });
                    throw error;
                }
            }

            async function initializeSale() {
                ticketIdDisplay.textContent = 'Buscando...';
                try {
                    // Usar el nuevo endpoint para buscar directamente la venta pendiente del usuario/caja
                    const pendingSale = await fetchApi('/ventas/buscarVentaPendiente'); 
                    
                    if (pendingSale && pendingSale.idVenta) { // Check if a pending sale object was returned
                        // New logic starts here
                        const today = getTodayDate();
                        const dailySalesData = await fetchApi(`/ventas/obtenerVentaPorDia/${today}`);
                        const allSales = dailySalesData.ventas || [];

                        const hasCompletedSales = allSales.some(sale => sale.estatus === 'C');
                        const hasPendingSale = allSales.some(sale => sale.estatus === 'P');
                        
                        // Check if all sales that are not the current pending sale are finalized
                        const allOthersFinalized = allSales
                            .filter(sale => sale.idVenta !== pendingSale.idVenta)
                            .every(sale => sale.estatus === 'F');

                        if (hasPendingSale && !hasCompletedSales && allOthersFinalized) {
                            // This is a new turn. Reset ticket number.
                            const updatedSale = { ...pendingSale, numeroTicket: 1 };
                            await fetchApi(`/ventas/actualizarVenta/${pendingSale.idVenta}`, 'PUT', updatedSale);
                            pendingSale.numeroTicket = 1; // update in memory
                            window.showToast({ message: 'Nuevo turno detectado. Ticket reiniciado a 1.', type: 'info' });
                        }
                        // New logic ends here

                        activeSaleId = pendingSale.idVenta;
                        if (!pendingSale.numeroTicket) throw new Error("La API no devolvió el número de ticket para la venta pendiente.");
                        ticketIdDisplay.textContent = pendingSale.numeroTicket;
                        
                        // Fetch details for the found pending sale
                        const allDetails = await fetchApi('/ventasDetalle/obtenerTodosLosVentasDetalles');
                        ticket = Array.isArray(allDetails) ? allDetails.filter(d => d.Venta.idVenta === activeSaleId).map(detail => ({
                            idProducto: detail.Producto.idProducto,
                            codigoBarras: detail.Producto.codigoBarras,
                            nombreProducto: detail.Producto.nombre,
                            cantidad: detail.cantidad,
                            precioUnitarioVenta: detail.precioUnitarioVenta,
                            existence: detail.Producto.stock,
                            idVentaDetalle: detail.idVentaDetalle,
                            Venta: detail.Venta,
                            Producto: detail.Producto,
                            isMayoreo: (detail.Producto.precio_mayoreo && detail.precioUnitarioVenta === detail.Producto.precio_mayoreo)
                        })) : [];
                        renderTicket();
                    } else {
                        // Si no se encuentra una venta pendiente, crear una nueva inmediatamente
                        await createNewSale();
                    }
                } catch (error) {
                    window.showToast({ message: `Error al inicializar: ${error.message}`, type: 'error' });
                    activeSaleId = null; ticket = []; ticketIdDisplay.textContent = 'ERROR'; renderTicket();
                } finally {
                    codigoProductoInput.disabled = false;
                    agregarProductoBtn.disabled = false;
                    codigoProductoInput.focus();
                }
            }

            function openPaymentModal() {
                if (!activeSaleId || ticket.length === 0) {
                    window.showToast({ message: 'No hay productos para cobrar.', type: 'error' });
                    return;
                }
                const total = ticket.reduce((sum, item) => sum + (item.precioUnitarioVenta * item.cantidad), 0);
                modalTotalAmount.textContent = `$${total.toFixed(2)}`;
                amountPaid.value = '';
                changeAmount.textContent = '$0.00';
                paymentModal.removeAttribute('hidden');
                paymentModal.classList.add('modal-active');
                amountPaid.focus();
            }

                            function closePaymentModal() {
                                paymentModal.classList.remove('modal-active');
                                paymentModal.setAttribute('hidden', '');
                            }
            // New Gramaje Calculator Functions
            function updateCalculatorDisplay(source) {
                let grams = parseFloat(gramajeInput.value) || 0;
                let totalPrice = parseFloat(precioTotal.value) || 0;
                const pricePerKilo = parseFloat(precioBase.value) || 0;

                if (source === 'grams') {
                    if (!isNaN(grams) && !isNaN(pricePerKilo) && grams >= 0) {
                        totalPrice = (grams / 1000) * pricePerKilo;
                        precioTotal.value = totalPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    } else {
                        precioTotal.value = '';
                    }
                } else if (source === 'totalPrice') {
                    if (!isNaN(totalPrice) && !isNaN(pricePerKilo) && pricePerKilo > 0 && totalPrice >= 0) {
                        grams = (totalPrice / pricePerKilo) * 1000;
                        gramajeInput.value = grams.toFixed(0);
                    } else {
                        gramajeInput.value = '';
                    }
                }
            }

            function setGramaje(grams) {
                gramajeInput.value = grams;
                updateCalculatorDisplay('grams'); // Corrected function call
            }

            function resetGramajeCalculator() { // Renamed from reset() to avoid conflict
                gramajeInput.value = '';
                precioTotal.value = ''; // Changed from .textContent to .value
                precioBase.value = calcProductPricePerKilo.value; // Reset to product's original price per kilo
                gramajeInput.focus();
                updateCalculatorDisplay('grams');
            }

            function openGramajeCalculator(productData) {
                gramajeCalculatorModal.removeAttribute('hidden');
                gramajeCalculatorModal.classList.add('modal-active');
                calcProductName.textContent = productData.nombre;
                calcProductId.value = productData.idProducto;
                calcProductPricePerKilo.value = productData.precio_venta; // Assuming precio_venta is price per kilo for gramaje products
                precioBase.value = productData.precio_venta; // Set the editable base price
                calcProductStock.value = productData.stock; // Stock in grams
                resetGramajeCalculator(); // Reset grams and total price
            }

            function closeGramajeCalculator() {
                gramajeCalculatorModal.classList.remove('modal-active');
                gramajeCalculatorModal.setAttribute('hidden', '');
                resetGramajeCalculator();
            }

            function calculateChange() {
                const total = parseFloat(modalTotalAmount.textContent.replace('$', ''));
                const paid = parseFloat(amountPaid.value) || 0;
                const change = paid - total;
                changeAmount.textContent = `$${change < 0 ? '0.00' : change.toFixed(2)}`;
            }

            async function handlePayment() {
                const total = parseFloat(modalTotalAmount.textContent.replace('$', ''));
                const paid = parseFloat(amountPaid.value) || 0;
                if (paid < total) {
                    window.showToast({ message: 'El monto pagado es menor al total.', type: 'error' });
                    return;
                }
                await completeSale('Efectivo');
                closePaymentModal();
            }

            async function handleTransferPayment() {
                if (!activeSaleId || ticket.length === 0) return;
                try {
                    const montoTotal = ticket.reduce((sum, item) => sum + (item.precioUnitarioVenta * item.cantidad), 0);
                    const queryParams = new URLSearchParams({
                        metodoPago: 'TRANSFERENCIA',
                        montoTotal: montoTotal,
                        // If idCaja is needed as a query parameter, add it here:
                        // idCaja: ID_CAJA
                    }).toString();
                    await fetchApi(`/ventas/completarVenta/${activeSaleId}?${queryParams}`, 'PUT');
                    window.showToast({ message: `Venta #${activeSaleId} completada con Transferencia.`, type: 'success' });
                    await initializeSale();
                } catch (error) {
                    window.showToast({ message: `Error al completar la venta por transferencia: ${error.message}`, type: 'error' });
                } finally {
                    closePaymentModal();
                }
            }

            async function completeSale(paymentMethod) {
                if (!activeSaleId || ticket.length === 0) return;
                try {
                    const montoTotal = ticket.reduce((sum, item) => sum + (item.precioUnitarioVenta * item.cantidad), 0);
                    // Eliminar tipoVenta del payload, ya que se gestiona por producto individual
                    const queryParams = new URLSearchParams({
                        metodoPago: paymentMethod,
                        montoTotal: montoTotal,
                        // If idCaja is needed as a query parameter, add it here:
                        // idCaja: ID_CAJA
                    }).toString();
                    await fetchApi(`/ventas/completarVenta/${activeSaleId}?${queryParams}`, 'PUT');
                    window.showToast({ message: `Venta #${activeSaleId} completada con ${paymentMethod}.`, type: 'success' });
                    await initializeSale();
                } catch (error) {
                    window.showToast({ message: `Error al completar la venta: ${error.message}`, type: 'error' });
                }
            }
            
            function renderSearchResults(products) {
                searchResultsContainer.innerHTML = '';
                if (!products || products.length === 0) {
                    searchResultsContainer.classList.add('hidden');
                    return;
                }
                products.forEach(product => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    
                    let pricesHtml = `<p class="font-bold text-primary">$${(product.precio_venta || 0).toFixed(2)}</p>`;
                    if (product.precio_mayoreo && product.precio_mayoreo > 0) {
                        pricesHtml += `<p class="text-sm text-gray-500">Mayoreo: $${(product.precio_mayoreo || 0).toFixed(2)}</p>`;
                    }

                    item.innerHTML = `
                        <div>
                            <p class="font-semibold">${product.nombre}</p>
                            <p class="text-sm text-gray-500">Stock: ${product.stock}</p>
                        </div>
                        <div>${pricesHtml}</div>
                    `;
                    item.addEventListener('click', () => {
                        searchResultsContainer.classList.add('hidden');
                        codigoProductoInput.value = '';
                        addProduct(product.codigoBarras || product.idProducto);
                    });
                    searchResultsContainer.appendChild(item);
                });
                searchResultsContainer.classList.remove('hidden');
            }

            async function searchProductsByName(query) {
                if(query.length < 2) { // Minimal length for search
                    searchResultsContainer.classList.add('hidden');
                    return;
                }
                try {
                    let results = [];
                    let trimmedQuery = query.trim();

                    // 1. Intentar buscar por ID si es numérico
                    if (!isNaN(trimmedQuery)) {
                        try {
                            const productById = await fetchApi(`/productos/buscarProductoPorId/${trimmedQuery}`);
                            if (productById) {
                                results.push(productById);
                            }
                        } catch (e) {
                            // Error al buscar por ID (ej. 404), no detener la búsqueda, solo registrar
                            console.debug(`No se encontró por ID: ${trimmedQuery}`);
                        }
                    }
                    
                    // 2. Intentar buscar por Código de Barras (funciona para códigos numéricos y alfanuméricos)
                    try {
                        const productByBarcode = await fetchApi(`/productos/buscarPorCodigoBarras/${trimmedQuery}`);
                        // Solo añadir si no es un duplicado del encontrado por ID
                        if (productByBarcode && !results.some(p => p.idProducto === productByBarcode.idProducto)) {
                            results.push(productByBarcode);
                        }
                    } catch (e) {
                        // Error al buscar por Código de Barras, no detener la búsqueda
                        console.debug(`No se encontró por Código de Barras: ${trimmedQuery}`);
                    }

                    // 3. Buscar por nombre (para consultas alfanuméricas o para ampliar resultados)
                    // Esta API de búsqueda por nombre ya debería manejar parciales.
                    try {
                        const nameSearchResults = await fetchApi(`/productos/buscar?nombre=${trimmedQuery}`);
                        nameSearchResults.forEach(p => {
                            // Evitar duplicados con los ya encontrados por ID o Código de Barras
                            if (!results.some(existing => existing.idProducto === p.idProducto)) {
                                results.push(p);
                            }
                        });
                    } catch (e) {
                        console.debug(`No se encontraron resultados por nombre para: ${trimmedQuery}`);
                    }

                    if (results.length > 0) {
                        renderSearchResults(results);
                    } else {
                        searchResultsContainer.classList.add('hidden');
                    }
                } catch (error) {
                    console.error('Error en búsqueda de productos:', error);
                    searchResultsContainer.classList.add('hidden');
                }
            }

            function handleMayoreoToggle(e) {
                if (e.target.classList.contains('mayoreo-checkbox')) {
                    const index = parseInt(e.target.dataset.index);
                    const item = ticket[index];
                    const isChecked = e.target.checked;
                    
                    let newPrecio;
                    let newIsMayoreo;

                    if (isChecked) {
                        if (item.Producto.precio_mayoreo === null || item.Producto.precio_mayoreo === undefined || item.Producto.precio_mayoreo <= 0) {
                            window.showToast({ message: `El producto "${item.nombreProducto}" no tiene un precio por mayoreo válido.`, type: 'error' });
                            e.target.checked = false; // Revert checkbox state
                            return;
                        }
                        newPrecio = item.Producto.precio_mayoreo;
                        newIsMayoreo = true;
                    } else {
                        newPrecio = item.Producto.precio_venta;
                        newIsMayoreo = false;
                    }
                    
                    const updatedItem = {
                        ...item,
                        precioUnitarioVenta: newPrecio,
                        isMayoreo: newIsMayoreo,
                        tipoPrecioAplicado: newIsMayoreo ? "MAYOREO" : "VENTA"
                    };
                    fetchApi(`/ventasDetalle/actualizarVentaDetalle/${item.idVentaDetalle}`, 'PUT', updatedItem)
                        .then(() => {
                            ticket[index] = updatedItem; // Update local ticket state
                            renderTicket();
                        })
                        .catch(err => {
                            window.showToast({ message: `Error al actualizar precio: ${err.message}`, type: 'error' });
                            e.target.checked = !isChecked; // Revert checkbox state on API error
                            // Revert local state to match UI
                            item.precioUnitarioVenta = isChecked ? item.Producto.precio_venta : item.Producto.precio_mayoreo;
                            item.isMayoreo = !isChecked;
                            renderTicket(); // Re-render to ensure UI reflects correct state
                        }); 
                }
            }

            codigoProductoInput.addEventListener('input', e => {
                clearTimeout(debounceTimer);
                const query = e.target.value.trim();
                if (query.length < 2) {
                    searchResultsContainer.classList.add('hidden');
                    return;
                }
                debounceTimer = setTimeout(() => {
                    searchProductsByName(query);
                }, 300);
            });

            document.addEventListener('click', (e) => {
                if (!searchResultsContainer.contains(e.target) && e.target !== codigoProductoInput) {
                    searchResultsContainer.classList.add('hidden');
                }
            });

            codigoProductoInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addProduct(e.target.value);
                    searchResultsContainer.classList.add('hidden');
                }
            });
            agregarProductoBtn.addEventListener('click', () => addProduct(codigoProductoInput.value));
            
            cobrarEfectivoBtn.addEventListener('click', openPaymentModal);
            cancelPaymentBtn.addEventListener('click', closePaymentModal);
            confirmPaymentBtn.addEventListener('click', handlePayment);
            confirmPaymentSpeiBtn.addEventListener('click', handleTransferPayment);
            amountPaid.addEventListener('input', calculateChange);
            ticketItemsTableBody.addEventListener('click', async e => {
                const target = e.target;
                if (target.classList.contains('btn-qty-plus')) await updateQuantity(target.dataset.index, 1);
                else if (target.classList.contains('btn-qty-minus')) await updateQuantity(target.dataset.index, -1);
                else if (target.classList.contains('mayoreo-checkbox')) handleMayoreoToggle(e);
                else if (target.closest('.btn-delete-item')) { // New condition for delete button
                    const index = target.closest('.btn-delete-item').dataset.index;
                    await removeProductFromTicket(index);
                }
            });
            document.addEventListener('keydown', e => {
                if (e.key === 'F12') { e.preventDefault(); openPaymentModal(); }
            });



                            // --- Lógica para la Modal de Historial de Ventas ---
                            const historialModal = document.getElementById('historialVentasModal');
                            console.log('historialModal element:', historialModal);
                            const verHistorialBtn = document.getElementById('verHistorialBtn');
                            console.log('verHistorialBtn element:', verHistorialBtn);
                            const cerrarHistorialModalBtn = document.getElementById('cerrarHistorialModalBtn');
                            console.log('cerrarHistorialModalBtn element:', cerrarHistorialModalBtn);            const historialVentasBody = document.getElementById('historialVentasBody');
            const historialCobroTotalEl = document.getElementById('historialCobroTotal');
            const historialGananciaTotalEl = document.getElementById('historialGananciaTotal');

            function getTodayDate() {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                return `${yyyy}-${mm}-${dd}`;
            }

            async function cargarHistorialVentas() {
                console.log('cargarHistorialVentas() started.');
                const today = getTodayDate();
                historialVentasBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Cargando...</td></tr>';
                console.log('Fetching sales data for today:', today);

                try {
                    const data = await fetchApi(`/ventas/obtenerVentaPorDia/${today}`);
                    console.log('Sales data fetched:', data);
                    
                    historialCobroTotalEl.textContent = `$${(data.cobroTotal || 0).toFixed(2)}`;
                    historialGananciaTotalEl.textContent = `$${(data.gananciaTotal || 0).toFixed(2)}`;

                    if (data.ventas && data.ventas.length > 0) {
                        // Order sales by numeroTicket (assuming it's numeric for sorting)
                        data.ventas.sort((a, b) => {
                            const dateA = new Date(a.fechaVenta);
                            const dateB = new Date(b.fechaVenta);

                            // Primary sort by date (ascending)
                            if (dateA.getTime() !== dateB.getTime()) {
                                return dateA.getTime() - dateB.getTime();
                            }

                            // Secondary sort by numeroTicket (ascending) if dates are the same
                            return a.numeroTicket - b.numeroTicket;
                        });

                        historialVentasBody.innerHTML = '';
                        data.ventas.forEach((venta, index) => {
                            const row = document.createElement('tr');
                            row.className = 'border-b cursor-pointer hover:bg-gray-700 hover:text-white hover:scale-[1.01] hover:shadow-lg'; // Make row clickable and darken on hover
                            row.dataset.id = venta.idVenta; // Store sale ID for details modal
                            row.dataset.enumeratedTicket = index + 1; // Store enumerated ticket number
                            
                            // Determine status text and class based on new definitions
                            let statusText;
                            let statusClass;
                            if (venta.estatus === 'F') {
                                statusText = 'Finalizada';
                                statusClass = 'bg-green-200 text-green-800';
                            } else if (venta.estatus === 'C') {
                                statusText = 'Completada';
                                statusClass = 'bg-blue-200 text-blue-800'; // Using blue for 'Completada'
                            } else if (venta.estatus === 'I') {
                                statusText = 'Inactiva/Cancelada';
                                statusClass = 'bg-red-200 text-danger';
                            } else {
                                statusText = venta.estatus; // Fallback for unknown status
                                statusClass = 'bg-gray-200 text-gray-800';
                            }

                            // Only Finalizada or Completada sales can be cancelled
                            const canBeCancelled = venta.estatus === 'F' || venta.estatus === 'C';
                            
                            row.innerHTML = `
                                <td class="text-center">${index + 1}</td>
                                <td class="text-center">$${venta.montoTotal.toFixed(2)}</td>
                                <td class="text-center">${venta.metodoPago}</td>
                                <td class="text-center">
                                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                                        ${statusText}
                                    </span>
                                </td>
                                <td class="text-center">${new Date(venta.fechaVenta).toLocaleTimeString()}</td>
                                <td class="text-center">
                                    <button 
                                        class="btn-cancelar-venta p-1 rounded-full w-8 h-8 shadow-md hover:bg-danger-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger disabled:opacity-50 disabled:cursor-not-allowed" 
                                        style="border-radius: 50%;"
                                        data-id="${venta.idVenta}" 
                                        title="Cancelar Venta"
                                        ${canBeCancelled ? '' : 'disabled'}>
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </td>
                            `;
                            historialVentasBody.appendChild(row);
                        });
                    } else {
                        historialVentasBody.innerHTML = '<tr><td colspan="6" class="text-center p-4">No se encontraron ventas para hoy.</td></tr>';
                    }
                } catch (error) {
                    historialVentasBody.innerHTML = `<tr><td colspan="6" class="text-center p-4 text-red-500">Error al cargar el historial: ${error.message}</td></tr>`;
                    window.showToast({ message: `Error al cargar el historial: ${error.message}`, type: 'error' });
                }
            } // Closes cargarHistorialVentas function

            async function handleCancelarVenta(e) {
                const button = e.target.closest('.btn-cancelar-venta');
                if (!button) return;

                const saleId = button.dataset.id;
                const confirmCancel = confirm(`¿Estás seguro de que deseas cancelar la venta con ID ${saleId}?`);

                if (!confirmCancel) return;

                button.disabled = true; // Disable button to prevent multiple clicks
                button.textContent = 'Cancelando...';

                try {
                    const payload = {
                        idUsuario: ID_USUARIO,
                        saleId: saleId,
                        newStatus: 'I' // 'I' for Inactiva/Cancelada
                    };
                    await fetchApi(`/ventas/cancelarVenta/${saleId}`, 'PUT', payload);
                    
                    window.showToast({ message: `Venta ${saleId} cancelada con éxito.`, type: 'success' });
                    cargarHistorialVentas(); // Refresh the sales history table
                } catch (error) {
                    window.showToast({ message: `Error al cancelar la venta ${saleId}: ${error.message}`, type: 'error' });
                } finally {
                    button.disabled = false;
                    button.textContent = ''; // Restore original button content (SVG icon)
                }
            }
            
            // Event listener for clicks within the sales history body (delegation)
            historialVentasBody.addEventListener('click', (e) => {
                const clickedElement = e.target;
                const targetRow = clickedElement.closest('tr[data-id]');

                if (clickedElement.closest('.btn-cancelar-venta')) {
                    handleCancelarVenta(e); // Let the existing handler manage the button click
                } else if (targetRow) {
                    // Remove 'row-selected' from previously selected row
                    if (currentlySelectedSaleRow) {
                        currentlySelectedSaleRow.classList.remove('row-selected');
                    }
                    // Add 'row-selected' to the newly clicked row
                    targetRow.classList.add('row-selected');
                    currentlySelectedSaleRow = targetRow; // Update currently selected row

                    const saleId = targetRow.dataset.id;
                    const enumeratedTicket = targetRow.dataset.enumeratedTicket; // Get the enumerated ticket
                    openSaleDetailsModal(saleId, enumeratedTicket);
                }
            });

            closeSaleDetailsModalBtn.addEventListener('click', () => {
                closeSaleDetailsModal(); // This already sets the modal to hidden
                if (currentlySelectedSaleRow) {
                    currentlySelectedSaleRow.classList.remove('row-selected');
                    currentlySelectedSaleRow = null; // Clear selection
                }
            });

            // Add event listener for "Ver Historial" button
            if (verHistorialBtn) { // Defensive check
                verHistorialBtn.addEventListener('click', () => {
                    console.log('verHistorialBtn clicked.');
                    historialModal.removeAttribute('hidden');
                    historialModal.classList.remove('hidden'); // Also remove Tailwind's hidden class
                    historialModal.classList.add('modal-active');
                    console.log('historialModal after showing: hidden attribute and hidden class removed, modal-active class added. Current classes:', historialModal.classList.value);
                    cargarHistorialVentas();
                    console.log('cargarHistorialVentas() called.');
                });
            }

            if (cerrarHistorialModalBtn) { // Assuming there's a close button for historialModal
                cerrarHistorialModalBtn.addEventListener('click', () => {
                    console.log('cerrarHistorialModalBtn clicked.');
                    historialModal.classList.remove('modal-active');
                    historialModal.classList.add('hidden'); // Also add Tailwind's hidden class back
                    historialModal.setAttribute('hidden', '');
                    console.log('historialModal after hiding: modal-active class removed, hidden attribute and hidden class added. Current classes:', historialModal.classList.value);
                });
            }

            // ... (rest of the code) ...


            async function addGramajeProductToSale() {
                const productId = calcProductId.value;
                const productName = calcProductName.value;
                let grams = parseFloat(gramajeInput.value); // New ID
                let totalPrice = parseFloat(precioTotal.value); // Read from .value now

                const pricePerKiloFromProduct = parseFloat(calcProductPricePerKilo.value); // Hidden original price_venta from product
                const stockAvailable = parseFloat(calcProductStock.value); // Stock is also in grams for gramaje products
                const currentPricePerKilo = parseFloat(precioBase.value); // Current visible price per kilo from input

                if (isNaN(grams) || grams <= 0 || isNaN(totalPrice) || totalPrice <= 0) {
                    window.showToast({ message: 'Por favor, ingrese un gramaje o precio total válido.', type: 'error' });
                    return;
                }
                
                // Ensure grams is a whole number if that's the intention, or adjust precision
                grams = Math.round(grams); 
                totalPrice = parseFloat(totalPrice.toFixed(2)); // Ensure consistent precision

                if (grams > stockAvailable) {
                    showAlertModal('Stock Insuficiente', `Stock insuficiente para "${productName}". Disponible: ${stockAvailable} gramos.`);
                    return;
                }

                try {
                    if (!activeSaleId) {
                        await createNewSale();
                    }

                    if (!activeSaleId) throw new Error("No se pudo crear una nueva venta.");

                    const existingItemIndex = ticket.findIndex(item => item.idProducto === productId);

                    // For gramaje products, if already in ticket, we treat it as a new line item
                    // or ask the user if they want to add to existing. For simplicity, let's add as new.
                    // If the user wants to combine, they can do it manually after.
                    // OR, if the requirement is to always add to existing if same product:
                    if (existingItemIndex !== -1) {
                        const existingItem = ticket[existingItemIndex];
                        const newTotalGrams = existingItem.cantidad + grams; // Assuming cantidad for gramaje product is in grams

                        if (newTotalGrams > stockAvailable) {
                            showAlertModal('Stock Insuficiente', `Stock insuficiente para "${productName}". Al intentar agregar ${grams}g, excedería el stock total. Disponible: ${stockAvailable} gramos.`);
                            return;
                        }

                        // Update existing item
                        const updatedItem = {
                            ...existingItem,
                            cantidad: newTotalGrams,
                            // Use the currentPricePerKilo from the modal for calculation, not the average
                            precioUnitarioVenta: totalPrice / grams, // This is price per gram based on current modal calculation
                        };
                        await fetchApi(`/ventasDetalle/actualizarVentaDetalle/${existingItem.idVentaDetalle}`, 'PUT', {
                            cantidad: updatedItem.cantidad,
                            precioUnitarioVenta: updatedItem.precioUnitarioVenta,
                        });
                        ticket[existingItemIndex] = updatedItem;
                    } else {
                        // Add as new item
                        const productData = {
                            idProducto: productId,
                            nombre: productName,
                            precio_venta: currentPricePerKilo, // Use the current price per kilo from modal
                            stock: stockAvailable,
                            is_gramaje: true
                        };
                        const ventaData = await fetchApi(`/ventas/obtenerVentaPorId/${activeSaleId}`);
                        const detailPayload = {
                            cantidad: grams, // Quantity is in grams
                            precioUnitarioVenta: totalPrice / grams, // Price per gram
                            Venta: ventaData,
                            Producto: productData,
                            tipoPrecioAplicado: "VENTA_GRAMAJE" // New type for gramaje sales
                        };
                        const newDetail = await fetchApi('/ventasDetalle/agregarVentaDetalle', 'POST', detailPayload);
                        ticket.push({
                            idProducto: productId,
                            nombreProducto: productName,
                            cantidad: grams,
                            precioUnitarioVenta: totalPrice / grams,
                            existence: stockAvailable,
                            idVentaDetalle: newDetail.idVentaDetalle,
                            Venta: ventaData,
                            Producto: productData,
                            isMayoreo: false // Gramaje products typically don't have mayoreo in the same way
                        });
                    }

                    renderTicket();
                    closeGramajeCalculator();
                    window.showToast({ message: `Producto por gramaje "${productName}" agregado a la venta.`, type: 'success' });

                } catch (error) {
                    window.showToast({ message: `Error al agregar producto por gramaje: ${error.message}`, type: 'error' });
                } finally {
                    codigoProductoInput.value = '';
                    codigoProductoInput.disabled = false;
                    agregarProductoBtn.textContent = 'ENTER - Agregar por Código';
                    codigoProductoInput.focus();
                }
            }

            // Gramaje Calculator Event Listeners
            gramajeInput.addEventListener('input', () => updateCalculatorDisplay('grams'));
            precioTotal.addEventListener('input', () => updateCalculatorDisplay('totalPrice'));
            precioBase.addEventListener('input', () => updateCalculatorDisplay('grams')); // Changing priceBase affects total price which is derived from grams

            calcCancelBtn.addEventListener('click', closeGramajeCalculator);
            calcAddToCartBtn.addEventListener('click', addGramajeProductToSale);
            calcResetBtn.addEventListener('click', resetGramajeCalculator); // Reset button event listener

            // Event listeners for quick action buttons
            document.querySelectorAll('[data-gramaje]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const grams = parseFloat(e.target.dataset.gramaje);
                    if (!isNaN(grams)) {
                        setGramaje(grams);
                    }
                });
            });
            initializeSale(); // Call initializeSale here after everything is set up

            // --- BARCODE SCANNER LOGIC ---
            const startScannerBtn = document.getElementById('startScannerBtn');
            const stopScannerBtn = document.getElementById('stopScannerBtn');
            let isProcessingScan = false;

            function processScannedCode(code) {
                addProduct(code);
                
                const feedback = document.getElementById('scan-feedback');
                const detectedId = document.getElementById('detected-id');
                feedback.classList.remove('hidden');
                detectedId.innerText = `ID: ${code}`;
    
                setTimeout(() => feedback.classList.add('hidden'), 3000);
            }

            function handleDetection(data) {
                if (isProcessingScan) return;

                const code = data.codeResult.code;
                if (code) {
                    isProcessingScan = true;
                    // document.getElementById('beep-sound').play(); // REMOVED: Replaced by programmatic beeps
                    stopScanner();
                    processScannedCode(code);
                }
            }

            function stopScanner() {
                Quagga.stop();
                document.getElementById('scanner-container').classList.add('hidden');
                document.getElementById('ticketPanel').classList.remove('hidden');
                document.querySelector('.w-full.md\\:w-1\\/4').classList.remove('hidden');
            }

            function startScanner() {
                isProcessingScan = false; // Reset flag on new scan session
                document.getElementById('scanner-container').classList.remove('hidden');
                document.getElementById('ticketPanel').classList.add('hidden');
                document.querySelector('.w-full.md\\:w-1\\/4').classList.add('hidden');
    
    
                Quagga.init({
                    inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: document.querySelector('#interactive'),
                        constraints: {
                            facingMode: "environment" // Usar cámara trasera
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
                        alert("Error al iniciar la cámara. Asegúrate de dar permisos.");
                        stopScanner(); // Asegurarse de limpiar la UI si falla
                        return;
                    }
                    Quagga.start();
                });
    
                Quagga.onDetected(handleDetection);
            }

            startScannerBtn.addEventListener('click', startScanner);
            stopScannerBtn.addEventListener('click', stopScanner);
        }); // Correctly closing DOMContentLoaded
    } // Correctly closing if (activeUser)