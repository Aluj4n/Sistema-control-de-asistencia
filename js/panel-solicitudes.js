// Base de datos de solicitudes (simulada)
let solicitudes = [
    {
        id: 'solicitud1',
        nombre: "Juan Pérez",
        telefono: "999-888-777",
        tipo: "Registro",
        estado: "pendiente",
        prioridad: "normal",
        fecha: "15/09/25",
        mensaje: "Necesito registrarme en el sistema para marcar mi asistencia. Es urgente ya que empiezo a trabajar mañana."
    },
    {
        id: 'solicitud2',
        nombre: "María López",
        telefono: "987-654-321",
        tipo: "Problema",
        estado: "urgente",
        prioridad: "alta",
        fecha: "15/09/25",
        mensaje: "Tengo un problema al intentar registrarme. El sistema no me permite completar el proceso."
    }
];

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    cargarSolicitudes();
    configurarEventos();
    actualizarEstadisticas();
});

// Configurar eventos
function configurarEventos() {
    // Búsqueda en tiempo real
    document.getElementById('search-input').addEventListener('input', filtrarSolicitudes);
    
    // Filtros
    document.getElementById('filter-tipo').addEventListener('change', filtrarSolicitudes);
    document.getElementById('filter-estado').addEventListener('change', filtrarSolicitudes);
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal-detalles');
        if (event.target === modal) {
            cerrarModal();
        }
    });
}

// Cargar solicitudes en la tabla
function cargarSolicitudes(solicitudesFiltradas = null) {
    const tbody = document.getElementById('solicitudes-list');
    const solicitudesParaMostrar = solicitudesFiltradas || solicitudes;
    
    tbody.innerHTML = '';
    
    if (solicitudesParaMostrar.length === 0) {
        document.getElementById('empty-state').style.display = 'block';
        return;
    }
    
    document.getElementById('empty-state').style.display = 'none';
    
    solicitudesParaMostrar.forEach(solicitud => {
        const row = document.createElement('tr');
        row.id = solicitud.id;
        row.innerHTML = `
            <td>${solicitud.fecha}</td>
            <td><strong>${solicitud.nombre}</strong></td>
            <td>${solicitud.tipo}</td>
            <td><span class="status-badge status-${solicitud.estado}">${formatearEstado(solicitud.estado)}</span></td>
            <td>${formatearPrioridad(solicitud.prioridad)}</td>
            <td>
                <div class="actions">
                    <button class="btn-accion btn-ver" onclick="verDetalles('${solicitud.id}')">👁 Ver</button>
                    <button class="btn-accion btn-resolver" onclick="marcarResuelto('${solicitud.id}')">✓ Resolver</button>
                    <button class="btn-accion btn-eliminar" onclick="confirmarEliminar('${solicitud.id}')">🗑 Eliminar</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Filtrar solicitudes
function filtrarSolicitudes() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const tipoFilter = document.getElementById('filter-tipo').value;
    const estadoFilter = document.getElementById('filter-estado').value;
    
    const solicitudesFiltradas = solicitudes.filter(solicitud => {
        const matchSearch = solicitud.nombre.toLowerCase().includes(searchTerm) ||
                         solicitud.tipo.toLowerCase().includes(searchTerm) ||
                         solicitud.mensaje.toLowerCase().includes(searchTerm);
        
        const matchTipo = tipoFilter === 'all' || solicitud.tipo === tipoFilter;
        const matchEstado = estadoFilter === 'all' || solicitud.estado === estadoFilter;
        
        return matchSearch && matchTipo && matchEstado;
    });
    
    cargarSolicitudes(solicitudesFiltradas);
}

// Ver detalles de solicitud
function verDetalles(solicitudId) {
    const solicitud = solicitudes.find(s => s.id === solicitudId);
    if (!solicitud) return;
    
    document.getElementById('detalle-nombre').textContent = solicitud.nombre;
    document.getElementById('detalle-telefono').textContent = solicitud.telefono;
    document.getElementById('detalle-tipo').textContent = solicitud.tipo;
    document.getElementById('detalle-estado').textContent = formatearEstado(solicitud.estado);
    document.getElementById('detalle-fecha').textContent = solicitud.fecha;
    document.getElementById('detalle-mensaje').textContent = solicitud.mensaje;
    
    document.getElementById('modal-detalles').style.display = 'block';
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modal-detalles').style.display = 'none';
}

// Marcar como resuelto
function marcarResuelto(solicitudId) {
    if (confirm('¿Estás seguro de que deseas marcar esta solicitud como resuelta?')) {
        solicitudes = solicitudes.filter(s => s.id !== solicitudId);
        cargarSolicitudes();
        actualizarEstadisticas();
        mostrarNotificacion('Solicitud marcada como resuelta exitosamente', 'success');
    }
}

// Confirmar eliminación
function confirmarEliminar(solicitudId) {
    if (confirm('¿Estás seguro de que deseas eliminar esta solicitud? Esta acción no se puede deshacer.')) {
        solicitudes = solicitudes.filter(s => s.id !== solicitudId);
        cargarSolicitudes();
        actualizarEstadisticas();
        mostrarNotificacion('Solicitud eliminada exitosamente', 'success');
    }
}

// Actualizar solicitudes
function actualizarSolicitudes() {
    // Simular carga desde servidor
    mostrarNotificacion('Actualizando solicitudes...', 'info');
    setTimeout(() => {
        cargarSolicitudes();
        actualizarEstadisticas();
        mostrarNotificacion('Solicitudes actualizadas exitosamente', 'success');
    }, 1000);
}

// Actualizar estadísticas
function actualizarEstadisticas() {
    const total = solicitudes.length;
    const pendientes = solicitudes.filter(s => s.estado !== 'resuelto').length;
    const resueltas = total - pendientes;
    
    document.getElementById('total-solicitudes').textContent = total;
    document.getElementById('solicitudes-pendientes').textContent = pendientes;
    document.getElementById('solicitudes-resueltas').textContent = resueltas;
}

// Formatear estado
function formatearEstado(estado) {
    const estados = {
        'pendiente': 'Pendiente',
        'proceso': 'En Proceso',
        'urgente': 'Urgente',
        'resuelto': 'Resuelto'
    };
    return estados[estado] || estado;
}

// Formatear prioridad
function formatearPrioridad(prioridad) {
    const prioridades = {
        'baja': '🟢 Baja',
        'normal': '🟡 Normal',
        'alta': '🔴 Alta'
    };
    return prioridades[prioridad] || prioridad;
}

// Mostrar notificación
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    
    // Colores según tipo
    const colores = {
        'success': '#28a745',
        'error': '#dc3545',
        'info': '#17a2b8',
        'warning': '#ffc107'
    };
    
    notificacion.style.backgroundColor = colores[tipo] || colores.info;
    notificacion.textContent = mensaje;
    
    document.body.appendChild(notificacion);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => document.body.removeChild(notificacion), 300);
    }, 3000);
}

// Cerrar panel
function cerrarPanel() {
    if (confirm('¿Estás seguro de que deseas cerrar el panel?')) {
        window.location.href = 'admin-welcome.html';
    }
}

// Función para cerrar detalles (compatibilidad con código anterior)
function cerrarDetalles() {
    cerrarModal();
}