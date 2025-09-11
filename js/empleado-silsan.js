function regresarInicio() {
    window.location.href = '../index.html';
}

function contactarAdmin() {

    alert('Para registrarse como nuevo empleado, contacte al Administrador del sistema.');
}

function validarLogin(event) {
    event.preventDefault();
    
    const numeroId = document.getElementById('numeroId').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    

    if (!numeroId || !password) {
        alert('Por favor complete todos los campos');
        return;
    }
    
    loginBtn.textContent = 'Validando...';
    loginBtn.disabled = true;
    

    setTimeout(() => {

        
        if (numeroId === '12345' && password === 'silsan123') {
            alert('¡Login exitoso! Bienvenido empleado de Silsan');
            
        } else {
            alert('Número ID o contraseña incorrectos');
            
 
            loginBtn.textContent = 'Ingresar';
            loginBtn.disabled = false;
            
 
            document.getElementById('numeroId').value = '';
            document.getElementById('password').value = '';
            document.getElementById('numeroId').focus();
        }
    }, 1500);
}

document.addEventListener('DOMContentLoaded', function() {

    document.getElementById('empleadoForm').addEventListener('submit', validarLogin);
    
 
    document.getElementById('numeroId').focus();
    
    document.getElementById('numeroId').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('password').focus();
        }
    });
});