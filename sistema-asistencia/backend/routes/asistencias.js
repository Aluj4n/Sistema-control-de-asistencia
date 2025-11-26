const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getConnection, sql } = require("../database/connection");

const router = express.Router();

// ✅ CONFIGURAR MULTER PARA FOTOS DE ASISTENCIA
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../../images/asistencias");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `asistencia-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}.jpg`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});


// ✅ ENDPOINT CORREGIDO PARA PROCESAR FOTO
router.post("/procesar-foto", async (req, res) => {
  try {
    const { fotoData, tipo, empleadoId } = req.body;

    console.log("📸 Procesando foto - Datos recibidos:", {
      tieneFotoData: !!fotoData,
      tipo: tipo,
      empleadoId: empleadoId,
    });

    if (!fotoData || !tipo || empleadoId === undefined || empleadoId === null) {
      return res.status(400).json({
        success: false,
        message: "Datos de foto incompletos",
      });
    }

    // ✅ VERIFICAR Y CREAR CARPETA
    const uploadPath = path.join(__dirname, "../../images/asistencias");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log("✅ Carpeta creada:", uploadPath);
    }

    // Convertir DataURL a buffer
    const base64Data = fotoData.replace(/^data:image\/jpeg;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generar nombre de archivo
    const fileName = `asistencia-${tipo}-${empleadoId}-${Date.now()}.jpg`;
    const filePath = path.join(uploadPath, fileName);

    console.log("📁 Guardando foto en:", filePath);

    // Guardar archivo
    fs.writeFileSync(filePath, buffer);

    console.log("✅ Foto guardada exitosamente");

    res.json({
      success: true,
      fotoPath: `images/asistencias/${fileName}`,
    });
  } catch (error) {
    console.error("❌ Error procesando foto:", error);
    res.status(500).json({
      success: false,
      message: "Error procesando foto: " + error.message,
    });
  }
});

// Registrar entrada (CON VALIDACIÓN DE HORARIOS)
router.post("/entrada", async (req, res) => {
  let pool;
  try {
    const { empleadoId, fotoPath, latitudEntrada, longitudEntrada } = req.body;

    if (!empleadoId) {
      return res.status(400).json({
        success: false,
        message: "ID de empleado es requerido",
      });
    }

    const fechaHoy = obtenerFechaPeru();
    const horaActual = new Date();

    pool = await getConnection();

    // Verificar si ya existe registro para hoy
    const registroExistente = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .input("fecha", sql.Date, fechaHoy)
      .query(
        "SELECT * FROM Asistencias WHERE EmpleadoID = @empleadoId AND Fecha = @fecha"
      );

    if (registroExistente.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya se registró la entrada para hoy",
      });
    }

    // ✅ VALIDAR HORARIO DEL EMPLEADO
    const validacion = await validarHorarioEmpleado(empleadoId, "entrada");

    let estado = "Presente";
    let mensajeFinal = "Entrada registrada exitosamente";

    if (!validacion.tieneTurno) {
      estado = "No Turno";
      mensajeFinal = "Registro en día sin turno";
    } else {
      estado = validacion.estado || "Presente";
      if (validacion.tipoError === "MUY_TEMPRANO") {
        mensajeFinal = validacion.mensaje + " - Registro permitido";
      }
    }

    // Insertar nuevo registro de entrada
    const result = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .input("fecha", sql.Date, fechaHoy)
      .input("horaEntrada", sql.DateTime, horaActual)
      .input("fotoEntrada", sql.VarChar(255), fotoPath)
      .input("latitudEntrada", sql.Decimal(10, 8), latitudEntrada)
      .input("longitudEntrada", sql.Decimal(10, 8), longitudEntrada)
      .input("estado", sql.VarChar(20), estado).query(`
                INSERT INTO Asistencias (
                    EmpleadoID, Fecha, HoraEntrada, FotoEntrada, 
                    LatitudEntrada, LongitudEntrada, Estado
                )
                OUTPUT INSERTED.AsistenciaID, INSERTED.HoraEntrada
                VALUES (
                    @empleadoId, @fecha, @horaEntrada, @fotoEntrada,
                    @latitudEntrada, @longitudEntrada, @estado
                )
            `);

    res.json({
      success: true,
      message: mensajeFinal,
      asistencia: result.recordset[0],
      estado: estado,
      advertencia: validacion.tipoError ? validacion.mensaje : null,
    });
  } catch (error) {
    console.error("Error registrando entrada:", error);
    res.status(500).json({
      success: false,
      message: "Error registrando entrada",
    });
  }
});

