const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Test route - just to check if auth routes work
router.get('/test', (req, res) => {
    res.json({ message: '✅ Auth routes are working!' });
});

// Register route
router.post('/register', async (req, res) => {
    const { full_name, email, password, phone } = req.body;

    // Check if email already exists
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error' });
        
        if (results.length > 0) {
            return res.json({ success: false, message: 'Email already registered' });
        }

        // Encrypt password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user to database
        db.query(
            'INSERT INTO users (full_name, email, password, phone) VALUES (?, ?, ?, ?)',
            [full_name, email, hashedPassword, phone],
            (err, result) => {
                if (err) return res.json({ success: false, message: 'Registration failed' });
                res.json({ success: true, message: '✅ Registration successful!' });
            }
        );
    });
});

// Login route
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.json({ success: false, message: 'Database error' });

        if (results.length === 0) {
            return res.json({ success: false, message: 'Email not found' });
        }

        const user = results[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: 'Incorrect password' });
        }

        // Save user in session
        req.session.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email
        };

        res.json({ success: true, message: '✅ Login successful!', user: req.session.user });
    });
});

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

// Check if user is logged in
router.get('/check', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

module.exports = router;