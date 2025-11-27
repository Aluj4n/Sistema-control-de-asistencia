const express = require('express');
const { getConnection, sql } = require('../database/connection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configurar multer para subir archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../../images');
    // Crear la carpeta si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = 'logo-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPEG, PNG, JPG, GIF)'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// Obtener todas las empresas
router.get('/', async (req, res) => {
    let pool;
    try {
        pool = await getConnection();
        
        const result = await pool.request()
            .query('SELECT * FROM Empresas ORDER BY Nombre');

        res.json({
            success: true,
            empresas: result.recordset
        });

    } catch (error) {
        console.error('Error obteniendo empresas:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo empresas'
        });
    }
});

// Obtener empresa por ID
router.get('/:id', async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        
        pool = await getConnection();
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Empresas WHERE EmpresaID = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        res.json({
            success: true,
            empresa: result.recordset[0]
        });

    } catch (error) {
        console.error('Error obteniendo empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo empresa'
        });
    }
});

// Crear nueva empresa CON SUBIDA DE LOGO
router.post('/', upload.single('logo'), async (req, res) => {
    let pool;
    try {
        const { nombre, descripcion } = req.body;
        
        // Si no se subió logo, usar por defecto. Si se subió, usar ese.
        let logoPath = 'images/logo-empresa.png';
        if (req.file) {
            logoPath = 'images/' + req.file.filename;
        }

        console.log('Datos recibidos:', { nombre, descripcion, logoPath });

        if (!nombre) {
            // Si hay error y se subió archivo, eliminarlo
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'El nombre de la empresa es requerido'
            });
        }

        pool = await getConnection();

        // Verificar si la empresa ya existe
        const empresaExistente = await pool.request()
            .input('nombre', sql.VarChar(50), nombre)
            .query('SELECT EmpresaID FROM Empresas WHERE Nombre = @nombre');

        if (empresaExistente.recordset.length > 0) {
            // Si ya existe y se subió archivo, eliminarlo
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'Ya existe una empresa con ese nombre'
            });
        }

        // Insertar nueva empresa
        const result = await pool.request()
            .input('nombre', sql.VarChar(50), nombre)
            .input('descripcion', sql.VarChar(100), descripcion || '')
            .input('logoPath', sql.VarChar(255), logoPath)
            .query(`
                INSERT INTO Empresas (Nombre, Descripcion, LogoPath)
                OUTPUT INSERTED.EmpresaID, INSERTED.Nombre, INSERTED.Descripcion, INSERTED.LogoPath
                VALUES (@nombre, @descripcion, @logoPath)
            `);

        res.json({
            success: true,
            message: 'Empresa creada exitosamente',
            empresa: result.recordset[0]
        });

    } catch (error) {
        // Si hay error y se subió archivo, eliminarlo
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error creando empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error creando empresa: ' + error.message
        });
    }
});

// Actualizar empresa
// Actualizar empresa CON LOGO
router.put('/:id', upload.single('logo'), async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        
        let logoPath = null;
        if (req.file) {
            logoPath = 'images/' + req.file.filename;
        }

        if (!nombre) {
            // Eliminar archivo subido si hay error
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({
                success: false,
                message: 'El nombre de la empresa es requerido'
            });
        }

        pool = await getConnection();

        let query = `UPDATE Empresas SET Nombre = @nombre, Descripcion = @descripcion`;
        if (logoPath) {
            query += `, LogoPath = @logoPath`;
        }
        query += ` WHERE EmpresaID = @id`;

        const request = pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar(50), nombre)
            .input('descripcion', sql.VarChar(100), descripcion || '');

        if (logoPath) {
            request.input('logoPath', sql.VarChar(255), logoPath);
        }

        const result = await request.query(query);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Empresa actualizada exitosamente'
        });

    } catch (error) {
        // Eliminar archivo si hay error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Error actualizando empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando empresa: ' + error.message
        });
    }
});

// Eliminar empresa
router.delete('/:id', async (req, res) => {
    let pool;
    try {
        const { id } = req.params;

        pool = await getConnection();

        // Verificar si hay empleados asociados
        const empleadosAsociados = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT COUNT(*) as count FROM Empleados WHERE EmpresaID = @id');

        if (empleadosAsociados.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la empresa porque tiene empleados asociados'
            });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Empresas WHERE EmpresaID = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({
                success: false,
                message: 'Empresa no encontrada'
            });
        }

        res.json({
            success: true,
            message: 'Empresa eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error eliminando empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error eliminando empresa'
        });
    }
});

module.exports = router;