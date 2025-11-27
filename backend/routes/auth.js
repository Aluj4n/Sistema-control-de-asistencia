const express = require('express');
const bcrypt = require('bcryptjs');
const { getConnection, sql } = require('../database/connection');

const router = express.Router();

// Login de empleados
router.post('/empleado', async (req, res) => {
    let pool;
    try {
        const { usuario, contraseña, empresaId } = req.body;
        
        if (!usuario || !contraseña || !empresaId) {
            return res.status(400).json({
                success: false,
                message: 'Usuario, contraseña y empresa son requeridos'
            });
        }

        pool = await getConnection();
        
        const result = await pool.request()
            .input('usuario', sql.VarChar(50), usuario)
            .input('empresaId', sql.Int, empresaId)
            .query(`
                SELECT e.*, em.Nombre as EmpresaNombre 
                FROM Empleados e
                INNER JOIN Empresas em ON e.EmpresaID = em.EmpresaID
                WHERE e.Usuario = @usuario 
                AND e.EmpresaID = @empresaId 
                AND e.Activo = 1
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }

        const empleado = result.recordset[0];
        
        // Verificar contraseña
        const contraseñaValida = await bcrypt.compare(contraseña, empleado.Contraseña);
        
        if (!contraseñaValida) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        // Eliminar contraseña de la respuesta
        delete empleado.Contraseña;

        res.json({
            success: true,
            message: 'Login exitoso',
            empleado: empleado
        });

    } catch (error) {
        console.error('Error en login empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Login de administrador
// Login de administrador (VERSIÓN SIMPLIFICADA)
router.post('/admin', async (req, res) => {
    let pool;
    try {
        const { usuario, contraseña } = req.body;
        
        if (!usuario || !contraseña) {
            return res.status(400).json({
                success: false,
                message: 'Usuario y contraseña son requeridos'
            });
        }

        pool = await getConnection();
        
        const result = await pool.request()
            .input('usuario', sql.VarChar(50), usuario)
            .query('SELECT * FROM UsuariosAdmin WHERE Usuario = @usuario');

        if (result.recordset.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuario administrador no encontrado'
            });
        }

        const admin = result.recordset[0];
        
        // ✅ VERSIÓN SIMPLIFICADA - Comparación directa (sin bcrypt)
        if (contraseña !== admin.Contraseña) {
            return res.status(401).json({
                success: false,
                message: 'Contraseña incorrecta'
            });
        }

        // Actualizar último acceso
        await pool.request()
            .input('usuario', sql.VarChar(50), usuario)
            .query('UPDATE UsuariosAdmin SET UltimoAcceso = GETDATE() WHERE Usuario = @usuario');

        // Eliminar contraseña de la respuesta
        delete admin.Contraseña;

        res.json({
            success: true,
            message: 'Login administrador exitoso',
            admin: admin
        });

    } catch (error) {
        console.error('Error en login admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }

    
});
router.post('/verify', (req, res) => {
    const { token } = req.body;
    if (!token) return res.json({ valid: false });

    // Si usas JWT o guardas el token en memoria, aquí lo verificas.
    // Por ahora haremos algo simple:
    res.json({ valid: true }); // o false si lo deseas más estricto
});

module.exports = router;