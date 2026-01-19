// --- CONFIGURACIÓN Y UTILIDADES ---
        const API_BASE_URL = 'http://192.168.0.248:8080';
        
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

        async function fetchApi(endpoint, method = 'GET', data = null) {
            let url = `${API_BASE_URL}${endpoint}`;
            const options = { method, headers: { 'Content-Type': 'application/json' } };
            if (data) options.body = JSON.stringify(data);
            console.log(`[API Call] ${method} ${url}`, data);
            try {
                const response = await fetch(url, options);
                let responseText = null;
                if (response.status !== 204) {
                    responseText = await response.text();
                }
                let responseData;
                const contentType = response.headers.get("content-type");
                if (responseText !== null && contentType && contentType.includes("application/json")) {
                    try { responseData = JSON.parse(responseText); } catch (e) {
                        responseData = responseText;
                        console.warn(`API response claimed JSON but failed to parse for ${url}:`, e);
                    }
                } else {
                    responseData = responseText;
                }
                if (!response.ok) {
                    const errorDetail = (responseData && (responseData.mensaje || responseData.error || responseData.message))
                                        ? (typeof responseData === 'object' ? JSON.stringify(responseData) : responseData)
                                        : `Error HTTP: ${response.status} ${response.statusText}`;
                    throw new Error(`API Error: ${errorDetail}`);
                }
                return (typeof responseData === 'object' && responseData !== null && responseData.hasOwnProperty('datos') && responseData.datos !== null) ? responseData.datos : responseData;
            } catch (error) {
                console.error("Error en la llamada a la API:", error);
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
                const ventasEfectivo = reportData.ventas.filter(v => v.metodoPago === 'EFECTIVO').reduce((sum, v) => sum + v.montoTotal, 0);
                const ventasTransferencia = reportData.ventas.filter(v => v.metodoPago === 'TRANSFERENCIA').reduce((sum, v) => sum + v.montoTotal, 0);
                
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
                const ventasEfectivo = data.ventas.filter(v => v.metodoPago === 'EFECTIVO').reduce((sum, v) => sum + v.montoTotal, 0);
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
            reporteCajero.textContent = 'N/A';
            corteReporte.classList.remove('hidden');
            cerrarTurnoBtn.classList.add('hidden');
            generateDailyReportBtn.classList.remove('hidden');
        }
        
        async function generateCorteReport() {
            const initialCashAmount = parseFloat(sessionStorage.getItem('initialCashAmount'));
            if (isNaN(initialCashAmount) || initialCashAmount < 0) {
                window.showToast({ message: 'Monto inicial de caja no encontrado o inválido. Por favor, inicia sesión nuevamente.', type: 'error' });
                return;
            }
            generateCorteBtn.disabled = true;
            generateCorteBtn.textContent = 'Calculando...';
            generateDailyReportBtn.classList.add('hidden');
            cerrarTurnoBtn.classList.add('hidden');
            corteReporte.classList.add('hidden');

            try {
                const corteResponse = await fetchApi(`/caja/corte?idUsuario=${ID_USUARIO}&montoInicial=${initialCashAmount}`, 'POST');
                
                let salesToday = [];
                try {
                    const allSalesResponse = await fetchApi('/ventas/obetenerVentas');
                    const allSales = Array.isArray(allSalesResponse) ? allSalesResponse : (allSalesResponse.datos || []);
                    
                    const corteDate = new Date(corteResponse.fechaCorte + 'Z'); 
                    
                    salesToday = allSales.filter(sale => {
                        if (!sale.fechaVenta) return false;
                        const saleDate = new Date(sale.fechaVenta + 'Z'); 
                        return saleDate.getUTCFullYear() === corteDate.getUTCFullYear() &&
                               saleDate.getUTCMonth() === corteDate.getUTCMonth() &&
                               saleDate.getUTCDate() === corteDate.getUTCDate() &&
                               sale.estatus === 'C';
                    });
                } catch (salesError) {
                    console.error("Error al obtener el total de tickets del día:", salesError);
                }

                // Calcular ventas por método de pago para el desglose
                const ventasTransferencia = salesToday.filter(v => v.metodoPago === 'TRANSFERENCIA').reduce((sum, v) => sum + v.montoTotal, 0);
                const ventasEfectivo = salesToday.filter(v => v.metodoPago === 'EFECTIVO').reduce((sum, v) => sum + v.montoTotal, 0);

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
            dailyReportModal.classList.remove('hidden');
        }

        function closeDailyReportModal() {
            dailyReportModal.classList.add('hidden');
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

        generateCorteBtn.addEventListener('click', generateCorteReport);
        generateDailyReportBtn.addEventListener('click', openDailyReportModal);
        cerrarTurnoBtn.addEventListener('click', cerrarTurno);
        
        // Listeners para la modal
        cancelModalBtn.addEventListener('click', closeDailyReportModal);
        generateReportFromModalBtn.addEventListener('click', generateDailyReportFromModal);
        
        document.addEventListener('DOMContentLoaded', () => {
             reporteCajero.textContent = activeUser.nombre;
             corteReporte.classList.add('hidden');
             generateDailyReportBtn.classList.add('hidden');
             cerrarTurnoBtn.classList.add('hidden');
        });