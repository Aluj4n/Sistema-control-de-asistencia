const express = require('express');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');

// Importar rutas
const authRoutes = require('./routes/auth');
const empleadosRoutes = require('./routes/empleados');
const asistenciasRoutes = require('./routes/asistencias');
const empresasRoutes = require('./routes/empresas');
const reportesRoutes = require('./routes/reportes');
const ubicacionesRoutes = require('./routes/ubicaciones');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 }
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '..')));
app.use('/css', express.static(path.join(__dirname, '../css')));
app.use('/js', express.static(path.join(__dirname, '../js')));
app.use('/images', express.static(path.join(__dirname, '../images')));
app.use('/pages', express.static(path.join(__dirname, '../pages')));

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/ubicaciones', ubicacionesRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Ruta para páginas
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const validPages = ['admin-login', 'empleado-login', 'asistencia', 'admin-panel', 'reportes'];
    
    if (validPages.includes(page)) {
        res.sendFile(path.join(__dirname, `../pages/${page}.html`));
    } else {
        res.status(404).send('Página no encontrada');
    }
});

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Manejo de errores 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo de errores del servidor
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 Sistema de Asistencia - Backend activo`);
    console.log(`📁 Rutas disponibles:`);
    console.log(`   👥 /api/auth - Autenticación`);
    console.log(`   👨‍💼 /api/empleados - Gestión de empleados`);
    console.log(`   📅 /api/asistencias - Registro de asistencias`);
    console.log(`   🏢 /api/empresas - Gestión de empresas`);
    console.log(`   📊 /api/reportes - Reportes y estadísticas`);
    console.log(`   📍 /api/ubicaciones - Gestión de ubicaciones`);
});