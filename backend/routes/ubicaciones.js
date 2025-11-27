const express = require('express');
const { getConnection, sql } = require('../database/connection');

const router = express.Router();

// Guardar ubicación
router.post('/', async (req, res) => {
    let pool;
    try {
        const { empleadoId, latitud, longitud, tipo } = req.body;

        if (!empleadoId || !latitud || !longitud || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'Datos incompletos: empleadoId, latitud, longitud y tipo son requeridos'
            });
        }

        pool = await getConnection();

        const fechaHoy = new Date().toISOString().split('T')[0];

        if (tipo === 'entrada') {
            await pool.request()
                .input('empleadoId', sql.Int, empleadoId)
                .input('fecha', sql.Date, fechaHoy)
                .input('latitud', sql.Decimal(10, 8), latitud)
                .input('longitud', sql.Decimal(10, 8), longitud)
                .query(`
                    UPDATE Asistencias 
                    SET LatitudEntrada = @latitud, 
                        LongitudEntrada = @longitud
                    WHERE EmpleadoID = @empleadoId AND Fecha = @fecha
                `);
        } else if (tipo === 'salida') {
            await pool.request()
                .input('empleadoId', sql.Int, empleadoId)
                .input('fecha', sql.Date, fechaHoy)
                .input('latitud', sql.Decimal(10, 8), latitud)
                .input('longitud', sql.Decimal(10, 8), longitud)
                .query(`
                    UPDATE Asistencias 
                    SET LatitudSalida = @latitud, 
                        LongitudSalida = @longitud
                    WHERE EmpleadoID = @empleadoId AND Fecha = @fecha
                `);
        }

        res.json({
            success: true,
            message: 'Ubicación guardada exitosamente'
        });

    } catch (error) {
        console.error('Error guardando ubicación:', error);
        res.status(500).json({
            success: false,
            message: 'Error guardando ubicación'
        });
    }
});

// Obtener ubicaciones de un empleado
router.get('/empleado/:empleadoId', async (req, res) => {
    let pool;
    try {
        const { empleadoId } = req.params;
        const { fecha } = req.query;

        pool = await getConnection();

        const result = await pool.request()
            .input('empleadoId', sql.Int, empleadoId)
            .input('fecha', sql.Date, fecha)
            .query(`
                SELECT 
                    LatitudEntrada,
                    LongitudEntrada,
                    LatitudSalida,
                    LongitudSalida,
                    Fecha
                FROM Asistencias 
                WHERE EmpleadoID = @empleadoId AND Fecha = @fecha
            `);

        res.json({
            success: true,
            ubicaciones: result.recordset[0] || {}
        });

    } catch (error) {
        console.error('Error obteniendo ubicaciones:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo ubicaciones'
        });
    }
});

module.exports = router;