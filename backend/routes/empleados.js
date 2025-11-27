const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getConnection, sql } = require("../database/connection");

const router = express.Router();

// Configurar multer para fotos de empleados
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../../images/empleados");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName =
      "empleado-" + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Obtener todos los empleados
router.get("/", async (req, res) => {
  let pool;
  try {
    pool = await getConnection();

    const result = await pool.request().query(`
                SELECT e.*, em.Nombre as EmpresaNombre 
                FROM Empleados e 
                INNER JOIN Empresas em ON e.EmpresaID = em.EmpresaID 
                WHERE e.Activo = 1
                ORDER BY e.Nombre, e.Apellidos
            `);

    res.json({
      success: true,
      empleados: result.recordset,
    });
  } catch (error) {
    console.error("Error obteniendo empleados:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo empleados",
    });
  }
});

// Obtener empleados por empresa
router.get("/empresa/:empresaId", async (req, res) => {
  let pool;
  try {
    const { empresaId } = req.params;

    pool = await getConnection();

    const result = await pool.request().input("empresaId", sql.Int, empresaId)
      .query(`
                SELECT * FROM Empleados 
                WHERE EmpresaID = @empresaId 
                AND Activo = 1 
                ORDER BY Nombre, Apellidos
            `);

    res.json({
      success: true,
      empleados: result.recordset,
    });
  } catch (error) {
    console.error("Error obteniendo empleados por empresa:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo empleados",
    });
  }
});

