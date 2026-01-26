// --- CONFIGURACIÓN Y UTILIDADES ---
        const API_BASE_URL = '__API_BASE_URL__';
        
        const activeUser = JSON.parse(sessionStorage.getItem('activeUser')) || { idUsuario: 1, nombre: 'Usuario Desconocido' };
        const ID_USUARIO = activeUser.idUsuario;
        let currentCorteDTO = null;

        let generateCorteBtn;
        let generateDailyReportBtn;
        let cerrarTurnoBtn;
        let corteReporte;
        let dailyReportModal;
        let generateReportFromModalBtn;
        let cancelModalBtn;
        let reportDateInput;
        let reportTitle;
        let chartTitle;
        let reporteFechaCorte;
        let reporteCajero;
        let reporteMontoInicial;
        let reporteVentasEfectivo;
        let reporteTotalVentas;
        let reporteOtrosIngresos;
        let reporteTotalEgresos;
        let reporteOtrasEntradas;
        let reporteSaldoFinalCalculado;
        let reporteGananciaTotal;
        let generateMonthlyReportBtn;
        let monthlyReportModal;
        let reportMonthInput;
        let generateReportFromMonthlyModalBtn;
        let cancelMonthlyModalBtn;
        let monthlyReportSelectedMonth;
        let statsVentasValue;
        let statsVentasChange;
        let statsTransferenciaValue;
        let statsTransferenciaChange;
        let statsGananciasValue;
        let statsGananciasChange;
        let monthlyReportChartContainer;
        let monthlyReportFooterTip;
        let monthlyReportFooterTipText;

        const formatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
        function formatCurrency(amount) { return formatter.format(amount || 0); }
        
        let cashFlowChartInstance = null; // Mantener global
        let monthlyReportChartInstance = null; // Mantener global

        document.addEventListener('DOMContentLoaded', () => {
            generateCorteBtn = document.getElementById('generateCorteBtn');
            console.log('DEBUG: generateCorteBtn:', generateCorteBtn);
            generateDailyReportBtn = document.getElementById('generateDailyReportBtn');
            console.log('DEBUG: generateDailyReportBtn:', generateDailyReportBtn);
            cerrarTurnoBtn = document.getElementById('cerrarTurnoBtn');
            console.log('DEBUG: cerrarTurnoBtn:', cerrarTurnoBtn);
            corteReporte = document.getElementById('corteReporte');
            console.log('DEBUG: corteReporte:', corteReporte);

            dailyReportModal = document.getElementById('dailyReportModal');
            console.log('DEBUG: dailyReportModal:', dailyReportModal);
            generateReportFromModalBtn = document.getElementById('generateReportFromModalBtn');
            console.log('DEBUG: generateReportFromModalBtn:', generateReportFromModalBtn);
            cancelModalBtn = document.getElementById('cancelModalBtn');
            console.log('DEBUG: cancelModalBtn:', cancelModalBtn);
            reportDateInput = document.getElementById('reportDate');
            console.log('DEBUG: reportDateInput:', reportDateInput);

            reportTitle = document.getElementById('reportTitle');
            console.log('DEBUG: reportTitle:', reportTitle);
            chartTitle = document.getElementById('chartTitle');
            console.log('DEBUG: chartTitle:', chartTitle);
            reporteFechaCorte = document.getElementById('reporteFechaCorte');
            console.log('DEBUG: reporteFechaCorte:', reporteFechaCorte);
            reporteCajero = document.getElementById('reporteCajero');
            console.log('DEBUG: reporteCajero:', reporteCajero);
            reporteMontoInicial = document.getElementById('reporteMontoInicial');
            console.log('DEBUG: reporteMontoInicial:', reporteMontoInicial);
            reporteVentasEfectivo = document.getElementById('reporteVentasEfectivo');
            console.log('DEBUG: reporteVentasEfectivo:', reporteVentasEfectivo);
            reporteTotalVentas = document.getElementById('reporteTotalVentas');
            console.log('DEBUG: reporteTotalVentas:', reporteTotalVentas);
            reporteOtrosIngresos = document.getElementById('reporteOtrosIngresos');
            console.log('DEBUG: reporteOtrosIngresos:', reporteOtrosIngresos);
            reporteTotalEgresos = document.getElementById('reporteTotalEgresos');
            console.log('DEBUG: reporteTotalEgresos:', reporteTotalEgresos);
            reporteOtrasEntradas = document.getElementById('reporteOtrasEntradas');
            console.log('DEBUG: reporteOtrasEntradas:', reporteOtrasEntradas);
            reporteSaldoFinalCalculado = document.getElementById('reporteSaldoFinalCalculado');
            console.log('DEBUG: reporteSaldoFinalCalculado:', reporteSaldoFinalCalculado);
            reporteGananciaTotal = document.getElementById('reporteGananciaTotal');
            console.log('DEBUG: reporteGananciaTotal:', reporteGananciaTotal);

            generateMonthlyReportBtn = document.getElementById('generateMonthlyReportBtn');
            console.log('DEBUG: generateMonthlyReportBtn:', generateMonthlyReportBtn);
            monthlyReportModal = document.getElementById('monthlyReportModal');
            console.log('DEBUG: monthlyReportModal:', monthlyReportModal);
            reportMonthInput = document.getElementById('reportMonth');
            console.log('DEBUG: reportMonthInput:', reportMonthInput);
            modalGenerateMonthlyReportBtn = document.getElementById('modalGenerateMonthlyReportBtn');
            console.log('DEBUG: modalGenerateMonthlyReportBtn:', modalGenerateMonthlyReportBtn);
            cancelMonthlyModalBtn = document.getElementById('cancelMonthlyModalBtn');
            console.log('DEBUG: cancelMonthlyModalBtn:', cancelMonthlyModalBtn);

            const tempMonthlyReportSelectedMonth = document.getElementById('monthlyReport-selectedMonth');
            monthlyReportSelectedMonth = tempMonthlyReportSelectedMonth ? tempMonthlyReportSelectedMonth.querySelector('span') : null;
            console.log('DEBUG: monthlyReportSelectedMonth:', monthlyReportSelectedMonth);

            statsVentasValue = document.getElementById('monthlyReport-stats-ventas-value');
            console.log('DEBUG: statsVentasValue:', statsVentasValue);
            statsVentasChange = document.getElementById('monthlyReport-stats-ventas-change');
            console.log('DEBUG: statsVentasChange:', statsVentasChange);
            statsTransferenciaValue = document.getElementById('monthlyReport-stats-transferencia-value');
            console.log('DEBUG: statsTransferenciaValue:', statsTransferenciaValue);
            statsTransferenciaChange = document.getElementById('monthlyReport-stats-transferencia-change');
            console.log('DEBUG: statsTransferenciaChange:', statsTransferenciaChange);
            statsGananciasValue = document.getElementById('monthlyReport-stats-ganancias-value');
            console.log('DEBUG: statsGananciasValue:', statsGananciasValue);
            statsGananciasChange = document.getElementById('monthlyReport-stats-ganancias-change');
            console.log('DEBUG: statsGananciasChange:', statsGananciasChange);
            monthlyReportChartContainer = document.getElementById('monthly-report-chart-container');
            console.log('DEBUG: monthlyReportChartContainer:', monthlyReportChartContainer);
            monthlyReportFooterTip = document.getElementById('monthlyReport-footer-tip');
            console.log('DEBUG: monthlyReportFooterTip:', monthlyReportFooterTip);
            monthlyReportFooterTipText = document.getElementById('monthlyReport-footer-tip-text');
            console.log('DEBUG: monthlyReportFooterTipText:', monthlyReportFooterTipText);

            if (reporteCajero) reporteCajero.textContent = activeUser.nombre;
            if (corteReporte) corteReporte.classList.add('hidden');
            if (generateDailyReportBtn) generateDailyReportBtn.classList.add('hidden');
            if (cerrarTurnoBtn) cerrarTurnoBtn.classList.add('hidden');
            
            if (generateCorteBtn) generateCorteBtn.addEventListener('click', generateCorteReport);
            if (generateDailyReportBtn) generateDailyReportBtn.addEventListener('click', openDailyReportModal);
            if (cerrarTurnoBtn) cerrarTurnoBtn.addEventListener('click', cerrarTurno);
            
            if (generateMonthlyReportBtn) generateMonthlyReportBtn.addEventListener('click', openMonthlyReportModal);
            if (cancelMonthlyModalBtn) cancelMonthlyModalBtn.addEventListener('click', closeMonthlyReportModal);
            if (generateReportFromMonthlyModalBtn) generateReportFromMonthlyModalBtn.addEventListener('click', generateMonthlyReport);
            
            if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeDailyReportModal);
            if (generateReportFromModalBtn) generateReportFromModalBtn.addEventListener('click', generateDailyReportFromModal);
        });