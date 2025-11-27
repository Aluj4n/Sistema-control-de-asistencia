// js/reportes.js
class ReportesApp {
    constructor() {
        this.empresas = [];
        this.reporteData = [];
        this.init();
    }

    async init() {
        await this.verificarSesion();
        await this.cargarEmpresas();
        this.configurarFechasPorDefecto();
        this.setupEventListeners();
    }

    async verificarSesion() {
        const adminData = localStorage.getItem('adminLogueado');
        if (!adminData) {
            window.location.href = 'admin-login.html';
            return;
        }
    }

    async cargarEmpresas() {
        try {
            const response = await fetch('/api/empresas');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.empresas = data.empresas;
                    this.llenarSelectEmpresas();
                }
            }
        } catch (error) {
            console.error('Error cargando empresas:', error);
        }
    }

    llenarSelectEmpresas() {
        const select = document.getElementById('empresaReporte');
        select.innerHTML = '<option value="">Todas las empresas</option>';
        
        this.empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.EmpresaID;
            option.textContent = empresa.Nombre;
            select.appendChild(option);
        });
    }

    configurarFechasPorDefecto() {
        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 30); // Últimos 30 días
        
        document.getElementById('fechaInicio').value = fechaInicio.toISOString().split('T')[0];
        document.getElementById('fechaFin').value = fechaFin.toISOString().split('T')[0];
    }

    setupEventListeners() {
        document.getElementById('tipoReporte').addEventListener('change', () => {
            this.generarReporte();
        });
    }

    async generarReporte() {
        const fechaInicio = document.getElementById('fechaInicio').value;
        const fechaFin = document.getElementById('fechaFin').value;
        const empresaId = document.getElementById('empresaReporte').value;
        const tipoReporte = document.getElementById('tipoReporte').value;

        if (!fechaInicio || !fechaFin) {
            this.mostrarError('Selecciona un rango de fechas válido');
            return;
        }

        try {
            let url = '';
            if (tipoReporte === 'asistencias') {
                url = `/api/reportes/asistencias?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
                if (empresaId) url += `&empresaId=${empresaId}`;
            } else if (tipoReporte === 'horas') {
                const mes = new Date(fechaInicio).getMonth() + 1;
                const año = new Date(fechaInicio).getFullYear();
                url = `/api/reportes/horas-trabajadas?mes=${mes}&año=${año}`;
                if (empresaId) url += `&empresaId=${empresaId}`;
            } else if (tipoReporte === 'estadisticas') {
                url = `/api/reportes/estadisticas?fecha=${fechaFin}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                this.mostrarResultados(data, tipoReporte);
            } else {
                throw new Error(data.message || 'Error generando reporte');
            }

        } catch (error) {
            console.error('Error:', error);
            this.mostrarError('Error al generar el reporte');
        }
    }

    mostrarResultados(data, tipoReporte) {
        if (tipoReporte === 'asistencias') {
            this.mostrarReporteAsistencias(data.reporte, data.resumen);
        } else if (tipoReporte === 'horas') {
            this.mostrarReporteHoras(data.reporte);
        } else if (tipoReporte === 'estadisticas') {
            this.mostrarEstadisticas(data.estadisticas);
        }
    }

    mostrarReporteAsistencias(reporte, resumen) {
        // Mostrar estadísticas
        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-item">
                <h4>Total Registros</h4>
                <div class="stat-number">${resumen.totalRegistros}</div>
            </div>
            <div class="stat-item">
                <h4>Presentes</h4>
                <div class="stat-number" style="color: #27ae60;">${resumen.totalPresentes}</div>
            </div>
            <div class="stat-item">
                <h4>Ausentes</h4>
                <div class="stat-number" style="color: #e74c3c;">${resumen.totalAusentes}</div>
            </div>
            <div class="stat-item">
                <h4>Tardanzas</h4>
                <div class="stat-number" style="color: #f39c12;">${resumen.totalTardanzas}</div>
            </div>
        `;

        // Mostrar tabla
        const header = document.getElementById('reportTableHeader');
        const body = document.getElementById('reportTableBody');
        const count = document.getElementById('resultCount');

        header.innerHTML = `
            <tr>
                <th>Empleado</th>
                <th>Empresa</th>
                <th>Fecha</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas</th>
                <th>Estado</th>
            </tr>
        `;

        body.innerHTML = '';

        if (reporte.length === 0) {
            body.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #7f8c8d; padding: 20px;">
                        No hay datos para el rango seleccionado
                    </td>
                </tr>
            `;
            count.textContent = '0 resultados';
            return;
        }

        reporte.forEach(registro => {
            const entrada = registro.HoraEntrada ? 
                new Date(registro.HoraEntrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 
                '--:--';
                
            const salida = registro.HoraSalida ? 
                new Date(registro.HoraSalida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 
                '--:--';

            const horasTrabajadas = registro.MinutosTrabajados ? 
                `${Math.floor(registro.MinutosTrabajados / 60)}h ${registro.MinutosTrabajados % 60}m` : 
                'N/A';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${registro.Nombre} ${registro.Apellidos}</td>
                <td>${registro.EmpresaNombre}</td>
                <td>${new Date(registro.Fecha).toLocaleDateString('es-ES')}</td>
                <td>${entrada}</td>
                <td>${salida}</td>
                <td>${horasTrabajadas}</td>
                <td>
                    <span class="status-badge status-${registro.Estado?.toLowerCase() || 'presente'}">
                        ${registro.Estado || 'Presente'}
                    </span>
                </td>
            `;
            body.appendChild(tr);
        });

        count.textContent = `${reporte.length} resultados`;
    }

    mostrarReporteHoras(reporte) {
        const statsGrid = document.getElementById('statsGrid');
        const totalHoras = reporte.reduce((sum, emp) => sum + (emp.TotalHoras || 0), 0);
        
        statsGrid.innerHTML = `
            <div class="stat-item">
                <h4>Total Empleados</h4>
                <div class="stat-number">${reporte.length}</div>
            </div>
            <div class="stat-item">
                <h4>Total Horas</h4>
                <div class="stat-number">${totalHoras.toFixed(1)}h</div>
            </div>
            <div class="stat-item">
                <h4>Promedio por Empleado</h4>
                <div class="stat-number">${(totalHoras / reporte.length).toFixed(1)}h</div>
            </div>
        `;

        const header = document.getElementById('reportTableHeader');
        const body = document.getElementById('reportTableBody');
        const count = document.getElementById('resultCount');

        header.innerHTML = `
            <tr>
                <th>Empleado</th>
                <th>Empresa</th>
                <th>Cargo</th>
                <th>Días Trabajados</th>
                <th>Total Horas</th>
                <th>Promedio Diario</th>
            </tr>
        `;

        body.innerHTML = '';

        reporte.forEach(empleado => {
            const promedioDiario = empleado.DiasTrabajados > 0 ? 
                (empleado.TotalHoras / empleado.DiasTrabajados).toFixed(1) : 0;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${empleado.Nombre} ${empleado.Apellidos}</td>
                <td>${empleado.EmpresaNombre}</td>
                <td>${empleado.Cargo || 'N/A'}</td>
                <td>${empleado.DiasTrabajados}</td>
                <td><strong>${empleado.TotalHoras || 0}h</strong></td>
                <td>${promedioDiario}h/día</td>
            `;
            body.appendChild(tr);
        });

        count.textContent = `${reporte.length} empleados`;
    }

    mostrarEstadisticas(estadisticas) {
        const statsGrid = document.getElementById('statsGrid');
        
        const totalEmpleados = estadisticas.empleadosPorEmpresa.reduce((sum, emp) => sum + emp.TotalEmpleados, 0);
        const empleadosActivos = estadisticas.empleadosPorEmpresa.reduce((sum, emp) => sum + emp.EmpleadosActivos, 0);
        const asistenciasHoy = estadisticas.asistenciasHoy.reduce((sum, emp) => sum + emp.TotalAsistencias, 0);

        statsGrid.innerHTML = `
            <div class="stat-item">
                <h4>Total Empleados</h4>
                <div class="stat-number">${totalEmpleados}</div>
            </div>
            <div class="stat-item">
                <h4>Empleados Activos</h4>
                <div class="stat-number">${empleadosActivos}</div>
            </div>
            <div class="stat-item">
                <h4>Asistencias Hoy</h4>
                <div class="stat-number">${asistenciasHoy}</div>
            </div>
            <div class="stat-item">
                <h4>Total Empresas</h4>
                <div class="stat-number">${estadisticas.empleadosPorEmpresa.length}</div>
            </div>
        `;

        const header = document.getElementById('reportTableHeader');
        const body = document.getElementById('reportTableBody');
        const count = document.getElementById('resultCount');

        header.innerHTML = `
            <tr>
                <th>Empresa</th>
                <th>Total Empleados</th>
                <th>Empleados Activos</th>
                <th>Asistencias Hoy</th>
                <th>Presentes</th>
                <th>Tardanzas</th>
            </tr>
        `;

        body.innerHTML = '';

        estadisticas.empleadosPorEmpresa.forEach((empresa, index) => {
            const asistenciaHoy = estadisticas.asistenciasHoy[index] || { TotalAsistencias: 0, Presentes: 0, Tardanzas: 0 };
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${empresa.Empresa}</strong></td>
                <td>${empresa.TotalEmpleados}</td>
                <td>${empresa.EmpleadosActivos}</td>
                <td>${asistenciaHoy.TotalAsistencias}</td>
                <td style="color: #27ae60;">${asistenciaHoy.Presentes || 0}</td>
                <td style="color: #f39c12;">${asistenciaHoy.Tardanzas || 0}</td>
            `;
            body.appendChild(tr);
        });

        count.textContent = `${estadisticas.empleadosPorEmpresa.length} empresas`;
    }

    exportarReporte() {
        this.mostrarMensaje('info', 'La exportación a PDF estará disponible pronto');
    }

    mostrarError(mensaje) {
        alert(`❌ ${mensaje}`);
    }

    mostrarMensaje(tipo, mensaje) {
        alert(mensaje);
    }
}

// Funciones globales
function volverAlPanel() {
    window.location.href = 'admin-panel.html';
}

function cerrarSesionAdmin() {
    localStorage.removeItem('adminLogueado');
    localStorage.removeItem('adminToken');
    window.location.href = 'admin-login.html';
}

function generarReporte() {
    window.reportesApp.generarReporte();
}

function exportarReporte() {
    window.reportesApp.exportarReporte();
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    window.reportesApp = new ReportesApp();
});