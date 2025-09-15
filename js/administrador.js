
function irAtras() {

    window.location.href = '../index.html';
}

function validarLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    const container = document.querySelector('.container');
    

    usernameError.style.display = 'none';
    passwordError.style.display = 'none';
    container.classList.remove('error-shake');
    
    let hasErrors = false;
    

    if (!username) {
        usernameError.style.display = 'block';
        hasErrors = true;
    }
    
    if (!password) {
        passwordError.style.display = 'block';
        hasErrors = true;
    }
    
    if (hasErrors) {
        container.classList.add('error-shake');
        return;
    }
    

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.textContent = 'Validando...';
    loginBtn.disabled = true;
    
    setTimeout(() => {
 
        if (username === 'admin' && password === 'admin123') {

            localStorage.setItem('adminName', username);
            window.location.href = 'admin-welcome.html';
            alert('Login exitoso! Redirigiendo al panel de administración...');
 
        } else {
            alert('Usuario o contraseña incorrectos');
            loginBtn.textContent = 'Entrar';
            loginBtn.disabled = false;
        }
    }, 1000);
}

document.getElementById('adminForm').addEventListener('submit', validarLogin);

document.getElementById('username').addEventListener('input', function() {
    document.getElementById('usernameError').style.display = 'none';
});

document.getElementById('password').addEventListener('input', function() {
    document.getElementById('passwordError').style.display = 'none';
});