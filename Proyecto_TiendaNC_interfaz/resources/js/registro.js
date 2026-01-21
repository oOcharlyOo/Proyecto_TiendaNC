document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registro-form');

    registroForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const apellido_p = document.getElementById('apellido_p').value;
        const apellido_m = document.getElementById('apellido_m').value;
        const password = document.getElementById('password').value;

        const data = {
            nombre: nombre,
            apellido_p: apellido_p,
            apellido_m: apellido_m,
            password_hash: password,
            id_tipo_usuario: 1 
        };

        try {
            const response = await fetch('http://localhost:8080/usuarios/agregarUsuario', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                alert('Usuario registrado con éxito. ID: ' + result.id_usuario);
                window.location.href = 'Login.html';
            } else {
                const errorData = await response.json();
                alert('Error al registrar el usuario: ' + (errorData.message || response.statusText));
            }
        } catch (error) {
            console.error('Error en el fetch:', error);
            alert('No se pudo conectar con el servidor. Por favor, inténtelo más tarde.');
        }
    });
});
