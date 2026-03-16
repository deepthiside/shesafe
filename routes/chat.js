const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { analyzeMessage } = require('../config/ai');

// Send a message + AI analysis
router.post('/send', async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Not logged in' });
    }

    const { message, is_sos } = req.body;
    const { id, full_name } = req.session.user;

    // Save message to database
    db.query(
        'INSERT INTO family_chat (user_id, sender_name, message, is_sos) VALUES (?, ?, ?, ?)',
        [id, full_name, message, is_sos || 0],
        async (err) => {
            if (err) return res.json({ success: false, message: 'Failed to send' });

            // Only run AI analysis on normal messages (not SOS alerts)
            if (!is_sos) {
                try {
                    console.log('🤖 Analyzing message for distress...');
                    const analysis = await analyzeMessage(message);
                    console.log('🤖 AI Result:', analysis);

                    // Send back AI analysis result to frontend
                    return res.json({
                        success: true,
                        ai: analysis
                    });
                } catch (e) {
                    return res.json({ success: true, ai: null });
                }
            }

            res.json({ success: true, ai: null });
        }
    );
});

// Get all messages
router.get('/messages', (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.id;

    db.query(
        'SELECT * FROM family_chat WHERE user_id = ? ORDER BY sent_at ASC LIMIT 50',
        [userId],
        (err, results) => {
            if (err) return res.json({ success: false });
            res.json({ success: true, messages: results });
        }
    );
});

module.exports = router;