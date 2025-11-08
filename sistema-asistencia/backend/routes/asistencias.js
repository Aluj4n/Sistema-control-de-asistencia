const express = require('express');
const { getConnection, sql } = require('../database/connection');

const router = express.Router();

// Registrar entrada
router.post('/entrada', async (req, res) => {
    let pool;
    try {
        const {
            empleadoId,
            fotoEntrada,
            latitudEntrada,
            longitudEntrada
        } = req.body;

        if (!empleadoId) {
            return res.status(400).json({
                success: false,
                message: 'ID de empleado es requerido'
            });
        }

        const fechaHoy = new Date().toISOString().split('T')[0];
        const horaActual = new Date();

        pool = await getConnection();

        // Verificar si ya existe registro para hoy
        const registroExistente = await pool.request()
            .input('empleadoId', sql.Int, empleadoId)
            .input('fecha', sql.Date, fechaHoy)
            .query('SELECT * FROM Asistencias WHERE EmpleadoID = @empleadoId AND Fecha = @fecha');

        if (registroExistente.recordset.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Ya se registró la entrada para hoy'
            });
        }

        // Insertar nuevo registro de entrada
        const result = await pool.request()
            .input('empleadoId', sql.Int, empleadoId)
            .input('fecha', sql.Date, fechaHoy)
            .input('horaEntrada', sql.DateTime, horaActual)
            .input('fotoEntrada', sql.VarChar(255), fotoEntrada)
            .input('latitudEntrada', sql.Decimal(10, 8), latitudEntrada)
            .input('longitudEntrada', sql.Decimal(10, 8), longitudEntrada)
            .query(`
                INSERT INTO Asistencias (
                    EmpleadoID, Fecha, HoraEntrada, FotoEntrada, 
                    LatitudEntrada, LongitudEntrada, Estado
                )
                OUTPUT INSERTED.AsistenciaID, INSERTED.HoraEntrada
                VALUES (
                    @empleadoId, @fecha, @horaEntrada, @fotoEntrada,
                    @latitudEntrada, @longitudEntrada, 'Presente'
                )
            `);

        res.json({
            success: true,
            message: 'Entrada registrada exitosamente',
            asistencia: result.recordset[0]
        });

    } catch (error) {
        console.error('Error registrando entrada:', error);
        res.status(500).json({
            success: false,
            message: 'Error registrando entrada'
        });
    }
});

// Registrar salida
router.post('/salida', async (req, res) => {
    let pool;
    try {
        const {
            empleadoId,
            fotoSalida,
            latitudSalida,
            longitudSalida
        } = req.body;

        if (!empleadoId) {
            return res.status(400).json({
                success: false,
                message: 'ID de empleado es requerido'
            });
        }

        const fechaHoy = new Date().toISOString().split('T')[0];
        const horaActual = new Date();

        pool = await getConnection();

        // Verificar si existe registro de entrada para hoy
        const registroExistente = await pool.request()
            .input('empleadoId', sql.Int, empleadoId)
            .input('fecha', sql.Date, fechaHoy)
            .query('SELECT * FROM Asistencias WHERE EmpleadoID = @empleadoId AND Fecha = @fecha');

        if (registroExistente.recordset.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No se encontró registro de entrada para hoy'
            });
        }

        if (registroExistente.recordset[0].HoraSalida) {
            return res.status(400).json({
                success: false,
                message: 'Ya se registró la salida para hoy'
            });
        }

        // Actualizar registro con salida
        const result = await pool.request()
            .input('empleadoId', sql.Int, empleadoId)
            .input('fecha', sql.Date, fechaHoy)
            .input('horaSalida', sql.DateTime, horaActual)
            .input('fotoSalida', sql.VarChar(255), fotoSalida)
            .input('latitudSalida', sql.Decimal(10, 8), latitudSalida)
            .input('longitudSalida', sql.Decimal(10, 8), longitudSalida)
            .query(`
                UPDATE Asistencias 
                SET HoraSalida = @horaSalida,
                    FotoSalida = @fotoSalida,
                    LatitudSalida = @latitudSalida,
                    LongitudSalida = @longitudSalida
                WHERE EmpleadoID = @empleadoId AND Fecha = @fecha
            `);

        res.json({
            success: true,
            message: 'Salida registrada exitosamente',
            horaSalida: horaActual
        });

    } catch (error) {
        console.error('Error registrando salida:', error);
        res.status(500).json({
            success: false,
            message: 'Error registrando salida'
        });
    }
});

// Obtener asistencias por fecha
router.get('/fecha/:fecha', async (req, res) => {
    let pool;
    try {
        const { fecha } = req.params;

        pool = await getConnection();

        const result = await pool.request()
            .input('fecha', sql.Date, fecha)
            .query(`
                SELECT 
                    a.*,
                    e.Nombre,
                    e.Apellidos,
                    e.Cargo,
                    em.Nombre as EmpresaNombre
                FROM Asistencias a
                INNER JOIN Empleados e ON a.EmpleadoID = e.EmpleadoID
                INNER JOIN Empresas em ON e.EmpresaID = em.EmpresaID
                WHERE a.Fecha = @fecha
                ORDER BY e.Nombre, e.Apellidos
            `);

        res.json({
            success: true,
            asistencias: result.recordset
        });

    } catch (error) {
        console.error('Error obteniendo asistencias:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo asistencias'
        });
    }
});

// Obtener asistencias de un empleado
router.get('/empleado/:empleadoId', async (req, res) => {
    let pool;
    try {
        const { empleadoId } = req.params;
        const { mes, año } = req.query;

        pool = await getConnection();

        let query = `
            SELECT 
                a.*,
                e.Nombre,
                e.Apellidos
            FROM Asistencias a
            INNER JOIN Empleados e ON a.EmpleadoID = e.EmpleadoID
            WHERE a.EmpleadoID = @empleadoId
        `;

        if (mes && año) {
            query += ` AND MONTH(a.Fecha) = @mes AND YEAR(a.Fecha) = @año`;
        }

        query += ` ORDER BY a.Fecha DESC`;

        const request = pool.request()
            .input('empleadoId', sql.Int, empleadoId);

        if (mes && año) {
            request.input('mes', sql.Int, mes)
                   .input('año', sql.Int, año);
        }

        const result = await request.query(query);

        res.json({
            success: true,
            asistencias: result.recordset
        });

    } catch (error) {
        console.error('Error obteniendo asistencias del empleado:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo asistencias'
        });
    }
});

module.exports = router;