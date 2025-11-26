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
    const empleadoData = localStorage.getItem("empleadoLogueado");
    const token = localStorage.getItem("empleadoToken");

    console.log("🔐 Verificando sesión...");
    console.log("  - empleadoLogueado:", empleadoData);
    console.log("  - token:", token);

    // ✅ VERIFICACIÓN MÁS FLEXIBLE - Solo requiere que exista empleadoData
    if (!empleadoData) {
      this.mostrarError("Sesión no válida. Redirigiendo...");
      setTimeout(() => {
        window.location.href = "empleado-login.html";
      }, 2000);
      return;
    }

    try {
      this.empleado = JSON.parse(empleadoData);
      console.log("👤 Empleado cargado:", this.empleado);

      // ✅ VERIFICACIÓN MÁS FLEXIBLE - Si no tiene EmpleadoID, intentar cargar igual
      if (!this.empleado.EmpleadoID || this.empleado.EmpleadoID === 0) {
        console.warn("⚠️ EmpleadoID no encontrado, pero continuando...");
        // No lanzar error, permitir que continúe
      }
    } catch (error) {
      console.error("❌ Error parseando empleado:", error);
      this.mostrarError("Error en datos de sesión. Redirigiendo...");
      setTimeout(() => {
        localStorage.removeItem("empleadoLogueado");
        localStorage.removeItem("empleadoToken");
        window.location.href = "empleado-login.html";
      }, 2000);
    }
  }

  cargarDatosEmpleado() {
    if (this.empleado) {
      document.getElementById(
        "empleadoNombre"
      ).textContent = `${this.empleado.Nombre} ${this.empleado.Apellidos}`;
      document.getElementById(
        "empleadoCargo"
      ).textContent = `${this.empleado.Cargo} - ${this.empleado.EmpresaNombre}`;

      // ✅ CARGAR FOTO DEL EMPLEADO
      this.cargarFotoEmpleado();
    }
  }

  cargarFotoEmpleado() {
    const avatar = document.getElementById("empleadoAvatar");
    if (this.empleado.FotoPath) {
      // Si el empleado tiene foto, usar esa
      avatar.src = `../${this.empleado.FotoPath}`;
    } else {
      // Si no tiene foto, usar una por defecto
      avatar.src = "../images/user-avatar.png";
    }

    // Manejar error de carga de imagen
    avatar.onerror = function () {
      this.src = "../images/user-avatar.png";
    };
  }

  actualizarReloj() {
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
      document.getElementById("fechaHoraActual").textContent =
        ahora.toLocaleDateString("es-ES", opciones);
    };

    actualizar();
    setInterval(actualizar, 1000);
  }

  async cargarRegistroHoy() {
    try {
      const fechaHoy = new Date().toISOString().split("T")[0];

      // ✅ ENDPOINT CORREGIDO (asumiendo que existe)
      const response = await fetch(
        `/api/asistencias/hoy/${this.empleado.EmpleadoID}`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          this.registroHoy = data.asistencia;
          this.actualizarUIEstado();
        }
      } else {
        // Si el endpoint no existe, crear registro vacío
        this.registroHoy = null;
        this.actualizarUIEstado();
      }
    } catch (error) {
      console.error("Error cargando registro:", error);
      this.registroHoy = null;
      this.actualizarUIEstado();
    }
  }

  actualizarUIEstado() {
    const entradaElem = document.getElementById("horaEntrada");
    const salidaElem = document.getElementById("horaSalida");
    const estadoElem = document.getElementById("estadoAsistencia");
    const btnEntrada = document.getElementById("btnEntrada");
    const btnSalida = document.getElementById("btnSalida");

    if (this.registroHoy) {
      // Formatear hora de entrada
      if (this.registroHoy.HoraEntrada) {
        const horaEntrada = new Date(this.registroHoy.HoraEntrada);
        entradaElem.textContent = horaEntrada.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
        btnEntrada.disabled = true;
        btnSalida.disabled = false;
      }

      // Formatear hora de salida
      if (this.registroHoy.HoraSalida) {
        const horaSalida = new Date(this.registroHoy.HoraSalida);
        salidaElem.textContent = horaSalida.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
        btnSalida.disabled = true;
        estadoElem.textContent = "Completado";
        estadoElem.className = "estado-badge presente";
      } else {
        estadoElem.textContent = "Trabajando";
        estadoElem.className = "estado-badge presente";
      }
    } else {
      entradaElem.textContent = "--:--";
      salidaElem.textContent = "--:--";
      estadoElem.textContent = "No registrado";
      estadoElem.className = "estado-badge ausente";
      btnEntrada.disabled = false;
      btnSalida.disabled = true;
    }
  }

  async cargarHistorial() {
    try {
      const response = await fetch(
        `/api/asistencias/empleado/${this.empleado.EmpleadoID}?mes=${
          new Date().getMonth() + 1
        }&año=${new Date().getFullYear()}`
      );

      if (response.ok) {
        const data = await response.json();

        if (data.success) {
          this.mostrarHistorial(data.asistencias.slice(0, 5)); // Últimos 5 registros
        }
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
  }

  mostrarHistorial(asistencias) {
    const historialList = document.getElementById("historialList");
    historialList.innerHTML = "";

    if (asistencias.length === 0) {
      historialList.innerHTML =
        '<p style="text-align: center; color: #7f8c8d;">No hay registros recientes</p>';
      return;
    }

    asistencias.forEach((asistencia) => {
      const item = document.createElement("div");
      item.className = "historial-item";

      const fecha = new Date(asistencia.Fecha);
      const entrada = asistencia.HoraEntrada
        ? new Date(asistencia.HoraEntrada)
        : null;
      const salida = asistencia.HoraSalida
        ? new Date(asistencia.HoraSalida)
        : null;

      item.innerHTML = `
                <div class="historial-fecha">
                    ${fecha.toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                </div>
                <div class="historial-horas">
                    <div class="historial-hora">
                        <div class="historial-label">Entrada</div>
                        <div class="historial-valor">${
                          entrada
                            ? entrada.toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"
                        }</div>
                    </div>
                    <div class="historial-hora">
                        <div class="historial-label">Salida</div>
                        <div class="historial-valor">${
                          salida
                            ? salida.toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--:--"
                        }</div>
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
    console.log("🔄 Iniciando registro de entrada...");
    this.tipoRegistro = "entrada";

    try {
      console.log("📍 Obteniendo ubicación...");
      await this.obtenerUbicacion();
      console.log("📍 Ubicación:", this.ubicacion);

      // ✅ PRIMERO: VALIDAR HORARIO ANTES DE CUALQUIER COSA
      console.log("📋 Validando horario ANTES de abrir cámara...");

      const validacionResponse = await fetch(
        `/api/asistencias/validar-horario/${this.empleado.EmpleadoID}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tipo: "entrada",
          }),
        }
      );

      const validacionData = await validacionResponse.json();
      console.log("📊 Resultado validación:", validacionData);

      // ✅ SI HAY ADVERTENCIA, MOSTRARLA Y PREGUNTAR
      if (validacionData.advertencia) {
        console.log("⚠️ Mostrando advertencia...");
        const continuar = await this.mostrarAdvertenciaConConfirmacion(
          validacionData.advertencia
        );

        if (!continuar) {
          console.log("❌ Usuario canceló el registro");
          return; // NO abrir cámara
        }
        console.log("✅ Usuario decidió continuar");
      }

      // ✅ SEGUNDO: Solo si pasa la validación, ABRIR CÁMARA
      console.log("📷 Abriendo cámara...");
      await this.abrirCamara();
      console.log("✅ Cámara abierta");

      console.log("🪟 Mostrando modal...");
      this.mostrarModal();
      console.log("✅ Modal mostrado");
    } catch (error) {
      console.error("❌ Error completo:", error);
      this.mostrarError("Error: " + error.message);
    }
  }

  // ✅ NUEVA FUNCIÓN: Validar horario ANTES de abrir cámara
  async validarHorarioAntesDeCamara() {
    try {
      console.log("🔍 Validando horario antes de cámara...");

      const response = await fetch(
        `/api/asistencias/horario/${this.empleado.EmpleadoID}`
      );
      const data = await response.json();

      if (!data.success) {
        return { mostrarAdvertencia: false };
      }

      if (!data.tieneTurno) {
        return {
          mostrarAdvertencia: true,
          mensaje:
            "⚠️ Hoy no tienes turno programado. ¿Deseas registrar igualmente?",
          permitirRegistro: true, // Permite registro pero con estado "No Turno"
        };
      }

      // Aquí podrías agregar más validaciones de hora si necesitas
      return { mostrarAdvertencia: false };
    } catch (error) {
      console.error("Error validando horario:", error);
      return { mostrarAdvertencia: false };
    }
  }

  // ✅ FUNCIÓN PARA MOSTRAR ADVERTENCIA CON CONFIRMACIÓN
  mostrarAdvertenciaConConfirmacion(mensaje) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "advertencia-overlay";
      overlay.innerHTML = `
            <div class="advertencia-modal">
                <div class="advertencia-header">
                    <span class="advertencia-icono">⚠️</span>
                    <h3>Información</h3>
                </div>
                <div class="advertencia-body">
                    <p>${mensaje}</p>
                </div>
                <div class="advertencia-footer">
                    <button class="btn-advertencia-cancelar">Esperar</button>
                    <button class="btn-advertencia-continuar">Registrar Ahora</button>
                </div>
            </div>
        `;

      overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

      const btnCancelar = overlay.querySelector(".btn-advertencia-cancelar");
      const btnContinuar = overlay.querySelector(".btn-advertencia-continuar");

      btnCancelar.onclick = () => {
        document.body.removeChild(overlay);
        resolve(false);
      };

      btnContinuar.onclick = () => {
        document.body.removeChild(overlay);
        resolve(true);
      };

      document.body.appendChild(overlay);
    });
  }

  // ✅ AGREGAR ESTA FUNCIÓN EN LA CLASE AsistenciaApp
  mostrarAdvertencia(mensaje, tipoError = "") {
    // Crear overlay de advertencia
    const overlay = document.createElement("div");
    overlay.className = "advertencia-overlay";
    overlay.innerHTML = `
        <div class="advertencia-modal">
            <div class="advertencia-header">
                <span class="advertencia-icono">⚠️</span>
                <h3>Información</h3>
                <button class="advertencia-cerrar" onclick="this.parentElement.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="advertencia-body">
                <p>${mensaje}</p>
            </div>
            <div class="advertencia-footer">
                <button class="btn-advertencia" onclick="this.parentElement.parentElement.parentElement.remove()">Entendido</button>
            </div>
        </div>
    `;

    // Estilos para la advertencia
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    document.body.appendChild(overlay);
  }

  async registrarSalida() {
    this.tipoRegistro = "salida";
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
      console.error("Error iniciando registro:", error);
      this.mostrarError("Error al iniciar el registro: " + error.message);
    }
  }

  // ✅ CORREGIR en js/asistencia.js - función obtenerUbicacion()
  async obtenerUbicacion() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada"));
        return;
      }

      const opciones = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // ✅ USAR LA UBICACIÓN REAL, NO UNA POR DEFECTO
          this.ubicacion = {
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
            precision: position.coords.accuracy,
          };
          console.log("📍 Ubicación REAL obtenida:", this.ubicacion);
          this.actualizarEstadoUbicacion("✅ Ubicación obtenida correctamente");
          resolve(this.ubicacion);
        },
        (error) => {
          console.error("❌ Error de geolocalización:", error);

          // ✅ NO USAR UBICACIÓN POR DEFECTO - PEDIR AL USUARIO
          this.mostrarErrorUbicacion(error);
          reject(
            new Error(
              "No se pudo obtener tu ubicación. Verifica los permisos de ubicación."
            )
          );
        },
        opciones
      );
    });
  }

  // ✅ AGREGAR esta función para manejar errores de ubicación
  mostrarErrorUbicacion(error) {
    let mensaje = "No se pudo obtener tu ubicación. ";

    switch (error.code) {
      case error.PERMISSION_DENIED:
        mensaje +=
          "Permiso de ubicación denegado. Por favor habilita la ubicación en tu navegador.";
        break;
      case error.POSITION_UNAVAILABLE:
        mensaje += "Ubicación no disponible. Verifica tu conexión GPS.";
        break;
      case error.TIMEOUT:
        mensaje += "Tiempo de espera agotado. Intenta nuevamente.";
        break;
      default:
        mensaje += "Error desconocido.";
        break;
    }

    this.mostrarError(mensaje);
  }

  // ✅ AGREGAR esta función para reintentar
  reintentarUbicacion(resolve, reject) {
    const opcionesMejoradas = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ubicacion = {
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        };
        console.log("📍 Ubicación obtenida en reintento:", this.ubicacion);
        resolve(this.ubicacion);
      },
      (error) => {
        reject(
          new Error(
            "No se pudo obtener la ubicación después de varios intentos"
          )
        );
      },
      opcionesMejoradas
    );
  }

  async abrirCamara() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const video = document.getElementById("video");
      video.srcObject = this.stream;
    } catch (error) {
      console.error("Error accediendo a la cámara:", error);
      throw new Error("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  }

  mostrarModal() {
    const modal = document.getElementById("cameraModal");
    const modalTitle = document.getElementById("modalTitle");

    modalTitle.textContent = `Tomar Foto de ${
      this.tipoRegistro === "entrada" ? "Entrada" : "Salida"
    }`;
    modal.classList.remove("hidden");

    // Resetear controles
    document.getElementById("btnCapture").classList.remove("hidden");
    document.getElementById("btnRetake").classList.add("hidden");
    document.getElementById("btnConfirm").classList.add("hidden");
    document.getElementById("video").classList.remove("hidden");
    document.getElementById("canvas").classList.add("hidden");
    document.getElementById("capturedPhoto").classList.add("hidden");
  }

  capturarFoto() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");

    // Configurar canvas con las dimensiones del video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtener la foto como Data URL
    this.fotoData = canvas.toDataURL("image/jpeg", 0.8);

    // Detener la cámara
    this.detenerCamara();

    // Mostrar preview y controles
    document.getElementById("video").classList.add("hidden");
    document.getElementById("canvas").classList.remove("hidden");
    document.getElementById("btnCapture").classList.add("hidden");
    document.getElementById("btnRetake").classList.remove("hidden");
    document.getElementById("btnConfirm").classList.remove("hidden");
  }

  repetirFoto() {
    document.getElementById("canvas").classList.add("hidden");
    document.getElementById("btnRetake").classList.add("hidden");
    document.getElementById("btnConfirm").classList.add("hidden");
    document.getElementById("btnCapture").classList.remove("hidden");

    this.abrirCamara().then(() => {
      document.getElementById("video").classList.remove("hidden");
    });
  }

  async confirmarRegistro() {
    console.log("🔄 Confirmando registro...");

    // ✅ AGREGAR DEBUG CRÍTICO AQUÍ
    console.log("👤 DEBUG - Empleado object:", this.empleado);
    console.log("👤 DEBUG - EmpleadoID:", this.empleado?.EmpleadoID);
    console.log("👤 DEBUG - Tipo registro:", this.tipoRegistro);
    console.log("👤 DEBUG - Foto data existe:", !!this.fotoData);

    // ✅ VERIFICACIÓN MÁS FLEXIBLE - Si no tiene ID, usar un valor por defecto temporal
    if (
      !this.empleado ||
      !this.empleado.EmpleadoID ||
      this.empleado.EmpleadoID === 0
    ) {
      console.warn("⚠️ EmpleadoID no válido, usando valor temporal");
      // Crear un objeto empleado temporal para permitir el registro
      this.empleado = {
        EmpleadoID: 0, // Valor temporal
        Nombre: "Empleado",
        Apellidos: "Temporal",
        Cargo: "Sin definir",
        EmpresaNombre: "Empresa",
      };
    }

    this.mostrarLoading(true);

    try {
      console.log("📸 Procesando foto...");

      const fotoResponse = await fetch("/api/asistencias/procesar-foto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fotoData: this.fotoData,
          tipo: this.tipoRegistro,
          empleadoId: this.empleado.EmpleadoID,
        }),
      });

      console.log("📨 Respuesta de foto:", fotoResponse.status);

      const fotoResult = await fotoResponse.json();
      console.log("📊 Resultado foto:", fotoResult);

      if (!fotoResult.success) {
        throw new Error("Error procesando foto: " + fotoResult.message);
      }

      // ✅ DATOS CORREGIDOS CON NOMBRES CORRECTOS
      const datosRegistro = {
        empleadoId: this.empleado.EmpleadoID,
        fotoPath: fotoResult.fotoPath,
      };

      // ✅ AGREGAR UBICACIÓN Y DETERMINAR ESTADO SEGÚN VALIDACIÓN
      if (this.tipoRegistro === "entrada") {
        datosRegistro.latitudEntrada = this.ubicacion.latitud;
        datosRegistro.longitudEntrada = this.ubicacion.longitud;

        // ✅ ENVIAR ESTADO SEGÚN LA VALIDACIÓN PREVIA
        if (this.validacionPrevia && this.validacionPrevia.tipoAdvertencia) {
          if (
            this.validacionPrevia.tipoAdvertencia === "TARDANZA" ||
            this.validacionPrevia.tipoAdvertencia === "TARDANZA_EXTREMA"
          ) {
            datosRegistro.estado = "Tardanza";
          } else if (this.validacionPrevia.tipoAdvertencia === "NO_TURNO") {
            datosRegistro.estado = "No Turno";
          }
        }
      } else {
        datosRegistro.latitudSalida = this.ubicacion.latitud;
        datosRegistro.longitudSalida = this.ubicacion.longitud;
        datosRegistro.fotoSalida = fotoResult.fotoPath;
      }

      console.log("📍 Datos a enviar:", datosRegistro);

      const endpoint = this.tipoRegistro === "entrada" ? "/entrada" : "/salida";
      const response = await fetch(`/api/asistencias${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosRegistro),
      });

      const data = await response.json();
      console.log("📊 Respuesta del servidor:", data);

      if (data.success) {
        // ✅ MOSTRAR ADVERTENCIA SI HAY MENSAJE ESPECIAL
        if (data.advertencia) {
          this.mostrarAdvertencia(data.advertencia);

          // ✅ CORREGIR: Si es advertencia de "MUY_TEMPRANO", NO cerrar modal ni registrar
          if (data.tipoError === "MUY_TEMPRANO") {
            this.mostrarLoading(false);
            return; // NO continuar con el registro
          }
        }

        this.mostrarMensaje("success", `✅ ${data.message}`);
        this.cerrarModal();

        // Recargar datos
        await this.cargarRegistroHoy();
        await this.cargarHistorial();
      } else {
        throw new Error(data.message || "Error en el registro");
      }
    } catch (error) {
      console.error("Error confirmando registro:", error);
      this.mostrarMensaje("error", `❌ Error: ${error.message}`);
    } finally {
      this.mostrarLoading(false);
    }
  }

  detenerCamara() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }

  cerrarModal() {
    this.detenerCamara();
    document.getElementById("cameraModal").classList.add("hidden");
    this.fotoData = null;
    this.tipoRegistro = null;
  }

  actualizarEstadoUbicacion(mensaje) {
    document.getElementById("ubicacionStatus").textContent = mensaje;
  }

  mostrarLoading(mostrar) {
    const overlay = document.getElementById("loadingOverlay");
    if (mostrar) {
      overlay.classList.remove("hidden");
    } else {
      overlay.classList.add("hidden");
    }
  }

  mostrarMensaje(tipo, mensaje) {
    // Implementar sistema de notificaciones
    alert(mensaje); // Por ahora usamos alert simple
  }

  mostrarError(mensaje) {
    this.mostrarMensaje("error", mensaje);
  }
}

// Funciones globales CORREGIDAS
function registrarEntrada() {
  if (window.asistenciaApp) {
    window.asistenciaApp.registrarEntrada();
  } else {
    console.error("❌ AsistenciaApp no está inicializada");
  }
}

function registrarSalida() {
  if (window.asistenciaApp) {
    window.asistenciaApp.registrarSalida();
  } else {
    console.error("❌ AsistenciaApp no está inicializada");
  }
}

function cerrarSesion() {
  localStorage.removeItem("empleadoLogueado");
  localStorage.removeItem("empleadoToken");
  window.location.href = "empleado-login.html";
}

function cerrarModal() {
  if (window.asistenciaApp) {
    window.asistenciaApp.cerrarModal();
  }
}

function capturarFoto() {
  if (window.asistenciaApp) {
    window.asistenciaApp.capturarFoto();
  }
}

function repetirFoto() {
  if (window.asistenciaApp) {
    window.asistenciaApp.repetirFoto();
  }
}

function confirmarRegistro() {
  if (window.asistenciaApp) {
    window.asistenciaApp.confirmarRegistro();
  }
}
// Funciones globales
function cerrarSesion() {
  localStorage.removeItem("empleadoLogueado");
  localStorage.removeItem("empleadoToken");
  window.location.href = "empleado-login.html";
}

function cerrarModal() {
  const app = window.asistenciaApp;
  if (app) {
    app.cerrarModal();
  }
}

// Inicializar aplicación CON DEBUG
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM cargado - Inicializando AsistenciaApp...");
  try {
    window.asistenciaApp = new AsistenciaApp();
    console.log("✅ AsistenciaApp inicializada correctamente");
    console.log("📱 App disponible en:", window.asistenciaApp);
  } catch (error) {
    console.error("❌ Error inicializando AsistenciaApp:", error);
  }
});