// Crear nuevo empleado
router.post("/", upload.single("foto"), async (req, res) => {
  let pool;
  try {
    console.log("📝 Datos recibidos:", req.body);

    // ✅ SOLUCIÓN: Usar el campo con encoding corrupto o el campo corregido
    const {
      nombre,
      apellidos,
      dni,
      telefono,
      direccion,
      cargo,
      empresaId,
      usuario,
      horarios,
    } = req.body;

    // ✅ OBTENER CONTRASEÑA DE CUALQUIER FORMA POSIBLE
    let contraseña =
      req.body.password ||
      req.body.contraseña ||
      req.body["contraseÃ±a"] ||
      req.body.contrase_a;

    console.log("🔑 Contraseña obtenida:", contraseña);

    // ✅ OBTENER FECHAS DE TURNO (SI EXISTEN)
    const fechaInicioTurno = req.body.fechaInicioTurno;
    const fechaFinTurno = req.body.fechaFinTurno;

    console.log("📅 Fechas de turno recibidas:", {
      fechaInicioTurno,
      fechaFinTurno,
    });

    // Validaciones básicas
    if (
      !nombre ||
      !apellidos ||
      !dni ||
      !empresaId ||
      !usuario ||
      !contraseña
    ) {
      console.log("❌ Campos faltantes:", {
        nombre: !!nombre,
        apellidos: !!apellidos,
        dni: !!dni,
        empresaId: !!empresaId,
        usuario: !!usuario,
        contraseña: !!contraseña,
      });
      return res.status(400).json({
        success: false,
        message:
          "Campos requeridos: nombre, apellidos, DNI, empresa, usuario y contraseña",
      });
    }

    pool = await getConnection();

    // Verificar si el DNI ya existe
    const dniExistente = await pool
      .request()
      .input("dni", sql.Char(8), dni)
      .query(
        "SELECT EmpleadoID FROM Empleados WHERE DNI = @dni AND Activo = 1"
      );

    if (dniExistente.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El DNI ya está registrado",
      });
    }

    // Verificar si el usuario ya existe
    const usuarioExistente = await pool
      .request()
      .input("usuario", sql.VarChar(50), usuario)
      .query(
        "SELECT EmpleadoID FROM Empleados WHERE Usuario = @usuario AND Activo = 1"
      );

    if (usuarioExistente.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: "El nombre de usuario ya está en uso",
      });
    }

    // Procesar foto si se subió
    let fotoPath = null;
    if (req.file) {
      fotoPath = "images/empleados/" + req.file.filename;
    }

    // Encriptar contraseña
    const contraseñaHash = await bcrypt.hash(contraseña, 10);

    // Insertar empleado CON FECHAS
    const result = await pool
      .request()
      .input("nombre", sql.VarChar(50), nombre)
      .input("apellidos", sql.VarChar(50), apellidos)
      .input("dni", sql.Char(8), dni)
      .input("telefono", sql.VarChar(15), telefono || "")
      .input("direccion", sql.VarChar(255), direccion || "")
      .input("cargo", sql.VarChar(50), cargo || "")
      .input("empresaId", sql.Int, empresaId)
      .input("usuario", sql.VarChar(50), usuario)
      .input("contraseña", sql.VarChar(255), contraseñaHash)
      .input("fotoPath", sql.VarChar(255), fotoPath)
      .input("fechaInicioTurno", sql.Date, fechaInicioTurno || null)
      .input("fechaFinTurno", sql.Date, fechaFinTurno || null).query(`
        INSERT INTO Empleados (
            Nombre, Apellidos, DNI, Telefono, Direccion, Cargo,
            EmpresaID, Usuario, Contraseña, FotoPath, FechaInicioTurno, FechaFinTurno
        )
        OUTPUT INSERTED.EmpleadoID
        VALUES (
            @nombre, @apellidos, @dni, @telefono, @direccion, @cargo,
            @empresaId, @usuario, @contraseña, @fotoPath, @fechaInicioTurno, @fechaFinTurno
        )
    `);

    const empleadoId = result.recordset[0].EmpleadoID;

    // Insertar horarios semanales (si existen)
    if (horarios) {
      try {
        console.log("📅 HORARIOS RECIBIDOS EN BACKEND (POST):", horarios);
        const horariosArray = JSON.parse(horarios);
        console.log("📅 HORARIOS PARSEADOS (POST):", horariosArray);

        if (Array.isArray(horariosArray)) {
          console.log("📅 INSERTANDO HORARIOS EN BD (POST)...");
          let horariosInsertados = 0;

          for (const h of horariosArray) {
            console.log("📅 PROCESANDO HORARIO (POST):", h);
            if (h.activo && h.horaEntrada && h.horaSalida) {
              console.log(
                `📅 INSERTANDO DÍA ${h.dia}: ${h.horaEntrada} - ${h.horaSalida}`
              );

              // ✅ SOLUCIÓN DEFINITIVA: Crear objeto Time de SQL Server
              const horaEntradaTime = new Date(
                `1970-01-01T${h.horaEntrada}:00`
              );
              const horaSalidaTime = new Date(`1970-01-01T${h.horaSalida}:00`);

              // ✅ SOLUCIÓN DEFINITIVA: Usar horas en formato string directamente
              console.log(
                `📅 INSERTANDO DÍA ${h.dia}: ${h.horaEntrada} - ${h.horaSalida}`
              );

              await pool
                .request()
                .input("empleadoId", sql.Int, empleadoId)
                .input("diaSemana", sql.Int, h.dia)
                .input("horaEntrada", sql.VarChar(8), h.horaEntrada + ":00") // ← String directo
                .input("horaSalida", sql.VarChar(8), h.horaSalida + ":00") // ← String directo
                .query(`
        INSERT INTO HorariosEmpleados (EmpleadoID, DiaSemana, HoraEntrada, HoraSalida, Activo)
        VALUES (@empleadoId, @diaSemana, @horaEntrada, @horaSalida, 1)
    `);

              horariosInsertados++;
              console.log(`✅ HORARIO DÍA ${h.dia} INSERTADO (POST)`);
            } else {
              console.log(
                `❌ HORARIO DÍA ${h.dia} NO CUMPLE CONDICIONES (POST):`,
                h
              );
            }
          }
          console.log(
            `✅ TOTAL HORARIOS INSERTADOS (POST): ${horariosInsertados}`
          );
        } else {
          console.log(
            "❌ HORARIOS NO ES UN ARRAY (POST):",
            typeof horariosArray
          );
        }
      } catch (error) {
        console.error("❌ ERROR PROCESANDO HORARIOS (POST):", error);
        console.error("❌ ERROR STACK (POST):", error.stack);
      }
    } else {
      console.log("❌ NO SE RECIBIERON HORARIOS EN EL BACKEND (POST)");
    }

    res.json({
      success: true,
      message: "Empleado creado exitosamente",
      empleadoId,
    });
  } catch (error) {
    console.error("Error creando empleado:", error);
    res.status(500).json({
      success: false,
      message: "Error creando empleado: " + error.message,
    });
  }
});

