const express = require('express');
const { getConnection, sql } = require('../database/connection');

const router = express.Router();

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

// Crear nueva empresa
router.post('/', async (req, res) => {
    let pool;
    try {
        const { nombre, descripcion, logoPath } = req.body;

        if (!nombre) {
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
            return res.status(400).json({
                success: false,
                message: 'Ya existe una empresa con ese nombre'
            });
        }

        // Insertar nueva empresa
        const result = await pool.request()
            .input('nombre', sql.VarChar(50), nombre)
            .input('descripcion', sql.VarChar(100), descripcion)
            .input('logoPath', sql.VarChar(255), logoPath)
            .query(`
                INSERT INTO Empresas (Nombre, Descripcion, LogoPath)
                OUTPUT INSERTED.EmpresaID, INSERTED.Nombre
                VALUES (@nombre, @descripcion, @logoPath)
            `);

        res.json({
            success: true,
            message: 'Empresa creada exitosamente',
            empresa: result.recordset[0]
        });

    } catch (error) {
        console.error('Error creando empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error creando empresa'
        });
    }
});

// Actualizar empresa
router.put('/:id', async (req, res) => {
    let pool;
    try {
        const { id } = req.params;
        const { nombre, descripcion, logoPath } = req.body;

        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la empresa es requerido'
            });
        }

        pool = await getConnection();

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar(50), nombre)
            .input('descripcion', sql.VarChar(100), descripcion)
            .input('logoPath', sql.VarChar(255), logoPath)
            .query(`
                UPDATE Empresas 
                SET Nombre = @nombre,
                    Descripcion = @descripcion,
                    LogoPath = @logoPath
                WHERE EmpresaID = @id
            `);

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
        console.error('Error actualizando empresa:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando empresa'
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
            .query('SELECT COUNT(*) as count FROM Empleados WHERE EmpresaID = @id AND Activo = 1');

        if (empleadosAsociados.recordset[0].count > 0) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la empresa porque tiene empleados activos'
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