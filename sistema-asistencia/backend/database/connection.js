const sql = require('mssql');

const dbConfig = {
    server: 'DESKTOP-QGM0FN2\\SQLEXPRESS',
    database: 'SistemaAsistencia',
    user: 'sa',
    password: 'Stick900',
    options: {
        enableArithAbort: true,
        trustServerCertificate: true,
        encrypt: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let poolConnection;

const getConnection = async () => {
    try {
        if (poolConnection) {
            return poolConnection;
        }
        
        poolConnection = await sql.connect(dbConfig);
        console.log('✅ Conectado a SQL Server correctamente');
        return poolConnection;
    } catch (error) {
        console.error('❌ Error conectando a SQL Server:', error.message);
        throw error;
    }
};

const closeConnection = async () => {
    try {
        if (poolConnection) {
            await poolConnection.close();
            poolConnection = null;
            console.log('🔌 Conexión cerrada');
        }
    } catch (error) {
        console.error('Error cerrando conexión:', error);
    }
};

module.exports = {
    getConnection,
    closeConnection,
    sql
};