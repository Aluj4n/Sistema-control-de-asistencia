// js/admin-panel.js
class AdminPanel {
  constructor() {
    this.admin = null;
    this.empleados = [];
    this.empresas = [];
    this.asistencias = [];
    this.empleadoAEliminar = null; // ✅ AGREGAR ESTA LÍNEA
    this.chart = null;
    // ✅ INICIALIZAR FECHA INMEDIATAMENTE
    setTimeout(() => {
      this.inicializarFecha();
    }, 100);

    this.init();
  }

  inicializarFecha() {
    const fechaInput = document.getElementById("fechaFiltro");
    const fechaInicioReporte = document.getElementById("fechaInicioReporte");
    const fechaFinReporte = document.getElementById("fechaFinReporte");

    if (fechaInput) {
      fechaInput.value = this.obtenerFechaActualPeru();
    }

    // ✅ TAMBIÉN INICIALIZAR FECHAS DE REPORTES
    if (fechaInicioReporte && !fechaInicioReporte.value) {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 7); // Última semana
      fechaInicioReporte.value = this.obtenerFechaActualPeru(fechaInicio);
    }

    if (fechaFinReporte && !fechaFinReporte.value) {
      fechaFinReporte.value = this.obtenerFechaActualPeru();
    }
  }

  async init() {
    await this.verificarSesionAdmin();
    this.cargarDatosAdmin();
    this.actualizarRelojAdmin();
    this.setupEventListeners();
    await this.cargarDatosIniciales();
    this.mostrarTab("dashboard");
    const fechaInput = document.getElementById("fechaFiltro");
    if (fechaInput && !fechaInput.value) {
      fechaInput.value = this.obtenerFechaActual();
    }
  }

  async verificarSesionAdmin() {
    const adminData = localStorage.getItem("adminLogueado");
    const token = localStorage.getItem("adminToken");

    // Si no existe sesión → pedir login
    if (!adminData || !token) {
      window.location.href = "/pages/admin-login.html";
      return;
    }

    // Si existe sesión, verificamos si pertenece al mismo navegador
    try {
      const response = await fetch("http://localhost:3000/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!data.valid) {
        // Si el token no es válido (por ejemplo, viene de otro navegador)
        localStorage.removeItem("adminLogueado");
        localStorage.removeItem("adminToken");
        window.location.href = "/pages/admin-login.html";
      } else {
        this.admin = JSON.parse(adminData);
      }
    } catch (error) {
      console.error("Error verificando sesión:", error);
      localStorage.removeItem("adminLogueado");
      localStorage.removeItem("adminToken");
      window.location.href = "/pages/admin-login.html";
    }
  }

  cargarDatosAdmin() {
    if (this.admin) {
      document.getElementById("adminWelcome").textContent = `Bienvenido, ${
        this.admin.NombreCompleto || "Administrador"
      }`;
    }
  }

  actualizarRelojAdmin() {
    const actualizar = () => {
      const ahora = new Date();
      const opciones = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      document.getElementById("fechaHoraAdmin").textContent =
        ahora.toLocaleDateString("es-ES", opciones);
    };

    actualizar();
    setInterval(actualizar, 1000);
  }

  setupEventListeners() {
    // Navegación entre tabs
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const tab = e.target.getAttribute("data-tab");
        this.mostrarTab(tab);
      });
    });

    // Formulario empleados
    document.getElementById("formEmpleado").addEventListener("submit", (e) => {
      e.preventDefault();
      this.guardarEmpleado();
    });

    // Formulario empresas
    document.getElementById("formEmpresa").addEventListener("submit", (e) => {
      e.preventDefault();
      this.guardarEmpresa();
    });
  }

  async cargarDatosIniciales() {
    await Promise.all([
      this.cargarEmpresas(),
      this.cargarEmpleados(),
      this.cargarAsistenciasHoy(),
      this.cargarEstadisticas(),
    ]);
  }

  // ========== GESTIÓN DE TABS ==========

  mostrarTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll(".tab-content").forEach((tab) => {
      tab.classList.remove("active");
    });

    // Desactivar todos los botones de navegación
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("active");
    });

    // Mostrar tab seleccionado
    document.getElementById(tabName).classList.add("active");

    // Activar botón de navegación
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

    // Cargar datos específicos del tab
    switch (tabName) {
      case "dashboard":
        this.cargarDashboard();
        break;
      case "asistencias":
        this.cargarAsistencias();
        break;
      case "empleados":
        this.cargarEmpleados();
        break;
      case "empresas":
        this.cargarEmpresas();
        break;
      case "reportes":
        this.cargarReportes();
        break;
    }
  }

  // ========== DASHBOARD ==========

  async cargarDashboard() {
    // ✅ ESTABLECER FECHA ACTUAL PRIMERO
    this.establecerFechaActual();

    await this.cargarEmpresas();
    await this.cargarEstadisticas();
    await this.cargarUltimasAsistencias();
    this.inicializarGrafico();

    // ✅ CARGAR ASISTENCIAS DEL DÍA ACTUAL
    await this.cargarAsistencias();
  }

  // ✅ MANTENER ESTA FUNCIÓN
  establecerFechaActual() {
    const fechaInput = document.getElementById("fechaFiltro");
    if (fechaInput) {
      const hoy = new Date().toISOString().split("T")[0];
      fechaInput.value = hoy;
      console.log("📅 Fecha establecida:", hoy);
    }
  }

  async cargarEstadisticas() {
    try {
      const response = await fetch("/api/reportes/estadisticas");
      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          // ✅ GUARDAR ESTADÍSTICAS PARA USAR EN EL GRÁFICO
          this.estadisticas = data.estadisticas;
          this.mostrarEstadisticas(data.estadisticas);
        }
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  }

  mostrarEstadisticas(estadisticas) {
    // Total empleados
    const totalEmpleados = estadisticas.empleadosPorEmpresa.reduce(
      (sum, emp) => sum + emp.TotalEmpleados,
      0
    );
    document.getElementById("totalEmpleados").textContent = totalEmpleados;

    // Total empresas
    document.getElementById("totalEmpresas").textContent =
      estadisticas.empleadosPorEmpresa.length;

    // Asistencias y tardanzas hoy
    const asistenciasHoy = estadisticas.asistenciasHoy.reduce(
      (sum, emp) => sum + emp.TotalAsistencias,
      0
    );
    const tardanzasHoy = estadisticas.asistenciasHoy.reduce(
      (sum, emp) => sum + (emp.Tardanzas || 0),
      0
    );

    document.getElementById("asistenciasHoy").textContent = asistenciasHoy;
    document.getElementById("tardanzasHoy").textContent = tardanzasHoy;
  }

  async cargarUltimasAsistencias() {
    try {
      const fechaHoy = new Date().toISOString().split("T")[0];
      const response = await fetch(`/api/asistencias/fecha/${fechaHoy}`);

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          this.mostrarUltimasAsistencias(data.asistencias.slice(0, 10));
        }
      }
    } catch (error) {
      console.error("Error cargando últimas asistencias:", error);
    }
  }

  mostrarUltimasAsistencias(asistencias) {
    const container = document.getElementById("recentAsistencias");
    container.innerHTML = "";

    if (asistencias.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #7f8c8d; padding: 20px;">No hay asistencias registradas hoy</p>';
      return;
    }

    asistencias.forEach((asistencia) => {
      const item = document.createElement("div");
      item.className = "recent-item";

      const entrada = asistencia.HoraEntrada
        ? new Date(asistencia.HoraEntrada).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--";

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
    const ctx = document.getElementById("asistenciasChart").getContext("2d");

    if (this.chart) {
      this.chart.destroy();
    }

    // ✅ USAR EMPRESAS REALES
    const labels = this.empresas.map((empresa) => empresa.Nombre);

    // ✅ CREAR OBJETO PARA MAPEAR EMPRESAS CON SUS ASISTENCIAS
    const asistenciasPorEmpresa = {};

    // Inicializar todas las empresas con 0 asistencias
    this.empresas.forEach((empresa) => {
      asistenciasPorEmpresa[empresa.Nombre] = 0;
    });

    // ✅ USAR DATOS REALES DE ASISTENCIAS (si existen)
    if (this.estadisticas && this.estadisticas.asistenciasHoy) {
      this.estadisticas.asistenciasHoy.forEach((empresa) => {
        if (asistenciasPorEmpresa.hasOwnProperty(empresa.Empresa)) {
          asistenciasPorEmpresa[empresa.Empresa] =
            empresa.TotalAsistencias || 0;
        }
      });
    }

    // ✅ CONVERTIR A ARRAY DE DATOS REALES
    const data = labels.map((empresa) => asistenciasPorEmpresa[empresa] || 0);

    // ✅ GENERAR COLORES DINÁMICAMENTE PARA MÁS EMPRESAS
    const colores = [
      "rgba(255, 107, 107, 0.8)", // Rojo
      "rgba(30, 144, 255, 0.8)", // Azul
      "rgba(46, 139, 87, 0.8)", // Verde
      "rgba(155, 89, 182, 0.8)", // Púrpura
      "rgba(241, 196, 15, 0.8)", // Amarillo
      "rgba(230, 126, 34, 0.8)", // Naranja
      "rgba(52, 152, 219, 0.8)", // Azul claro
      "rgba(142, 68, 173, 0.8)", // Violeta
      "rgba(39, 174, 96, 0.8)", // Verde esmeralda
      "rgba(211, 84, 0, 0.8)", // Naranja oscuro
    ];

    this.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Asistencias Hoy",
            data: data,
            backgroundColor: labels.map(
              (_, index) => colores[index % colores.length]
            ),
            borderColor: labels.map((_, index) =>
              colores[index % colores.length].replace("0.8", "1")
            ),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  async inicializar() {
    await this.cargarEmpresas();
    await this.cargarDashboard();
    await this.cargarSelectEmpresasReporte();

    // ✅ AGREGAR ESTO: Establecer fecha actual en el filtro
    this.establecerFechaActual();

    // Cargar asistencias del día actual
    await this.cargarAsistencias();
  }

  // ✅ AGREGAR ESTA NUEVA FUNCIÓN
  establecerFechaActual() {
    const fechaInput = document.getElementById("fechaFiltro");
    if (fechaInput) {
      const hoy = new Date().toISOString().split("T")[0];
      fechaInput.value = hoy;
    }
  }

  // ========== GESTIÓN DE EMPLEADOS ==========

  async cargarEmpleados() {
    this.mostrarLoading(true);

    try {
      const response = await fetch("/api/empleados");
      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          this.empleados = data.empleados;
          this.mostrarEmpleados(this.empleados);
        } else {
          this.mostrarError("Error al cargar empleados");
        }
      } else {
        this.mostrarError("Error de conexión al cargar empleados");
      }
    } catch (error) {
      console.error("Error cargando empleados:", error);
      this.mostrarError("Error al cargar empleados");
    } finally {
      this.mostrarLoading(false);
    }
  }

  mostrarEmpleados() {
    const tbody = document.getElementById("tablaEmpleados");
    tbody.innerHTML = "";

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

    this.empleados.forEach((empleado) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
                <td>${empleado.EmpleadoID}</td>
                <td>${empleado.Nombre} ${empleado.Apellidos}</td>
                <td>${empleado.DNI}</td>
                <td>${empleado.EmpresaNombre}</td>
                <td>${empleado.Cargo || "N/A"}</td>
                <td>${empleado.Usuario}</td>
                <td>
                    <span class="status-badge ${
                      empleado.Activo ? "status-presente" : "status-ausente"
                    }">
                        ${empleado.Activo ? "Activo" : "Inactivo"}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="adminPanel.editarEmpleado(${
                      empleado.EmpleadoID
                    })">✏️ Editar</button>
                    <button class="btn-delete" onclick="adminPanel.eliminarEmpleado(${
                      empleado.EmpleadoID
                    })">🗑️ Eliminar</button>
                </td>
            `;

      tbody.appendChild(tr);
    });
  }
  // ========== ELIMINAR EMPLEADO ==========
  async eliminarEmpleado(empleadoId) {
    console.log(
      "🆔 ID recibido para eliminar:",
      empleadoId,
      "Tipo:",
      typeof empleadoId
    );

    const idNumerico = parseInt(empleadoId);

    if (isNaN(idNumerico)) {
      console.error("❌ ID inválido:", empleadoId);
      this.mostrarError("ID de empleado inválido");
      return;
    }

    // ✅ SOLUCIÓN: Usar localStorage en lugar de variable global
    localStorage.setItem("empleadoAEliminar", idNumerico.toString());
    console.log(
      "✅ ID guardado en localStorage:",
      localStorage.getItem("empleadoAEliminar")
    );

    this.mostrarConfirmModal();
  }

  // ========== MODAL DE CONFIRMACIÓN ==========
  mostrarConfirmModal() {
    const modal = document.getElementById("confirmModal");
    if (modal) {
      modal.classList.remove("hidden");
    } else {
      console.error("❌ No se encontró el modal de confirmación");
    }
  }

  cerrarConfirmModal() {
    const modal = document.getElementById("confirmModal");
    if (modal) {
      modal.classList.add("hidden");
    }
    // ✅ NO limpiar localStorage aquí
  }

  async confirmarEliminacion() {
    // ✅ SOLUCIÓN: Obtener ID de localStorage
    const idGuardado = localStorage.getItem("empleadoAEliminar");
    console.log("🔍 ID recuperado de localStorage:", idGuardado);
    console.log("🔍 Tipo:", typeof idGuardado);

    if (!idGuardado) {
      console.error("❌ No hay ID guardado en localStorage");
      this.mostrarError("No se pudo identificar el empleado a eliminar");
      return;
    }

    const idNumerico = parseInt(idGuardado);
    if (isNaN(idNumerico)) {
      console.error("❌ ID inválido en localStorage:", idGuardado);
      this.mostrarError("ID de empleado inválido");
      return;
    }

    this.mostrarLoading(true);
    this.cerrarConfirmModal();

    try {
      // ✅ USAR el ID de localStorage
      const url = `/api/empleados/${idNumerico}`;
      console.log("🌐 URL final:", url);

      const response = await fetch(url, {
        method: "DELETE",
      });

      console.log("📡 Respuesta del servidor:", response.status);

      const data = await response.json();
      console.log("📊 Datos de respuesta:", data);

      if (data.success) {
        this.mostrarMensaje("success", "Empleado eliminado exitosamente");
        await this.cargarEmpleados();
      } else {
        throw new Error(data.message || "Error eliminando empleado");
      }
    } catch (error) {
      console.error("❌ Error eliminando empleado:", error);
      this.mostrarError("Error al eliminar empleado: " + error.message);
    } finally {
      this.mostrarLoading(false);
      // ✅ Limpiar localStorage al final
      localStorage.removeItem("empleadoAEliminar");
    }
  }

  async abrirModalEmpleado(empleado = null) {
    const modal = document.getElementById("empleadoModal");
    const titulo = document.getElementById("modalEmpleadoTitulo");

    // ✅ PRIMERO LIMPIAR COMPLETAMENTE EL MODAL
    limpiarModalEmpleadoCompleto();

    // Cargar empresas
    await this.cargarEmpresas();
    await this.cargarSelectEmpresas();
    this.generarHorariosSemanales();

    if (empleado) {
      titulo.textContent = "Editar Empleado";
      this.cargarDatosEmpleadoForm(empleado);

      // ✅ SOLO AL EDITAR: Mostrar placeholder de contraseña
      const passwordInput = document.getElementById("empleadoContraseña");
      if (passwordInput) {
        passwordInput.required = false;
        passwordInput.placeholder =
          "Dejar vacío para mantener contraseña actual";
      }
    } else {
      titulo.textContent = "Nuevo Empleado";
      document.getElementById("empleadoId").value = "";

      // ✅ EN NUEVO EMPLEADO: Contraseña requerida sin placeholder especial
      const passwordInput = document.getElementById("empleadoContraseña");
      if (passwordInput) {
        passwordInput.required = true;
        passwordInput.placeholder = "";
      }
    }

    modal.classList.remove("hidden");
  }

  cargarDatosEmpleadoForm(empleado) {
    console.log("Cargando datos del empleado:", empleado);

    document.getElementById("empleadoId").value = empleado.EmpleadoID;
    document.getElementById("empleadoNombre").value = empleado.Nombre;
    document.getElementById("empleadoApellidos").value = empleado.Apellidos;
    document.getElementById("empleadoDNI").value = empleado.DNI;
    document.getElementById("empleadoTelefono").value = empleado.Telefono || "";
    document.getElementById("empleadoDireccion").value =
      empleado.Direccion || "";
    document.getElementById("empleadoCargo").value = empleado.Cargo || "";
    document.getElementById("empleadoUsuario").value = empleado.Usuario;

    // ✅ CORREGIR: Esperar a que el select se llene
    setTimeout(() => {
      document.getElementById("empleadoEmpresa").value = empleado.EmpresaID;
      console.log("Empresa seleccionada:", empleado.EmpresaID);
    }, 200);

    // ✅ MEJORAR: Contraseña segura
    document.getElementById("empleadoContraseña").value = "";
    document.getElementById("empleadoContraseña").placeholder =
      "Dejar vacío para mantener contraseña actual";
    document.getElementById("empleadoContraseña").required = false;

    // Cargar foto si existe
    if (empleado.FotoPath) {
      const preview = document.getElementById("previewImage");
      const noPhoto = document.getElementById("noPhotoText");
      const removeBtn = document.getElementById("removePhotoBtn");

      preview.src = `../${empleado.FotoPath}`;
      preview.style.display = "block";
      noPhoto.style.display = "none";
      removeBtn.classList.remove("hidden");
    }

    // ✅ CARGAR FECHAS DE TURNO
    const fechaInicioInput = document.getElementById("fechaInicioTurno");
    const fechaFinInput = document.getElementById("fechaFinTurno");

    if (fechaInicioInput && empleado.FechaInicioTurnoStr) {
      fechaInicioInput.value = empleado.FechaInicioTurnoStr;
    }
    if (fechaFinInput && empleado.FechaFinTurnoStr) {
      fechaFinInput.value = empleado.FechaFinTurnoStr;
    }

    console.log("📅 Fechas cargadas:", {
      inicio: empleado.FechaInicioTurnoStr,
      fin: empleado.FechaFinTurnoStr,
    });

    // ✅ CORREGIR: Cargar horarios correctamente
    console.log("Horarios del empleado desde BD:", empleado.Horarios);

    // Primero desactivar TODOS los horarios
    for (let i = 1; i <= 7; i++) {
      const checkbox = document.getElementById(`horario_${i}`);
      const entrada = document.getElementById(`entrada_${i}`);
      const salida = document.getElementById(`salida_${i}`);

      if (checkbox) {
        checkbox.checked = false;
        entrada.disabled = true;
        salida.disabled = true;
        entrada.value = "";
        salida.value = "";
      }
    }

    // Luego activar SOLO los horarios guardados en BD
    if (empleado.Horarios && Array.isArray(empleado.Horarios)) {
      empleado.Horarios.forEach((horario) => {
        const dia = horario.DiaSemana;
        const checkbox = document.getElementById(`horario_${dia}`);
        const entrada = document.getElementById(`entrada_${dia}`);
        const salida = document.getElementById(`salida_${dia}`);

        console.log(`📅 Procesando día ${dia}:`, { checkbox, entrada, salida });

        if (checkbox && entrada && salida && horario.Activo) {
          // ✅ ACTIVAR CHECKBOX
          checkbox.checked = true;
          entrada.disabled = false;
          salida.disabled = false;

          // ✅ FORMATEAR HORAS SIMPLE
          let horaEntrada = horario.HoraEntrada
            ? horario.HoraEntrada.substring(0, 5)
            : "08:00";
          let horaSalida = horario.HoraSalida
            ? horario.HoraSalida.substring(0, 5)
            : "17:00";

          // ✅ ASIGNAR VALORES DIRECTAMENTE
          entrada.value = horaEntrada;
          salida.value = horaSalida;

          console.log(`✅ Día ${dia} cargado: ${horaEntrada} - ${horaSalida}`);
          console.log(`✅ Inputs - Entrada:`, entrada, `Valor:`, entrada.value);
          console.log(`✅ Inputs - Salida:`, salida, `Valor:`, salida.value);
        } else {
          console.log(`❌ No se pudo cargar día ${dia}:`, {
            checkbox: !!checkbox,
            entrada: !!entrada,
            salida: !!salida,
            activo: horario.Activo,
          });
        }
      });
    } else {
      console.log("❌ No se encontraron horarios para este empleado");
    }
  }

  async cargarSelectEmpresas() {
    const select = document.getElementById("empleadoEmpresa");

    // ✅ VERIFICAR SI EL SELECT EXISTE
    if (!select) {
      console.error("No se encontró el select de empresas");
      return;
    }

    select.innerHTML = '<option value="">Seleccionar empresa</option>';

    // ✅ ASEGURARSE DE QUE LAS EMPRESAS ESTÁN CARGADAS
    if (this.empresas.length === 0) {
      console.log("Cargando empresas...");
      await this.cargarEmpresas();
    }

    console.log("Empresas disponibles:", this.empresas);

    // ✅ LLENAR EL SELECT
    this.empresas.forEach((empresa) => {
      const option = document.createElement("option");
      option.value = empresa.EmpresaID;
      option.textContent = empresa.Nombre;
      select.appendChild(option);
    });

    console.log("Select actualizado con", this.empresas.length, "empresas");
  }

  async guardarEmpleado() {
    this.mostrarLoading(true);

    try {
      const formData = this.obtenerDatosEmpleadoForm();
      const esEdicion = !!formData.empleadoId;

      // ✅ AGREGAR LOGS PARA DEPURAR
      console.log("📊 Datos del formulario:", formData);
      console.log("📅 Horarios a enviar:", formData.horarios);
      // ✅ AGREGAR LOGS DETALLADOS PARA VERIFICAR DNI
      console.log("🔍 DATOS DEL FORMULARIO COMPLETOS:", formData);
      console.log("🔍 DNI en formData:", formData.dni);
      console.log(
        "🔍 ¿Existe empleadoDNI en el DOM?",
        document.getElementById("empleadoDNI")
      );
      console.log(
        "🔍 Valor de empleadoDNI:",
        document.getElementById("empleadoDNI").value
      );

      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();

      // ✅ SOLUCIÓN DEFINITIVA: Agregar campos manualmente para evitar problemas
      formDataToSend.append("empleadoId", formData.empleadoId || "");
      formDataToSend.append("nombre", formData.nombre);
      formDataToSend.append("apellidos", formData.apellidos);
      formDataToSend.append("dni", formData.dni); // ← ¡IMPORTANTE!
      formDataToSend.append("telefono", formData.telefono || "");
      formDataToSend.append("direccion", formData.direccion || "");
      formDataToSend.append("cargo", formData.cargo || "");
      formDataToSend.append("empresaId", formData.empresaId);
      formDataToSend.append("usuario", formData.usuario);
      formDataToSend.append("contraseña", formData.contraseña || "");
      formDataToSend.append(
        "fechaInicioTurno",
        formData.fechaInicioTurno || ""
      );
      formDataToSend.append("fechaFinTurno", formData.fechaFinTurno || "");

      if (formData.horarios) {
        console.log("📅 Enviando horarios:", formData.horarios);
        formDataToSend.append("horarios", JSON.stringify(formData.horarios));
      }

      if (formData.fotoFile) {
        formDataToSend.append("foto", formData.fotoFile);
      }

      // ✅ VERIFICAR QUE HORARIOS SE ENVÍAN
      console.log("📦 FormData completo:");
      for (let pair of formDataToSend.entries()) {
        console.log(pair[0] + ": ", pair[1]);
      }

      const url = esEdicion
        ? `/api/empleados/${formData.empleadoId}`
        : "/api/empleados";
      const method = esEdicion ? "PUT" : "POST";

      console.log("🌐 Enviando a:", url, "Método:", method);

      const response = await fetch(url, {
        method: method,
        body: formDataToSend,
      });

      const data = await response.json();
      console.log("📡 Respuesta del servidor:", data);

      if (data.success) {
        this.mostrarMensaje(
          "success",
          `Empleado ${esEdicion ? "actualizado" : "creado"} exitosamente`
        );
        this.cerrarModalEmpleado();
        await this.cargarEmpleados();
      } else {
        throw new Error(data.message || "Error guardando empleado");
      }
    } catch (error) {
      console.error("Error guardando empleado:", error);
      this.mostrarError(error.message);
    } finally {
      this.mostrarLoading(false);
    }
  }

  // Función para generar horarios semanales
  generarHorariosSemanales() {
    const container = document.getElementById("horariosContainer");
    const dias = [
      { id: 1, nombre: "Lunes" },
      { id: 2, nombre: "Martes" },
      { id: 3, nombre: "Miércoles" },
      { id: 4, nombre: "Jueves" },
      { id: 5, nombre: "Viernes" },
      { id: 6, nombre: "Sábado" },
      { id: 7, nombre: "Domingo" },
    ];

    container.innerHTML = "";

    dias.forEach((dia) => {
      const horarioItem = document.createElement("div");
      horarioItem.className = "horario-item";
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
      if (!entrada.value) entrada.value = "08:00";
      if (!salida.value) salida.value = "17:00";
    } else {
      entrada.disabled = true;
      salida.disabled = true;
      entrada.value = "";
      salida.value = "";
    }
  }

  // Función para subir foto
  previewPhoto(input) {
    const preview = document.getElementById("previewImage");
    const noPhoto = document.getElementById("noPhotoText");

    if (input.files && input.files[0]) {
      const reader = new FileReader();

      reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = "block";
        noPhoto.style.display = "none";
      };

      reader.readAsDataURL(input.files[0]);
    }
  }

  // Función para mostrar/ocultar contraseña
  togglePassword() {
    const passwordInput = document.getElementById("empleadoContraseña");
    const toggleBtn = document.querySelector(".toggle-password");

    if (passwordInput.type === "password") {
      passwordInput.type = "text";
      toggleBtn.textContent = "🙈";
    } else {
      passwordInput.type = "password";
      toggleBtn.textContent = "👁️";
    }
  }

  // Modificar la función de obtener datos del formulario
  obtenerDatosEmpleadoForm() {
    const horarios = [];

    // Recoger horarios
    for (let i = 1; i <= 7; i++) {
      const checkbox = document.getElementById(`horario_${i}`);
      const entrada = document.getElementById(`entrada_${i}`);
      const salida = document.getElementById(`salida_${i}`);

      if (checkbox && checkbox.checked) {
        horarios.push({
          dia: i,
          activo: true,
          horaEntrada: entrada.value,
          horaSalida: salida.value,
        });
      }
    }

    // ✅ AGREGAR FECHAS DE TURNO
    const fechaInicio = document.getElementById("fechaInicioTurno").value;
    const fechaFin = document.getElementById("fechaFinTurno").value;

    console.log("📅 Fechas de turno:", { fechaInicio, fechaFin });

    return {
      empleadoId: document.getElementById("empleadoId").value || null,
      nombre: document.getElementById("empleadoNombre").value,
      apellidos: document.getElementById("empleadoApellidos").value,
      dni: document.getElementById("empleadoDNI").value,
      telefono: document.getElementById("empleadoTelefono").value,
      direccion: document.getElementById("empleadoDireccion").value,
      cargo: document.getElementById("empleadoCargo").value,
      empresaId: parseInt(document.getElementById("empleadoEmpresa").value),
      usuario: document.getElementById("empleadoUsuario").value,
      contraseña: document.getElementById("empleadoContraseña").value,
      fotoFile: document.getElementById("empleadoFoto").files[0],
      horarios: horarios,
      // ✅ NUEVOS CAMPOS
      fechaInicioTurno: fechaInicio,
      fechaFinTurno: fechaFin || null,
    };
  }

  async editarEmpleado(empleadoId) {
    this.mostrarLoading(true);

    try {
      // Obtener datos completos del empleado
      const response = await fetch(`/api/empleados/${empleadoId}`);
      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          // ✅ NO obtener contraseña - ES SEGURO
          await this.abrirModalEmpleado(data.empleado);
        } else {
          throw new Error("Error cargando datos del empleado");
        }
      } else {
        throw new Error("Error en la respuesta del servidor");
      }
    } catch (error) {
      console.error("Error cargando empleado:", error);
      this.mostrarError("Error al cargar datos del empleado");
    } finally {
      this.mostrarLoading(false);
    }
  }

  cerrarModalEmpleado() {
    document.getElementById("empleadoModal").classList.add("hidden");
  }

  // ========== GESTIÓN DE EMPRESAS ==========

  async cargarEmpresas() {
    try {
      const response = await fetch("/api/empresas");
      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          this.empresas = data.empresas;
          this.mostrarEmpresas();
        }
      }
    } catch (error) {
      console.error("Error cargando empresas:", error);
    }
  }

  mostrarEmpresas() {
    const container = document.getElementById("empresasGrid");
    container.innerHTML = "";

    if (this.empresas.length === 0) {
      container.innerHTML = `
                <div style="text-align: center; color: #7f8c8d; padding: 40px; grid-column: 1 / -1;">
                    No hay empresas registradas
                </div>
            `;
      return;
    }

    this.empresas.forEach((empresa) => {
      const card = document.createElement("div");
      card.className = "empresa-card";

      card.innerHTML = `
                <div class="empresa-logo">
                    <img src="../${
                      empresa.LogoPath || "images/logo-sistema.png"
                    }" alt="${empresa.Nombre}">
                </div>
                <h3>${empresa.Nombre}</h3>
                <p>${empresa.Descripcion || "Sin descripción"}</p>
                <div class="empresa-actions">
                    <button class="btn-edit" onclick="adminPanel.editarEmpresa(${
                      empresa.EmpresaID
                    })">✏️ Editar</button>
                    <button class="btn-delete" onclick="adminPanel.eliminarEmpresa(${
                      empresa.EmpresaID
                    })">🗑️ Eliminar</button>
                </div>
            `;

      container.appendChild(card);
    });
  }

  abrirModalEmpresa(empresa = null) {
    const modal = document.getElementById("empresaModal");
    const titulo = document.getElementById("modalEmpresaTitulo");
    const form = document.getElementById("formEmpresa");

    form.reset();

    // ✅ RESETEAR PREVIEW DEL LOGO
    const preview = document.getElementById("previewLogoImage");
    const noLogo = document.getElementById("noLogoText");
    preview.style.display = "none";
    noLogo.style.display = "inline";
    document.getElementById("empresaLogo").value = "";

    if (empresa) {
      titulo.textContent = "Editar Empresa";
      this.cargarDatosEmpresaForm(empresa);
    } else {
      titulo.textContent = "Nueva Empresa";
      document.getElementById("empresaId").value = "";
    }

    modal.classList.remove("hidden");
  }

  cargarDatosEmpresaForm(empresa) {
    document.getElementById("empresaId").value = empresa.EmpresaID;
    document.getElementById("empresaNombre").value = empresa.Nombre;
    document.getElementById("empresaDescripcion").value =
      empresa.Descripcion || "";

    // ✅ MOSTRAR LOGO ACTUAL EN EL PREVIEW
    const preview = document.getElementById("previewLogoImage");
    const noLogo = document.getElementById("noLogoText");

    if (empresa.LogoPath && empresa.LogoPath !== "images/logo-empresa.png") {
      preview.src = `../${empresa.LogoPath}`;
      preview.style.display = "block";
      noLogo.style.display = "none";
    } else {
      preview.style.display = "none";
      noLogo.style.display = "inline";
    }

    // Limpiar el input file
    document.getElementById("empresaLogo").value = "";
  }
  async guardarEmpresa() {
    this.mostrarLoading(true);

    try {
      const formData = new FormData();
      const empresaId = document.getElementById("empresaId").value;
      const nombre = document.getElementById("empresaNombre").value;
      const descripcion = document.getElementById("empresaDescripcion").value;
      const logoFile = document.getElementById("empresaLogo").files[0];

      console.log("Datos empresa:", {
        empresaId,
        nombre,
        descripcion,
        logoFile,
      });

      if (!nombre) {
        throw new Error("El nombre de la empresa es requerido");
      }

      // Agregar datos al FormData
      formData.append("nombre", nombre);
      formData.append("descripcion", descripcion);

      // Agregar archivo si existe
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const esEdicion = !!empresaId;
      const url = esEdicion ? `/api/empresas/${empresaId}` : "/api/empresas";
      const method = esEdicion ? "PUT" : "POST";

      console.log("Enviando a:", url, "Método:", method);

      const response = await fetch(url, {
        method: method,
        body: formData, // ✅ IMPORTANTE: NO enviar headers Content-Type
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        this.mostrarMensaje(
          "success",
          `Empresa ${esEdicion ? "actualizada" : "creada"} exitosamente`
        );
        this.cerrarModalEmpresa();
        await this.cargarEmpresas();

        // Recargar el dashboard para que aparezca en index.html
        await this.cargarDashboard();
      } else {
        throw new Error(data.message || "Error guardando empresa");
      }
    } catch (error) {
      console.error("Error guardando empresa:", error);
      this.mostrarError("Error al guardar empresa: " + error.message);
    } finally {
      this.mostrarLoading(false);
    }
  }

  obtenerDatosEmpresaForm() {
    return {
      empresaId: document.getElementById("empresaId").value || null,
      nombre: document.getElementById("empresaNombre").value,
      descripcion: document.getElementById("empresaDescripcion").value,
      logoPath: document.getElementById("empresaLogo").value,
    };
  }

  async editarEmpresa(empresaId) {
    const empresa = this.empresas.find((e) => e.EmpresaID === empresaId);
    if (empresa) {
      this.abrirModalEmpresa(empresa);
    }
  }

  async eliminarEmpresa(empresaId) {
    // Guardar el ID de la empresa a eliminar
    localStorage.setItem("empresaAEliminar", empresaId.toString());

    // Mostrar tu modal personalizado en lugar del confirm nativo
    this.mostrarConfirmModalEmpresa();
  }

  // AGREGAR esta nueva función para el modal de empresas
  mostrarConfirmModalEmpresa() {
    const modal = document.getElementById("confirmModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  // MODIFICAR la función confirmarEliminacion para manejar empresas
  async confirmarEliminacion() {
    // Verificar si es empleado o empresa
    const idEmpleado = localStorage.getItem("empleadoAEliminar");
    const idEmpresa = localStorage.getItem("empresaAEliminar");

    this.mostrarLoading(true);
    this.cerrarConfirmModal();

    try {
      if (idEmpleado) {
        // Código existente para eliminar empleado...
        const idNumerico = parseInt(idEmpleado);
        const url = `/api/empleados/${idNumerico}`;

        const response = await fetch(url, { method: "DELETE" });
        const data = await response.json();

        if (data.success) {
          this.mostrarMensaje("success", "Empleado eliminado exitosamente");
          await this.cargarEmpleados();
        } else {
          throw new Error(data.message || "Error eliminando empleado");
        }

        localStorage.removeItem("empleadoAEliminar");
      } else if (idEmpresa) {
        // Nuevo código para eliminar empresa
        const idNumerico = parseInt(idEmpresa);
        const url = `/api/empresas/${idNumerico}`;

        const response = await fetch(url, { method: "DELETE" });
        const data = await response.json();

        if (data.success) {
          this.mostrarMensaje("success", "Empresa eliminada exitosamente");
          await this.cargarEmpresas();
        } else {
          throw new Error(data.message || "Error eliminando empresa");
        }

        localStorage.removeItem("empresaAEliminar");
      }
    } catch (error) {
      console.error("Error eliminando:", error);
      this.mostrarError("Error al eliminar: " + error.message);
    } finally {
      this.mostrarLoading(false);
    }
  }

  cerrarModalEmpresa() {
    document.getElementById("empresaModal").classList.add("hidden");
  }

  // ========== ASISTENCIAS ==========
  async cargarAsistencias() {
    this.mostrarLoading(true);

    try {
      let fecha = document.getElementById("fechaFiltro").value;
      if (!fecha) {
        // ✅ CORREGIR: Usar la función correcta
        fecha = this.obtenerFechaActualPeru();
        document.getElementById("fechaFiltro").value = fecha;
      }
      const empresaId = document.getElementById("empresaFiltro").value;

      console.log("🔍 Filtros aplicados:", { fecha, empresaId });

      let url = `/api/asistencias/fecha/${fecha}`;
      console.log("🌐 URL de consulta:", url);

      const response = await fetch(url);
      console.log("📡 Respuesta del servidor:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("📊 Datos recibidos del servidor:", data);

        if (data.success) {
          let asistencias = data.asistencias;
          console.log("👥 Asistencias recibidas:", asistencias);

          // Filtrar por empresa si se seleccionó una
          if (empresaId) {
            console.log("🎯 Filtrando por empresa ID:", empresaId);
            asistencias = asistencias.filter((a) => a.EmpresaID == empresaId);
            console.log("📋 Asistencias después del filtro:", asistencias);
          }

          // ✅ GUARDAR DATOS PARA EXPORTACIÓN
          this.asistencias = asistencias;
          console.log(
            "💾 Datos guardados en this.asistencias:",
            this.asistencias
          );

          this.mostrarAsistencias(asistencias);
        }
      } else {
        console.error(
          "❌ Error en la respuesta del servidor:",
          response.status
        );
      }
    } catch (error) {
      console.error("Error cargando asistencias:", error);
      this.mostrarError("Error al cargar asistencias");
    } finally {
      this.mostrarLoading(false);
    }
  }

  // ========== ASISTENCIAS HOY ==========
  async cargarAsistenciasHoy() {
    try {
      const fechaHoy = new Date().toISOString().split("T")[0];
      const response = await fetch(`/api/asistencias/fecha/${fechaHoy}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Procesar asistencias del día si es necesario
          console.log(
            "✅ Asistencias de hoy cargadas:",
            data.asistencias.length
          );
        }
      }
    } catch (error) {
      console.error("Error cargando asistencias de hoy:", error);
    }
  }

  mostrarAsistencias(asistencias) {
    const tbody = document.getElementById("tablaAsistencias");
    tbody.innerHTML = "";

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

    asistencias.forEach((asistencia) => {
      const tr = document.createElement("tr");

      const entrada = asistencia.HoraEntrada
        ? new Date(asistencia.HoraEntrada).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--";

      const salida = asistencia.HoraSalida
        ? new Date(asistencia.HoraSalida).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--:--";

      // ✅ CORREGIR: La fecha ya viene como "2025-11-16T00:00:00.000Z"
      // Extraer solo la parte YYYY-MM-DD y convertir a fecha Perú
      const fechaString = asistencia.Fecha.split("T")[0]; // "2025-11-16"
      const fecha = new Date(fechaString + "T00:00:00-05:00"); // Forzar hora Perú
      const fechaFormateada = fecha.toLocaleDateString("es-ES");

      // ✅ BOTÓN DE MAPA CORREGIDO
      const ubicacion =
        asistencia.LatitudEntrada && asistencia.LongitudEntrada
          ? `<button class="btn-map" onclick="verEnMapa(${asistencia.LatitudEntrada}, ${asistencia.LongitudEntrada})">
                    📍 Ver en Mapa
                </button>`
          : "No registrada";

      tr.innerHTML = `
            <td>${asistencia.Nombre} ${asistencia.Apellidos}</td>
            <td>${asistencia.EmpresaNombre}</td>
            <td>${fechaFormateada}</td> <!-- ✅ FECHA CORREGIDA -->
            <td>${entrada}</td>
            <td>${salida}</td>
            <td>
                <span class="status-badge status-${
                  asistencia.Estado?.toLowerCase() || "presente"
                }">
                    ${asistencia.Estado || "Presente"}
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

  // Agrega esta función a la clase AdminPanel
  async verificarEmpresas() {
    try {
      const response = await fetch("/api/empresas");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log("🏢 Empresas disponibles:", data.empresas);
        }
      }
    } catch (error) {
      console.error("Error verificando empresas:", error);
    }
  }

  // ========== REPORTES ==========

  async cargarReportes() {
    // Cargar select de empresas para reportes
    await this.cargarSelectEmpresasReporte();

    // ✅ CORREGIR: Establecer fechas por defecto CORRECTAS
    const fechaFin = new Date();
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - 7); // Última semana

    // ✅ USAR FECHA CORREGIDA - HOY es 17/11/2025, no 18/11/2025
    document.getElementById("fechaInicioReporte").value =
      this.obtenerFechaActualPeru(fechaInicio);
    document.getElementById("fechaFinReporte").value =
      this.obtenerFechaActualPeru(fechaFin); // Esto debería ser 2025-11-17

    console.log("📊 Fechas de reporte inicializadas:", {
      fechaInicio: this.obtenerFechaActualPeru(fechaInicio),
      fechaFin: this.obtenerFechaActualPeru(fechaFin),
      hoy: new Date().toLocaleDateString("es-PE"),
    });
  }

  // ✅ AGREGAR ESTA FUNCIÓN
  obtenerFechaActualPeru(fecha = new Date()) {
    // Perú es UTC-5
    const offsetPeru = -5 * 60;
    const offsetLocal = fecha.getTimezoneOffset();
    const diferencia = offsetLocal - offsetPeru;

    const fechaPeru = new Date(fecha.getTime() + diferencia * 60000);
    return fechaPeru.toISOString().split("T")[0];
  }

  async cargarSelectEmpresasReporte() {
    const select = document.getElementById("empresaReporte");
    const selectFiltro = document.getElementById("empresaFiltro");

    select.innerHTML = '<option value="">Todas las empresas</option>';
    selectFiltro.innerHTML = '<option value="">Todas las empresas</option>';

    if (this.empresas.length === 0) {
      await this.cargarEmpresas();
    }

    this.empresas.forEach((empresa) => {
      [select, selectFiltro].forEach((sel) => {
        const option = document.createElement("option");
        option.value = empresa.EmpresaID;
        option.textContent = empresa.Nombre;
        sel.appendChild(option);
      });
    });
  }

  async generarReporte() {
    this.mostrarLoading(true);

    try {
      const fechaInicio = document.getElementById("fechaInicioReporte").value;
      const fechaFin = document.getElementById("fechaFinReporte").value;
      const empresaId = document.getElementById("empresaReporte").value;

      if (!fechaInicio || !fechaFin) {
        this.mostrarError("Selecciona un rango de fechas");
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
      console.error("Error generando reporte:", error);
      this.mostrarError("Error al generar reporte");
    } finally {
      this.mostrarLoading(false);
    }
  }

  mostrarReporte(reporte, resumen) {
    // Mostrar estadísticas
    const statsContainer = document.getElementById("reporteStats");
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
    const tbody = document.getElementById("tablaReporte");
    tbody.innerHTML = "";

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

    reporte.forEach((registro) => {
      const tr = document.createElement("tr");

      const horasTrabajadas = registro.MinutosTrabajados
        ? `${Math.floor(registro.MinutosTrabajados / 60)}h ${
            registro.MinutosTrabajados % 60
          }m`
        : "N/A";

      // ✅ CORREGIR: La fecha ya viene como "2025-11-16T00:00:00.000Z"
      // Extraer solo la parte YYYY-MM-DD y convertir a fecha Perú
      const fechaString = registro.Fecha.split("T")[0]; // "2025-11-16"
      const fecha = new Date(fechaString + "T00:00:00-05:00"); // Forzar hora Perú
      const fechaFormateada = fecha.toLocaleDateString("es-ES");

      tr.innerHTML = `
            <td>${registro.Nombre} ${registro.Apellidos}</td>
            <td>${registro.EmpresaNombre}</td>
            <td>${fechaFormateada}</td> <!-- ✅ FECHA CORREGIDA -->
            <td>${horasTrabajadas}</td>
            <td>
                <span class="status-badge status-${
                  registro.Estado?.toLowerCase() || "presente"
                }">
                    ${registro.Estado || "Presente"}
                </span>
            </td>
        `;

      tbody.appendChild(tr);
    });
  }

  // ✅ FUNCIÓN MEJORADA PARA EXPORTAR REPORTES A PDF (TABLA ORGANIZADA)
  exportarPDFReportes() {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Configuración
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Título principal
      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.text("REPORTE DETALLADO DE ASISTENCIAS", pageWidth / 2, yPosition, {
        align: "center",
      });
      yPosition += 8;

      // Información del reporte
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const fechaInicio = document.getElementById("fechaInicioReporte").value;
      const fechaFin = document.getElementById("fechaFinReporte").value;
      const empresaId = document.getElementById("empresaReporte").value;
      const empresaNombre = empresaId
        ? document.getElementById("empresaReporte").options[
            document.getElementById("empresaReporte").selectedIndex
          ].text
        : "Todas las empresas";

      doc.text(
        `Período: ${fechaInicio} al ${fechaFin} | Empresa: ${empresaNombre}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 6;

      doc.text(
        `Generado: ${new Date().toLocaleDateString(
          "es-ES"
        )} ${new Date().toLocaleTimeString("es-ES")}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 15;

      // Estadísticas del reporte
      const statsContainer = document.getElementById("reporteStats");
      if (statsContainer && statsContainer.children.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(44, 62, 80);
        doc.text("RESUMEN ESTADÍSTICO", 20, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // Crear tabla de estadísticas
        const stats = statsContainer.getElementsByClassName("report-stat");
        const statsData = [];

        for (let i = 0; i < Math.min(stats.length, 4); i++) {
          const stat = stats[i];
          const label = stat.querySelector("h4").textContent;
          const value = stat.querySelector(".number").textContent;
          statsData.push([label, value]);
        }

        // Dibujar tabla de estadísticas
        doc.autoTable({
          startY: yPosition,
          head: [["ESTADÍSTICA", "VALOR"]],
          body: statsData,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [44, 62, 80], textColor: 255 },
          margin: { left: 20, right: 20 },
        });

        yPosition = doc.lastAutoTable.finalY + 15;
      }

      // Obtener datos de la tabla de reportes
      const tablaReporte = document.getElementById("tablaReporte");
      const filas = tablaReporte.getElementsByTagName("tr");
      const tableData = [];

      // Convertir tabla HTML a datos para autoTable
      for (let i = 0; i < filas.length; i++) {
        const celdas = filas[i].getElementsByTagName("td");
        if (celdas.length >= 5) {
          const rowData = [
            celdas[0].textContent, // Empleado
            celdas[1].textContent, // Empresa
            celdas[2].textContent, // Fecha
            celdas[3].textContent, // Horas Trabajadas
            celdas[4].textContent, // Estado
          ];
          tableData.push(rowData);
        }
      }

      // Título de la tabla principal
      doc.setFontSize(14);
      doc.setTextColor(44, 62, 80);
      doc.text("DETALLE DE ASISTENCIAS", 20, yPosition);
      yPosition += 10;

      if (tableData.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(
          "No hay datos para mostrar en el período seleccionado",
          20,
          yPosition
        );
      } else {
        // Crear tabla principal con autoTable (MUCHO MÁS ORDENADA)
        doc.autoTable({
          startY: yPosition,
          head: [
            ["EMPLEADO", "EMPRESA", "FECHA", "HORAS TRABAJADAS", "ESTADO"],
          ],
          body: tableData,
          theme: "grid",
          styles: {
            fontSize: 8,
            cellPadding: 3,
            overflow: "linebreak",
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: [44, 62, 80],
            textColor: 255,
            fontStyle: "bold",
            lineWidth: 0.1,
          },
          bodyStyles: {
            lineWidth: 0.1,
          },
          columnStyles: {
            0: { cellWidth: 45, fontStyle: "bold" }, // Empleado
            1: { cellWidth: 35 }, // Empresa
            2: { cellWidth: 25 }, // Fecha
            3: { cellWidth: 25 }, // Horas
            4: { cellWidth: 20 }, // Estado
          },
          margin: { left: 10, right: 10 },
          pageBreak: "auto",
          tableWidth: "wrap",
        });
      }

      // Pie de página en cada página
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Página ${i} de ${totalPages} - Sistema de Asistencia`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Guardar
      const nombreArchivo = `reporte_asistencias_${fechaInicio}_a_${fechaFin}.pdf`;
      doc.save(nombreArchivo);

      this.mostrarMensaje("success", "✅ Reporte PDF exportado correctamente");
    } catch (error) {
      console.error("Error exportando reporte PDF:", error);
      this.mostrarError("Error al exportar reporte PDF: " + error.message);
    }
  }

  exportarPDF() {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Configuración
      const pageWidth = doc.internal.pageSize.getWidth();

      // Título principal
      doc.setFontSize(16);
      doc.setTextColor(44, 62, 80);
      doc.text("REGISTROS DE ASISTENCIA", pageWidth / 2, 20, {
        align: "center",
      });

      // Información del reporte
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const fecha = document.getElementById("fechaFiltro").value;
      const empresaId = document.getElementById("empresaFiltro").value;
      const empresaNombre = empresaId
        ? document.getElementById("empresaFiltro").options[
            document.getElementById("empresaFiltro").selectedIndex
          ].text
        : "Todas las empresas";

      doc.text(
        `Fecha: ${fecha} | Empresa: ${empresaNombre}`,
        pageWidth / 2,
        30,
        { align: "center" }
      );

      doc.text(
        `Generado: ${new Date().toLocaleDateString(
          "es-ES"
        )} ${new Date().toLocaleTimeString("es-ES")}`,
        pageWidth / 2,
        36,
        { align: "center" }
      );

      // Obtener datos de la tabla de asistencias
      const tablaAsistencias = document.getElementById("tablaAsistencias");
      const filas = tablaAsistencias.getElementsByTagName("tr");
      const tableData = [];

      // Convertir tabla HTML a datos para autoTable
      for (let i = 0; i < filas.length; i++) {
        const celdas = filas[i].getElementsByTagName("td");
        if (celdas.length >= 7) {
          // Formatear ubicación
          let ubicacion = "📍 Ubicación registrada";
          if (celdas[6].textContent === "No registrada") {
            ubicacion = "No registrada";
          }

          const rowData = [
            celdas[0].textContent.trim(), // Empleado
            celdas[1].textContent.trim(), // Empresa
            celdas[2].textContent.trim(), // Fecha
            celdas[3].textContent.trim(), // Entrada
            celdas[4].textContent.trim(), // Salida
            celdas[5].textContent.trim(), // Estado
            ubicacion, // Ubicación
          ];
          tableData.push(rowData);
        }
      }

      if (tableData.length === 0) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(
          "No hay asistencias registradas para la fecha seleccionada",
          20,
          60
        );
      } else {
        // Crear tabla principal con autoTable - CONFIGURACIÓN MEJORADA
        doc.autoTable({
          startY: 45,
          head: [
            [
              "EMPLEADO",
              "EMPRESA",
              "FECHA",
              "ENTRADA",
              "SALIDA",
              "ESTADO",
              "UBICACIÓN",
            ],
          ],
          body: tableData,
          theme: "grid",
          styles: {
            fontSize: 8,
            cellPadding: 4,
            lineWidth: 0.1,
            minCellHeight: 8,
          },
          headStyles: {
            fillColor: [44, 62, 80],
            textColor: 255,
            fontStyle: "bold",
            lineWidth: 0.1,
            fontSize: 8,
            cellPadding: 4,
          },
          bodyStyles: {
            lineWidth: 0.1,
            cellPadding: 4,
          },
          columnStyles: {
            0: {
              cellWidth: 38,
              fontStyle: "bold",
              overflow: "linebreak",
            }, // Empleado
            1: {
              cellWidth: 30,
              overflow: "linebreak",
            }, // Empresa
            2: {
              cellWidth: 22,
              overflow: "linebreak",
            }, // Fecha
            3: {
              cellWidth: 18,
              halign: "center",
            }, // Entrada
            4: {
              cellWidth: 18,
              halign: "center",
            }, // Salida
            5: {
              cellWidth: 20,
              halign: "center",
              fontStyle: "bold",
            }, // Estado
            6: {
              cellWidth: 24,
              overflow: "linebreak",
              fontSize: 7,
            }, // Ubicación
          },
          margin: { left: 10, right: 10 },
          pageBreak: "auto",
          tableWidth: "wrap",
          didParseCell: function (data) {
            // Centrar columnas de entrada, salida y estado
            if (
              data.column.index === 3 ||
              data.column.index === 4 ||
              data.column.index === 5
            ) {
              data.cell.styles.halign = "center";
            }

            // Hacer el texto más compacto para nombres largos
            if (data.column.index === 0 || data.column.index === 1) {
              if (data.cell.raw.length > 20) {
                data.cell.styles.fontSize = 7;
              }
            }
          },
          didDrawPage: function (data) {
            // Agregar resumen en la primera página
            if (data.pageNumber === 1) {
              const resumenY = data.cursor.y + 12;
              doc.setFontSize(9);
              doc.setTextColor(44, 62, 80);
              doc.setFont(undefined, "bold");
              doc.text(`RESUMEN:`, 14, resumenY);

              doc.setFont(undefined, "normal");
              doc.text(
                `Total registros: ${tableData.length}`,
                14,
                resumenY + 5
              );

              // Contar por estado
              const estados = {};
              tableData.forEach((row) => {
                const estado = row[5];
                estados[estado] = (estados[estado] || 0) + 1;
              });

              let estadoY = resumenY + 10;
              Object.keys(estados).forEach((estado) => {
                doc.text(`${estado}: ${estados[estado]}`, 14, estadoY);
                estadoY += 4;
              });
            }
          },
        });
      }

      // Pie de página en cada página
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Página ${i} de ${totalPages} - Sistema de Asistencia`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Guardar
      const nombreArchivo = `asistencias_${fecha}_${empresaNombre.replace(
        /\s+/g,
        "_"
      )}.pdf`;
      doc.save(nombreArchivo);

      this.mostrarMensaje("success", "✅ PDF exportado correctamente");
    } catch (error) {
      console.error("Error exportando PDF:", error);
      this.mostrarError("Error al exportar PDF: " + error.message);
    }
  }

  exportarAsistencias() {
    try {
      const fecha = document.getElementById("fechaFiltro").value;
      const empresaId = document.getElementById("empresaFiltro").value;
      const empresaNombre = empresaId
        ? document.getElementById("empresaFiltro").options[
            document.getElementById("empresaFiltro").selectedIndex
          ].text
        : "Todas";

      console.log("📊 Exportando datos...", {
        fecha,
        empresaId,
        empresaNombre,
        asistenciasEnMemoria: this.asistencias ? this.asistencias.length : 0,
      });

      // ✅ VERIFICAR SI TENEMOS DATOS EN MEMORIA
      if (!this.asistencias || this.asistencias.length === 0) {
        console.error("❌ No hay datos en this.asistencias");
        this.mostrarError(
          "No hay datos cargados para exportar. Primero filtra las asistencias."
        );
        return;
      }

      // ✅ CREAR CONTENIDO CSV CON DATOS REALES
      let csvContent =
        "Empleado,Empresa,Fecha,Entrada,Salida,Estado,Ubicación\n";

      this.asistencias.forEach((asistencia) => {
        const entrada = asistencia.HoraEntrada
          ? new Date(asistencia.HoraEntrada).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";

        const salida = asistencia.HoraSalida
          ? new Date(asistencia.HoraSalida).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--:--";

        // ✅ UBICACIÓN COMO LINK (sin botón)
        const ubicacion =
          asistencia.LatitudEntrada && asistencia.LongitudEntrada
            ? `https://maps.google.com/?q=${asistencia.LatitudEntrada},${asistencia.LongitudEntrada}`
            : "No registrada";

        const fila = [
          `${asistencia.Nombre} ${asistencia.Apellidos}`,
          asistencia.EmpresaNombre,
          new Date(asistencia.Fecha).toLocaleDateString("es-ES"),
          entrada,
          salida,
          asistencia.Estado || "Presente",
          ubicacion,
        ];

        // ✅ CORREGIDO: Usar 'campo' en lugar de 'field'
        const filaEscapada = fila.map(
          (campo) => `"${String(campo).replace(/"/g, '""')}"`
        );
        csvContent += filaEscapada.join(",") + "\n";
      });

      console.log("📄 Contenido CSV generado:", csvContent);

      // Crear y descargar archivo
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const nombreEmpresa = empresaId
        ? `_${empresaNombre.replace(/\s+/g, "_")}`
        : "_Todas";
      const nombreFecha = fecha ? `_${fecha}` : "_Todas";
      const nombreArchivo = `asistencias${nombreFecha}${nombreEmpresa}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", nombreArchivo);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.mostrarMensaje(
        "success",
        `✅ Archivo CSV exportado: ${nombreArchivo}`
      );
    } catch (error) {
      console.error("Error exportando asistencias:", error);
      this.mostrarError("Error al exportar asistencias: " + error.message);
    }
  }

  // ========== UTILIDADES ==========

  mostrarLoading(mostrar) {
    const overlay = document.getElementById("loadingOverlay");
    if (mostrar) {
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
    }
  }

  mostrarMensaje(tipo, mensaje) {
    // Sistema de notificaciones simple
    const colors = {
      success: "#27ae60",
      error: "#e74c3c",
      info: "#3498db",
      warning: "#f39c12",
    };

    // Crear notificación
    const notification = document.createElement("div");
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
    this.mostrarMensaje("error", mensaje);
  }
}

// ✅ FUNCIÓN CORREGIDA - USAR SOLO COORDENADAS GUARDADAS
async function verEnMapa(latitudGuardada, longitudGuardada) {
  try {
    console.log("📍 Mostrando mapa con coordenadas:", {
      latitud: latitudGuardada,
      longitud: longitudGuardada,
    });

    // ✅ USAR SOLO LAS COORDENADAS GUARDADAS, NO INTENTAR OBTENER NUEVAS
    const latitud = latitudGuardada;
    const longitud = longitudGuardada;

    // Configurar el mapa
    const width = 800;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const options = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,location=no,menubar=no,toolbar=no,status=no`;

    // URL de Google Maps con la ubicación GUARDADA
    const url = `https://www.google.com/maps?q=${latitud},${longitud}&z=17&output=embed`;

    const popupContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Ubicación de Asistencia</title>
                <style>
                    body { margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background: #f8f9fa; }
                    .map-header { 
                        background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); 
                        color: white; padding: 20px; text-align: center; font-size: 18px; font-weight: bold;
                    }
                    .map-info {
                        background: white; padding: 15px; text-align: center; font-size: 14px; color: #2c3e50;
                        border-bottom: 1px solid #e9ecef;
                    }
                    .coordinates { font-family: monospace; background: #f8f9fa; padding: 8px 12px; border-radius: 6px; }
                    iframe { width: 100%; height: calc(100vh - 140px); border: none; }
                </style>
            </head>
            <body>
                <div class="map-header">
                    📍 Ubicación Registrada de Asistencia
                </div>
                <div class="map-info">
                    <strong>Coordenadas del registro:</strong>
                    <div class="coordinates">${latitud.toFixed(
                      6
                    )}, ${longitud.toFixed(6)}</div>
                    <div style="color: #27ae60; font-size: 12px; margin-top: 5px;">
                        ✅ Mostrando ubicación exacta del momento del registro
                    </div>
                </div>
                <iframe src="${url}" allowfullscreen loading="lazy"></iframe>
            </body>
            </html>
        `;

    const popup = window.open("", "mapPopup", options);
    if (popup) {
      popup.document.write(popupContent);
      popup.document.close();
      popup.focus();
    } else {
      alert("Por favor permite ventanas emergentes para ver el mapa");
      window.open(
        `https://www.google.com/maps?q=${latitud},${longitud}&z=17`,
        "_blank"
      );
    }
  } catch (error) {
    console.error("Error mostrando mapa:", error);
    // Fallback simple
    window.open(
      `https://www.google.com/maps?q=${latitudGuardada},${longitudGuardada}&z=17`,
      "_blank"
    );
  }
}