// ✅ AGREGAR ESTA FUNCIÓN PARA CORREGIR FECHAS DE CONSULTA
function corregirFechaConsulta(fechaFrontend) {
  // El frontend envía fecha en formato YYYY-MM-DD (Perú UTC-5)
  // Pero la base de datos la guarda en UTC, necesitamos ajustar
  const fecha = new Date(fechaFrontend + "T00:00:00-05:00"); // Forzar hora Perú
  return fecha.toISOString().split("T")[0];
}

// ✅ ENDPOINT CORREGIDO: Mantener estado "Tardanza"
router.post("/salida", async (req, res) => {
  let pool;
  try {
    const { empleadoId, fotoSalida, latitudSalida, longitudSalida } = req.body;

    if (!empleadoId) {
      return res.status(400).json({
        success: false,
        message: "ID de empleado es requerido",
      });
    }

    const fechaHoy = obtenerFechaPeru();
    const horaActual = new Date();

    pool = await getConnection();

    // Verificar si existe registro de entrada para hoy
    const registroExistente = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .input("fecha", sql.Date, fechaHoy)
      .query(
        "SELECT * FROM Asistencias WHERE EmpleadoID = @empleadoId AND Fecha = @fecha"
      );

    if (registroExistente.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No se encontró registro de entrada para hoy",
      });
    }

    if (registroExistente.recordset[0].HoraSalida) {
      return res.status(400).json({
        success: false,
        message: "Ya se registró la salida para hoy",
      });
    }

    // ✅ CORREGIDO: Mantener estado original
    const estadoActual = registroExistente.recordset[0].Estado;
    let estadoFinal = estadoActual; // Mantener el mismo estado

    // Solo cambiar a "Completado" si era "Presente"
    if (estadoActual === "Presente") {
      estadoFinal = "Completado";
    }

    // Actualizar registro con salida
    const result = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .input("fecha", sql.Date, fechaHoy)
      .input("horaSalida", sql.DateTime, horaActual)
      .input("fotoSalida", sql.VarChar(255), fotoSalida)
      .input("latitudSalida", sql.Decimal(10, 8), latitudSalida)
      .input("longitudSalida", sql.Decimal(10, 8), longitudSalida)
      .input("estado", sql.VarChar(20), estadoFinal).query(`
                UPDATE Asistencias 
                SET HoraSalida = @horaSalida,
                    FotoSalida = @fotoSalida,
                    LatitudSalida = @latitudSalida,
                    LongitudSalida = @longitudSalida,
                    Estado = @estado
                WHERE EmpleadoID = @empleadoId AND Fecha = @fecha
            `);

    res.json({
      success: true,
      message: `Salida registrada exitosamente - Estado: ${estadoFinal}`,
      horaSalida: horaActual,
      estado: estadoFinal,
    });
  } catch (error) {
    console.error("Error registrando salida:", error);
    res.status(500).json({
      success: false,
      message: "Error registrando salida",
    });
  }
});

// ✅ FUNCIÓN CORREGIDA DEFINITIVA
function obtenerFechaPeru() {
  const ahora = new Date();

  // Usar la zona horaria de Perú directamente
  const opciones = { timeZone: "America/Lima" };
  const fechaPeru = ahora.toLocaleDateString("en-CA", opciones); // Formato YYYY-MM-DD

  console.log("📍 Fecha Perú calculada:", {
    horaUTC: ahora.toISOString(),
    horaPeru: ahora.toLocaleString("es-PE", { timeZone: "America/Lima" }),
    fechaPeru: fechaPeru,
  });

  return fechaPeru;
}

