document.addEventListener('DOMContentLoaded', function() {

    generarIdAutomatico();
    
    generarPinAutomatico();
    
    document.getElementById('empleadoForm').addEventListener('submit', guardarEmpleado);
    
    document.getElementById('telefono').addEventListener('input', validarTelefono);
    
    document.getElementById('foto').addEventListener('change', previsualizarFoto);
    
    document.querySelectorAll('input[name="empresa"]').forEach(radio => {
        radio.addEventListener('change', generarIdAutomatico);
    });
});

function regresarPanel() {
    if (formularioTieneDatos()) {
        if (confirm('¿Está seguro de que desea regresar? Los cambios no guardados se perderán.')) {
            window.location.href = '../admin.welcome.html';
        }
    } else {
        window.location.href = '../admin.welcome.html';
    }
}

function generarIdAutomatico() {
    const empresaSeleccionada = document.querySelector('input[name="empresa"]:checked');
    let prefijo = 'EMP';
    
    if (empresaSeleccionada) {
        prefijo = empresaSeleccionada.value === 'silsan' ? 'SIL' : 'NAN';
    }
    
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const id = `${prefijo}${timestamp.toString().slice(-6)}${random.toString().padStart(3, '0')}`;
    
    document.getElementById('cedula').value = id;
}

function generarPinAutomatico() {

    const pin = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('pin').value = pin.toString();
}

function togglePassword() {
    const pinInput = document.getElementById('pin');
    const toggleBtn = document.querySelector('.toggle-password');
    
    if (pinInput.type === 'password') {
        pinInput.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        pinInput.type = 'password';
        toggleBtn.textContent = '👁';
    }
}

function validarTelefono() {
    const telefono = document.getElementById('telefono');
    const errorDiv = document.getElementById('telefonoError');
    let valor = telefono.value;
    
    valor = valor.replace(/\D/g, '');
    
    if (valor.length > 9) {
        valor = valor.slice(0, 9);
    }
    
    telefono.value = valor;
    

    if (valor.length === 0) {
        errorDiv.style.display = 'none';
        telefono.style.borderColor = '#b2dfdb';
    } else if (valor[0] !== '9') {
        errorDiv.textContent = 'Inicia con el número 9 por favor';
        errorDiv.style.display = 'block';
        telefono.style.borderColor = '#f44336';
    } else if (valor.length < 9) {
        const faltantes = 9 - valor.length;
        errorDiv.textContent = `Faltan ${faltantes} dígito${faltantes > 1 ? 's' : ''}`;
        errorDiv.style.display = 'block';
        telefono.style.borderColor = '#f44336';
    } else if (valor.length === 9 && valor[0] === '9') {
        errorDiv.style.display = 'none';
        telefono.style.borderColor = '#4caf50';
    }
}

function previsualizarFoto() {
    const fileInput = document.getElementById('foto');
    const preview = document.getElementById('photoPreview');
    const file = fileInput.files[0];
    
    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor seleccione un archivo de imagen válido.');
            fileInput.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es demasiado grande. Por favor seleccione una imagen menor a 5MB.');
            fileInput.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Vista previa">`;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = 'Vista previa de la foto';
    }
}

function cancelarFormulario() {
    if (confirm('¿Está seguro de que desea cancelar? Se perderán todos los datos ingresados.')) {
        document.getElementById('empleadoForm').reset();
        document.getElementById('photoPreview').innerHTML = 'Vista previa de la foto';
        document.getElementById('telefonoError').style.display = 'none';
        
        generarIdAutomatico();
        generarPinAutomatico();
        
        document.getElementById('telefono').style.borderColor = '#b2dfdb';
        
        document.querySelector('input[name="empresa"]').focus();
    }
}

function guardarEmpleado(event) {
    event.preventDefault();
    

    const formData = new FormData(document.getElementById('empleadoForm'));
    const empleado = {
        empresa: formData.get('empresa'),
        cedula: document.getElementById('cedula').value,
        nombre: document.getElementById('nombre').value.trim(),
        telefono: document.getElementById('telefono').value,
        pin: document.getElementById('pin').value,
        foto: document.getElementById('foto').files[0]
    };
    
    if (!validarFormulario(empleado)) {
        return;
    }
    
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'GUARDANDO...';
    saveBtn.disabled = true;
    

    setTimeout(() => {
        alert(`Empleado registrado exitosamente!\n\nID: ${empleado.cedula}\nNombre: ${empleado.nombre}\nEmpresa: ${empleado.empresa.toUpperCase()}\nTeléfono: ${empleado.telefono}\nPIN: ${empleado.pin}`);
        
 
        console.log('Datos del empleado:', empleado);
        

        if (confirm('¿Desea registrar otro empleado?')) {
            cancelarFormulario();
        } else {

            window.location.href = '../admin.welcome.html';
        }
        

        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        
    }, 2000);
}

function validarFormulario(empleado) {

    if (!empleado.empresa) {
        alert('Por favor seleccione una empresa.');
        return false;
    }
    
    if (!empleado.nombre || empleado.nombre.length < 2) {
        alert('Por favor ingrese un nombre completo válido.');
        document.getElementById('nombre').focus();
        return false;
    }
    

    if (!empleado.telefono || empleado.telefono.length !== 9 || empleado.telefono[0] !== '9') {
        alert('Por favor ingrese un teléfono válido que empiece con 9 y tenga 9 dígitos.');
        document.getElementById('telefono').focus();
        return false;
    }
    
    return true;
}

function formularioTieneDatos() {
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const empresa = document.querySelector('input[name="empresa"]:checked');
    const foto = document.getElementById('foto').files[0];
    
    return nombre || telefono || empresa || foto;
}