function removePhoto() {
  const preview = document.getElementById("previewImage");
  const noPhoto = document.getElementById("noPhotoText");
  const removeBtn = document.getElementById("removePhotoBtn");
  const fileInput = document.getElementById("empleadoFoto");

  preview.src = "";
  preview.style.display = "none";
  noPhoto.style.display = "inline";
  removeBtn.classList.add("hidden");
  fileInput.value = "";

  // Agregar campo hidden para indicar que se debe eliminar la foto
  if (!document.getElementById("removeFotoFlag")) {
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.id = "removeFotoFlag";
    hiddenInput.name = "removeFoto";
    hiddenInput.value = "true";
    document.getElementById("formEmpleado").appendChild(hiddenInput);
  }
}

// Event listener para el botón de confirmar eliminación
document.addEventListener("DOMContentLoaded", function () {
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      if (window.adminPanel) {
        window.adminPanel.confirmarEliminacion();
      }
    });
  }

  // ✅ ELIMINAR esta línea: window.empleadoAEliminarGlobal = null;
});


// Función para preview del logo de empresa
function previewEmpresaLogo(input) {
  const preview = document.getElementById("previewLogoImage");
  const noLogo = document.getElementById("noLogoText");

  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
      noLogo.style.display = "none";
    };

    reader.readAsDataURL(input.files[0]);
  }
}