// Actualizar empleado (COMPLETO) - VERSIÓN CORREGIDA
router.put("/:id", upload.single("foto"), async (req, res) => {
  let pool;
  try {
    const { id } = req.params;
    console.log("📝 Datos recibidos para edición:", req.body);
    // ✅ AGREGAR LOG DETALLADO DE LO QUE LLEGA
    console.log("🔍 DATOS RECIBIDOS EN BACKEND (PUT):", req.body);
    console.log("🔍 DNI recibido:", req.body.dni);
    console.log("🔍 Todos los campos recibidos:");
    Object.keys(req.body).forEach((key) => {
      console.log(`   ${key}: ${req.body[key]}`);
    });

    const {
      nombre,
      apellidos,
      dni,
      telefono,
      direccion,
      cargo,
      empresaId,
      usuario,
      horarios,
      removeFoto,
      fechaInicioTurno,
      fechaFinTurno,
    } = req.body;

    // Obtener contraseña (puede estar vacía en edición)
    let contraseña =
      req.body.password ||
      req.body.contraseña ||
      req.body["contraseÃ±a"] ||
      req.body.contrase_a;

    console.log("🔑 Contraseña recibida:", contraseña ? "***" : "Vacía");

    pool = await getConnection();

    // Verificar que el empleado existe
    const empleadoExistente = await pool
      .request()
      .input("id", sql.Int, id)
      .query("SELECT * FROM Empleados WHERE EmpleadoID = @id AND Activo = 1");

    if (empleadoExistente.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Empleado no encontrado",
      });
    }

    // ✅ CORREGIDO: Verificar si el usuario ya existe en OTRO empleado
    console.log("🔍 Validando usuario:", {
      usuarioRecibido: usuario,
      usuarioActual: empleadoExistente.recordset[0].Usuario,
      sonIguales: usuario === empleadoExistente.recordset[0].Usuario,
    });

    // ✅ SOLUCIÓN CORREGIDA: Solo validar si el usuario cambió
    if (usuario !== empleadoExistente.recordset[0].Usuario) {
      console.log("🔍 Usuario cambió, validando...");

      const usuarioExistente = await pool
        .request()
        .input("usuario", sql.VarChar(50), usuario)
        .input("id", sql.Int, id)
        .query(
          "SELECT EmpleadoID FROM Empleados WHERE Usuario = @usuario AND EmpleadoID != @id AND Activo = 1"
        );

      console.log("🔍 Resultado validación usuario:", {
        encontrados: usuarioExistente.recordset.length,
        registros: usuarioExistente.recordset,
      });

      if (usuarioExistente.recordset.length > 0) {
        console.log(
          "❌ Usuario ya existe en otro empleado:",
          usuarioExistente.recordset[0]
        );
        return res.status(400).json({
          success: false,
          message: "El nombre de usuario ya está en uso por otro empleado",
        });
      }
    } else {
      console.log("✅ Usuario no cambió, no necesita validación");
    }

    // Procesar foto
    let fotoPath = empleadoExistente.recordset[0].FotoPath;

    if (removeFoto === "true") {
      // Eliminar foto existente
      if (fotoPath && fs.existsSync(path.join(__dirname, "../../", fotoPath))) {
        fs.unlinkSync(path.join(__dirname, "../../", fotoPath));
      }
      fotoPath = null;
    } else if (req.file) {
      // Nueva foto subida
      if (fotoPath && fs.existsSync(path.join(__dirname, "../../", fotoPath))) {
        fs.unlinkSync(path.join(__dirname, "../../", fotoPath));
      }
      fotoPath = "images/empleados/" + req.file.filename;
    }

    // ✅ CORREGIDO: Usar un nombre diferente para evitar conflicto
    const dbRequest = pool
      .request()
      .input("id", sql.Int, id)
      .input("nombre", sql.VarChar(50), nombre)
      .input("apellidos", sql.VarChar(50), apellidos)
      .input("telefono", sql.VarChar(15), telefono || "")
      .input("direccion", sql.VarChar(255), direccion || "")
      .input("cargo", sql.VarChar(50), cargo || "")
      .input("empresaId", sql.Int, empresaId)
      .input("usuario", sql.VarChar(50), usuario)
      .input("fechaInicioTurno", sql.Date, fechaInicioTurno || null)
      .input("fechaFinTurno", sql.Date, fechaFinTurno || null);

    // Preparar consulta de actualización
    let updateQuery = `
            UPDATE Empleados 
            SET Nombre = @nombre,
                Apellidos = @apellidos,
                Telefono = @telefono,
                Direccion = @direccion,
                Cargo = @cargo,
                EmpresaID = @empresaId,
                Usuario = @usuario,
                FechaInicioTurno = @fechaInicioTurno,
                FechaFinTurno = @fechaFinTurno
        `;

    // En la parte de la contraseña:
    if (contraseña && contraseña.trim() !== "") {
      const contraseñaHash = await bcrypt.hash(contraseña, 10);
      updateQuery += ", Contraseña = @contraseña";
      dbRequest.input("contraseña", sql.VarChar(255), contraseñaHash); // ← Cambiado
    }

    if (fotoPath !== undefined) {
      updateQuery += ", FotoPath = @fotoPath";
      dbRequest.input("fotoPath", sql.VarChar(255), fotoPath); // ← Cambiado
    }

    // Y en la ejecución final:
    const result = await dbRequest.query(updateQuery); // ← Cambiado

    // Actualizar horarios
    if (horarios) {
      try {
        console.log("📅 HORARIOS RECIBIDOS EN BACKEND:", horarios);
        const horariosArray = JSON.parse(horarios);
        console.log("📅 HORARIOS PARSEADOS:", horariosArray);

        if (Array.isArray(horariosArray)) {
          console.log("📅 INSERTANDO HORARIOS EN BD...");
          let horariosInsertados = 0;

          // ✅ PRIMERO: Eliminar horarios existentes
          await pool
            .request()
            .input("empleadoId", sql.Int, id)
            .query(
              "DELETE FROM HorariosEmpleados WHERE EmpleadoID = @empleadoId"
            );

          // ✅ LUEGO: Insertar nuevos horarios
          for (const h of horariosArray) {
            console.log("📅 PROCESANDO HORARIO:", h);
            if (h.activo && h.horaEntrada && h.horaSalida) {
              console.log(
                `📅 INSERTANDO DÍA ${h.dia}: ${h.horaEntrada} - ${h.horaSalida}`
              );

              // ✅ SOLUCIÓN DEFINITIVA: Crear objeto Time de SQL Server
              const horaEntradaTime = new Date(
                `1970-01-01T${h.horaEntrada}:00Z`
              ); // ← Agregar Z
              const horaSalidaTime = new Date(`1970-01-01T${h.horaSalida}:00Z`); // ← Agregar Z

              console.log(
                `📅 HORA UTC - Entrada: ${horaEntradaTime.toISOString()}, Salida: ${horaSalidaTime.toISOString()}`
              );

              await pool
                .request()
                .input("empleadoId", sql.Int, id)
                .input("diaSemana", sql.Int, h.dia)
                .input("horaEntrada", sql.Time, horaEntradaTime)
                .input("horaSalida", sql.Time, horaSalidaTime).query(`
        INSERT INTO HorariosEmpleados (EmpleadoID, DiaSemana, HoraEntrada, HoraSalida, Activo)
        VALUES (@empleadoId, @diaSemana, @horaEntrada, @horaSalida, 1)
    `);

              horariosInsertados++;
              console.log(`✅ HORARIO DÍA ${h.dia} INSERTADO`);
            } else {
              console.log(`❌ HORARIO DÍA ${h.dia} NO CUMPLE CONDICIONES:`, h);
            }
          }
          console.log(`✅ TOTAL HORARIOS INSERTADOS: ${horariosInsertados}`);
        } else {
          console.log("❌ HORARIOS NO ES UN ARRAY:", typeof horariosArray);
        }
      } catch (error) {
        console.error("❌ ERROR PROCESANDO HORARIOS:", error);
        console.error("❌ ERROR STACK:", error.stack);
      }
    } else {
      console.log("❌ NO SE RECIBIERON HORARIOS EN EL BACKEND");
    }

    res.json({
      success: true,
      message: "Empleado actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error actualizando empleado:", error);
    res.status(500).json({
      success: false,
      message: "Error actualizando empleado: " + error.message,
    });
  }
});

