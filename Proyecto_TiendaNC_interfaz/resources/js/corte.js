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
            generateDailyReportBtn = document.getElementById('generateDailyReportBtn');
            cerrarTurnoBtn = document.getElementById('cerrarTurnoBtn');
            corteReporte = document.getElementById('corteReporte');

            dailyReportModal = document.getElementById('dailyReportModal');
            generateReportFromModalBtn = document.getElementById('generateReportFromModalBtn');
            cancelModalBtn = document.getElementById('cancelModalBtn');
            reportDateInput = document.getElementById('reportDate');

            reportTitle = document.getElementById('reportTitle');
            chartTitle = document.getElementById('chartTitle');
            reporteFechaCorte = document.getElementById('reporteFechaCorte');
            reporteCajero = document.getElementById('reporteCajero');
            reporteMontoInicial = document.getElementById('reporteMontoInicial');
            reporteVentasEfectivo = document.getElementById('reporteVentasEfectivo');
            reporteTotalVentas = document.getElementById('reporteTotalVentas');
            reporteOtrosIngresos = document.getElementById('reporteOtrosIngresos');
            reporteTotalEgresos = document.getElementById('reporteTotalEgresos');
            reporteOtrasEntradas = document.getElementById('reporteOtrasEntradas');
            reporteSaldoFinalCalculado = document.getElementById('reporteSaldoFinalCalculado');
            reporteGananciaTotal = document.getElementById('reporteGananciaTotal');

            generateMonthlyReportBtn = document.getElementById('generateMonthlyReportBtn');
            monthlyReportModal = document.getElementById('monthlyReportModal');
            reportMonthInput = document.getElementById('reportMonth');
            generateReportFromMonthlyModalBtn = document.getElementById('generateReportFromMonthlyModalBtn');
            cancelMonthlyModalBtn = document.getElementById('cancelMonthlyModalBtn');

            monthlyReportSelectedMonth = document.getElementById('monthlyReport-selectedMonth')?.querySelector('span');
            statsVentasValue = document.getElementById('monthlyReport-stats-ventas-value');
            statsVentasChange = document.getElementById('monthlyReport-stats-ventas-change');
            statsTransferenciaValue = document.getElementById('monthlyReport-stats-transferencia-value');
            statsTransferenciaChange = document.getElementById('monthlyReport-stats-transferencia-change');
            statsGananciasValue = document.getElementById('monthlyReport-stats-ganancias-value');
            statsGananciasChange = document.getElementById('monthlyReport-stats-ganancias-change');
            monthlyReportChartContainer = document.getElementById('monthly-report-chart-container');
            monthlyReportFooterTip = document.getElementById('monthlyReport-footer-tip');
            monthlyReportFooterTipText = document.getElementById('monthlyReport-footer-tip-text');

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