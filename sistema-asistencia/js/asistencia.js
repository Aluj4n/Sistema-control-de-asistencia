// js/asistencia.js
class AsistenciaApp {
    constructor() {
        this.empleado = null;
        this.ubicacion = null;
        this.registroHoy = null;
        this.stream = null;
        this.fotoData = null;
        this.tipoRegistro = null; // 'entrada' o 'salida'
        
        this.init();
    }

    async init() {
        await this.verificarSesion();
        this.cargarDatosEmpleado();
        this.actualizarReloj();
        this.cargarRegistroHoy();
        this.cargarHistorial();
        this.setupEventListeners();
    }

    async verificarSesion() {
        const empleadoData = localStorage.getItem('empleadoLogueado');
        const token = localStorage.getItem('empleadoToken');

        if (!empleadoData || !token) {
            this.mostrarError('Sesión no válida. Redirigiendo...');
            setTimeout(() => {
                window.location.href = 'empleado-login.html';
            }, 2000);
            return;
        }

        this.empleado = JSON.parse(empleadoData);
    }

    cargarDatosEmpleado() {
        if (this.empleado) {
            document.getElementById('empleadoNombre').textContent = 
                `${this.empleado.Nombre} ${this.empleado.Apellidos}`;
            document.getElementById('empleadoCargo').textContent = 
                `${this.empleado.Cargo} - ${this.empleado.EmpresaNombre}`;
        }
    }

    actualizarReloj() {
        const actualizar = () => {
            const ahora = new Date();
            const opciones = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            document.getElementById('fechaHoraActual').textContent = 
                ahora.toLocaleDateString('es-ES', opciones);
        };

        actualizar();
        setInterval(actualizar, 1000);
    }

