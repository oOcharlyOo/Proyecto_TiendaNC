// --- CONFIGURACIÓN DE ENDPOINT ---
        const API_BASE_URL = 'http://localhost:8080';
        const LOGIN_URL = `${API_BASE_URL}/usuarios/login`;
        const SHIFT_START_URL = 'http://localhost:8080/caja/apertura'; // Endpoint para apertura de caja
        const CHECK_ACTIVE_SHIFT_URL = 'http://localhost:8080/caja/apertura/activa'; // Nuevo Endpoint para verificar caja activa

        // --- REFERENCIAS DEL DOM ---
        const form = document.getElementById('loginForm');
        const nombreInput = document.getElementById('nombre');
        const passwordInput = document.getElementById('password');
        const statusMessage = document.getElementById('statusMessage');
        const loginButton = document.getElementById('loginButton');

        // Referencias del DOM para el Modal de Monto Inicial
        const initialCashModal = document.getElementById('initialCashModal');
        const initialCashInput = document.getElementById('initialCashInput');
        const saveInitialCashBtn = document.getElementById('saveInitialCashBtn');

        // --- FUNCIONES DE UTILIDAD ---
        function setLoginButtonState(enabled, text) {
            loginButton.disabled = !enabled;
            loginButton.textContent = text;
            loginButton.classList.toggle('opacity-75', !enabled);
            loginButton.classList.toggle('cursor-not-allowed', !enabled);
        }

        function setShiftButtonState(enabled, text) {
            saveInitialCashBtn.disabled = !enabled;
            saveInitialCashBtn.textContent = text;
            saveInitialCashBtn.classList.toggle('opacity-75', !enabled);
        }
        
        // --- LÓGICA PARA VERIFICAR CAJA ACTIVA Y REDIRIGIR ---
        async function checkAndRedirectIfShiftActive(idUsuario) {
            try {
                const response = await fetch(`${CHECK_ACTIVE_SHIFT_URL}?idUsuario=${idUsuario}`);
                const result = await response.json();

                if (response.ok && result.datos !== null) { // Caja activa encontrada
                    localStorage.setItem('montoInicialCaja', result.datos.monto); // Guardar monto inicial para persistencia
                    sessionStorage.setItem('activeUserShift', JSON.stringify({
                        shiftAmount: result.datos.monto.toFixed(2),
                        shiftId: result.datos.idCaja
                    }));
                    window.location.href = 'interfaz.html'; // Redirigir directamente a ventas
                } else { // No hay caja activa, mostrar modal de apertura
                    document.querySelector('.login-card').classList.add('hidden');
                    initialCashModal.classList.remove('hidden');
                    initialCashInput.focus();
                }
            } catch (error) {
                console.error("Error al verificar el estado de la caja activa:", error);
                window.showToast({ message: 'Error de conexión al verificar el estado de la caja.', type: 'error' });
                setLoginButtonState(true, 'ACCEDER'); // Permitir reintentar login
            }
        }

        // --- LÓGICA DE INICIO DE SESIÓN ---
        async function handleLogin(event) {
            event.preventDefault();
            statusMessage.classList.add('hidden');

            const nombre = nombreInput.value.trim();
            const password_hash = passwordInput.value.trim();

            if (!nombre || !password_hash) {
                window.showToast({ message: 'Por favor, ingresa tu nombre de usuario y contraseña.', type: 'error' });
                return;
            }

            setLoginButtonState(false, 'Verificando...');

            const payload = { nombre, password_hash };

            try {
                const response = await fetch(LOGIN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok && result.codigo === 200) {
                    window.showToast({ message: result.mensaje || 'Login exitoso.', type: 'success' });
                    sessionStorage.setItem('activeUser', JSON.stringify(result.datos));
                    // Lógica para verificar caja activa
                    await checkAndRedirectIfShiftActive(result.datos.idUsuario);
                } else {
                    window.showToast({ message: result.mensaje || 'Error de autenticación.', type: 'error' });
                    setLoginButtonState(true, 'ACCEDER');
                }
            } catch (error) {
                console.error("Error en la llamada al API de login:", error);
                window.showToast({ message: 'Error de Conexión: No se pudo conectar con el servidor.', type: 'error' });
                setLoginButtonState(true, 'ACCEDER');
            }
        }

        // --- LÓGICA DEL MODAL DE MONTO INICIAL DE CAJA ---
        async function startShift() {
            const initialAmount = parseFloat(initialCashInput.value);
            const activeUser = JSON.parse(sessionStorage.getItem('activeUser'));

            if (!activeUser?.idUsuario) {
                window.showToast({ message: 'Error: No se encontró un usuario activo. Por favor, inicie sesión de nuevo.', type: 'error' });
                // Consider adding a redirect here if not already handled by nav.js on page load
                // window.location.reload(); // This might cause a loop if nav.js also redirects
                setShiftButtonState(true, 'Continuar a Ventas');
                return;
            }

            if (isNaN(initialAmount) || initialAmount < 0) {
                window.showToast({ message: 'Por favor, ingresa un monto inicial válido y positivo.', type: 'error' });
                initialCashInput.focus();
                setShiftButtonState(true, 'Continuar a Ventas'); // Re-enable button
                return;
            }
            
            setShiftButtonState(false, 'Procesando...');

            const payload = {
                idUsuario: activeUser.idUsuario,
                montoInicial: initialAmount
            };

            try {
                const response = await fetch(SHIFT_START_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) { // response.ok es para estados 2xx
                    localStorage.setItem('montoInicialCaja', initialAmount); // Guardar para persistencia
                    sessionStorage.setItem('initialCashAmount', initialAmount); // Add this line
                    sessionStorage.setItem('activeUserShift', JSON.stringify({
                        shiftAmount: initialAmount.toFixed(2),
                        shiftId: (await response.json()).datos.idCaja // Assuming the response for opening shift contains idCaja
                    }));
                    setShiftButtonState(false, 'Redirigiendo...'); // Informar al usuario
                    setTimeout(() => {
                        window.location.href = 'interfaz.html';
                    }, 1500); // 1.5 segundos de retraso para asegurar que el backend procese la apertura
                } else {
                    const errorResult = await response.json().catch(() => ({ mensaje: 'Respuesta no válida del servidor.'}));
                    window.showToast({ message: `Error al iniciar turno: ${errorResult.mensaje || 'Ocurrió un error.'}`, type: 'error' });
                    setShiftButtonState(true, 'Continuar a Ventas');
                }
            } catch (error) {
                console.error("Error en la llamada al API de inicio de turno:", error);
                window.showToast({ message: 'Error de Conexión: No se pudo registrar el inicio de turno.', type: 'error' });
                setShiftButtonState(true, 'Continuar a Ventas');
            }
        }
        
        // --- EVENT LISTENERS ---
        saveInitialCashBtn.addEventListener('click', startShift);
        form.addEventListener('submit', handleLogin);
        
        initialCashInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                startShift();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !initialCashModal.classList.contains('hidden')) {
                // Opcional: Para permitir cerrar el modal con Escape, descomenta las siguientes líneas.
                // initialCashModal.classList.add('hidden');
                // document.querySelector('.login-card').classList.remove('hidden');
                // setLoginButtonState(true, 'ACCEDER');
            }
        });