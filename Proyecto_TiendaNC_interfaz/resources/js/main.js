// Auth Check: This IIFE runs immediately to protect the page.
(function() {
    const onLoginPage = window.location.pathname.endsWith('Login.html') || window.location.pathname.endsWith('registro.html');
    const activeUser = sessionStorage.getItem('activeUser');

    // If there is no active user and we are not on the login or registration page, redirect.
    if (!activeUser && !onLoginPage) {
        window.location.href = 'Login.html';
    }
})();

// Global Toast Notification Function
window.showToast = ({ message = '', type = 'info', duration = 3000 }) => {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toastContainer.prepend(toast); // Add to the top of the stack

    setTimeout(() => {
        toast.classList.add('show'); // Trigger show animation
    }, 10); // Small delay to allow CSS transition

    setTimeout(() => {
        toast.classList.remove('show'); // Trigger hide animation
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
};

// Global function to get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        fetch('nav.html')
            .then(response => {
                return response.text();
            })
            .then(data => {
                navbarPlaceholder.insertAdjacentHTML('beforeend', data);

                // Lógica para activar el botón correcto
                const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
                const navIdMap = {
                    'interfaz': 'interfaz',
                    'productos': 'productos',
                    'inventario': 'inventario',
                    'corte': 'corte'
                };
                const activeNavId = navIdMap[currentPage];

                if (activeNavId) {
                    const activeLink = document.querySelector(`[data-nav-id="${activeNavId}"]`);
                    if (activeLink) {
                        activeLink.classList.remove('inactive-header-btn');
                        activeLink.classList.add('active-header-btn');
                    }
                }

                // --- MOBILE MENU LOGIC ---
                const mobileMenuButton = document.getElementById('mobile-menu-button');
                const mainNavigation = document.getElementById('main-navigation');
                const mobileMenuIcon = document.getElementById('mobile-menu-icon');

                if (mobileMenuButton && mainNavigation) {
                    mobileMenuButton.addEventListener('click', () => {
                        mainNavigation.classList.toggle('hidden');
                        mainNavigation.classList.toggle('flex');
                        mainNavigation.classList.toggle('flex-col');
                        
                        if (mobileMenuIcon) {
                            mobileMenuIcon.classList.toggle('rotate-180');
                        }
                    });
                    
                    mainNavigation.querySelectorAll('a').forEach(link => {
                        link.addEventListener('click', () => {
                            if (window.innerWidth < 640) { // Only for mobile view
                                mainNavigation.classList.add('hidden');
                                mainNavigation.classList.remove('flex', 'flex-col');
                                if (mobileMenuIcon) {
                                    mobileMenuIcon.classList.remove('rotate-180');
                                }
                            }
                        });
                    });
                }

                // --- LOGOUT FUNCTIONALITY ---
                function handleLogout() {
                    sessionStorage.clear();
                    window.showToast({ message: "Guardando partida y saliendo...", type: "info" });
                    // Delay redirect to allow toast to be seen
                    setTimeout(() => {
                        window.location.href = 'Login.html';
                    }, 500); // 0.5 second delay
                }

                const exitButton = document.getElementById('exit-btn');
                if (exitButton) {
                    exitButton.addEventListener('click', handleLogout);
                }

                const mobileExitButton = document.getElementById('mobile-exit-btn');
                if (mobileExitButton) {
                    mobileExitButton.addEventListener('click', handleLogout);
                }
            })
            .catch(error => {
                console.error('Error al cargar la barra de navegación:', error);
                navbarPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error al cargar el menú</p>';
            });
    }
});