// Obtener asistencias por fecha
router.get("/fecha/:fecha", async (req, res) => {
  let pool;
  try {
    const { fecha } = req.params; // fecha viene como "2025-11-17" (Perú)

    console.log("📅 Consulta - Fecha recibida:", fecha);

    pool = await getConnection();

    const result = await pool.request().input("fecha", sql.Date, fecha) // ✅ Usar la fecha tal cual (ya es Perú)
      .query(`
                SELECT 
                    a.*,
                    e.Nombre,
                    e.Apellidos,
                    e.Cargo,
                    e.EmpresaID,
                    em.Nombre as EmpresaNombre
                FROM Asistencias a
                INNER JOIN Empleados e ON a.EmpleadoID = e.EmpleadoID
                INNER JOIN Empresas em ON e.EmpresaID = em.EmpresaID
                WHERE a.Fecha = @fecha
                ORDER BY e.Nombre, e.Apellidos
            `);

    console.log("📊 Registros encontrados:", result.recordset.length);

    res.json({
      success: true,
      asistencias: result.recordset,
    });
  } catch (error) {
    console.error("Error obteniendo asistencias:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo asistencias",
    });
  }
});

// ✅ NUEVO: Endpoint para obtener registro de hoy
router.get("/hoy/:empleadoId", async (req, res) => {
  let pool;
  try {
    const { empleadoId } = req.params;
    const fechaHoy = obtenerFechaPeru();

    pool = await getConnection();

    const result = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .input("fecha", sql.Date, fechaHoy).query(`
                SELECT 
                    a.*,
                    e.Nombre,
                    e.Apellidos
                FROM Asistencias a
                INNER JOIN Empleados e ON a.EmpleadoID = e.EmpleadoID
                WHERE a.EmpleadoID = @empleadoId AND a.Fecha = @fecha
            `);

    if (result.recordset.length > 0) {
      res.json({
        success: true,
        asistencia: result.recordset[0],
      });
    } else {
      res.json({
        success: true,
        asistencia: null,
      });
    }
  } catch (error) {
    console.error("Error obteniendo registro de hoy:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo registro",
    });
  }
});

