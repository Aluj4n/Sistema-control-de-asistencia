const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getConnection, sql } = require('../database/connection');

const router = express.Router();

// Configurar multer para fotos de empleados
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../images/empleados');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = 'empleado-' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Obtener todos los empleados
router.get('/', async (req, res) => {
    let pool;
    try {
        pool = await getConnection();
        
        const result = await pool.request()
            .query(`
                SELECT e.*, em.Nombre as EmpresaNombre 
                FROM Empleados e 
                INNER JOIN Empresas em ON e.EmpresaID = em.EmpresaID 
                WHERE e.Activo = 1
                ORDER BY e.Nombre, e.Apellidos
            `);

        res.json({
            success: true,
            empleados: result.recordset
        });

    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo empleados'
        });
    }
});

// Obtener empleados por empresa
router.get('/empresa/:empresaId', async (req, res) => {
    let pool;
    try {
        const { empresaId } = req.params;
        
        pool = await getConnection();
        
        const result = await pool.request()
            .input('empresaId', sql.Int, empresaId)
            .query(`
                SELECT * FROM Empleados 
                WHERE EmpresaID = @empresaId 
                AND Activo = 1 
                ORDER BY Nombre, Apellidos
            `);

        res.json({
            success: true,
            empleados: result.recordset
        });

    } catch (error) {
        console.error('Error obteniendo empleados por empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo empleados'
        });
    }
});

// Crear nuevo empleado
router.post('/', upload.single('foto'), async (req, res) => {
    let pool;
    try {
        console.log('📝 Datos recibidos:', req.body);

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
            horarios
        } = req.body;

        // ✅ OBTENER CONTRASEÑA DE CUALQUIER FORMA POSIBLE
        let contraseña = req.body.password || 
                        req.body.contraseña || 
                        req.body['contraseÃ±a'] || 
                        req.body.contrase_a;

        console.log('🔑 Contraseña obtenida:', contraseña);

        // Validaciones básicas
        if (!nombre || !apellidos || !dni || !empresaId || !usuario || !contraseña) {
            console.log('❌ Campos faltantes:', {
                nombre: !!nombre,
                apellidos: !!apellidos,
                dni: !!dni,
                empresaId: !!empresaId,
                usuario: !!usuario,
                contraseña: !!contraseña
            });
            return res.status(400).json({
                success: false,
                message: 'Campos requeridos: nombre, apellidos, DNI, empresa, usuario y contraseña'
            });
        }

        pool = await getConnection();

        // Verificar si el DNI ya existe
        const dniExistente = await pool.request()
            .input('dni', sql.Char(8), dni)
            .query('SELECT EmpleadoID FROM Empleados WHERE DNI = @dni AND Activo = 1');

        if (dniExistente.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El DNI ya está registrado'
            });
        }

        // Verificar si el usuario ya existe
        const usuarioExistente = await pool.request()
            .input('usuario', sql.VarChar(50), usuario)
            .query('SELECT EmpleadoID FROM Empleados WHERE Usuario = @usuario AND Activo = 1');

        if (usuarioExistente.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de usuario ya está en uso'
            });
        }

        // Procesar foto si se subió
        let fotoPath = null;
        if (req.file) {
            fotoPath = 'images/empleados/' + req.file.filename;
        }

        // Encriptar contraseña
        const contraseñaHash = await bcrypt.hash(contraseña, 10);

        // Insertar empleado
        const result = await pool.request()
            .input('nombre', sql.VarChar(50), nombre)
            .input('apellidos', sql.VarChar(50), apellidos)
            .input('dni', sql.Char(8), dni)
            .input('telefono', sql.VarChar(15), telefono || '')
            .input('direccion', sql.VarChar(255), direccion || '')
            .input('cargo', sql.VarChar(50), cargo || '')
            .input('empresaId', sql.Int, empresaId)
            .input('usuario', sql.VarChar(50), usuario)
            .input('contraseña', sql.VarChar(255), contraseñaHash)
            .input('fotoPath', sql.VarChar(255), fotoPath)
            .query(`
                INSERT INTO Empleados (
                    Nombre, Apellidos, DNI, Telefono, Direccion, Cargo,
                    EmpresaID, Usuario, Contraseña, FotoPath
                )
                OUTPUT INSERTED.EmpleadoID
                VALUES (
                    @nombre, @apellidos, @dni, @telefono, @direccion, @cargo,
                    @empresaId, @usuario, @contraseña, @fotoPath
                )
            `);

        const empleadoId = result.recordset[0].EmpleadoID;

        // Insertar horarios semanales (si existen)
        if (horarios) {
            try {
                const horariosArray = JSON.parse(horarios);
                if (Array.isArray(horariosArray)) {
                    for (const h of horariosArray) {
                        if (h.activo && h.horaEntrada && h.horaSalida) {
                            await pool.request()
                                .input('empleadoId', sql.Int, empleadoId)
                                .input('diaSemana', sql.Int, h.dia)
                                .input('horaEntrada', sql.Time, h.horaEntrada)
                                .input('horaSalida', sql.Time, h.horaSalida)
                                .query(`
                                    INSERT INTO HorariosEmpleados (EmpleadoID, DiaSemana, HoraEntrada, HoraSalida, Activo)
                                    VALUES (@empleadoId, @diaSemana, @horaEntrada, @horaSalida, 1)
                                `);
                        }
                    }
                }
            } catch (error) {
                console.error('Error procesando horarios:', error);
            }
        }

        res.json({
            success: true,
            message: 'Empleado creado exitosamente',
            empleadoId
        });

    } catch (error) {
        console.error('Error creando empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error creando empleado: ' + error.message
        });
    }
});

// Actualizar empleado
router.put('/:id', async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        const {
            nombre,
            apellidos,
            telefono,
            direccion,
            cargo,
            horarioEntrada,
            horarioSalida,
            activo
        } = req.body;

        pool = await getConnection();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar(50), nombre)
            .input('apellidos', sql.VarChar(50), apellidos)
            .input('telefono', sql.VarChar(15), telefono)
            .input('direccion', sql.VarChar(255), direccion)
            .input('cargo', sql.VarChar(50), cargo)
            .input('horarioEntrada', sql.Time, horarioEntrada)
            .input('horarioSalida', sql.Time, horarioSalida)
            .input('activo', sql.Bit, activo)
            .query(`
                UPDATE Empleados 
                SET Nombre = @nombre,
                    Apellidos = @apellidos,
                    Telefono = @telefono,
                    Direccion = @direccion,
                    Cargo = @cargo,
                    HorarioEntrada = @horarioEntrada,
                    HorarioSalida = @horarioSalida,
                    Activo = @activo
                WHERE EmpleadoID = @id
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Empleado actualizado exitosamente'
        });

    } catch (error) {
        console.error('Error actualizando empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando empleado'
        });
    }
});

// Eliminar empleado (soft delete)
router.delete('/:id', async (req, res) => {
    let pool;
    try {
        const { id } = req.params;

        pool = await getConnection();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE Empleados SET Activo = 0 WHERE EmpleadoID = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empleado no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Empleado eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error eliminando empleado'
        });
    }
});

module.exports = router;