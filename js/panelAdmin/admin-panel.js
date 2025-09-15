// Datos de ejemplo para la tabla
const sampleData = [
    { empleado: 'Juan Pérez', empresa: 'Nanas', entrada: '08:00', salida: '17:00', estado: 'Presente', horas: '9:00' },
    { empleado: 'María López', empresa: 'Silsan', entrada: '--:--', salida: '--:--', estado: 'Ausente', horas: '0:00' },
    { empleado: 'Ana Ruiz', empresa: 'Nanas', entrada: '08:15', salida: '16:45', estado: 'Tarde', horas: '8:30' },
    { empleado: 'Carlos Mendoza', empresa: 'Silsan', entrada: '07:45', salida: '17:30', estado: 'Presente', horas: '9:45' }
];

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    cargarDatosAdministrador();
    cargarFechaActual();
    cargarTablaResumen();
});

// Cargar datos del administrador
function cargarDatosAdministrador() {
    const adminName = localStorage.getItem('adminName') || 'Administrador';
    document.getElementById('adminName').textContent = adminName;
}

// Cargar fecha actual
function cargarFechaActual() {
    const now = new Date();
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    document.getElementById('currentMonth').textContent = months[now.getMonth()];
    document.getElementById('currentMonthYear').textContent = `${months[now.getMonth()]}-${now.getFullYear()}`;
}

// Cargar tabla de resumen
function cargarTablaResumen() {
    const tableBody = document.getElementById('summaryTableBody');
    tableBody.innerHTML = '';
    
    let totalHoras = 0;
    
    sampleData.forEach(item => {
        const row = document.createElement('tr');
        
        // Aplicar clases según el estado y empresa
        let statusClass = '';
        if (item.estado === 'Presente') statusClass = 'status-present';
        else if (item.estado === 'Ausente') statusClass = 'status-absent';
        else if (item.estado === 'Tarde') statusClass = 'status-late';
        
        let companyClass = '';
        if (item.empresa === 'Nanas') companyClass = 'company-nanas';
        else if (item.empresa === 'Silsan') companyClass = 'company-silsan';
        
        // Calcular horas totales
        if (item.horas !== '0:00') {
            const [horas, minutos] = item.horas.split(':').map(Number);
            totalHoras += horas + (minutos / 60);
        }
        
        row.innerHTML = `
            <td>${item.empleado}</td>
            <td class="${companyClass}">${item.empresa}</td>
            <td>${item.entrada}</td>
            <td>${item.salida}</td>
            <td class="${statusClass}">${item.estado}</td>
            <td>${item.horas}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Actualizar total de horas
    const horasEnteras = Math.floor(totalHoras);
    const minutos = Math.round((totalHoras - horasEnteras) * 60);
    document.getElementById('totalHours').textContent = `${horasEnteras}:${minutos.toString().padStart(2, '0')}`;
}

// Conectar con Google Sheets
function conectarSheets() {
    const url = document.getElementById('sheetsUrl').value.trim();
    const statusElement = document.getElementById('connectionStatus');
    
    if (!url) {
        alert('Por favor ingrese la URL de Google Sheets');
        return;
    }
    
    statusElement.textContent = 'Conectando...';
    statusElement.className = 'status-connecting';
    
    // Simular conexión (en un caso real, aquí se conectaría con la API)
    setTimeout(() => {
        statusElement.textContent = 'Conectado';
        statusElement.className = 'status-connected';
        alert('Conexión exitosa con Google Sheets');
        
        // Aquí iría el código real para obtener datos de Google Sheets
        // obtenerDatosDeSheets(url);
    }, 2000);
}

// Actualizar datos
function actualizarDatos() {
    const statusElement = document.getElementById('connectionStatus');
    
    if (statusElement.className !== 'status-connected') {
        alert('Primero debe conectarse a Google Sheets');
        return;
    }
    
    statusElement.textContent = 'Actualizando...';
    statusElement.className = 'status-connecting';
    
    // Simular actualización
    setTimeout(() => {
        statusElement.textContent = 'Conectado';
        statusElement.className = 'status-connected';
        alert('Datos actualizados correctamente');
        
        // Recargar tabla con datos actualizados
        cargarTablaResumen();
    }, 1500);
}

// Ver lista de empleados
function verListaEmpleados() {
    alert('Redirigiendo a la lista de empleados...');
    // window.location.href = 'empleados-lista.html'; // Para Formulario 10
}

// Ver reporte de asistencias
// En js/panelAdmin/admin-panel.js - Modificar esta función:
function verReporteAsistencias() {
    window.location.href = 'reporte-asistencias.html'; // Redirige al Formulario 11
}

// Exportar datos
function exportarDatos() {
    const option = confirm("¿Desea exportar a Excel? (Aceptar) o a PDF (Cancelar)");
    
    if (option) {
        alert('Exportando a Excel...');
        // exportarAExcel();
    } else {
        alert('Exportando a PDF...');
        // exportarAPDF();
    }
}

// Volver al formulario anterior
function volver() {
    window.location.href = '../admin-welcome.html'; // Volver a Formulario 5
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Está seguro de que desea cerrar sesión?')) {
        localStorage.removeItem('adminName');
        window.location.href = '../../index.html'; // Volver a Formulario 1
    }
}