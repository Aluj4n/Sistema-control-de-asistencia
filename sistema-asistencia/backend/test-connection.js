const { getConnection, closeConnection } = require('./database/connection');

async function testConnection() {
    try {
        const pool = await getConnection();
        
        // Probar consulta simple
        const result = await pool.request()
            .query('SELECT name FROM sys.databases');
            
        console.log('✅ Conexión exitosa. Bases de datos disponibles:');
        result.recordset.forEach(db => {
            console.log(`   - ${db.name}`);
        });
        
        await closeConnection();
    } catch (error) {
        console.error('❌ Error en la conexión:', error.message);
    }
}

testConnection();