    async cargarRegistroHoy() {
        try {
            const fechaHoy = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/asistencias/empleado/${this.empleado.EmpleadoID}?mes=${new Date().getMonth() + 1}&año=${new Date().getFullYear()}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    // Buscar registro de hoy
                    this.registroHoy = data.asistencias.find(a => a.Fecha.split('T')[0] === fechaHoy);
                    this.actualizarUIEstado();
                }
            }
        } catch (error) {
            console.error('Error cargando registro:', error);
        }
    }

    actualizarUIEstado() {
        const entradaElem = document.getElementById('horaEntrada');
        const salidaElem = document.getElementById('horaSalida');
        const estadoElem = document.getElementById('estadoAsistencia');
        const btnEntrada = document.getElementById('btnEntrada');
        const btnSalida = document.getElementById('btnSalida');

        if (this.registroHoy) {
            // Formatear hora de entrada
            if (this.registroHoy.HoraEntrada) {
                const horaEntrada = new Date(this.registroHoy.HoraEntrada);
                entradaElem.textContent = horaEntrada.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                btnEntrada.disabled = true;
                btnSalida.disabled = false;
            }

            // Formatear hora de salida
            if (this.registroHoy.HoraSalida) {
                const horaSalida = new Date(this.registroHoy.HoraSalida);
                salidaElem.textContent = horaSalida.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                btnSalida.disabled = true;
                estadoElem.textContent = 'Completado';
                estadoElem.className = 'estado-badge presente';
            } else {
                estadoElem.textContent = 'Trabajando';
                estadoElem.className = 'estado-badge presente';
            }
        } else {
            entradaElem.textContent = '--:--';
            salidaElem.textContent = '--:--';
            estadoElem.textContent = 'No registrado';
            estadoElem.className = 'estado-badge ausente';
            btnEntrada.disabled = false;
            btnSalida.disabled = true;
        }
    }

    async cargarHistorial() {
        try {
            const response = await fetch(`/api/asistencias/empleado/${this.empleado.EmpleadoID}?mes=${new Date().getMonth() + 1}&año=${new Date().getFullYear()}`);
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    this.mostrarHistorial(data.asistencias.slice(0, 5)); // Últimos 5 registros
                }
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    }

    mostrarHistorial(asistencias) {
        const historialList = document.getElementById('historialList');
        historialList.innerHTML = '';

        if (asistencias.length === 0) {
            historialList.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay registros recientes</p>';
            return;
        }

        asistencias.forEach(asistencia => {
            const item = document.createElement('div');
            item.className = 'historial-item';
            
            const fecha = new Date(asistencia.Fecha);
            const entrada = asistencia.HoraEntrada ? new Date(asistencia.HoraEntrada) : null;
            const salida = asistencia.HoraSalida ? new Date(asistencia.HoraSalida) : null;

            item.innerHTML = `
                <div class="historial-fecha">
                    ${fecha.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
                </div>
                <div class="historial-horas">
                    <div class="historial-hora">
                        <div class="historial-label">Entrada</div>
                        <div class="historial-valor">${entrada ? entrada.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div>
                    </div>
                    <div class="historial-hora">
                        <div class="historial-label">Salida</div>
                        <div class="historial-valor">${salida ? salida.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div>
                    </div>
                </div>
            `;

            historialList.appendChild(item);
        });
    }

    setupEventListeners() {
        // Event listeners adicionales si son necesarios
    }

    // ========== REGISTRO DE ASISTENCIA ==========

    async registrarEntrada() {
        this.tipoRegistro = 'entrada';
        await this.iniciarRegistro();
    }

    async registrarSalida() {
        this.tipoRegistro = 'salida';
        await this.iniciarRegistro();
    }

    async iniciarRegistro() {
        try {
            // Obtener ubicación primero
            await this.obtenerUbicacion();
            
            // Abrir cámara
            await this.abrirCamara();
            
            // Mostrar modal
            this.mostrarModal();
            
        } catch (error) {
            console.error('Error iniciando registro:', error);
            this.mostrarError('Error al iniciar el registro: ' + error.message);
        }
    }

    async obtenerUbicacion() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocalización no soportada'));
                return;
            }

            const opciones = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.ubicacion = {
                        latitud: position.coords.latitude,
                        longitud: position.coords.longitude
                    };
                    this.actualizarEstadoUbicacion('✅ Ubicación obtenida correctamente');
                    resolve(this.ubicacion);
                },
                (error) => {
                    let mensaje = 'Error obteniendo ubicación: ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            mensaje += 'Permiso denegado';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            mensaje += 'Posición no disponible';
                            break;
                        case error.TIMEOUT:
                            mensaje += 'Tiempo de espera agotado';
                            break;
                        default:
                            mensaje += 'Error desconocido';
                    }
                    this.actualizarEstadoUbicacion(mensaje);
                    reject(new Error(mensaje));
                },
                opciones
            );
        });
    }

    async abrirCamara() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            const video = document.getElementById('video');
            video.srcObject = this.stream;
            
        } catch (error) {
            console.error('Error accediendo a la cámara:', error);
            throw new Error('No se pudo acceder a la cámara. Verifica los permisos.');
        }
    }

    mostrarModal() {
        const modal = document.getElementById('cameraModal');
        const modalTitle = document.getElementById('modalTitle');
        
        modalTitle.textContent = `Tomar Foto de ${this.tipoRegistro === 'entrada' ? 'Entrada' : 'Salida'}`;
        modal.classList.remove('hidden');
        
        // Resetear controles
        document.getElementById('btnCapture').classList.remove('hidden');
        document.getElementById('btnRetake').classList.add('hidden');
        document.getElementById('btnConfirm').classList.add('hidden');
        document.getElementById('video').classList.remove('hidden');
        document.getElementById('canvas').classList.add('hidden');
        document.getElementById('capturedPhoto').classList.add('hidden');
    }

    capturarFoto() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const context = canvas.getContext('2d');

        // Configurar canvas con las dimensiones del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Dibujar el frame actual del video en el canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Obtener la foto como Data URL
        this.fotoData = canvas.toDataURL('image/jpeg', 0.8);

        // Detener la cámara
        this.detenerCamara();

        // Mostrar preview y controles
        document.getElementById('video').classList.add('hidden');
        document.getElementById('canvas').classList.remove('hidden');
        document.getElementById('btnCapture').classList.add('hidden');
        document.getElementById('btnRetake').classList.remove('hidden');
        document.getElementById('btnConfirm').classList.remove('hidden');
    }

    repetirFoto() {
        document.getElementById('canvas').classList.add('hidden');
        document.getElementById('btnRetake').classList.add('hidden');
        document.getElementById('btnConfirm').classList.add('hidden');
        document.getElementById('btnCapture').classList.remove('hidden');
        
        this.abrirCamara().then(() => {
            document.getElementById('video').classList.remove('hidden');
        });
    }

    async confirmarRegistro() {
        this.mostrarLoading(true);

        try {
            const datosRegistro = {
                empleadoId: this.empleado.EmpleadoID,
                fotoEntrada: this.tipoRegistro === 'entrada' ? this.fotoData : null,
                fotoSalida: this.tipoRegistro === 'salida' ? this.fotoData : null,
                latitudEntrada: this.tipoRegistro === 'entrada' ? this.ubicacion.latitud : null,
                longitudEntrada: this.tipoRegistro === 'entrada' ? this.ubicacion.longitud : null,
                latitudSalida: this.tipoRegistro === 'salida' ? this.ubicacion.latitud : null,
                longitudSalida: this.tipoRegistro === 'salida' ? this.ubicacion.longitud : null
            };

            const endpoint = this.tipoRegistro === 'entrada' ? '/entrada' : '/salida';
            const response = await fetch(`/api/asistencias${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosRegistro)
            });

            const data = await response.json();

            if (data.success) {
                this.mostrarMensaje('success', `✅ ${this.tipoRegistro === 'entrada' ? 'Entrada' : 'Salida'} registrada exitosamente!`);
                this.cerrarModal();
                
                // Recargar datos
                await this.cargarRegistroHoy();
                await this.cargarHistorial();
                
            } else {
                throw new Error(data.message || 'Error en el registro');
            }

        } catch (error) {
            console.error('Error confirmando registro:', error);
            this.mostrarMensaje('error', `❌ Error: ${error.message}`);
        } finally {
            this.mostrarLoading(false);
        }
    }

    detenerCamara() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }

    cerrarModal() {
        this.detenerCamara();
        document.getElementById('cameraModal').classList.add('hidden');
        this.fotoData = null;
        this.tipoRegistro = null;
    }

    actualizarEstadoUbicacion(mensaje) {
        document.getElementById('ubicacionStatus').textContent = mensaje;
    }

    mostrarLoading(mostrar) {
        const overlay = document.getElementById('loadingOverlay');
        if (mostrar) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    mostrarMensaje(tipo, mensaje) {
        // Implementar sistema de notificaciones
        alert(mensaje); // Por ahora usamos alert simple
    }

    mostrarError(mensaje) {
        this.mostrarMensaje('error', mensaje);
    }
}

// Funciones globales
function cerrarSesion() {
    localStorage.removeItem('empleadoLogueado');
    localStorage.removeItem('empleadoToken');
    window.location.href = 'empleado-login.html';
}

function cerrarModal() {
    const app = window.asistenciaApp;
    if (app) {
        app.cerrarModal();
    }
}

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.asistenciaApp = new AsistenciaApp();
});