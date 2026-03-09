import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '127.0.0.1',
    database: process.env.DB_DATABASE,
    port: 1434, // We discovered your server uses 1434
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// --- Database Connection Pool ---
let pool;

async function connectDB() {
    try {
        pool = await sql.connect(dbConfig);
        console.log('Connected to MSSQL Database');
    } catch (err) {
        console.error('Database Connection Failed:', err);
    }
}

connectDB();

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        const user = result.recordset[0];
        if (user) {
            // Simplified auth (plain text password comparison for demo - in prod use bcrypt)
            if (user.password_hash === password) {
                res.json({ id: user.id, name: user.name, email: user.email, company: user.company });
            } else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, company } = req.body;
    try {
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .input('company', sql.NVarChar, company)
            .query('INSERT INTO Users (name, email, password_hash, company) VALUES (@name, @email, @password, @company)');

        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Inventory Routes ---
app.get('/api/inventory', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT * FROM Inventory');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/inventory', async (req, res) => {
    const { items } = req.body; // Array of { id, quantity }
    try {
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        for (const item of items) {
            const request = new sql.Request(transaction);
            await request
                .input('id', sql.Int, item.id)
                .input('quantity', sql.Decimal(10, 2), item.quantity)
                .query('UPDATE Inventory SET quantity = @quantity, last_updated = GETDATE() WHERE id = @id');
        }

        await transaction.commit();
        res.json({ message: 'Inventory updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inventory/use', async (req, res) => {
    const { component_type, material, amount } = req.body;
    try {
        const result = await pool.request()
            .input('type', sql.NVarChar, component_type)
            .input('material', sql.NVarChar, material)
            .input('amount', sql.Decimal(10, 2), amount)
            .query('UPDATE Inventory SET quantity = quantity - @amount WHERE component_type = @type AND material = @material');

        if (result.rowsAffected[0] > 0) {
            res.json({ message: 'Inventory decremented successfully' });
        } else {
            res.status(404).json({ message: 'Component not found in inventory' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Design Routes ---
app.post('/api/designs', async (req, res) => {
    const { userId, name, jsonData, previewImage } = req.body;
    try {
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('name', sql.NVarChar, name)
            .input('jsonData', sql.NVarChar(sql.MAX), jsonData)
            .input('previewImage', sql.NVarChar(sql.MAX), previewImage)
            .query('INSERT INTO Designs (user_id, name, json_data, preview_image) VALUES (@userId, @name, @jsonData, @previewImage)');

        res.status(201).json({ message: 'Design saved successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
