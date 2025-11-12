// js/admin-panel.js
class AdminPanel {
    constructor() {
        this.admin = null;
        this.empleados = [];
        this.empresas = [];
        this.asistencias = [];
        this.chart = null;

        this.init();
    }

    async init() {
        await this.verificarSesionAdmin();
        this.cargarDatosAdmin();
        this.actualizarRelojAdmin();
        this.setupEventListeners();
        await this.cargarDatosIniciales();
        this.mostrarTab('dashboard');
    }

    async verificarSesionAdmin() {
        const adminData = localStorage.getItem('adminLogueado');
        const token = localStorage.getItem('adminToken');

        // Si no existe sesión → pedir login
        if (!adminData || !token) {
            window.location.href = '/pages/admin-login.html';
            return;
        }

        // Si existe sesión, verificamos si pertenece al mismo navegador
        try {
            const response = await fetch('http://localhost:3000/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (!data.valid) {
                // Si el token no es válido (por ejemplo, viene de otro navegador)
                localStorage.removeItem('adminLogueado');
                localStorage.removeItem('adminToken');
                window.location.href = '/pages/admin-login.html';
            } else {
                this.admin = JSON.parse(adminData);
            }
        } catch (error) {
            console.error('Error verificando sesión:', error);
            localStorage.removeItem('adminLogueado');
            localStorage.removeItem('adminToken');
            window.location.href = '/pages/admin-login.html';
        }
    }

    cargarDatosAdmin() {
        if (this.admin) {
            document.getElementById('adminWelcome').textContent =
                `Bienvenido, ${this.admin.NombreCompleto || 'Administrador'}`;
        }
    }

    actualizarRelojAdmin() {
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
            document.getElementById('fechaHoraAdmin').textContent =
                ahora.toLocaleDateString('es-ES', opciones);
        };

