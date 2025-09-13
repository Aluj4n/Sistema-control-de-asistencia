// Cargar datos del administrador al iniciar
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosAdministrador();
});

function cargarDatosAdministrador() {
    // Obtener nombre del administrador
    const adminName = localStorage.getItem('adminName') || 'Administrador';
    document.getElementById('adminName').textContent = adminName;
}

function irARegistrarEmpleado() {
    window.location.href = 'panelAdmin/registrar-nuevoemp.html'; // Para Formulario 6
}

function irAPanelAdministracion() {
    // Redirigir al panel de administración
    alert('Redirigiendo al panel de administración...');
    // window.location.href = 'admin-panel.html'; // Para Formulario 7
}

// FUNCIÓN NUEVA AGREGADA
function irAVerSolicitudes() {
    // Redirigir al panel de solicitudes
    alert('Redirigiendo a solicitudes pendientes...');
    window.location.href = 'admin-solicitudes.html'; // Para Formulario 9
}

function cerrarSesion() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        // Limpiar datos de sesión si es necesario
        localStorage.removeItem('adminName');
        // Redirigir al formulario principal
        window.location.href = '../index.html';
    }
}