// Función para quitar logo seleccionado
function removeEmpresaLogo() {
  const fileInput = document.getElementById("empresaLogo");
  const preview = document.getElementById("previewLogoImage");
  const noLogo = document.getElementById("noLogoText");

  fileInput.value = "";
  preview.src = "";
  preview.style.display = "none";
  noLogo.style.display = "inline";
}

// ✅ AGREGAR ESTA FUNCIÓN NUEVA - Limpia completamente el modal
function limpiarModalEmpleadoCompleto() {
  const form = document.getElementById("formEmpleado");
  if (form) {
    form.reset();
  }

  // Limpiar vista previa de foto
  const preview = document.getElementById("previewImage");
  const noPhotoText = document.getElementById("noPhotoText");
  const removeBtn = document.getElementById("removePhotoBtn");

  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }
  if (noPhotoText) {
    noPhotoText.style.display = "inline";
  }
  if (removeBtn) {
    removeBtn.classList.add("hidden");
  }

  // Limpiar file input
  const fileInput = document.getElementById("empleadoFoto");
  if (fileInput) {
    fileInput.value = "";
  }

  // Resetear contraseña
  const passwordInput = document.getElementById("empleadoContraseña");
  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.required = true;
    passwordInput.placeholder = "";
    passwordInput.type = "password";
  }

  // Resetear horarios
  for (let i = 1; i <= 7; i++) {
    const checkbox = document.getElementById(`horario_${i}`);
    const entrada = document.getElementById(`entrada_${i}`);
    const salida = document.getElementById(`salida_${i}`);

    if (checkbox && entrada && salida) {
      checkbox.checked = false;
      entrada.disabled = true;
      salida.disabled = true;
      entrada.value = "";
      salida.value = "";
    }
  }
}

