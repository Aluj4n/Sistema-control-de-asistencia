const express = require('express');
const { getConnection, sql } = require('../database/connection');

const router = express.Router();

// Reporte de asistencias por fecha
router.get('/asistencias', async (req, res) => {
    let pool;
    try {
        const { fechaInicio, fechaFin, empresaId } = req.query;

        pool = await getConnection();

        let query = `
            SELECT 
                a.Fecha,
                e.Nombre,
                e.Apellidos,
                e.Cargo,
                em.Nombre as EmpresaNombre,
                a.HoraEntrada,
                a.HoraSalida,
                a.Estado,
                DATEDIFF(MINUTE, a.HoraEntrada, a.HoraSalida) as MinutosTrabajados
            FROM Asistencias a
            INNER JOIN Empleados e ON a.EmpleadoID = e.EmpleadoID
            INNER JOIN Empresas em ON e.EmpresaID = em.EmpresaID
            WHERE a.Fecha BETWEEN @fechaInicio AND @fechaFin
        `;

        if (empresaId) {
            query += ` AND e.EmpresaID = @empresaId`;
        }

        query += ` ORDER BY a.Fecha DESC, e.Nombre, e.Apellidos`;

        const request = pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin);

        if (empresaId) {
            request.input('empresaId', sql.Int, empresaId);
        }

        const result = await request.query(query);

        // Calcular resumen
        const resumen = {
            totalRegistros: result.recordset.length,
            totalPresentes: result.recordset.filter(r => r.Estado === 'Presente').length,
            totalAusentes: result.recordset.filter(r => r.Estado === 'Ausente').length,
            totalTardanzas: result.recordset.filter(r => r.Estado === 'Tardanza').length
        };

        res.json({
            success: true,
            reporte: result.recordset,
            resumen: resumen
        });

    } catch (error) {
        console.error('Error generando reporte:', error);
        res.status(500).json({
            success: false,
            message: 'Error generando reporte'
        });
    }
});

// Reporte de horas trabajadas por empleado
router.get('/horas-trabajadas', async (req, res) => {
    let pool;
    try {
        const { mes, año, empresaId } = req.query;

        pool = await getConnection();

        let query = `
            SELECT 
                e.EmpleadoID,
                e.Nombre,
                e.Apellidos,
                e.Cargo,
                em.Nombre as EmpresaNombre,
                COUNT(a.AsistenciaID) as DiasTrabajados,
                SUM(DATEDIFF(MINUTE, a.HoraEntrada, a.HoraSalida)) as TotalMinutos,
                CAST(SUM(DATEDIFF(MINUTE, a.HoraEntrada, a.HoraSalida)) / 60.0 as DECIMAL(10,2)) as TotalHoras
            FROM Empleados e
            INNER JOIN Empresas em ON e.EmpresaID = em.EmpresaID
            LEFT JOIN Asistencias a ON e.EmpleadoID = a.EmpleadoID 
                AND MONTH(a.Fecha) = @mes 
                AND YEAR(a.Fecha) = @año
                AND a.HoraSalida IS NOT NULL
            WHERE e.Activo = 1
        `;

        if (empresaId) {
            query += ` AND e.EmpresaID = @empresaId`;
        }

        query += ` GROUP BY e.EmpleadoID, e.Nombre, e.Apellidos, e.Cargo, em.Nombre
                   ORDER BY em.Nombre, e.Nombre, e.Apellidos`;

        const request = pool.request()
            .input('mes', sql.Int, mes)
            .input('año', sql.Int, año);

        if (empresaId) {
            request.input('empresaId', sql.Int, empresaId);
        }

        const result = await request.query(query);

        res.json({
            success: true,
            reporte: result.recordset
        });

    } catch (error) {
        console.error('Error generando reporte de horas:', error);
        res.status(500).json({
            success: false,
            message: 'Error generando reporte'
        });
    }
});

// Estadísticas generales
router.get('/estadisticas', async (req, res) => {
    let pool;
    try {
        const { fecha } = req.query;
        const fechaConsulta = fecha || new Date().toISOString().split('T')[0];

        pool = await getConnection();

        // Total empleados por empresa
        const empleadosPorEmpresa = await pool.request()
            .query(`
                SELECT 
                    em.Nombre as Empresa,
                    COUNT(e.EmpleadoID) as TotalEmpleados,
                    SUM(CASE WHEN e.Activo = 1 THEN 1 ELSE 0 END) as EmpleadosActivos
                FROM Empresas em
                LEFT JOIN Empleados e ON em.EmpresaID = e.EmpresaID
                GROUP BY em.EmpresaID, em.Nombre
                ORDER BY em.Nombre
            `);

        // Asistencias del día
        const asistenciasHoy = await pool.request()
            .input('fecha', sql.Date, fechaConsulta)
            .query(`
                SELECT 
                    em.Nombre as Empresa,
                    COUNT(a.AsistenciaID) as TotalAsistencias,
                    SUM(CASE WHEN a.Estado = 'Presente' THEN 1 ELSE 0 END) as Presentes,
                    SUM(CASE WHEN a.Estado = 'Tardanza' THEN 1 ELSE 0 END) as Tardanzas
                FROM Empresas em
                LEFT JOIN Empleados e ON em.EmpresaID = e.EmpresaID AND e.Activo = 1
                LEFT JOIN Asistencias a ON e.EmpleadoID = a.EmpleadoID AND a.Fecha = @fecha
                GROUP BY em.EmpresaID, em.Nombre
                ORDER BY em.Nombre
            `);

        res.json({
            success: true,
            estadisticas: {
                empleadosPorEmpresa: empleadosPorEmpresa.recordset,
                asistenciasHoy: asistenciasHoy.recordset,
                fechaConsulta: fechaConsulta
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo estadísticas'
        });
    }
});

module.exports = router;