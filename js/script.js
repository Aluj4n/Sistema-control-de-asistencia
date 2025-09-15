function seleccionarEmpresa(empresa) {

    const button = document.querySelector(`[data-empresa="${empresa}"]`);
    button.classList.add('clicked');
    
    setTimeout(() => {
        button.classList.remove('clicked');
        
        if (empresa === 'nanas') {
            window.location.href = 'pages/empleado-nanaslogin.html';
        } else if (empresa === 'silsan') {
            window.location.href = 'pages/empleado-silsan.html';
        }
    }, 300);
}

function irAdministrador() {

    window.location.href = 'pages/admin-login.html';

}