// --- CONFIGURACIÓN Y UTILIDADES ---
        const API_BASE_URL = 'http://localhost:8080';
        
        const activeUser = JSON.parse(sessionStorage.getItem('activeUser')) || { idUsuario: 1, nombre: 'Usuario Desconocido' };
        const ID_USUARIO = activeUser.idUsuario;
        let currentCorteDTO = null;

        const generateCorteBtn = document.getElementById('generateCorteBtn');
        const generateDailyReportBtn = document.getElementById('generateDailyReportBtn');
        const cerrarTurnoBtn = document.getElementById('cerrarTurnoBtn');
        const corteReporte = document.getElementById('corteReporte');

        // Nuevos elementos de la modal
        const dailyReportModal = document.getElementById('dailyReportModal');
        const generateReportFromModalBtn = document.getElementById('generateReportFromModalBtn');
        const cancelModalBtn = document.getElementById('cancelModalBtn');
        const reportDateInput = document.getElementById('reportDate');

        // Elementos del reporte
        const reportTitle = document.getElementById('reportTitle');
        const chartTitle = document.getElementById('chartTitle');
        const reporteFechaCorte = document.getElementById('reporteFechaCorte');
        const reporteCajero = document.getElementById('reporteCajero');
        const reporteMontoInicial = document.getElementById('reporteMontoInicial');
        const reporteVentasEfectivo = document.getElementById('reporteVentasEfectivo'); // Nuevo elemento
        const reporteTotalVentas = document.getElementById('reporteTotalVentas');
        const reporteOtrosIngresos = document.getElementById('reporteOtrosIngresos');
        const reporteTotalEgresos = document.getElementById('reporteTotalEgresos');
        const reporteSaldoFinalCalculado = document.getElementById('reporteSaldoFinalCalculado');
        const reporteGananciaTotal = document.getElementById('reporteGananciaTotal');

        const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
        function formatCurrency(amount) { return formatter.format(amount || 0); }

        async function fetchApi(endpoint, method = 'GET', data = null) { // Changed path to endpoint, body to data
            const headers = {
                'Content-Type': 'application/json',
            };

            const config = {
                method,
                headers,
            };

            if (data) {
                config.body = JSON.stringify(data);
            }

            try {
                const response = await fetch(`${API_BASE_URL}${endpoint}`, config); // Changed path to endpoint
                
               // console.log('API Raw Response Object:', response); // Keep for debugging raw response

                if (!response.ok) {
                    let errorMessage = `HTTP error! status: ${response.status}`;
                    try {
                        const contentType = response.headers.get("content-type");
                        if (contentType && contentType.includes("application/json")) {
                            const errorData = await response.json();
                            console.error('API Error Data (from !response.ok):', errorData);
                            errorMessage = errorData.mensaje || errorData.message || errorMessage;
                        } else {
                            const textError = await response.text();
                            console.error('API Error Text (from !response.ok):', textError);
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
                        // Specific handling for /ventas/buscarVentaPendiente (only for interfaz.js, not needed here but kept general)
                        // If a specific 404 for this endpoint means "no content" for corte.js, adjust here.
                        // For corte.js, assume 404 is a real error unless specified.
                        return jsonResponse.datos; // Success, return data
                    } else {
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
        
        let cashFlowChartInstance = null;

        function drawCashFlowChart(reportData, isHistoric = false) {
            const ctx = document.getElementById('cashFlowChart').getContext('2d');
            if (cashFlowChartInstance) {
                cashFlowChartInstance.destroy();
            }

            let labels, dataValues, titleText, totalBruto;

            if (isHistoric) { // Reporte Histórico por Día
                const ventasEfectivo = reportData.ventas.filter(v => v.metodoPago.toUpperCase() === 'EFECTIVO').reduce((sum, v) => sum + v.montoTotal, 0);
                const ventasTransferencia = reportData.ventas.filter(v => v.metodoPago.toUpperCase() === 'TRANSFERENCIA').reduce((sum, v) => sum + v.montoTotal, 0);
                
                labels = ['Ventas en Efectivo', 'Ventas por Transferencia'];
                dataValues = [ventasEfectivo, ventasTransferencia];
                totalBruto = reportData.cobroTotal;
                titleText = `Ingresos Totales: ${formatCurrency(totalBruto)}`;
                chartTitle.textContent = 'Composición del Flujo de Efectivo Bruto (Entradas)';

            } else { // Lógica para el corte de caja en vivo
                labels = ['Monto Inicial', 'Ventas en Efectivo', 'Ventas por Transferencia', 'Otros Ingresos'];
                
                const montoInicial = reportData.montoInicial || 0;
                const ventasEfectivo = reportData.ventasEfectivo || 0; 
                const ventasTransferencia = reportData.ventasTransferencia || 0; 
                const otrosIngresos = reportData.otrosIngresos || 0;
                
                dataValues = [montoInicial, ventasEfectivo, ventasTransferencia, otrosIngresos];
                totalBruto = montoInicial + ventasEfectivo + ventasTransferencia + otrosIngresos;
                
                titleText = `Total Entradas: ${formatCurrency(totalBruto)}`;
                chartTitle.textContent = 'Composición del Flujo de Caja';
            }

            const chartData = {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: ['#f97316', '#10b981', '#3b82f6', '#af7810'], 
                    hoverOffset: 15
                }]
            };
            
            cashFlowChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { size: 14 },
                                generateLabels: (chart) => {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map((label, i) => {
                                            const value = data.datasets[0].data[i];
                                            const percentage = totalBruto > 0 ? ((value / totalBruto) * 100).toFixed(1) : "0.0";
                                            return {
                                                text: `${label}: ${formatCurrency(value)} (${percentage}%)`,
                                                fillStyle: data.datasets[0].backgroundColor[i],
                                                strokeStyle: data.datasets[0].backgroundColor[i],
                                                lineWidth: 1,
                                                hidden: isNaN(value) || value === 0,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            }
                        },
                        title: {
                            display: true,
                            text: titleText,
                            font: { size: 16, weight: 'bold' },
                            padding: { bottom: 20 }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed;
                                    const percentage = totalBruto > 0 ? ((value / totalBruto) * 100).toFixed(1) : "0.0";
                                    return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }


        function renderCorteReport(corteDTO, ventasEfectivo, ventasTransferencia, salesTodayLength) {
            // 1. Asegurar que los títulos sean los originales para el corte en vivo
            reportTitle.textContent = 'Reporte del Corte Actual';
            reporteMontoInicial.parentElement.querySelector('.summary-title').textContent = 'Monto Inicial';
            reporteVentasEfectivo.parentElement.querySelector('.summary-title').textContent = 'Ventas en Efectivo'; // Nuevo título
            reporteOtrosIngresos.parentElement.querySelector('.summary-title').textContent = 'Ventas por Transferencia'; // Cambiado
            // El título del Total Ventas se mantiene en el HTML.

            // 2. Poblar los datos del corte en vivo
            reporteFechaCorte.textContent = new Date(corteDTO.fechaCorte).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
            reporteCajero.textContent = activeUser.nombre; 
            reporteMontoInicial.textContent = formatCurrency(corteDTO.montoInicial);
            reporteVentasEfectivo.textContent = formatCurrency(ventasEfectivo); // Nuevo campo
            reporteTotalVentas.textContent = formatCurrency(corteDTO.totalVentas); // Usar total del backend
            reporteOtrosIngresos.textContent = formatCurrency(ventasTransferencia); // Ventas por Transferencia
            reporteTotalEgresos.textContent = formatCurrency(corteDTO.totalEgresos);
            reporteSaldoFinalCalculado.textContent = formatCurrency(corteDTO.saldoFinalCalculado); // Usar saldo del backend
            reporteGananciaTotal.textContent = formatCurrency(corteDTO.gananciaTotal); // Usar ganancia del backend
            
            document.getElementById('reporteTotalTicketsDia').textContent = salesTodayLength;

            corteReporte.classList.remove('hidden');
            generateDailyReportBtn.classList.remove('hidden');
            cerrarTurnoBtn.classList.remove('hidden');

            currentCorteDTO = corteDTO; 

            // 3. Preparar datos para el gráfico
            const chartDataForLiveReport = {
                montoInicial: corteDTO.montoInicial,
                ventasEfectivo: ventasEfectivo,
                ventasTransferencia: ventasTransferencia,
                otrosIngresos: corteDTO.otrosIngresos // Incluir por si tiene valor
            };
            drawCashFlowChart(chartDataForLiveReport, false);
        }

        function renderHistoricReport(data, date) {
            // 1. Cambiar dinámicamente los títulos para el reporte histórico
            reportTitle.textContent = `Reporte del Día: ${date}`;
            reporteMontoInicial.parentElement.querySelector('.summary-title').textContent = 'Monto Inicial'; // Mantener el título original
            reporteVentasEfectivo.parentElement.querySelector('.summary-title').textContent = 'Ventas en Efectivo'; // Nuevo título
            reporteOtrosIngresos.parentElement.querySelector('.summary-title').textContent = 'Ventas por Transferencia'; // Cambiado
            
            // 2. Si no hay datos o la lista de ventas está vacía, muestra un reporte en ceros.
            if (!data || !data.ventas || data.ventas.length === 0) {
                window.showToast({ message: `No se encontraron datos de ventas para el día ${date}.`, type: 'info' });
                const emptyReport = { cobroTotal: 0, gananciaTotal: 0, ventas: [] };
                
                reporteMontoInicial.textContent = formatCurrency(0); // Monto Inicial = 0 para reporte histórico
                reporteVentasEfectivo.textContent = formatCurrency(0); // Nuevo campo
                reporteOtrosIngresos.textContent = formatCurrency(0); // Ventas por Transferencia
                reporteTotalVentas.textContent = formatCurrency(0);
                reporteGananciaTotal.textContent = formatCurrency(0);
                reporteSaldoFinalCalculado.textContent = formatCurrency(0);
                document.getElementById('reporteTotalTicketsDia').textContent = 0;
                reporteTotalEgresos.textContent = formatCurrency(0);
                drawCashFlowChart(emptyReport, true);
            } else {
                // 3. Calcular ventas por método de pago
                const ventasEfectivo = data.ventas.filter(v => v.metodoPago === 'EFECTIVO' || v.metodoPago === 'Efectivo').reduce((sum, v) => sum + v.montoTotal, 0);
                const ventasTransferencia = data.ventas.filter(v => v.metodoPago === 'TRANSFERENCIA').reduce((sum, v) => sum + v.montoTotal, 0);

                // 4. Poblar UI con los datos del reporte histórico
                reporteMontoInicial.textContent = formatCurrency(0); // Monto Inicial = 0 para reporte histórico
                reporteVentasEfectivo.textContent = formatCurrency(ventasEfectivo); // Nuevo campo
                reporteOtrosIngresos.textContent = formatCurrency(ventasTransferencia); // Ventas por Transferencia
                reporteTotalVentas.textContent = formatCurrency(data.cobroTotal);
                reporteGananciaTotal.textContent = formatCurrency(data.gananciaTotal);
                reporteSaldoFinalCalculado.textContent = formatCurrency(data.cobroTotal);
                document.getElementById('reporteTotalTicketsDia').textContent = data.ventas.length;
                reporteTotalEgresos.textContent = formatCurrency(0);
                
                window.showToast({ message: `Reporte para el día ${date} generado con éxito.`, type: 'success' });
                drawCashFlowChart(data, true);
            }

            // 5. Mostrar y ocultar elementos correspondientes
            reporteFechaCorte.textContent = new Date(date + 'T00:00:00').toLocaleString('es-MX', { dateStyle: 'long' });
            reporteCajero.textContent = activeUser.nombre;
            corteReporte.classList.remove('hidden');
            cerrarTurnoBtn.classList.add('hidden');
            generateDailyReportBtn.classList.remove('hidden');
        }
        
        async function generateCorteReport() {
            generateCorteBtn.disabled = true;
            generateCorteBtn.textContent = 'Calculando...';
            generateDailyReportBtn.classList.add('hidden');
            cerrarTurnoBtn.classList.add('hidden');
            corteReporte.classList.add('hidden');

            let initialCashAmount = 0; // Default to 0

            try {
                // Try to get initial amount from active cash register
                const activeCaja = await fetchApi(`/caja/apertura/activa?idUsuario=${ID_USUARIO}`, 'GET');
                if (activeCaja && typeof activeCaja.monto === 'number') {
                    initialCashAmount = activeCaja.monto;
                } else {
                    // Fallback to sessionStorage if no active caja or monto
                    const sessionAmount = parseFloat(sessionStorage.getItem('initialCashAmount'));
                    if (!isNaN(sessionAmount) && sessionAmount >= 0) {
                        initialCashAmount = sessionAmount;
                    } else {
                        // If both fail, report an error
                        window.showToast({ message: 'Monto inicial de caja no encontrado. Por favor, asegúrese de que haya una caja abierta.', type: 'error' });
                        return;
                    }
                }

                const corteResponse = await fetchApi(`/caja/corte?idUsuario=${ID_USUARIO}&montoInicial=${initialCashAmount}`, 'POST');
                
                let salesToday = [];
                try {
                    const allSalesResponse = await fetchApi('/ventas/obtenerVentas'); // Corrected typo
                    const allSales = Array.isArray(allSalesResponse) ? allSalesResponse : (allSalesResponse.datos || []);
                    
                    const corteDate = new Date(corteResponse.fechaCorte + 'Z'); 
                    
                    salesToday = allSales.filter(sale => {
                        if (!sale.fechaVenta) return false;
                        const saleDate = new Date(sale.fechaVenta + 'Z'); 
                        const isSameDay = saleDate.getUTCFullYear() === corteDate.getUTCFullYear() &&
                                          saleDate.getUTCMonth() === corteDate.getUTCMonth() &&
                                          saleDate.getUTCDate() === corteDate.getUTCDate();
                        
                        // Include sales that are 'C' (Completed) or 'F' (Finalized)
                        return isSameDay && (sale.estatus === 'C');
                    });
                } catch (salesError) {
                    console.error("Error al obtener el total de tickets del día:", salesError);
                }

                // Calcular ventas por método de pago para el desglose
                const ventasTransferencia = salesToday.filter(v => v.metodoPago.toUpperCase() === 'TRANSFERENCIA').reduce((sum, v) => sum + v.montoTotal, 0);
                const ventasEfectivo = salesToday.filter(v => v.metodoPago.toUpperCase() === 'EFECTIVO').reduce((sum, v) => sum + v.montoTotal, 0);

                renderCorteReport(corteResponse, ventasEfectivo, ventasTransferencia, salesToday.length);
                window.showToast({ message: 'Corte de caja generado con éxito.', type: 'success' });
            } catch (error) {
                window.showToast({ message: `Error al generar el corte: ${error.message}`, type: 'error' });
            } finally {
                generateCorteBtn.disabled = false;
                generateCorteBtn.textContent = 'Generar Corte de Caja';
            }
        }
        
        // --- Lógica para el reporte diario ---
        function openDailyReportModal() {
            reportDateInput.valueAsDate = new Date(); // Poner la fecha actual por defecto
            dailyReportModal.removeAttribute('hidden');
            dailyReportModal.classList.add('modal-active');
        }

        function closeDailyReportModal() {
            dailyReportModal.classList.remove('modal-active');
            dailyReportModal.setAttribute('hidden', '');
        }

        async function generateDailyReportFromModal() {
            const selectedDate = reportDateInput.value;
            if (!selectedDate) {
                window.showToast({ message: 'Por favor, selecciona una fecha.', type: 'error' });
                return;
            }
            
            generateReportFromModalBtn.disabled = true;
            generateReportFromModalBtn.textContent = 'Generando...';

            try {
                const dailyReportData = await fetchApi(`/ventas/obtenerVentaPorDia/${selectedDate}`, 'GET');
                renderHistoricReport(dailyReportData, selectedDate);
                closeDailyReportModal();
            } catch (error) {
                window.showToast({ message: `Error al generar el reporte diario: ${error.message}`, type: 'error' });
            } finally {
                generateReportFromModalBtn.disabled = false;
                generateReportFromModalBtn.textContent = 'Generar Reporte';
            }
        }

        async function cerrarTurno() {
            if (!currentCorteDTO) {
                window.showToast({ message: 'Primero genera un reporte de corte de caja.', type: 'error' });
                return;
            }
            cerrarTurnoBtn.disabled = true;
            cerrarTurnoBtn.textContent = 'Cerrando Turno...';
            try {
                const endOfDay = new Date(currentCorteDTO.fechaCorte + 'Z');
                const startOfDay = new Date(endOfDay);
                startOfDay.setUTCHours(0, 0, 0, 0);
                const payload = {
                    idUsuario: ID_USUARIO,
                    startDate: startOfDay.toISOString(), 
                    endDate: endOfDay.toISOString(),
                    oldStatus: 'C',
                    newStatus: 'F'  
                };
                await fetchApi('/caja/ventas/status', 'PUT', payload);
                window.showToast({ message: 'Turno cerrado con éxito. Cerrando sesión...', type: 'success' });
                sessionStorage.clear();
                setTimeout(() => { window.location.href = 'Login.html'; }, 1500);
            } catch (error) {
                window.showToast({ message: `Error al cerrar el turno: ${error.message}`, type: 'error' });
            } finally {
                cerrarTurnoBtn.disabled = false;
                cerrarTurnoBtn.textContent = 'Cerrar Turno';
            }
        }

// Nuevos elementos para el reporte mensual
const generateMonthlyReportBtn = document.getElementById('generateMonthlyReportBtn');
const monthlyReportModal = document.getElementById('monthlyReportModal');
const reportMonthInput = document.getElementById('reportMonth');
const generateReportFromMonthlyModalBtn = document.getElementById('generateReportFromMonthlyModalBtn');
const cancelMonthlyModalBtn = document.getElementById('cancelMonthlyModalBtn');
const monthlyReportTableBody = document.getElementById('monthlyReportTableBody');

// --- Lógica para el reporte mensual ---
function openMonthlyReportModal() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    reportMonthInput.value = `${year}-${month}`; // Set current month/year by default
    monthlyReportModal.removeAttribute('hidden');
    monthlyReportModal.classList.add('modal-active');
}

function closeMonthlyReportModal() {
    monthlyReportModal.classList.remove('modal-active');
    monthlyReportModal.setAttribute('hidden', '');
}

async function generateMonthlyReport() {
    const selectedMonthYear = reportMonthInput.value; // Format: YYYY-MM
    if (!selectedMonthYear) {
        window.showToast({ message: 'Por favor, selecciona un mes y año.', type: 'error' });
        return;
    }

    const [year, month] = selectedMonthYear.split('-');
    const targetMonth = parseInt(month) - 1; // Months are 0-indexed in JavaScript Date
    const targetYear = parseInt(year);

    generateReportFromMonthlyModalBtn.disabled = true;
    generateReportFromMonthlyModalBtn.textContent = 'Generando...';

    try {
        const allSaleDetails = await fetchApi(`/ventasDetalle/obtenerTodosLosVentasDetalles`, 'GET');
        
        // Filter sale details by selected month, year and status 'C' or 'F'
        const monthlySaleDetails = allSaleDetails.filter(detail => {
            const saleDate = new Date(detail.Venta.fechaVenta);
            return saleDate.getMonth() === targetMonth && 
                   saleDate.getFullYear() === targetYear &&
                   (detail.Venta.estatus === 'C' || detail.Venta.estatus === 'F'); // Added status check
        });

        // Aggregate sales by Venta.idVenta to calculate total sales and profit per unique sale
        const salesMap = new Map(); // Map to store aggregated info for each unique sale
        monthlySaleDetails.forEach(detail => {
            const saleId = detail.Venta.idVenta;
            if (!salesMap.has(saleId)) {
                salesMap.set(saleId, {
                    ...detail.Venta, // Copy main Venta properties
                    totalVenta: 0,
                    totalCosto: 0,
                    ganancia: 0,
                    productos: [] // To store details if needed
                });
            }
            const sale = salesMap.get(saleId);
            sale.totalVenta += detail.cantidad * detail.precioUnitarioVenta;

            let costoPorUnidad = detail.Producto.precio_costo || 0;
            let cantidadParaCosto = detail.cantidad;

            // Ajuste para productos vendidos por gramaje:
            // Si el producto es por gramaje (is_gramaje: true), la cantidad está en gramos,
            // y el precio_costo está por kilogramo. Convertimos gramos a kilogramos.
            if (detail.Producto.is_gramaje === true) {
                cantidadParaCosto = detail.cantidad / 1000; // Convertir gramos a kilogramos
            }

            sale.totalCosto += cantidadParaCosto * costoPorUnidad;
            sale.ganancia = sale.totalVenta - sale.totalCosto;
            sale.productos.push(detail);
        });

        const monthlySales = Array.from(salesMap.values()); // Convert map values to array for display

        // Calculate total monthly sales and profit across all filtered details
        const totalMonthlySalesAmount = monthlySales.reduce((sum, sale) => sum + sale.totalVenta, 0);
        const totalMonthlyProfit = monthlySales.reduce((sum, sale) => sum + sale.ganancia, 0);


        monthlyReportTableBody.innerHTML = ''; // Clear previous report
        if (monthlySales && monthlySales.length > 0) {
            // Add a row for total sales and profit at the top
            const totalRow = document.createElement('tr');
            totalRow.className = 'bg-primary-light-20 font-bold'; // Changed background here
            totalRow.innerHTML = `
                <td class="px-6 py-3 whitespace-normal break-words text-sm text-gray-900 text-center" colspan="3">Total Ventas del Mes:</td>
                <td class="px-6 py-3 whitespace-normal break-words text-sm text-income-color text-center">${formatCurrency(totalMonthlySalesAmount)}</td>
                <td class="px-6 py-3 whitespace-normal break-words text-sm text-gray-900 text-center" colspan="3">Ganancia Total del Mes:</td>
                <td class="px-6 py-3 whitespace-normal break-words text-sm text-profit-color text-center">${formatCurrency(totalMonthlyProfit)}</td>
            `;
            monthlyReportTableBody.appendChild(totalRow);

            monthlySales.forEach(sale => { // Iterate through aggregated sales
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 text-center">${sale.idVenta}</td>
                    <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 text-center">${sale.numeroTicket}</td>
                    <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 text-center">${new Date(sale.fechaVenta).toLocaleString()}</td>
                    <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 text-center">${formatCurrency(sale.totalVenta)}</td>
                    <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 text-center">${sale.metodoPago}</td>
                    <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 text-center">${sale.estatus}</td>
                    <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 text-center">${sale.usuario ? sale.usuario.nombre : 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-normal break-words text-sm text-gray-900 text-center">${formatCurrency(sale.ganancia)}</td>
                `;
                monthlyReportTableBody.appendChild(row);
            });
        } else {
            monthlyReportTableBody.innerHTML = `<tr><td colspan="8" class="px-6 py-4 whitespace-normal break-words text-sm text-gray-500 text-center">No se encontraron ventas para ${month}/${year}.</td></tr>`;
        }
        window.showToast({ message: `Reporte mensual para ${month}/${year} generado con éxito.`, type: 'success' });
        // Optionally, close modal after generating report, or leave open to view
        // closeMonthlyReportModal();
    } catch (error) {
        window.showToast({ message: `Error al generar el reporte mensual: ${error.message}`, type: 'error' });
    } finally {
        generateReportFromMonthlyModalBtn.disabled = false;
        generateReportFromMonthlyModalBtn.textContent = 'Generar Reporte';
    }
}

        generateCorteBtn.addEventListener('click', generateCorteReport);
        generateDailyReportBtn.addEventListener('click', openDailyReportModal);
        cerrarTurnoBtn.addEventListener('click', cerrarTurno);
        
        // Listeners para la modal de reporte mensual
        generateMonthlyReportBtn.addEventListener('click', openMonthlyReportModal);
        cancelMonthlyModalBtn.addEventListener('click', closeMonthlyReportModal);
        generateReportFromMonthlyModalBtn.addEventListener('click', generateMonthlyReport);
        
        // Listeners para la modal de reporte diario
        cancelModalBtn.addEventListener('click', closeDailyReportModal);
        generateReportFromModalBtn.addEventListener('click', generateDailyReportFromModal);
        
        document.addEventListener('DOMContentLoaded', () => {
             reporteCajero.textContent = activeUser.nombre;
             corteReporte.classList.add('hidden');
             generateDailyReportBtn.classList.add('hidden');
             cerrarTurnoBtn.classList.add('hidden');
        });