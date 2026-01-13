// Auth Check: This IIFE runs immediately to protect the page.
(function() {
    const onLoginPage = window.location.pathname.endsWith('Login.html');
    const activeUser = sessionStorage.getItem('activeUser');

    // If there is no active user and we are not on the login page, redirect.
    if (!activeUser && !onLoginPage) {
        window.location.href = 'Login.html';
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        fetch('nav.html')
            .then(response => {
                return response.text();
            })
            .then(data => {
                navbarPlaceholder.innerHTML = data;

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

                // --- NEW MOBILE MENU LOGIC ---
                const mobileMenuButton = document.getElementById('mobile-menu-button');
                const mainNavigation = document.getElementById('main-navigation');

                if (mobileMenuButton && mainNavigation) {
                    mobileMenuButton.addEventListener('click', () => {
                        mainNavigation.classList.toggle('hidden');
                        mainNavigation.classList.toggle('flex');
                        mainNavigation.classList.toggle('flex-col');
                    });
                    
                    // Close menu on link click (optional, but good UX)
                    mainNavigation.querySelectorAll('a').forEach(link => {
                        link.addEventListener('click', () => {
                            if (window.innerWidth < 640) { // Only for mobile view
                                mainNavigation.classList.add('hidden');
                                mainNavigation.classList.remove('flex', 'flex-col');
                            }
                        });
                    });
                }

                // Add event listener for the exit button
                const exitButton = document.getElementById('exit-btn');
                if (exitButton) {
                    exitButton.addEventListener('click', () => {
                        // Correctly clear session storage
                        sessionStorage.clear();
                        // Redirect to the login page
                        window.location.href = 'Login.html';
                    });
                }
            })
            .catch(error => {
                console.error('Error al cargar la barra de navegación:', error);
                navbarPlaceholder.innerHTML = '<p class="text-red-500 text-center">Error al cargar el menú</p>';
            });
    }
});