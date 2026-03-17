import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sql from 'mssql';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Configuration
const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Pipe3D@2026',
    server: process.env.DB_SERVER || 'ABINAYA-ARUNKUMAR',
    database: process.env.DB_DATABASE || 'Pipe3DPro',
    port: 1434,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        connectTimeout: 30000
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Simple Singleton Connection Manager
let globalPool = null;

async function getPool() {
    try {
        if (globalPool && globalPool.connected) {
            return globalPool;
        }

        console.log('--- Database Connection Attempt ---');
        globalPool = await sql.connect(dbConfig);
        console.log('✅ Connected to MSSQL Database');
        return globalPool;
    } catch (err) {
        console.error('❌ Database Connection Failed:', err.message);
        globalPool = null;
        throw err;
    }
}

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// --- Inventory Endpoints ---
app.get('/api/inventory', async (req, res) => {
    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const result = await pool.request().query('SELECT * FROM Inventory ORDER BY component_type, material');
        res.json(result.recordset);
    } catch (err) {
        console.error('API Error (/api/inventory):', err.message);
        res.status(503).json({ error: 'Database Unavailable', details: err.message });
    }
});

app.put('/api/inventory', async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid items format' });
    }

    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const item of items) {
                await new sql.Request(transaction)
                    .input('id', sql.Int, item.id)
                    .input('quantity', sql.Decimal(18, 2), item.quantity)
                    .query('UPDATE Inventory SET quantity = @quantity, last_updated = GETDATE() WHERE id = @id');
            }
            await transaction.commit();
            res.json({ message: 'Inventory updated successfully' });
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        console.error('API Error (PUT /api/inventory):', err.message);
        res.status(500).json({ error: 'Update Failed', details: err.message });
    }
});

app.post('/api/inventory/use', async (req, res) => {
    let { component_type, material, amount } = req.body;

    // Map frontend types to database types if they differ
    const typeMap = {
        'straight': 'straight',
        'vertical': 'vertical',
        'elbow': 'elbow',
        'elbow-45': 'elbow-45',
        't-joint': 't-joint',
        'cross': 'cross',
        'reducer': 'reducer',
        'flange': 'flange',
        'union': 'union',
        'coupling': 'coupling',
        'valve': 'valve',
        'filter': 'filter',
        'tank': 'tank',
        'cap': 'cap',
        'plug': 'plug',
        'water-tap': 'water-tap',
        'cylinder': 'cylinder',
        'cube': 'cube',
        'cone': 'cone',
        'industrial-tank': 'industrial-tank',
        'wall': 'wall'
    };
    const dbType = typeMap[component_type] || component_type;

    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const result = await pool.request()
            .input('type', sql.NVarChar, dbType)
            .input('material', sql.NVarChar, material)
            .input('amount', sql.Decimal(18, 2), amount)
            .query('UPDATE Inventory SET quantity = quantity - @amount, last_updated = GETDATE() WHERE component_type = @type AND material = @material');

        if (result.rowsAffected[0] === 0) {
            console.warn(`Inventory Warning: No match found for ${dbType} (${material})`);
            return res.status(404).json({ error: 'Item not found in inventory' });
        }

        console.log(`✅ Inventory Reduced: ${dbType} (${material}) by ${amount}`);
        res.json({ message: 'Inventory updated' });
    } catch (err) {
        console.error('API Error (/api/inventory/use):', err.message);
        res.status(500).json({ error: 'Failed to update inventory', details: err.message });
    }
});

// Batch inventory decrement - accepts array of { component_type, material, amount }
app.post('/api/inventory/use-batch', async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items must be a non-empty array' });
    }

    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            for (const item of items) {
                const { component_type, material, amount = 1 } = item;
                if (!component_type || !material) continue;

                const result = await new sql.Request(transaction)
                    .input('type', sql.NVarChar, component_type)
                    .input('material', sql.NVarChar, material)
                    .input('amount', sql.Decimal(18, 2), amount)
                    .query('UPDATE Inventory SET quantity = quantity - @amount, last_updated = GETDATE() WHERE component_type = @type AND material = @material');

                if (result.rowsAffected[0] === 0) {
                    console.warn(`Inventory Warning (batch): No match for ${component_type} (${material})`);
                }
            }
            await transaction.commit();
            console.log(`✅ Inventory Batch Reduced: ${items.length} items`);
            res.json({ message: `Batch updated ${items.length} inventory items` });
        } catch (txErr) {
            await transaction.rollback();
            throw txErr;
        }
    } catch (err) {
        console.error('API Error (/api/inventory/use-batch):', err.message);
        res.status(500).json({ error: 'Failed to update batch inventory', details: err.message });
    }
});

