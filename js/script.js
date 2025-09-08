function seleccionarEmpresa(empresa) {
    // Guardar la empresa seleccionada en el almacenamiento local
    localStorage.setItem('empresaSeleccionada', empresa);
    
    // Redirigir al formulario de login de empleados
    window.location.href = 'pages/empleado-login.html';
}

function irAdministrador() {
    // Redirigir al formulario de login de administrador
    window.location.href = 'pages/admin-login.html';
}