// ========== FUNCIONES GLOBALES PARA EL HTML ==========

function cerrarSesionAdmin() {
  localStorage.removeItem("adminLogueado");
  localStorage.removeItem("adminToken");
  window.location.href = "/pages/admin-login.html";
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
  window.adminPanel.exportarPDF(); // Llamar a PDF en lugar de CSV
}

function cargarEmpleados() {
  window.adminPanel.cargarEmpleados();
}

// Funciones globales para el HTML
function toggleHorario(dia) {
  window.adminPanel.toggleHorario(dia);
}

// Mostrar la vista previa al seleccionar una foto
function previewPhoto(input) {
  const file = input.files[0];
  const preview = document.getElementById("previewImage");
  const noPhotoText = document.getElementById("noPhotoText");
  const removeBtn = document.getElementById("removePhotoBtn");

  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.style.display = "block";
      noPhotoText.style.display = "none";
      removeBtn.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }
}

// Quitar la foto seleccionada
function removePhoto() {
  const fileInput = document.getElementById("empleadoFoto");
  const preview = document.getElementById("previewImage");
  const noPhotoText = document.getElementById("noPhotoText");
  const removeBtn = document.getElementById("removePhotoBtn");

  fileInput.value = ""; // limpiar archivo
  preview.src = "";
  preview.style.display = "none";
  noPhotoText.style.display = "inline";
  removeBtn.classList.add("hidden");
}

// ✅ REEMPLAZAR la función togglePassword existente
function togglePassword() {
  const passwordInput = document.getElementById("empleadoContraseña");
  const toggleBtn = document.querySelector(".toggle-password");
  const realPassword = passwordInput.getAttribute("data-real-password");

  if (passwordInput.type === "password") {
    // Si tenemos contraseña real, mostrarla
    if (realPassword && realPassword !== "") {
      passwordInput.value = realPassword;
    } else if (passwordInput.value === "********") {
      // Si es placeholder, cambiar a vacío para editar
      passwordInput.value = "";
    }
    passwordInput.type = "text";
    toggleBtn.textContent = "🙈";
  } else {
    // Ocultar contraseña
    if (passwordInput.value === "" && realPassword) {
      passwordInput.value = "********";
    }
    passwordInput.type = "password";
    toggleBtn.textContent = "👁️";
  }
}

// Inicializar aplicación
document.addEventListener("DOMContentLoaded", () => {
  window.adminPanel = new AdminPanel();
});
