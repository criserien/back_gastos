const express = require('express');
const app = express();
const PORT = 3000;
const mysql = require('mysql2/promise');

// Middleware opcional para que el servidor entienda datos en formato JSON
app.use(express.json());

app.use(express.json()); // Permite recibir JSON en las peticiones

// Configuración de la conexión a la base de datos
const pool = mysql.createPool({
    host: 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    user: '4XyqGZcQ4k4MWoG.root',
    password: 'ZQ5AS1QgoyHVRxmz',
    database: 'GASTOS',
    port: 4000, // Puerto común de TiDB (o el que te proporcione tu proveedor)
    ssl: {
        rejectUnauthorized: true // Esto activa la conexión segura obligatoria
    }
});

// ==========================================
// 1. RUTA GET: Consultar todos los registros
// ==========================================
app.get('/registros', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM registro_ventas');
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al consultar los datos' });
    }
});

// ==========================================
// 2. RUTA POST: Crear/Subir la fecha y los productos
// ==========================================
app.post('/registros', async (req, res) => {
    const { dia, mes, anio, productos } = req.body;

    // Validamos que vengan los datos obligatorios
    if (!dia || !mes || !anio || !Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: 'Faltan datos de la fecha o el arreglo de productos está vacío' 
        });
    }

    try {
        // Combinamos la fecha única con cada uno de los productos del arreglo
        const valores = productos.map(p => [dia, mes, anio, p.detalle, p.precio]);

        // Inserción masiva (Bulk Insert) eficiente en MySQL
        const query = 'INSERT INTO registro_ventas (dia, mes, anio, detalle, precio) VALUES ?';
        
        await pool.query(query, [valores]);

        res.status(201).json({
            success: true,
            message: `Se guardaron correctamente ${productos.length} productos para la fecha ${dia}/${mes}/${anio}`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Error al guardar los datos en la base de datos' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`Desde emulador Android: http://10.0.2.2:${PORT}`);
});