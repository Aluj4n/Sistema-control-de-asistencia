// Cargar datos del administrador al iniciar
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosAdministrador();
});

function cargarDatosAdministrador() {
    // Obtener nombre del administrador (puedes cambiar esto según tu sistema)
    const adminName = localStorage.getItem('adminName') || 'Administrador';
    document.getElementById('adminName').textContent = adminName;
    
    // Configurar logo del sistema (usa una imagen existente)
    const systemLogo = document.getElementById('systemLogo');
    systemLogo.src = '../images/logo-nanas.png'; // Puedes cambiar esto
}

function irARegistrarEmpleado() {
    // Redirigir al formulario de registro de empleados
    alert('Redirigiendo a registro de empleados...');
    // window.location.href = 'admin-register-employee.html'; // Descomenta cuando crees el Formulario 6
}

function irAPanelAdministracion() {
    // Redirigir al panel de administración
    alert('Redirigiendo al panel de administración...');
    // window.location.href = 'admin-panel.html'; // Descomenta cuando crees el Formulario 7
}

function cerrarSesion() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        // Limpiar datos de sesión si es necesario
        localStorage.removeItem('adminName');
        // Redirigir al formulario principal
        window.location.href = '../index.html';
    }
}