// Eliminar empleado por query parameter (alternativa)
router.delete("/:id", async (req, res) => {
  let pool;
  try {
    const { id } = req.params;

    // ✅ AGREGAR LOGS DETALLADOS
    console.log("🗑️ ===== INICIANDO ELIMINACIÓN =====");
    console.log("📥 ID recibido en params:", id);
    console.log("📥 Tipo de ID:", typeof id);
    console.log("📥 URL completa:", req.originalUrl);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID de empleado requerido",
      });
    }

    const idNumerico = parseInt(id);
    if (isNaN(idNumerico)) {
      return res.status(400).json({
        success: false,
        message: "ID de empleado debe ser un número",
      });
    }

    pool = await getConnection();

    const result = await pool
      .request()
      .input("id", sql.Int, idNumerico)
      .query("UPDATE Empleados SET Activo = 0 WHERE EmpleadoID = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Empleado no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Empleado eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error eliminando empleado:", error);
    res.status(500).json({
      success: false,
      message: "Error eliminando empleado",
    });
  }
});

// Agregar después del endpoint GET /
router.get("/:id", async (req, res) => {
  let pool;
  try {
    const { id } = req.params;

    pool = await getConnection();

    // Obtener datos del empleado CON FECHAS
    const empleadoResult = await pool.request().input("id", sql.Int, id).query(`
    SELECT e.*, em.Nombre as EmpresaNombre,
           CONVERT(VARCHAR(10), e.FechaInicioTurno, 120) as FechaInicioTurnoStr,
           CONVERT(VARCHAR(10), e.FechaFinTurno, 120) as FechaFinTurnoStr
    FROM Empleados e 
    INNER JOIN Empresas em ON e.EmpresaID = em.EmpresaID 
    WHERE e.EmpleadoID = @id AND e.Activo = 1
`);

    if (empleadoResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Empleado no encontrado",
      });
    }

    const empleado = empleadoResult.recordset[0];

    // Obtener horarios del empleado
    const horariosResult = await pool.request().input("empleadoId", sql.Int, id)
      .query(`
        SELECT DiaSemana, 
               CONVERT(VARCHAR(8), HoraEntrada, 108) as HoraEntrada,
               CONVERT(VARCHAR(8), HoraSalida, 108) as HoraSalida, 
               Activo 
        FROM HorariosEmpleados 
        WHERE EmpleadoID = @empleadoId AND Activo = 1
        ORDER BY DiaSemana
    `);

    empleado.Horarios = horariosResult.recordset;
    console.log("📅 Horarios desde BD:", empleado.Horarios);

    res.json({
      success: true,
      empleado,
    });
  } catch (error) {
    console.error("Error obteniendo empleado:", error);
    res.status(500).json({
      success: false,
      message: "Error obteniendo empleado",
    });
  }
});

// Eliminar empleado por POST (ruta alternativa)
router.post("/delete", async (req, res) => {
  let pool;
  try {
    const id = req.body.get("id"); // ✅ FormData se lee con .get()

    console.log("🗑️ ===== ELIMINACIÓN POR POST =====");
    console.log("📥 ID recibido en body:", id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID de empleado requerido",
      });
    }

    const idNumerico = parseInt(id);
    if (isNaN(idNumerico)) {
      return res.status(400).json({
        success: false,
        message: "ID de empleado debe ser un número",
      });
    }

    pool = await getConnection();

    const result = await pool
      .request()
      .input("id", sql.Int, idNumerico)
      .query("UPDATE Empleados SET Activo = 0 WHERE EmpleadoID = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: "Empleado no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Empleado eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error eliminando empleado:", error);
    res.status(500).json({
      success: false,
      message: "Error eliminando empleado",
    });
  }
});

module.exports = router;
