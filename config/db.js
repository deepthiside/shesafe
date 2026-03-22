const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000
});

db.connect((err) => {
    if (err) {
        console.log('❌ Database connection failed:', err.message);
        return;
    }
    console.log('✅ MySQL Database connected successfully!');
    createTables();
});

// Auto reconnect if connection drops
db.on('error', (err) => {
    console.log('Database error:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.log('Reconnecting to database...');
        db.connect();
    }
});

// Auto create tables if they don't exist
function createTables() {
    const queries = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS trusted_contacts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            contact_name VARCHAR(100) NOT NULL,
            contact_email VARCHAR(150),
            contact_phone VARCHAR(20),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        `CREATE TABLE IF NOT EXISTS family_chat (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            sender_name VARCHAR(100) NOT NULL,
            message TEXT NOT NULL,
            is_sos TINYINT(1) DEFAULT 0,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`
    ];

    queries.forEach(query => {
        db.query(query, (err) => {
            if (err) console.log('Table creation error:', err.message);
            else console.log('✅ Table ready!');
        });
    });
}

module.exports = db;