app.post('/api/inventory/reset', async (req, res) => {
    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        // Clean slate
        await pool.request().query('DELETE FROM Inventory');

        const components = [
            'straight', 'vertical', 'elbow', 'elbow-45', 't-joint', 'cross', 'reducer', 
            'flange', 'union', 'coupling', 'valve', 'filter', 'tank', 'cap', 'plug', 
            'water-tap', 'cylinder', 'cube', 'cone', 'industrial-tank', 'wall'
        ];

        const materials = [
            'steel', 'ms', 'gi', 'ss304', 'ss316', 'copper', 'brass', 'ci', 
            'pvc', 'cpvc', 'upvc', 'hdpe', 'sq_steel', 'sq_aluminium', 
            'industrial_yellow', 'wall_concrete'
        ];

        let count = 0;
        
        // Disable transaction for simple loops to avoid timeout if there are many entries.
        // Or process in batches. Here we'll do direct inserts for simplicity.
        for (const comp of components) {
            for (const mat of materials) {
                // Determine unit logically
                const unit = ['straight', 'vertical', 'wall'].includes(comp) ? 'm' : 'pcs';
                const quantity = unit === 'm' ? 10000 : 100;

                await pool.request()
                    .input('type', sql.NVarChar, comp)
                    .input('material', sql.NVarChar, mat)
                    .input('unit', sql.NVarChar, unit)
                    .input('quantity', sql.Decimal(18, 2), quantity)
                    .query('INSERT INTO Inventory (component_type, material, quantity, unit) VALUES (@type, @material, @quantity, @unit)');
                
                count++;
            }
        }

        res.json({ message: `Inventory reset: inserted ${count} items (10000m for pipes, 100pcs for others).` });
    } catch (err) {
        console.error('API Error (/api/inventory/reset):', err.message);
        res.status(500).json({ error: 'Reset Failed', details: err.message });
    }
});

// --- Projects Endpoints (History) ---
app.post('/api/projects', async (req, res) => {
    const { user_id, name, components_json, bom_json, image_data } = req.body;
    
    if (!name || !components_json || !bom_json) {
        return res.status(400).json({ error: 'Missing required project data' });
    }

    const safeImageData = image_data || '';

    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const result = await pool.request()
            .input('user_id', sql.Int, user_id || null)
            .input('name', sql.NVarChar, name)
            .input('components_json', sql.NVarChar(sql.MAX), components_json)
            .input('bom_json', sql.NVarChar(sql.MAX), bom_json)
            .input('image_data', sql.NVarChar(sql.MAX), safeImageData)
            .query(`
                INSERT INTO Projects (user_id, name, components_json, bom_json, image_data)
                OUTPUT INSERTED.id
                VALUES (@user_id, @name, @components_json, @bom_json, @image_data)
            `);

        res.status(201).json({ 
            message: 'Project saved successfully',
            id: result.recordset[0].id 
        });
    } catch (err) {
        console.error('API Error (POST /api/projects):', err.message);
        res.status(500).json({ error: 'Failed to save project', details: err.message });
    }
});

app.get('/api/projects', async (req, res) => {
    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const result = await pool.request()
            .query(`
                SELECT id, user_id, name, bom_json, created_at
                -- Return a smaller cropped version or omit image if too large for list. We'll fetch image_data.
                , image_data
                FROM Projects 
                ORDER BY created_at DESC
            `);
        
        // Return everything except the massive components_json for the list view
        res.json(result.recordset);
    } catch (err) {
        console.error('API Error (GET /api/projects):', err.message);
        res.status(500).json({ error: 'Failed to fetch projects', details: err.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Projects WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('API Error (GET /api/projects/:id):', err.message);
        res.status(500).json({ error: 'Failed to fetch project', details: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Projects WHERE id = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error('API Error (DELETE /api/projects/:id):', err.message);
        res.status(500).json({ error: 'Failed to delete project', details: err.message });
    }
});

// --- Auth Endpoints (Simplified) ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = await getPool();
        if (!pool) throw new Error('Could not establish database connection');

        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        const user = result.recordset[0];
        if (user && user.password_hash === password) {
            const { password_hash, ...safeUser } = user;
            res.json(safeUser);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Auth Service Down', details: err.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    getPool().catch(() => { }); // Initial connection attempt
});
