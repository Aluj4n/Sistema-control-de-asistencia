// Cargar datos del administrador al iniciar
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosAdministrador();
});

function cargarDatosAdministrador() {
    // Obtener nombre del administrador desde localStorage
    const adminName = localStorage.getItem('adminName') || 'Administrador';
    document.getElementById('adminName').textContent = adminName;
}

// Redirigir al formulario de registro de empleados
function irARegistrarEmpleado() {
    alert('Redirigiendo a registro de empleados...');
    // window.location.href = 'admin-register.html'; // Para Formulario 6
}

// Redirigir al panel de administración
function irAPanelAdministracion() {
    window.location.href = 'panelAdmin/admin-panel.html';
}

// Redirigir a solicitudes pendientes (Formulario 9)
function irAVerSolicitudes() {
    alert('Redirigiendo a solicitudes pendientes...');
    window.location.href = 'panel-solicitudes.html'; // Cambiado a la ruta correcta
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        // Limpiar datos de sesión si es necesario
        localStorage.removeItem('adminName');
        // Redirigir al formulario principal
        window.location.href = '../index.html';
    }
}
