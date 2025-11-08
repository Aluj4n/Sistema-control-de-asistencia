// js/admin-login.js
class AdminLogin {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('adminLoginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Enter key support
        document.getElementById('adminContraseña').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAdminLogin();
            }
        });
    }

    checkExistingSession() {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) {
            // Si ya hay sesión, redirigir al panel
            window.location.href = 'admin-panel.html';
        }
    }

    async handleAdminLogin() {
        const usuario = document.getElementById('adminUsuario').value.trim();
        const contraseña = document.getElementById('adminContraseña').value;

        if (!usuario || !contraseña) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch('/api/auth/admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario: usuario,
                    contraseña: contraseña
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Acceso concedido! Redirigiendo al panel...');
                
                // Guardar sesión de administrador
                localStorage.setItem('adminLogueado', JSON.stringify(data.admin));
                localStorage.setItem('adminToken', 'admin-' + Date.now());
                
                // Redirigir al panel admin
                setTimeout(() => {
                    window.location.href = 'admin-panel.html';
                }, 1500);
            } else {
                this.showError(data.message || 'Credenciales incorrectas');
            }

        } catch (error) {
            console.error('Error en login admin:', error);
            this.showError('Error de conexión con el servidor');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        const btnLogin = document.getElementById('btnAdminLogin');
        const btnText = btnLogin.querySelector('span');
        const loadingEl = document.getElementById('adminLoading');

        if (loading) {
            btnText.classList.add('hidden');
            loadingEl.classList.remove('hidden');
            btnLogin.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            loadingEl.classList.add('hidden');
            btnLogin.disabled = false;
        }
    }

    showError(message) {
        this.showMessage('adminErrorMessage', message);
    }

    showSuccess(message) {
        this.showMessage('adminSuccessMessage', message);
    }

    showMessage(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.classList.remove('hidden');
        
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }
}

// Función global para volver al inicio
function volverInicio() {
    window.location.href = '../index.html';
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new AdminLogin();
});