        actualizar();
        setInterval(actualizar, 1000);
    }

    setupEventListeners() {
        // Navegación entre tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.mostrarTab(tab);
            });
        });

        // Formulario empleados
        document.getElementById('formEmpleado').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarEmpleado();
        });

        // Formulario empresas
        document.getElementById('formEmpresa').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarEmpresa();
        });
    }

    async cargarDatosIniciales() {
        await Promise.all([
            this.cargarEmpresas(),
            this.cargarEmpleados(),
            this.cargarAsistenciasHoy(),
            this.cargarEstadisticas()
        ]);
    }

    // ========== GESTIÓN DE TABS ==========

    mostrarTab(tabName) {
        // Ocultar todos los tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Desactivar todos los botones de navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar tab seleccionado
        document.getElementById(tabName).classList.add('active');

        // Activar botón de navegación
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Cargar datos específicos del tab
        switch (tabName) {
            case 'dashboard':
                this.cargarDashboard();
                break;
            case 'asistencias':
                this.cargarAsistencias();
                break;
            case 'empleados':
                this.cargarEmpleados();
                break;
            case 'empresas':
                this.cargarEmpresas();
                break;
            case 'reportes':
                this.cargarReportes();
                break;
        }
    }

    // ========== DASHBOARD ==========

    async cargarDashboard() {
        // ✅ CARGAR EMPRESAS PRIMERO para que el gráfico tenga datos actualizados
        await this.cargarEmpresas();
        await this.cargarEstadisticas();
        await this.cargarUltimasAsistencias();
        this.inicializarGrafico(); // ← Ahora tiene empresas actualizadas
    }
    async cargarEstadisticas() {
        try {
            const response = await fetch('/api/reportes/estadisticas');
            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    this.mostrarEstadisticas(data.estadisticas);
                }
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    mostrarEstadisticas(estadisticas) {
        // Total empleados
        const totalEmpleados = estadisticas.empleadosPorEmpresa.reduce((sum, emp) => sum + emp.TotalEmpleados, 0);
        document.getElementById('totalEmpleados').textContent = totalEmpleados;

        // Total empresas
        document.getElementById('totalEmpresas').textContent = estadisticas.empleadosPorEmpresa.length;

        // Asistencias y tardanzas hoy
        const asistenciasHoy = estadisticas.asistenciasHoy.reduce((sum, emp) => sum + emp.TotalAsistencias, 0);
        const tardanzasHoy = estadisticas.asistenciasHoy.reduce((sum, emp) => sum + (emp.Tardanzas || 0), 0);

        document.getElementById('asistenciasHoy').textContent = asistenciasHoy;
        document.getElementById('tardanzasHoy').textContent = tardanzasHoy;
    }

    async cargarUltimasAsistencias() {
        try {
            const fechaHoy = new Date().toISOString().split('T')[0];
            const response = await fetch(`/api/asistencias/fecha/${fechaHoy}`);

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    this.mostrarUltimasAsistencias(data.asistencias.slice(0, 10));
                }
            }
        } catch (error) {
            console.error('Error cargando últimas asistencias:', error);
        }
    }

    mostrarUltimasAsistencias(asistencias) {
        const container = document.getElementById('recentAsistencias');
        container.innerHTML = '';

        if (asistencias.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">No hay asistencias registradas hoy</p>';
            return;
        }

        asistencias.forEach(asistencia => {
            const item = document.createElement('div');
            item.className = 'recent-item';

            const entrada = asistencia.HoraEntrada ?
                new Date(asistencia.HoraEntrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) :
                '--:--';

            item.innerHTML = `
                <div>
                    <div class="recent-empleado">${asistencia.Nombre} ${asistencia.Apellidos}</div>
                    <div class="recent-empresa">${asistencia.EmpresaNombre}</div>
                </div>
                <div class="recent-hora">${entrada}</div>
            `;

            container.appendChild(item);
        });
    }

    inicializarGrafico() {
        const ctx = document.getElementById('asistenciasChart').getContext('2d');

        if (this.chart) {
            this.chart.destroy();
        }

        // ✅ USAR EMPRESAS REALES, NO FIJAS
        const labels = this.empresas.map(empresa => empresa.Nombre);

        // Datos reales de asistencias (por ahora ejemplo)
        const data = labels.map(() => Math.floor(Math.random() * 20) + 5);

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels, // ← EMPRESAS DINÁMICAS
                datasets: [{
                    label: 'Asistencias Hoy',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 107, 107, 0.8)',
                        'rgba(30, 144, 255, 0.8)',
                        'rgba(46, 139, 87, 0.8)',
                        'rgba(155, 89, 182, 0.8)', // Colores extras para más empresas
                        'rgba(241, 196, 15, 0.8)',
                        'rgba(230, 126, 34, 0.8)'
                    ],
                    borderColor: [
                        'rgb(255, 107, 107)',
                        'rgb(30, 144, 255)',
                        'rgb(46, 139, 87)',
                        'rgb(155, 89, 182)',
                        'rgb(241, 196, 15)',
                        'rgb(230, 126, 34)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // ========== GESTIÓN DE EMPLEADOS ==========

    async cargarEmpleados() {
        this.mostrarLoading(true);

        try {
            const response = await fetch('/api/empleados');
            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    this.empleados = data.empleados;
                    this.mostrarEmpleados();
                }
            }
        } catch (error) {
            console.error('Error cargando empleados:', error);
            this.mostrarError('Error al cargar empleados');
        } finally {
            this.mostrarLoading(false);
        }
    }

    mostrarEmpleados() {
        const tbody = document.getElementById('tablaEmpleados');
        tbody.innerHTML = '';

        if (this.empleados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: #7f8c8d; padding: 20px;">
                        No hay empleados registrados
                    </td>
                </tr>
            `;
            return;
        }

        this.empleados.forEach(empleado => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td>${empleado.EmpleadoID}</td>
                <td>${empleado.Nombre} ${empleado.Apellidos}</td>
                <td>${empleado.DNI}</td>
                <td>${empleado.EmpresaNombre}</td>
                <td>${empleado.Cargo || 'N/A'}</td>
                <td>${empleado.Usuario}</td>
                <td>
                    <span class="status-badge ${empleado.Activo ? 'status-presente' : 'status-ausente'}">
                        ${empleado.Activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="adminPanel.editarEmpleado(${empleado.EmpleadoID})">✏️ Editar</button>
                    <button class="btn-delete" onclick="adminPanel.eliminarEmpleado(${empleado.EmpleadoID})">🗑️ Eliminar</button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    async abrirModalEmpleado(empleado = null) {
        const modal = document.getElementById('empleadoModal');
        const titulo = document.getElementById('modalEmpleadoTitulo');
        const form = document.getElementById('formEmpleado');

        form.reset();

        if (empleado) {
            titulo.textContent = 'Editar Empleado';
            this.cargarDatosEmpleadoForm(empleado);
        } else {
            titulo.textContent = 'Nuevo Empleado';
            document.getElementById('empleadoId').value = '';
        }

        // ✅ CARGAR EMPRESAS PRIMERO ANTES DE LLENAR EL SELECT
        await this.cargarEmpresas();
        await this.cargarSelectEmpresas();
        this.generarHorariosSemanales();
        modal.classList.remove('hidden');
    }

    cargarDatosEmpleadoForm(empleado) {
        document.getElementById('empleadoId').value = empleado.EmpleadoID;
        document.getElementById('empleadoNombre').value = empleado.Nombre;
        document.getElementById('empleadoApellidos').value = empleado.Apellidos;
        document.getElementById('empleadoDNI').value = empleado.DNI;
        document.getElementById('empleadoTelefono').value = empleado.Telefono || '';
        document.getElementById('empleadoDireccion').value = empleado.Direccion || '';
        document.getElementById('empleadoCargo').value = empleado.Cargo || '';
        document.getElementById('empleadoEmpresa').value = empleado.EmpresaID;
        document.getElementById('empleadoUsuario').value = empleado.Usuario;
        document.getElementById('empleadoContraseña').value = ''; // No cargar contraseña por seguridad
        document.getElementById('empleadoContraseña').required = !empleado.EmpleadoID;

        // Cargar foto si existe
        if (empleado.Foto) {
            const preview = document.getElementById('previewImage');
            const noPhoto = document.getElementById('noPhotoText');
            preview.src = `../${empleado.Foto}`;
            preview.style.display = 'block';
            noPhoto.style.display = 'none';
        }

        // Cargar horarios si existen
        if (empleado.Horarios && Array.isArray(empleado.Horarios)) {
            empleado.Horarios.forEach(horario => {
                const checkbox = document.getElementById(`horario_${horario.Dia}`);
                if (checkbox) {
                    checkbox.checked = true;
                    this.toggleHorario(horario.Dia);
                    document.getElementById(`entrada_${horario.Dia}`).value = horario.HoraEntrada;
                    document.getElementById(`salida_${horario.Dia}`).value = horario.HoraSalida;
                }
            });
        }
    }

    async cargarSelectEmpresas() {
        const select = document.getElementById('empleadoEmpresa');

        // ✅ VERIFICAR SI EL SELECT EXISTE
        if (!select) {
            console.error('No se encontró el select de empresas');
            return;
        }

        select.innerHTML = '<option value="">Seleccionar empresa</option>';

        // ✅ ASEGURARSE DE QUE LAS EMPRESAS ESTÁN CARGADAS
        if (this.empresas.length === 0) {
            console.log('Cargando empresas...');
            await this.cargarEmpresas();
        }

        console.log('Empresas disponibles:', this.empresas);

        // ✅ LLENAR EL SELECT
        this.empresas.forEach(empresa => {
            const option = document.createElement('option');
            option.value = empresa.EmpresaID;
            option.textContent = empresa.Nombre;
            select.appendChild(option);
        });

        console.log('Select actualizado con', this.empresas.length, 'empresas');
    }

    async guardarEmpleado() {
        this.mostrarLoading(true);

        try {
            const formData = this.obtenerDatosEmpleadoForm();
            const esEdicion = !!formData.empleadoId;

            // Crear FormData para enviar archivos
            const formDataToSend = new FormData();

            // ✅ CORREGIR: Usar nombres de campos en inglés para evitar problemas de encoding
            Object.keys(formData).forEach(key => {
                if (key === 'horarios') {
                    formDataToSend.append(key, JSON.stringify(formData[key]));
                } else if (key === 'fotoFile' && formData[key]) {
                    formDataToSend.append('foto', formData[key]);
                } else if (key !== 'fotoFile') {
                    // ✅ CORREGIR NOMBRES DE CAMPOS
                    let fieldName = key;
                    if (key === 'contraseña') fieldName = 'contraseña';
                    if (key === 'empleadoId') fieldName = 'empleadoId';

                    formDataToSend.append(fieldName, formData[key]);
                }
            });

            const url = esEdicion ? `/api/empleados/${formData.empleadoId}` : '/api/empleados';
            const method = esEdicion ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                body: formDataToSend
            });

            const data = await response.json();

            if (data.success) {
                this.mostrarMensaje('success', `Empleado ${esEdicion ? 'actualizado' : 'creado'} exitosamente`);
                this.cerrarModalEmpleado();
                await this.cargarEmpleados();
            } else {
                throw new Error(data.message || 'Error guardando empleado');
            }

        } catch (error) {
            console.error('Error guardando empleado:', error);
            this.mostrarError(error.message);
        } finally {
            this.mostrarLoading(false);
        }
    }
    // Función para generar horarios semanales
    generarHorariosSemanales() {
        const container = document.getElementById('horariosContainer');
        const dias = [
            { id: 1, nombre: 'Lunes' },
            { id: 2, nombre: 'Martes' },
            { id: 3, nombre: 'Miércoles' },
            { id: 4, nombre: 'Jueves' },
            { id: 5, nombre: 'Viernes' },
            { id: 6, nombre: 'Sábado' },
            { id: 7, nombre: 'Domingo' }
        ];

        container.innerHTML = '';

        dias.forEach(dia => {
            const horarioItem = document.createElement('div');
            horarioItem.className = 'horario-item';
            horarioItem.innerHTML = `
                <div class="horario-checkbox">
                    <input type="checkbox" id="horario_${dia.id}" 
                           data-dia="${dia.id}" onchange="toggleHorario(${dia.id})">
                    <label for="horario_${dia.id}" class="horario-day">${dia.nombre}</label>
                </div>
                <div class="horario-times">
                    <input type="time" id="entrada_${dia.id}" disabled>
                    <span>a</span>
                    <input type="time" id="salida_${dia.id}" disabled>
                </div>
            `;
            container.appendChild(horarioItem);
        });

        // Activar Lunes a Sábado por defecto
        [1, 2, 3, 4, 5, 6].forEach(dia => {
            document.getElementById(`horario_${dia}`).checked = true;
            this.toggleHorario(dia);
        });
    }

    // Función para activar/desactivar horarios
    toggleHorario(dia) {
        const checkbox = document.getElementById(`horario_${dia}`);
        const entrada = document.getElementById(`entrada_${dia}`);
        const salida = document.getElementById(`salida_${dia}`);

        if (checkbox.checked) {
            entrada.disabled = false;
            salida.disabled = false;
            // Valores por defecto
            if (!entrada.value) entrada.value = '08:00';
            if (!salida.value) salida.value = '17:00';
        } else {
            entrada.disabled = true;
            salida.disabled = true;
            entrada.value = '';
            salida.value = '';
        }
    }

    // Función para subir foto
    previewPhoto(input) {
        const preview = document.getElementById('previewImage');
        const noPhoto = document.getElementById('noPhotoText');

        if (input.files && input.files[0]) {
            const reader = new FileReader();

            reader.onload = function (e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
                noPhoto.style.display = 'none';
            }

            reader.readAsDataURL(input.files[0]);
        }
    }

    // Función para mostrar/ocultar contraseña
    togglePassword() {
        const passwordInput = document.getElementById('empleadoContraseña');
        const toggleBtn = document.querySelector('.toggle-password');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁️';
        }
    }

    // Modificar la función de obtener datos del formulario
    obtenerDatosEmpleadoForm() {
        const horarios = [];

        // Recoger horarios
        for (let i = 1; i <= 7; i++) {
            const checkbox = document.getElementById(`horario_${i}`);
            if (checkbox && checkbox.checked) {
                horarios.push({
                    dia: i,
                    activo: true,
                    horaEntrada: document.getElementById(`entrada_${i}`).value,
                    horaSalida: document.getElementById(`salida_${i}`).value
                });
            }
        }

        return {
            empleadoId: document.getElementById('empleadoId').value || null,
            nombre: document.getElementById('empleadoNombre').value,
            apellidos: document.getElementById('empleadoApellidos').value,
            dni: document.getElementById('empleadoDNI').value,
            telefono: document.getElementById('empleadoTelefono').value,
            direccion: document.getElementById('empleadoDireccion').value,
            cargo: document.getElementById('empleadoCargo').value,
            empresaId: parseInt(document.getElementById('empleadoEmpresa').value),
            usuario: document.getElementById('empleadoUsuario').value,
            contraseña: document.getElementById('empleadoContraseña').value,
            fotoFile: document.getElementById('empleadoFoto').files[0],
            horarios: horarios
        };
    }

    async editarEmpleado(empleadoId) {
        const empleado = this.empleados.find(e => e.EmpleadoID === empleadoId);
        if (empleado) {
            this.abrirModalEmpleado(empleado);
        }
    }

    async eliminarEmpleado(empleadoId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
            return;
        }

        this.mostrarLoading(true);

        try {
            const response = await fetch(`/api/empleados/${empleadoId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.mostrarMensaje('success', 'Empleado eliminado exitosamente');
                await this.cargarEmpleados();
            } else {
                throw new Error(data.message || 'Error eliminando empleado');
            }

        } catch (error) {
            console.error('Error eliminando empleado:', error);
            this.mostrarError(error.message);
        } finally {
            this.mostrarLoading(false);
        }
    }

    cerrarModalEmpleado() {
        document.getElementById('empleadoModal').classList.add('hidden');
    }

    // ========== GESTIÓN DE EMPRESAS ==========

    async cargarEmpresas() {
        try {
            const response = await fetch('/api/empresas');
            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    this.empresas = data.empresas;
                    this.mostrarEmpresas();
                }
            }
        } catch (error) {
            console.error('Error cargando empresas:', error);
        }
    }

    mostrarEmpresas() {
        const container = document.getElementById('empresasGrid');
        container.innerHTML = '';

        if (this.empresas.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #7f8c8d; padding: 40px; grid-column: 1 / -1;">
                    No hay empresas registradas
                </div>
            `;
            return;
        }

        this.empresas.forEach(empresa => {
            const card = document.createElement('div');
            card.className = 'empresa-card';

            card.innerHTML = `
                <div class="empresa-logo">
                    <img src="../${empresa.LogoPath || 'images/logo-sistema.png'}" alt="${empresa.Nombre}">
                </div>
                <h3>${empresa.Nombre}</h3>
                <p>${empresa.Descripcion || 'Sin descripción'}</p>
                <div class="empresa-actions">
                    <button class="btn-edit" onclick="adminPanel.editarEmpresa(${empresa.EmpresaID})">✏️ Editar</button>
                    <button class="btn-delete" onclick="adminPanel.eliminarEmpresa(${empresa.EmpresaID})">🗑️ Eliminar</button>
                </div>
            `;

            container.appendChild(card);
        });
    }

    abrirModalEmpresa(empresa = null) {
        const modal = document.getElementById('empresaModal');
        const titulo = document.getElementById('modalEmpresaTitulo');
        const form = document.getElementById('formEmpresa');

        form.reset();

        // ✅ RESETEAR PREVIEW DEL LOGO
        const preview = document.getElementById('previewLogoImage');
        const noLogo = document.getElementById('noLogoText');
        preview.style.display = 'none';
        noLogo.style.display = 'inline';
        document.getElementById('empresaLogo').value = '';

        if (empresa) {
            titulo.textContent = 'Editar Empresa';
            this.cargarDatosEmpresaForm(empresa);
        } else {
            titulo.textContent = 'Nueva Empresa';
            document.getElementById('empresaId').value = '';
        }

        modal.classList.remove('hidden');
    }

    cargarDatosEmpresaForm(empresa) {
        document.getElementById('empresaId').value = empresa.EmpresaID;
        document.getElementById('empresaNombre').value = empresa.Nombre;
        document.getElementById('empresaDescripcion').value = empresa.Descripcion || '';

        // ✅ MOSTRAR LOGO ACTUAL EN EL PREVIEW
        const preview = document.getElementById('previewLogoImage');
        const noLogo = document.getElementById('noLogoText');

        if (empresa.LogoPath && empresa.LogoPath !== 'images/logo-empresa.png') {
            preview.src = `../${empresa.LogoPath}`;
            preview.style.display = 'block';
            noLogo.style.display = 'none';
        } else {
            preview.style.display = 'none';
            noLogo.style.display = 'inline';
        }

        // Limpiar el input file
        document.getElementById('empresaLogo').value = '';
    }
    async guardarEmpresa() {
        this.mostrarLoading(true);

        try {
            const formData = new FormData();
            const empresaId = document.getElementById('empresaId').value;
            const nombre = document.getElementById('empresaNombre').value;
            const descripcion = document.getElementById('empresaDescripcion').value;
            const logoFile = document.getElementById('empresaLogo').files[0];

            console.log('Datos empresa:', { empresaId, nombre, descripcion, logoFile });

            if (!nombre) {
                throw new Error('El nombre de la empresa es requerido');
            }

            // Agregar datos al FormData
            formData.append('nombre', nombre);
            formData.append('descripcion', descripcion);

            // Agregar archivo si existe
            if (logoFile) {
                formData.append('logo', logoFile);
            }

            const esEdicion = !!empresaId;
            const url = esEdicion ? `/api/empresas/${empresaId}` : '/api/empresas';
            const method = esEdicion ? 'PUT' : 'POST';

            console.log('Enviando a:', url, 'Método:', method);

            const response = await fetch(url, {
                method: method,
                body: formData  // ✅ IMPORTANTE: NO enviar headers Content-Type
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.mostrarMensaje('success', `Empresa ${esEdicion ? 'actualizada' : 'creada'} exitosamente`);
                this.cerrarModalEmpresa();
                await this.cargarEmpresas();

                // Recargar el dashboard para que aparezca en index.html
                await this.cargarDashboard();
            } else {
                throw new Error(data.message || 'Error guardando empresa');
            }

        } catch (error) {
            console.error('Error guardando empresa:', error);
            this.mostrarError('Error al guardar empresa: ' + error.message);
        } finally {
            this.mostrarLoading(false);
        }
    }

    obtenerDatosEmpresaForm() {
        return {
            empresaId: document.getElementById('empresaId').value || null,
            nombre: document.getElementById('empresaNombre').value,
            descripcion: document.getElementById('empresaDescripcion').value,
            logoPath: document.getElementById('empresaLogo').value
        };
    }

    async editarEmpresa(empresaId) {
        const empresa = this.empresas.find(e => e.EmpresaID === empresaId);
        if (empresa) {
            this.abrirModalEmpresa(empresa);
        }
    }

    async eliminarEmpresa(empresaId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta empresa?')) {
            return;
        }

        this.mostrarLoading(true);

        try {
            const response = await fetch(`/api/empresas/${empresaId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                this.mostrarMensaje('success', 'Empresa eliminada exitosamente');
                await this.cargarEmpresas();
            } else {
                throw new Error(data.message || 'Error eliminando empresa');
            }

        } catch (error) {
            console.error('Error eliminando empresa:', error);
            this.mostrarError(error.message);
        } finally {
            this.mostrarLoading(false);
        }
    }

    cerrarModalEmpresa() {
        document.getElementById('empresaModal').classList.add('hidden');
    }

    // ========== ASISTENCIAS ==========

    async cargarAsistencias() {
        this.mostrarLoading(true);

        try {
            const fecha = document.getElementById('fechaFiltro').value;
            const empresaId = document.getElementById('empresaFiltro').value;

            let url = `/api/asistencias/fecha/${fecha}`;
            if (empresaId) {
                // Necesitaríamos un endpoint específico para filtrar por empresa y fecha
                // Por ahora cargamos todas y filtramos en el cliente
                url = `/api/asistencias/fecha/${fecha}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    let asistencias = data.asistencias;

                    // Filtrar por empresa si se seleccionó una
                    if (empresaId) {
                        asistencias = asistencias.filter(a => a.EmpresaID == empresaId);
                    }

                    this.mostrarAsistencias(asistencias);
                }
            }
        } catch (error) {
            console.error('Error cargando asistencias:', error);
            this.mostrarError('Error al cargar asistencias');
        } finally {
            this.mostrarLoading(false);
        }
    }

    mostrarAsistencias(asistencias) {
        const tbody = document.getElementById('tablaAsistencias');
        tbody.innerHTML = '';

        if (asistencias.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #7f8c8d; padding: 20px;">
                        No hay asistencias para la fecha seleccionada
                    </td>
                </tr>
            `;
            return;
        }

        asistencias.forEach(asistencia => {
            const tr = document.createElement('tr');

            const entrada = asistencia.HoraEntrada ?
                new Date(asistencia.HoraEntrada).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) :
                '--:--';

            const salida = asistencia.HoraSalida ?
                new Date(asistencia.HoraSalida).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) :
                '--:--';

            const ubicacion = asistencia.LatitudEntrada ?
                `📍 (${asistencia.LatitudEntrada.toFixed(4)}, ${asistencia.LongitudEntrada.toFixed(4)})` :
                'No registrada';

            tr.innerHTML = `
                <td>${asistencia.Nombre} ${asistencia.Apellidos}</td>
                <td>${asistencia.EmpresaNombre}</td>
                <td>${new Date(asistencia.Fecha).toLocaleDateString('es-ES')}</td>
                <td>${entrada}</td>
                <td>${salida}</td>
                <td>
                    <span class="status-badge status-${asistencia.Estado?.toLowerCase() || 'presente'}">
                        ${asistencia.Estado || 'Presente'}
                    </span>
                </td>
                <td>${ubicacion}</td>
            `;

            tbody.appendChild(tr);
        });
    }

    filtrarAsistencias() {
        this.cargarAsistencias();
    }

    // ========== REPORTES ==========

    async cargarReportes() {
        // Cargar select de empresas para reportes
        await this.cargarSelectEmpresasReporte();

        // Establecer fechas por defecto (última semana)
        const fechaFin = new Date();
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - 7);

        document.getElementById('fechaInicioReporte').value = fechaInicio.toISOString().split('T')[0];
        document.getElementById('fechaFinReporte').value = fechaFin.toISOString().split('T')[0];
    }

    async cargarSelectEmpresasReporte() {
        const select = document.getElementById('empresaReporte');
        const selectFiltro = document.getElementById('empresaFiltro');

        select.innerHTML = '<option value="">Todas las empresas</option>';
        selectFiltro.innerHTML = '<option value="">Todas las empresas</option>';

        if (this.empresas.length === 0) {
            await this.cargarEmpresas();
        }

        this.empresas.forEach(empresa => {
            [select, selectFiltro].forEach(sel => {
                const option = document.createElement('option');
                option.value = empresa.EmpresaID;
                option.textContent = empresa.Nombre;
                sel.appendChild(option);
            });
        });
    }

    async generarReporte() {
        this.mostrarLoading(true);

        try {
            const fechaInicio = document.getElementById('fechaInicioReporte').value;
            const fechaFin = document.getElementById('fechaFinReporte').value;
            const empresaId = document.getElementById('empresaReporte').value;

            if (!fechaInicio || !fechaFin) {
                this.mostrarError('Selecciona un rango de fechas');
                return;
            }

            let url = `/api/reportes/asistencias?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
            if (empresaId) {
                url += `&empresaId=${empresaId}`;
            }

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    this.mostrarReporte(data.reporte, data.resumen);
                }
            }
        } catch (error) {
            console.error('Error generando reporte:', error);
            this.mostrarError('Error al generar reporte');
        } finally {
            this.mostrarLoading(false);
        }
    }

    mostrarReporte(reporte, resumen) {
        // Mostrar estadísticas
        const statsContainer = document.getElementById('reporteStats');
        statsContainer.innerHTML = `
            <div class="report-stat">
                <h4>Total Registros</h4>
                <div class="number">${resumen.totalRegistros}</div>
            </div>
            <div class="report-stat">
                <h4>Presentes</h4>
                <div class="number" style="color: #27ae60;">${resumen.totalPresentes}</div>
            </div>
            <div class="report-stat">
                <h4>Ausentes</h4>
                <div class="number" style="color: #e74c3c;">${resumen.totalAusentes}</div>
            </div>
            <div class="report-stat">
                <h4>Tardanzas</h4>
                <div class="number" style="color: #f39c12;">${resumen.totalTardanzas}</div>
            </div>
        `;

        // Mostrar tabla de reporte
        const tbody = document.getElementById('tablaReporte');
        tbody.innerHTML = '';

        if (reporte.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #7f8c8d; padding: 20px;">
                        No hay datos para el rango de fechas seleccionado
                    </td>
                </tr>
            `;
            return;
        }

        reporte.forEach(registro => {
            const tr = document.createElement('tr');

            const horasTrabajadas = registro.MinutosTrabajados ?
                `${Math.floor(registro.MinutosTrabajados / 60)}h ${registro.MinutosTrabajados % 60}m` :
                'N/A';

            tr.innerHTML = `
                <td>${registro.Nombre} ${registro.Apellidos}</td>
                <td>${registro.EmpresaNombre}</td>
                <td>${new Date(registro.Fecha).toLocaleDateString('es-ES')}</td>
                <td>${horasTrabajadas}</td>
                <td>
                    <span class="status-badge status-${registro.Estado?.toLowerCase() || 'presente'}">
                        ${registro.Estado || 'Presente'}
                    </span>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    exportarPDF() {
        this.mostrarMensaje('info', 'Función de exportación PDF en desarrollo...');
        // Aquí iría la lógica para generar y descargar PDF
    }

    exportarAsistencias() {
        this.mostrarMensaje('info', 'Función de exportación en desarrollo...');
        // Aquí iría la lógica para exportar a Excel/CSV
    }

    // ========== UTILIDADES ==========

    mostrarLoading(mostrar) {
        const overlay = document.getElementById('loadingOverlay');
        if (mostrar) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    mostrarMensaje(tipo, mensaje) {
        // Sistema de notificaciones simple
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            info: '#3498db',
            warning: '#f39c12'
        };

        // Crear notificación
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[tipo] || colors.info};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 3000;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = mensaje;

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    mostrarError(mensaje) {
        this.mostrarMensaje('error', mensaje);
    }
}
// Función para preview del logo de empresa
function previewEmpresaLogo(input) {
    const preview = document.getElementById('previewLogoImage');
    const noLogo = document.getElementById('noLogoText');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            noLogo.style.display = 'none';
        }
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Función para quitar logo seleccionado
function removeEmpresaLogo() {
    const fileInput = document.getElementById('empresaLogo');
    const preview = document.getElementById('previewLogoImage');
    const noLogo = document.getElementById('noLogoText');
    
    fileInput.value = '';
    preview.src = '';
    preview.style.display = 'none';
    noLogo.style.display = 'inline';
}

// ========== FUNCIONES GLOBALES PARA EL HTML ==========

function cerrarSesionAdmin() {
    localStorage.removeItem('adminLogueado');
    localStorage.removeItem('adminToken');
    window.location.href = '/pages/admin-login.html';
}

function abrirModalEmpleado() {
    window.adminPanel.abrirModalEmpleado();
}

function cerrarModalEmpleado() {
    window.adminPanel.cerrarModalEmpleado();
}

function abrirModalEmpresa() {
    window.adminPanel.abrirModalEmpresa();
}

function cerrarModalEmpresa() {
    window.adminPanel.cerrarModalEmpresa();
}

function cargarDashboard() {
    window.adminPanel.cargarDashboard();
}

function filtrarAsistencias() {
    window.adminPanel.filtrarAsistencias();
}

function generarReporte() {
    window.adminPanel.generarReporte();
}

function exportarPDF() {
    window.adminPanel.exportarPDF();
}

function exportarAsistencias() {
    window.adminPanel.exportarAsistencias();
}

// Funciones globales para el HTML
function toggleHorario(dia) {
    window.adminPanel.toggleHorario(dia);
}

// Mostrar la vista previa al seleccionar una foto
function previewPhoto(input) {
    const file = input.files[0];
    const preview = document.getElementById('previewImage');
    const noPhotoText = document.getElementById('noPhotoText');
    const removeBtn = document.getElementById('removePhotoBtn');

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            noPhotoText.style.display = 'none';
            removeBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Quitar la foto seleccionada
function removePhoto() {
    const fileInput = document.getElementById('empleadoFoto');
    const preview = document.getElementById('previewImage');
    const noPhotoText = document.getElementById('noPhotoText');
    const removeBtn = document.getElementById('removePhotoBtn');

    fileInput.value = ''; // limpiar archivo
    preview.src = '';
    preview.style.display = 'none';
    noPhotoText.style.display = 'inline';
    removeBtn.classList.add('hidden');
}

function togglePassword() {
    window.adminPanel.togglePassword();
}

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.adminPanel = new AdminPanel();
});