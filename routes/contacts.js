const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all contacts
router.get('/list', (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Not logged in' });
    }

    db.query(
        'SELECT * FROM trusted_contacts WHERE user_id = ?',
        [req.session.user.id],
        (err, results) => {
            if (err) return res.json({ success: false });
            res.json({ success: true, contacts: results });
        }
    );
});

// Add a contact
router.post('/add', (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Not logged in' });
    }

    const { contact_name, contact_email, contact_phone } = req.body;

    db.query(
        'INSERT INTO trusted_contacts (user_id, contact_name, contact_email, contact_phone) VALUES (?, ?, ?, ?)',
        [req.session.user.id, contact_name, contact_email, contact_phone],
        (err) => {
            if (err) return res.json({ success: false, message: 'Failed to add contact' });
            res.json({ success: true, message: '✅ Contact added!' });
        }
    );
});

// Delete a contact
router.delete('/delete/:id', (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Not logged in' });
    }

    db.query(
        'DELETE FROM trusted_contacts WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.user.id],
        (err) => {
            if (err) return res.json({ success: false });
            res.json({ success: true });
        }
    );
});

module.exports = router;