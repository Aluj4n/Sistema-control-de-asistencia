// js/empleado-login.js
class EmpleadoLogin {
    constructor() {
        this.empresa = null;
        this.init();
    }

    init() {
        this.loadEmpresaSeleccionada();
        this.setupEventListeners();
    }

    loadEmpresaSeleccionada() {
        const empresaData = localStorage.getItem('empresaSeleccionada');
        if (empresaData) {
            this.empresa = JSON.parse(empresaData);
            this.updateUI();
        } else {
            this.showError('No se ha seleccionado una empresa. Redirigiendo...');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 2000);
        }
    }

    updateUI() {
        if (this.empresa) {
            document.getElementById('empresaNombre').textContent = 
                `Acceso - ${this.empresa.nombre}`;
            
            // Actualizar logo según la empresa
            this.setEmpresaLogo();
        }
    }

    setEmpresaLogo() {
        const logoImg = document.getElementById('empresaLogo');
        const logos = {
            1: '../images/logo-nanas.png',
            2: '../images/logo-silsan.png', 
            3: '../images/logo-valverde.png'
        };
        
        logoImg.src = logos[this.empresa.id] || '../images/logo-sistema.png';
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    async handleLogin() {
        const usuario = document.getElementById('usuario').value.trim();
        const contraseña = document.getElementById('contraseña').value;

        // Validaciones
        if (!usuario || !contraseña) {
            this.showError('Por favor completa todos los campos');
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch('/api/auth/empleado', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario: usuario,
                    contraseña: contraseña,
                    empresaId: this.empresa.id
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showSuccess('Login exitoso! Redirigiendo...');
                
                // Guardar datos del empleado en localStorage
                localStorage.setItem('empleadoLogueado', JSON.stringify(data.empleado));
                localStorage.setItem('empleadoToken', 'empleado-' + Date.now());
                
                // Redirigir al panel de asistencia
                setTimeout(() => {
                    window.location.href = 'asistencia.html';
                }, 1500);
            } else {
                this.showError(data.message || 'Error en el login');
            }

        } catch (error) {
            console.error('Error en login:', error);
            this.showError('Error de conexión. Intenta nuevamente.');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        const btnLogin = document.getElementById('btnLogin');
        const btnText = btnLogin.querySelector('span');
        const loadingEl = document.getElementById('loading');

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
        this.showMessage('errorMessage', message);
    }

    showSuccess(message) {
        this.showMessage('successMessage', message);
    }

    showMessage(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.classList.remove('hidden');
        
        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }
}

// Función global para volver al inicio
function volverInicio() {
    window.location.href = '../index.html';
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new EmpleadoLogin();
});