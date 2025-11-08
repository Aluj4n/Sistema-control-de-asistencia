// js/script.js
function seleccionarEmpresa(empresa) {
    console.log('Empresa seleccionada:', empresa);
    
    // Guardar la empresa seleccionada en localStorage
    let empresaData = {};
    
    switch(empresa) {
        case 'nanas':
            empresaData = { id: 1, nombre: 'Nanas y Amas' };
            break;
        case 'silsan':
            empresaData = { id: 2, nombre: 'Droguería Silsan' };
            break;
        case 'valverde':
            empresaData = { id: 3, nombre: 'Valverde' };
            break;
    }
    
    localStorage.setItem('empresaSeleccionada', JSON.stringify(empresaData));
    
    // Redirigir al login de empleados
    window.location.href = 'pages/empleado-login.html';
}

function irAdministrador() {
    console.log('Acceso administrador');
    window.location.href = 'pages/admin-login.html';
}

// Efectos visuales adicionales
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.empresa-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 200);
    });
});