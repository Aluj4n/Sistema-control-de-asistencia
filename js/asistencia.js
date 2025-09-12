// Variables globales
let stream = null;
let photoTaken = false;
let currentLocation = null;

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    iniciarCamara();
    actualizarReloj();
    obtenerUbicacion();
    cargarDatosEmpleado();
    
    // Actualizar reloj cada segundo
    setInterval(actualizarReloj, 1000);
});

function cargarDatosEmpleado() {
    const empresa = localStorage.getItem('empresa');
    const employeeName = localStorage.getItem('employeeName') || 'Nombre del Empleado';
    const employeePosition = localStorage.getItem('employeePosition') || 'Cargo no especificado';
    
    // Configurar logo según empresa
    const companyLogo = document.getElementById('companyLogo');
    const companyName = document.getElementById('companyName');
    
    if (empresa === 'nanas') {
        companyLogo.src = '../images/logo-nanas.png';
        companyName.textContent = 'Nanas y Amas';
        // Cambiar colores a tonos rosados
        document.body.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #c0392b 100%)';
        document.querySelector('.header').style.background = 'linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%)';
        
    } else if (empresa === 'silsan') {
        companyLogo.src = '../images/logo-silsan.png';
        companyName.textContent = 'Droguería Silsan';
        // Cambiar colores a tonos azules
        document.body.style.background = 'linear-gradient(135deg, #3498db 0%, #2c3e50 100%)';
        document.querySelector('.header').style.background = 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)';
    }
    
    document.getElementById('employeeName').textContent = employeeName;
    document.getElementById('employeePosition').textContent = `Cargo: ${employeePosition}`;
}

// Iniciar cámara
async function iniciarCamara() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user' 
            }, 
            audio: false 
        });
        
        const video = document.getElementById('video');
        video.srcObject = stream;
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        mostrarMensaje('Error: No se pudo acceder a la cámara', 'error');
    }
}

// Capturar foto
function capturePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');
    
    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Detener la cámara
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    // Mostrar botón de volver a tomar
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'block';
    
    // Habilitar botones de asistencia
    document.getElementById('entradaBtn').disabled = false;
    document.getElementById('salidaBtn').disabled = false;
    document.getElementById('inicioBreakBtn').disabled = false;
    document.getElementById('finBreakBtn').disabled = false;
    
    photoTaken = true;
    mostrarMensaje('Foto capturada correctamente. Ahora puede marcar su asistencia.', 'success');
}

// Volver a tomar foto
function retakePhoto() {
    document.getElementById('captureBtn').style.display = 'block';
    document.getElementById('retakeBtn').style.display = 'none';
    
    // Deshabilitar botones de asistencia
    document.getElementById('entradaBtn').disabled = true;
    document.getElementById('salidaBtn').disabled = true;
    document.getElementById('inicioBreakBtn').disabled = true;
    document.getElementById('finBreakBtn').disabled = true;
    
    photoTaken = false;
    iniciarCamara();
    mostrarMensaje('');
}

// Obtener ubicación GPS
function obtenerUbicacion() {
    if (!navigator.geolocation) {
        document.getElementById('gpsStatus').textContent = '📍 GPS no soportado por el navegador';
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            document.getElementById('gpsStatus').textContent = 
                `📍 Ubicación obtenida (Precisión: ${Math.round(currentLocation.accuracy)} metros)`;
        },
        function(error) {
            console.error('Error obteniendo ubicación:', error);
            document.getElementById('gpsStatus').textContent = 
                '📍 Error obteniendo ubicación. Verifique los permisos de GPS.';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

// Actualizar reloj
function actualizarReloj() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('es-ES', options);
    
    document.getElementById('currentTime').textContent = 
        now.toLocaleTimeString('es-ES');
}

// Marcar entrada
function marcarEntrada() {
    if (!validarAccion()) return;
    
    const timestamp = new Date().toISOString();
    const registro = {
        tipo: 'entrada',
        timestamp: timestamp,
        ubicacion: currentLocation,
        foto: document.getElementById('canvas').toDataURL('image/jpeg', 0.8)
    };
    
    guardarRegistro(registro);
    mostrarMensaje('✅ Entrada registrada correctamente', 'success');
}

// Marcar salida
function marcarSalida() {
    if (!validarAccion()) return;
    
    const timestamp = new Date().toISOString();
    const registro = {
        tipo: 'salida',
        timestamp: timestamp,
        ubicacion: currentLocation,
        foto: document.getElementById('canvas').toDataURL('image/jpeg', 0.8)
    };
    
    guardarRegistro(registro);
    mostrarMensaje('✅ Salida registrada correctamente', 'success');
}

// Marcar inicio de break
function marcarInicioBreak() {
    if (!validarAccion()) return;
    
    const timestamp = new Date().toISOString();
    const registro = {
        tipo: 'inicio_break',
        timestamp: timestamp,
        ubicacion: currentLocation
    };
    
    guardarRegistro(registro);
    mostrarMensaje('⏸️ Inicio de refrigerio registrado', 'success');
}

// Marcar fin de break
function marcarFinBreak() {
    if (!validarAccion()) return;
    
    const timestamp = new Date().toISOString();
    const registro = {
        tipo: 'fin_break',
        timestamp: timestamp,
        ubicacion: currentLocation
    };
    
    guardarRegistro(registro);
    mostrarMensaje('⏯️ Fin de refrigerio registrado', 'success');
}

// Validar acción
function validarAccion() {
    if (!photoTaken) {
        mostrarMensaje('❌ Debe tomar una foto primero', 'error');
        return false;
    }
    
    if (!currentLocation) {
        mostrarMensaje('❌ Esperando obtención de ubicación GPS...', 'error');
        return false;
    }
    
    return true;
}

// Guardar registro (simulación - luego se integrará con Google Sheets)
function guardarRegistro(registro) {
    console.log('Registro guardado:', registro);
    // Aquí se integrará con Google Sheets API
}

// Mostrar mensaje de estado
function mostrarMensaje(mensaje, tipo = '') {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = mensaje;
    statusElement.className = 'status-message';
    
    if (tipo === 'success') {
        statusElement.classList.add('status-success');
    } else if (tipo === 'error') {
        statusElement.classList.add('status-error');
    }
    
    // Auto-ocultar mensajes después de 5 segundos
    if (mensaje) {
        setTimeout(() => {
            statusElement.textContent = '';
            statusElement.className = 'status-message';
        }, 5000);
    }
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        window.location.href = '../index.html';
    }
}