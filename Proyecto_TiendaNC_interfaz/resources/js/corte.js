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
        const reporteOtrasEntradas = document.getElementById('reporteOtrasEntradas');
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

            if (isHistoric) { // Reporte Hist├│rico por D├¡a
                const ventasEfectivo = reportData.ventas.filter(v => v.metodoPago.toUpperCase() === 'EFECTIVO').reduce((sum, v) => sum + v.montoTotal, 0);
                const ventasTransferencia = reportData.ventas.filter(v => v.metodoPago.toUpperCase() === 'TRANSFERENCIA').reduce((sum, v) => sum + v.montoTotal, 0);

                labels = ['Ventas en Efectivo', 'Ventas por Transferencia'];
                dataValues = [ventasEfectivo, ventasTransferencia];
                totalBruto = reportData.cobroTotal;
                titleText = `Ingresos Totales: ${formatCurrency(totalBruto)}`;
                chartTitle.textContent = 'Composici├│n del Flujo de Efectivo Bruto (Entradas)';

            } else { // L├│gica para el corte de caja en vivo
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
            // 1. Asegurar que los t├¡tulos sean los originales para el corte en vivo
            reportTitle.textContent = 'Reporte del Corte Actual';
            reporteMontoInicial.parentElement.querySelector('.summary-title').textContent = 'Monto Inicial';
            reporteVentasEfectivo.parentElement.querySelector('.summary-title').textContent = 'Ventas en Efectivo'; // Nuevo t├¡tulo
            reporteOtrosIngresos.parentElement.querySelector('.summary-title').textContent = 'Ventas por Transferencia'; // Cambiado
            // El t├¡tulo del Total Ventas se mantiene en el HTML.

            // 2. Poblar los datos del corte en vivo
            reporteFechaCorte.textContent = new Date(corteDTO.fechaCorte).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
            reporteCajero.textContent = activeUser.nombre;
            reporteMontoInicial.textContent = formatCurrency(corteDTO.montoInicial);
            reporteVentasEfectivo.textContent = formatCurrency(ventasEfectivo); // Nuevo campo
            reporteTotalVentas.textContent = formatCurrency(corteDTO.totalVentas); // Usar total del backend
            reporteOtrosIngresos.textContent = formatCurrency(ventasTransferencia); // Ventas por Transferencia
            reporteTotalEgresos.textContent = "- " + formatCurrency(corteDTO.totalEgresos);
            reporteOtrasEntradas.textContent = formatCurrency(corteDTO.otrosIngresos);
            reporteSaldoFinalCalculado.textContent = formatCurrency(corteDTO.saldoFinalCalculado); // Usar saldo del backend
            reporteGananciaTotal.textContent = formatCurrency(corteDTO.gananciaTotal); // Usar ganancia del backend

            document.getElementById('reporteTotalTicketsDia').textContent = salesTodayLength;

            corteReporte.classList.remove('hidden');
            generateDailyReportBtn.classList.remove('hidden');
            cerrarTurnoBtn.classList.remove('hidden');

            currentCorteDTO = corteDTO;

            // 3. Preparar datos para el gr├ífico
            const chartDataForLiveReport = {
                montoInicial: corteDTO.montoInicial,
                ventasEfectivo: ventasEfectivo,
                ventasTransferencia: ventasTransferencia,
                otrosIngresos: corteDTO.otrosIngresos // Incluir por si tiene valor
            };
            drawCashFlowChart(chartDataForLiveReport, false);
        }

        function renderHistoricReport(data, date) {
            // 1. Cambiar din├ímicamente los t├¡tulos para el reporte hist├│rico
            reportTitle.textContent = `Reporte del Día: ${date}`;
            reporteMontoInicial.parentElement.querySelector('.summary-title').textContent = 'Monto Inicial'; // Mantener el t├¡tulo original
            reporteVentasEfectivo.parentElement.querySelector('.summary-title').textContent = 'Ventas en Efectivo'; // Nuevo t├¡tulo
            reporteOtrosIngresos.parentElement.querySelector('.summary-title').textContent = 'Ventas por Transferencia'; // Cambiado

            // 2. Si no hay datos o la lista de ventas est├í vac├¡a, muestra un reporte en ceros.
            if (!data || !data.ventas || data.ventas.length === 0) {
                window.showToast({ message: `No se encontraron datos de ventas para el día ${date}.`, type: 'info' });
                const emptyReport = { cobroTotal: 0, gananciaTotal: 0, ventas: [] };

                reporteMontoInicial.textContent = formatCurrency(0); // Monto Inicial = 0 para reporte hist├│rico
                reporteVentasEfectivo.textContent = formatCurrency(0); // Nuevo campo
                reporteOtrosIngresos.textContent = formatCurrency(0); // Ventas por Transferencia
                reporteTotalVentas.textContent = formatCurrency(0);
                reporteGananciaTotal.textContent = formatCurrency(0);
                reporteSaldoFinalCalculado.textContent = formatCurrency(0);
                document.getElementById('reporteTotalTicketsDia').textContent = 0;
                reporteTotalEgresos.textContent = "- " + formatCurrency(0);
                drawCashFlowChart(emptyReport, true);
            } else {
                // 3. Calcular ventas por m├®todo de pago
                const ventasEfectivo = data.ventas.filter(v => v.metodoPago === 'EFECTIVO' || v.metodoPago === 'Efectivo').reduce((sum, v) => sum + v.montoTotal, 0);
                const ventasTransferencia = data.ventas.filter(v => v.metodoPago === 'TRANSFERENCIA').reduce((sum, v) => sum + v.montoTotal, 0);

                // 4. Poblar UI con los datos del reporte hist├│rico
                reporteMontoInicial.textContent = formatCurrency(0); // Monto Inicial = 0 para reporte hist├│rico
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
                        window.showToast({ message: 'Monto inicial de caja no encontrado. Por favor, aseg├║rese de que haya una caja abierta.', type: 'error' });
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
                    console.error("Error al obtener el total de tickets del d├¡a:", salesError);
                }

                // Calcular ventas por m├®todo de pago para el desglose
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

        // --- L├│gica para el reporte diario ---
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
                    endDate: endOfDay.toISOString()
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

// Nuevos elementos para el reporte mensual (Nuevo Dise├▒o)
const generateMonthlyReportBtn = document.getElementById('generateMonthlyReportBtn');
const monthlyReportModal = document.getElementById('monthlyReportModal');
const reportMonthInput = document.getElementById('reportMonth');
const generateReportFromMonthlyModalBtn = document.getElementById('modalGenerateMonthlyReportBtn'); // Changed for consistency
const cancelMonthlyModalBtn = document.getElementById('cancelMonthlyModalBtn');

const monthlyReportSelectedMonth = document.getElementById('monthlyReport-selectedMonth').querySelector('span');
const statsVentasValue = document.getElementById('monthlyReport-stats-ventas-value');
const statsVentasChange = document.getElementById('monthlyReport-stats-ventas-change');
const statsTransferenciaValue = document.getElementById('monthlyReport-stats-transferencia-value');
const statsTransferenciaChange = document.getElementById('monthlyReport-stats-transferencia-change');
const statsGananciasValue = document.getElementById('monthlyReport-stats-ganancias-value');
const statsGananciasChange = document.getElementById('monthlyReport-stats-ganancias-change');
const monthlyReportChartContainer = document.getElementById('monthly-report-chart-container');
const monthlyReportFooterTip = document.getElementById('monthlyReport-footer-tip');
const monthlyReportFooterTipText = document.getElementById('monthlyReport-footer-tip-text');

let monthlyReportChartInstance = null;


// --- L├│gica para el reporte mensual ---

function createMonthlyReportChart(weeklyData, monthYearString) {
    const canvas = document.getElementById('monthlyReportChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (monthlyReportChartInstance) {
        monthlyReportChartInstance.destroy();
    }

    // Helper function to get week range label
    const getWeekRangeLabel = (weekNumber, monthYearString) => {
        const [year, month] = monthYearString.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate(); // Get last day of previous month, which is days in current month

        let startDate, endDate;

        if (weekNumber === 1) {
            startDate = 1;
            endDate = 7;
        } else if (weekNumber === 2) {
            startDate = 8;
            endDate = 14;
        } else if (weekNumber === 3) {
            startDate = 15;
            endDate = 21;
        } else if (weekNumber === 4) {
            startDate = 22;
            endDate = daysInMonth; // Last day of the month
        } else {
            return `S${weekNumber}`; // Fallback, though we expect only 1-4
        }

        const start = new Date(year, month - 1, startDate).getDate();
        const end = new Date(year, month - 1, endDate).getDate();

        // Format the label to show only day of month
        return `S${weekNumber}\n(${start}-${end})`;
    };

    const labels = weeklyData.map(d => getWeekRangeLabel(d.week, monthYearString)); // Modified labels generation
    const salesData = weeklyData.map(d => d.sales);
    const profitData = weeklyData.map(d => d.profit);

    monthlyReportChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ventas',
                    data: salesData,
                    backgroundColor: '#48d308', // Zelda Green - Keep original color
                    borderRadius: 2,
                    barPercentage: 0.6,
                },
                {
                    label: 'Ganancia',
                    data: profitData,
                    backgroundColor: '#f1c40f', // Zelda Gold - Keep original color
                    borderRadius: 2,
                    barPercentage: 0.6,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: 8 },
                        callback: function(value) {
                            return '$' + (value / 1000) + 'k';
                        }
                    },
                    grid: {
                        drawTicks: false,
                        color: '#f1f5f9' // slate-100
                    },
                    border: {
                        dash: [2, 4],
                        display: false
                    }
                },
                x: {
                    ticks: {
                        font: { size: 10, weight: 'bold' }
                    },
                    grid: {
                        display: false,
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}


function openMonthlyReportModal() {
    // console.log('Opening monthly report modal. Modal element:', monthlyReportModal); // DEBUG LOG
    // console.log('Monthly Report Modal classList before changes:', monthlyReportModal ? monthlyReportModal.classList : 'Modal not found'); // DEBUG LOG
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    reportMonthInput.value = `${year}-${month}`; // Set current month/year by default
    monthlyReportModal.removeAttribute('hidden');
    monthlyReportModal.classList.remove('hidden'); // Use Tailwind class to un-hide
    monthlyReportModal.classList.add('modal-active');
    // console.log('Monthly Report Modal classList after changes:', monthlyReportModal ? monthlyReportModal.classList : 'Modal not found'); // DEBUG LOG

    // Reset UI to initial state
    monthlyReportSelectedMonth.textContent = 'Seleccione un mes';
    statsVentasValue.textContent = '$0.00';
    statsTransferenciaValue.textContent = '$0.00';
    statsGananciasValue.textContent = '$0.00';
    statsVentasChange.textContent = '--%';
    statsTransferenciaChange.textContent = '--%';
    statsGananciasChange.textContent = '--%';
    if (monthlyReportChartInstance) {
        monthlyReportChartInstance.destroy();
        monthlyReportChartInstance = null;
    }
    monthlyReportFooterTip.classList.add('hidden');
}

function closeMonthlyReportModal() {
    monthlyReportModal.classList.remove('modal-active');
    monthlyReportModal.classList.add('hidden');
    monthlyReportModal.setAttribute('hidden', '');
}

async function generateMonthlyReport() {
    const selectedMonthYear = reportMonthInput.value;
    if (!selectedMonthYear) {
        window.showToast({ message: 'Por favor, selecciona un mes y a├▒o.', type: 'error' });
        return;
    }

    const originalButtonContent = generateReportFromMonthlyModalBtn.innerHTML;
    generateReportFromMonthlyModalBtn.disabled = true;
    generateReportFromMonthlyModalBtn.innerHTML = `<svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Generando...`;

    try {
        const [year, month] = selectedMonthYear.split('-');
        const targetMonth = parseInt(month) - 1;
        const targetYear = parseInt(year);

        const date = new Date(targetYear, targetMonth, 1);
        const monthName = date.toLocaleString('es-MX', { month: 'long' });
        const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        monthlyReportSelectedMonth.textContent = `${formattedMonthName} ${year}`;



        // 1. Obtener todos los detalles de ventas
        const allSaleDetails = await fetchApi(`/ventasDetalle/obtenerTodosLosVentasDetalles`, 'GET');

        // 2. Filtrar detalles de ventas por el mes y a├▒o seleccionados
        const monthlySaleDetails = allSaleDetails.filter(detail => {
            const saleDate = new Date(detail.Venta.fechaVenta);
            return saleDate.getMonth() === targetMonth &&
                   saleDate.getFullYear() === targetYear &&
                   (detail.Venta.estatus === 'C' || detail.Venta.estatus === 'F');
        });

        // 3. Procesar y agrupar los detalles en ventas ├║nicas con sus totales
        const salesMap = new Map();
        monthlySaleDetails.forEach(detail => {
            const saleId = detail.Venta.idVenta;
            if (!salesMap.has(saleId)) {
                salesMap.set(saleId, {
                    ...detail.Venta,
                    totalVenta: detail.Venta.montoTotal, // Usar el montoTotal del backend
                    totalCosto: 0,
                });
            }
            const sale = salesMap.get(saleId);
            // No sumar itemVenta aqu├¡, ya que totalVenta viene del backend


            const costoPorUnidad = detail.Producto.precio_costo || 0;
            // Use tipoPrecioAplicado from the sale detail to determine if grammage conversion is needed
            const isGramajeSale = detail.tipoPrecioAplicado === "VENTA_GRAMAJE";
            const cantidadParaCosto = isGramajeSale ? (detail.cantidad / 1000) : detail.cantidad;
            sale.totalCosto += cantidadParaCosto * costoPorUnidad;
        });

        const monthlySales = Array.from(salesMap.values()).map(sale => ({
            ...sale,
            ganancia: sale.totalVenta - sale.totalCosto
        }));
        monthlySales.sort((a, b) => new Date(b.fechaVenta) - new Date(a.fechaVenta));

        // 4. Construir el objeto reportData a partir de los datos procesados
        const totalVentas = monthlySales.reduce((sum, sale) => sum + sale.totalVenta, 0);
        const totalGanancias = monthlySales.reduce((sum, sale) => sum + sale.ganancia, 0);
        const totalTransferencia = monthlySales
            .filter(s => s.metodoPago.toUpperCase() === 'TRANSFERENCIA')
            .reduce((sum, sale) => sum + sale.montoTotal, 0);



        const getFixedWeekNumber = (date) => {
            const dayOfMonth = date.getDate();
            if (dayOfMonth >= 1 && dayOfMonth <= 7) {
                return 1;
            } else if (dayOfMonth >= 8 && dayOfMonth <= 14) {
                return 2;
            } else if (dayOfMonth >= 15 && dayOfMonth <= 21) {
                return 3;
            } else { // dayOfMonth >= 22 and up to daysInMonth
                return 4;
            }
        };

        const weeklyData = Array.from({ length: 4 }, (_, i) => ({ week: i + 1, sales: 0, profit: 0 }));
        monthlySales.forEach(sale => {
            const saleDate = new Date(sale.fechaVenta);
            const week = getFixedWeekNumber(saleDate);
            if (week >= 1 && week <= 4) {
                weeklyData[week - 1].sales += sale.totalVenta;
                weeklyData[week - 1].profit += sale.ganancia;
            }
        });

        const reportData = {
            totalVentas,
            totalGanancias,
            totalTransferencia,
            ventasChange: undefined, // No se calcula por ahora
            transferenciaChange: undefined,
            gananciasChange: undefined,
            weeklyData,
            recentTransactions: monthlySales, // Ya est├ín ordenadas por fecha
        };

        // 5. Utilizar reportData para popular la UI
        statsVentasValue.textContent = formatCurrency(reportData.totalVentas);
        statsTransferenciaValue.textContent = formatCurrency(reportData.totalTransferencia);
        statsGananciasValue.textContent = formatCurrency(reportData.totalGanancias);

        // Los porcentajes de cambio se dejan como estaban
        statsVentasChange.textContent = '--%';
        statsTransferenciaChange.textContent = '--%';
        statsGananciasChange.textContent = '--%';

        if (reportData.weeklyData && reportData.weeklyData.length > 0) {
                            createMonthlyReportChart(reportData.weeklyData, selectedMonthYear);        } else {
            createMonthlyReportChart([]);
        }

        // ... (remaining code in generateMonthlyReport function) ...

        window.showToast({ message: `Reporte para ${formattedMonthName} ${year} generado.`, type: 'success' });

    } catch (error) {
        window.showToast({ message: `Error al generar el reporte mensual: ${error.message}`, type: 'error' });
        statsVentasValue.textContent = '$0.00';
        statsTransferenciaValue.textContent = '$0.00';
        statsGananciasValue.textContent = '$0.00';
        if (monthlyReportChartInstance) {
            monthlyReportChartInstance.destroy();
            monthlyReportChartInstance = null;
        }

    } finally {
        generateReportFromMonthlyModalBtn.disabled = false;
        generateReportFromMonthlyModalBtn.innerHTML = originalButtonContent;
    }
}


        document.addEventListener('DOMContentLoaded', () => {
             if (reporteCajero) reporteCajero.textContent = activeUser.nombre;
             if (corteReporte) corteReporte.classList.add('hidden');
             if (cerrarTurnoBtn) cerrarTurnoBtn.classList.add('hidden');

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
        });