// ✅ FUNCIÓN CORREGIDA DEFINITIVA - ZONA HORARIA FIXED
async function validarHorarioEmpleado(empleadoId, tipoRegistro) {
  try {
    const fechaActual = obtenerFechaPeru();
    const horaActual = new Date();
    const diaSemanaJS = horaActual.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const diaSemanaBD = diaSemanaJS === 0 ? 7 : diaSemanaJS; // 1=Lunes, 2=Martes, ..., 7=Domingo

    console.log(`🔍 DEBUG VALIDACIÓN HORARIO:`);
    console.log(`   📅 Fecha actual: ${fechaActual}`);
    console.log(`   🕐 Hora actual: ${horaActual.toLocaleTimeString()}`);
    console.log(
      `   📆 Día JS: ${diaSemanaJS} (0=Domingo, 1=Lunes, ..., 6=Sábado)`
    );
    console.log(
      `   🗃️  Día BD: ${diaSemanaBD} (1=Lunes, 2=Martes, ..., 7=Domingo)`
    );
    console.log(`   👤 Empleado ID: ${empleadoId}`);
    console.log(`   📝 Tipo registro: ${tipoRegistro}`);

    const pool = await getConnection();

    // Consultar horario del empleado para hoy
    const horarioQuery = `
  SELECT he.HoraEntrada, he.HoraSalida, he.Activo
  FROM HorariosEmpleados he
  WHERE he.EmpleadoID = @empleadoId 
    AND he.DiaSemana = @diaSemanaBD 
    AND he.Activo = 1
    -- ✅ AGREGAR VALIDACIÓN POR FECHA (cuando implementemos TurnosEmpleados)
    -- AND (te.FechaInicio IS NULL OR te.FechaInicio <= @fechaActual)
    -- AND (te.FechaFin IS NULL OR te.FechaFin >= @fechaActual)
`;

    console.log(
      `   📊 Consulta SQL: SELECT... WHERE EmpleadoID=${empleadoId} AND DiaSemana=${diaSemanaBD}`
    );

    const result = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .input("diaSemanaBD", sql.Int, diaSemanaBD)
      .query(horarioQuery);

    console.log(`   📋 Resultados encontrados: ${result.recordset.length}`);

    if (result.recordset.length > 0) {
      console.log(`   ✅ HORARIO ENCONTRADO:`);
      console.log(`      - HoraEntrada: ${result.recordset[0].HoraEntrada}`);
      console.log(`      - HoraSalida: ${result.recordset[0].HoraSalida}`);
      console.log(`      - Activo: ${result.recordset[0].Activo}`);
    }

    // ✅ SI NO TIENE TURNO HOY
    if (result.recordset.length === 0) {
      console.log(`   ❌ NO TIENE TURNO HOY - Día BD: ${diaSemanaBD}`);
      return {
        tieneTurno: false,
        mensaje: "Hoy no tienes turno programado.",
        tipoError: "NO_TURNO",
      };
    }

    const horario = result.recordset[0];
    console.log(
      `   ✅ TIENE TURNO - Entrada: ${horario.HoraEntrada}, Salida: ${horario.HoraSalida}`
    );

    if (!horario.HoraEntrada || !horario.HoraSalida) {
      return {
        tieneTurno: true,
        mensaje: "Horario no configurado correctamente.",
        tipoError: "HORARIO_INVALIDO",
      };
    }

    // ✅ SOLUCIÓN DEFINITIVA - CORREGIR ZONA HORARIA
    // Convertir el objeto Date a string y extraer la hora manualmente
    const horaEntradaStr = horario.HoraEntrada.toTimeString().split(" ")[0]; // "05:50:00"
    const [horaEntradaH, horaEntradaM] = horaEntradaStr.split(":").map(Number);

    // ✅ CORREGIR: Manejar correctamente horas mayores a 23
    let horaEntradaHCorregida = horaEntradaH + 5;
    if (horaEntradaHCorregida >= 24) {
      horaEntradaHCorregida = horaEntradaHCorregida - 24;
    }

    const horaEntradaObj = new Date();
    horaEntradaObj.setHours(horaEntradaHCorregida, horaEntradaM, 0, 0);

    console.log(
      `   🕐 HoraEntrada original BD: ${horaEntradaH}:${horaEntradaM
        .toString()
        .padStart(2, "0")}`
    );
    console.log(
      `   🕐 HoraEntrada corregida: ${horaEntradaHCorregida}:${horaEntradaM
        .toString()
        .padStart(2, "0")}`
    );

    // ✅ MARGENES CORREGIDOS SEGÚN TUS ESPECIFICACIONES
    const margenAntesEntrada = new Date(
      horaEntradaObj.getTime() - 5 * 60 * 1000
    ); // 5 min antes
    const margenTardanza = new Date(horaEntradaObj.getTime() + 10 * 60 * 1000); // 10 min después
    const margenFueraHorario = new Date(
      horaEntradaObj.getTime() + 60 * 60 * 1000
    ); // 60 min después

    console.log(
      `   ⏰ Horario programado: ${horaEntradaHCorregida}:${horaEntradaM
        .toString()
        .padStart(2, "0")}`
    );
    console.log(`   📊 Hora actual: ${horaActual.toLocaleTimeString()}`);
    console.log(
      `   ⏱️  Margen temprano: ${margenAntesEntrada.toLocaleTimeString()}`
    );
    console.log(
      `   ⏱️  Margen tardanza: ${margenTardanza.toLocaleTimeString()}`
    );
    console.log(
      `   ⏱️  Margen fuera horario: ${margenFueraHorario.toLocaleTimeString()}`
    );

    // Determinar saludo según hora
    let saludo = "Buenos días";
    const hora = horaActual.getHours();
    if (hora >= 12 && hora < 18) saludo = "Buenas tardes";
    else if (hora >= 18) saludo = "Buenas noches";

    // ✅ VALIDAR SEGÚN RANGOS DE TIEMPO
    if (horaActual < margenAntesEntrada) {
      const minutosRestantes = Math.round(
        (margenAntesEntrada - horaActual) / (60 * 1000)
      );
      console.log(`   ⚠️  MUY TEMPRANO - Faltan ${minutosRestantes} minutos`);
      return {
        tieneTurno: true,
        mensaje: `${saludo}. Tu turno es a las ${horaEntradaHCorregida}:${horaEntradaM
          .toString()
          .padStart(2, "0")}. Faltan ${minutosRestantes} minutos.`,
        tipoError: "MUY_TEMPRANO",
        estado: "Presente",
      };
    } else if (horaActual <= margenTardanza) {
      console.log(`   ✅ PUNTUAL`);
      return {
        tieneTurno: true,
        mensaje: "Registro puntual",
        estado: "Presente",
      };
    } else if (horaActual <= margenFueraHorario) {
      const minutosTardanza = Math.round(
        (horaActual - horaEntradaObj) / (60 * 1000)
      );
      console.log(`   🕒 TARDANZA - ${minutosTardanza} minutos`);
      return {
        tieneTurno: true,
        mensaje: `Registro con tardanza (${minutosTardanza} minutos)`,
        estado: "Tardanza",
      };
    } else {
      console.log(`   ❌ FUERA DE HORARIO`);
      return {
        tieneTurno: true,
        mensaje: "Registro fuera de horario permitido",
        estado: "Tardanza",
      };
    }
  } catch (error) {
    console.error("❌ Error validando horario:", error);
    return {
      tieneTurno: false,
      mensaje: "Error al validar horario",
    };
  }
}

