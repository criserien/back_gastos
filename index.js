const express = require('express');
const app = express();
const PORT = 3000;
const mysql = require('mysql2/promise');
const cors = require('cors'); // 1. Importar

// 2. Configurar CORS para permitir tu frontend de Angular
const corsOptions = {
  origin: [
    'http://localhost:4200',
    'https://contabilidad-mu-seven.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions)); // 3. Usar el middleware

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

app.get('/gastos/:anio/:mes/:dia', async (req, res) => {
    try {
        const { anio, mes, dia } = req.params;

        // Convertir a enteros
        const anioNum = parseInt(anio, 10);
        const mesNum  = parseInt(mes, 10);
        const diaNum  = parseInt(dia, 10);

        // Validaciones básicas
        if (
            isNaN(anioNum) || isNaN(mesNum) || isNaN(diaNum) ||
            mesNum < 1 || mesNum > 12 ||
            diaNum < 1 || diaNum > 31
        ) {
            return res.status(400).json({
                error: 'Fecha inválida. Formato esperado: /gastos/:anio/:mes/:dia'
            });
        }

        // Verificar que la fecha exista realmente (ej: 2025-02-30 no existe)
        const fechaObj = new Date(anioNum, mesNum - 1, diaNum);
        if (
            fechaObj.getFullYear() !== anioNum ||
            fechaObj.getMonth() + 1 !== mesNum ||
            fechaObj.getDate() !== diaNum
        ) {
            return res.status(400).json({ error: 'La fecha no existe en el calendario.' });
        }

        // Consulta: suma los gastos del día usando las 3 columnas INT
        // Ajusta "monto" al nombre real de tu columna de valor del gasto.
        const [rows] = await pool.query(
            `SELECT 
                COALESCE(SUM(precio), 0) AS total,
                COUNT(*) AS cantidad_gastos
             FROM registro_ventas
             WHERE anio = ? AND mes = ? AND dia = ?`,
            [anioNum, mesNum, diaNum]
        );

        return res.json({
            fecha: `${anioNum}-${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`,
            anio: anioNum,
            mes: mesNum,
            dia: diaNum,
            total: Number(rows[0].total),
            cantidad_gastos: rows[0].cantidad_gastos
        });

    } catch (err) {
        console.error('Error en /gastos:', err);
        return res.status(500).json({
            error: 'Error interno del servidor',
            detalle: err.message
        });
    }
});

// ==========================================
// 5. RUTA GET: Consultar base del día
// ==========================================
app.get('/base/:anio/:mes/:dia', async (req, res) => {
    try {
        const { anio, mes, dia } = req.params;
        const anioNum = parseInt(anio, 10);
        const mesNum  = parseInt(mes, 10);
        const diaNum  = parseInt(dia, 10);

        if (isNaN(anioNum) || isNaN(mesNum) || isNaN(diaNum) ||
            mesNum < 1 || mesNum > 12 || diaNum < 1 || diaNum > 31) {
            return res.status(400).json({ error: 'Fecha inválida.' });
        }

        const [rows] = await pool.query(
            `SELECT base, base_nequi, dia, mes, anio
             FROM base
             WHERE anio = ? AND mes = ? AND dia = ?
             ORDER BY id DESC
             LIMIT 1`,
            [anioNum, mesNum, diaNum]
        );

        if (rows.length === 0) {
            return res.json({
                success: true,
                encontrado: false,
                base: 0,
                base_nequi: 0
            });
        }

        return res.json({
            success: true,
            encontrado: true,
            base: Number(rows[0].base),
            base_nequi: Number(rows[0].base_nequi),
            dia: rows[0].dia,
            mes: rows[0].mes,
            anio: rows[0].anio
        });
    } catch (err) {
        console.error('Error en GET /base:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==========================================
// 6. RUTA GET: Consultar base_final del día
// ==========================================
app.get('/base_final/:anio/:mes/:dia', async (req, res) => {
    try {
        const { anio, mes, dia } = req.params;
        const anioNum = parseInt(anio, 10);
        const mesNum  = parseInt(mes, 10);
        const diaNum  = parseInt(dia, 10);

        if (isNaN(anioNum) || isNaN(mesNum) || isNaN(diaNum) ||
            mesNum < 1 || mesNum > 12 || diaNum < 1 || diaNum > 31) {
            return res.status(400).json({ error: 'Fecha inválida.' });
        }

        const [rows] = await pool.query(
            `SELECT base_final, base_nequi_final, dia, mes, anio
             FROM base_final
             WHERE anio = ? AND mes = ? AND dia = ?
             ORDER BY id DESC
             LIMIT 1`,
            [anioNum, mesNum, diaNum]
        );

        if (rows.length === 0) {
            return res.json({
                success: true,
                encontrado: false,
                base_final: 0,
                base_nequi_final: 0
            });
        }

        return res.json({
            success: true,
            encontrado: true,
            base_final: Number(rows[0].base_final),
            base_nequi_final: Number(rows[0].base_nequi_final),
            dia: rows[0].dia,
            mes: rows[0].mes,
            anio: rows[0].anio
        });
    } catch (err) {
        console.error('Error en GET /base_final:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
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

// ==========================================
// 3. RUTA POST: Insertar en tabla "base"
// Campos: base (INT), base_nequi (INT), dia, mes, anio
// ==========================================
app.post('/base', async (req, res) => {
    const { base, base_nequi, dia, mes, anio } = req.body;

    // Validación de números enteros
    if (
        base === undefined || base_nequi === undefined ||
        dia === undefined || mes === undefined || anio === undefined ||
        isNaN(parseInt(base, 10)) || isNaN(parseInt(base_nequi, 10)) ||
        isNaN(parseInt(dia, 10)) || isNaN(parseInt(mes, 10)) || isNaN(parseInt(anio, 10))
    ) {
        return res.status(400).json({
            success: false,
            message: 'Debes enviar base, base_nequi, dia, mes y anio como números enteros'
        });
    }

    const baseNum = parseInt(base, 10);
    const baseNequiNum = parseInt(base_nequi, 10);
    const diaNum = parseInt(dia, 10);
    const mesNum = parseInt(mes, 10);
    const anioNum = parseInt(anio, 10);

    // Validación de rango de fecha
    if (mesNum < 1 || mesNum > 12 || diaNum < 1 || diaNum > 31) {
        return res.status(400).json({
            success: false,
            message: 'Fecha inválida: mes debe estar entre 1-12 y día entre 1-31'
        });
    }

    // Verificar que la fecha exista realmente
    const fechaObj = new Date(anioNum, mesNum - 1, diaNum);
    if (
        fechaObj.getFullYear() !== anioNum ||
        fechaObj.getMonth() + 1 !== mesNum ||
        fechaObj.getDate() !== diaNum
    ) {
        return res.status(400).json({
            success: false,
            message: 'La fecha no existe en el calendario.'
        });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO base (base, base_nequi, dia, mes, anio) VALUES (?, ?, ?, ?, ?)',
            [baseNum, baseNequiNum, diaNum, mesNum, anioNum]
        );

        res.status(201).json({
            success: true,
            message: 'Registro guardado en tabla base',
            id: result.insertId,
            fecha: `${anioNum}-${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar en tabla base'
        });
    }
});

// ==========================================
// 4. RUTA POST: Insertar en tabla "base_final"
// Campos: base_final (INT), base_nequi_final (INT), dia, mes, anio
// ==========================================
app.post('/base_final', async (req, res) => {
    const { base_final, base_nequi_final, dia, mes, anio } = req.body;

    // Validación de números enteros
    if (
        base_final === undefined || base_nequi_final === undefined ||
        dia === undefined || mes === undefined || anio === undefined ||
        isNaN(parseInt(base_final, 10)) || isNaN(parseInt(base_nequi_final, 10)) ||
        isNaN(parseInt(dia, 10)) || isNaN(parseInt(mes, 10)) || isNaN(parseInt(anio, 10))
    ) {
        return res.status(400).json({
            success: false,
            message: 'Debes enviar base_final, base_nequi_final, dia, mes y anio como números enteros'
        });
    }

    const baseFinalNum = parseInt(base_final, 10);
    const baseNequiFinalNum = parseInt(base_nequi_final, 10);
    const diaNum = parseInt(dia, 10);
    const mesNum = parseInt(mes, 10);
    const anioNum = parseInt(anio, 10);

    // Validación de rango de fecha
    if (mesNum < 1 || mesNum > 12 || diaNum < 1 || diaNum > 31) {
        return res.status(400).json({
            success: false,
            message: 'Fecha inválida: mes debe estar entre 1-12 y día entre 1-31'
        });
    }

    // Verificar que la fecha exista realmente
    const fechaObj = new Date(anioNum, mesNum - 1, diaNum);
    if (
        fechaObj.getFullYear() !== anioNum ||
        fechaObj.getMonth() + 1 !== mesNum ||
        fechaObj.getDate() !== diaNum
    ) {
        return res.status(400).json({
            success: false,
            message: 'La fecha no existe en el calendario.'
        });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO base_final (base_final, base_nequi_final, dia, mes, anio) VALUES (?, ?, ?, ?, ?)',
            [baseFinalNum, baseNequiFinalNum, diaNum, mesNum, anioNum]
        );

        res.status(201).json({
            success: true,
            message: 'Registro guardado en tabla base_final',
            id: result.insertId,
            fecha: `${anioNum}-${String(mesNum).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar en tabla base_final'
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`Desde emulador Android: http://10.0.2.2:${PORT}`);
});