// ✅ ENDPOINT CORREGIDO: Validar horario con márgenes de 10 minutos
router.post("/validar-horario/:empleadoId", async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const { tipo } = req.body;

    console.log(
      `🔍 Validando horario para empleado: ${empleadoId}, tipo: ${tipo}`
    );

    const fechaActual = obtenerFechaPeru();
    const horaActual = new Date();
    const diaSemanaJS = horaActual.getDay();
    const diaSemanaBD = diaSemanaJS === 0 ? 7 : diaSemanaJS;

    const pool = await getConnection();

    // Consultar horario del empleado para hoy
    // ✅ CONSULTA MEJORADA: Validar por día Y por fecha actual
    const horarioQuery = `
    SELECT he.HoraEntrada, he.HoraSalida, he.Activo,
           e.FechaInicioTurno, e.FechaFinTurno
    FROM HorariosEmpleados he
    INNER JOIN Empleados e ON he.EmpleadoID = e.EmpleadoID
    WHERE he.EmpleadoID = @empleadoId 
      AND he.DiaSemana = @diaSemanaBD 
      AND he.Activo = 1
      AND e.Activo = 1
      AND (e.FechaInicioTurno IS NULL OR e.FechaInicioTurno <= @fechaActual)
      AND (e.FechaFinTurno IS NULL OR e.FechaFinTurno >= @fechaActual)
`;

    // Ejecutar con fecha actual
    const result = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .input("diaSemanaBD", sql.Int, diaSemanaBD)
      .input("fechaActual", sql.Date, fechaActual)
      .query(horarioQuery);

    // ✅ SI NO TIENE TURNO HOY
    if (result.recordset.length === 0) {
      return res.json({
        advertencia:
          "⚠️ Hoy no tienes turno programado. ¿Deseas registrar igualmente?",
        tieneTurno: false,
        tipoAdvertencia: "NO_TURNO",
      });
    }

    const horario = result.recordset[0];

    if (!horario.HoraEntrada || !horario.HoraSalida) {
      return res.json({
        advertencia: "El horario no está configurado correctamente.",
        tieneTurno: true,
        tipoAdvertencia: "HORARIO_INVALIDO",
      });
    }

    // Convertir hora de entrada
    const horaEntradaStr = horario.HoraEntrada.toTimeString().split(" ")[0];
    const [horaEntradaH, horaEntradaM] = horaEntradaStr.split(":").map(Number);
    // ✅ CORREGIR: Manejar correctamente horas mayores a 23
    let horaEntradaHCorregida = horaEntradaH + 5;
    if (horaEntradaHCorregida >= 24) {
      horaEntradaHCorregida = horaEntradaHCorregida - 24;
    }

    const horaEntradaObj = new Date();
    horaEntradaObj.setHours(horaEntradaHCorregida, horaEntradaM, 0, 0);

    // ✅ MÁRGENES CORREGIDOS: 10 minutos antes, 15 minutos después
    const margenAntesEntrada = new Date(
      horaEntradaObj.getTime() - 10 * 60 * 1000
    ); // 10 min antes
    const margenTardanza = new Date(horaEntradaObj.getTime() + 15 * 60 * 1000); // 15 min después

    console.log(
      `⏰ Horario: ${horaEntradaHCorregida}:${horaEntradaM
        .toString()
        .padStart(2, "0")}`
    );
    console.log(`📊 Hora actual: ${horaActual.toLocaleTimeString()}`);
    console.log(
      `⏱️  Permite desde: ${margenAntesEntrada.toLocaleTimeString()}`
    );
    console.log(`⏱️  Tardanza hasta: ${margenTardanza.toLocaleTimeString()}`);

    // Determinar saludo
    let saludo = "Buenos días";
    const hora = horaActual.getHours();
    if (hora >= 12 && hora < 18) saludo = "Buenas tardes";
    else if (hora >= 18) saludo = "Buenas noches";

    // ✅ VALIDAR SEGÚN RANGOS DE TIEMPO
    if (horaActual < margenAntesEntrada) {
      const minutosRestantes = Math.round(
        (margenAntesEntrada - horaActual) / (60 * 1000)
      );

      return res.json({
        advertencia: `${saludo}. Tu turno es a las ${horaEntradaHCorregida}:${horaEntradaM
          .toString()
          .padStart(
            2,
            "0"
          )}. Faltan ${minutosRestantes} minutos. ¿Deseas registrar ahora?`,
        tieneTurno: true,
        tipoAdvertencia: "MUY_TEMPRANO",
      });
    }
    // ✅ VALIDAR SI ES TARDANZA (hasta 15 minutos después)
    else if (horaActual > horaEntradaObj && horaActual <= margenTardanza) {
      const minutosTardanza = Math.round(
        (horaActual - horaEntradaObj) / (60 * 1000)
      );

      return res.json({
        advertencia: `⚠️ ${saludo}. Estás ${minutosTardanza} minutos tarde. ¿Deseas registrar con tardanza?`,
        tieneTurno: true,
        tipoAdvertencia: "TARDANZA",
      });
    }
    // ✅ VALIDAR SI ES MUY TARDE (más de 15 minutos)
    else if (horaActual > margenTardanza) {
      const minutosTardanza = Math.round(
        (horaActual - horaEntradaObj) / (60 * 1000)
      );

      return res.json({
        advertencia: `⚠️ ${saludo}. Llegaste ${minutosTardanza} minutos tarde. ¿Deseas registrar igualmente?`,
        tieneTurno: true,
        tipoAdvertencia: "TARDANZA_EXTREMA",
      });
    }

    // ✅ SI NO HAY ADVERTENCIA (dentro del horario normal)
    return res.json({
      advertencia: null,
      tieneTurno: true,
      tipoAdvertencia: "PUNTUAL",
    });
  } catch (error) {
    console.error("❌ Error validando horario:", error);
    return res.json({
      advertencia: "Error al validar horario",
      tieneTurno: false,
      tipoAdvertencia: "ERROR",
    });
  }
});

// ✅ AGREGAR ESTE ENDPOINT PARA OBTENER HORARIO DEL EMPLEADO
router.get("/horario/:empleadoId", async (req, res) => {
  let pool;
  try {
    const { empleadoId } = req.params;
    const diaSemana = new Date().getDay() === 0 ? 7 : new Date().getDay();

    pool = await getConnection();

    const result = await pool
      .request()
      .input("empleadoId", sql.Int, empleadoId)
      .input("diaSemana", sql.Int, diaSemana).query(`
        SELECT he.HoraEntrada, he.HoraSalida, he.Activo
        FROM HorariosEmpleados he
        WHERE he.EmpleadoID = @empleadoId AND he.DiaSemana = @diaSemana AND he.Activo = 1
      `);

    if (result.recordset.length > 0) {
      res.json({
        success: true,
        horario: result.recordset[0],
        tieneTurno: true,
      });
    } else {
      res.json({
        success: true,
        horario: null,
        tieneTurno: false,
      });
    }
  } catch (error) {
    console.error("Error obteniendo horario:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo horario",
    });
  }
});

module.exports = router;
