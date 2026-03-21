const twilio = require('twilio');
const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { sendEmail } = require('../config/mailer');
const sosEmailTemplate = require('../config/emailTemplate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup audio storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/recordings';
        // Create folder if it doesn't exist
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop() || 'webm';
    const fileName = `recording_${req.session.user.id}_${Date.now()}.${ext}`;
    cb(null, fileName);
}   
});

const upload = multer({ storage });

// ── MAIN SOS ROUTE ──────────────────────────
router.post('/trigger', async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Not logged in' });
    }

    const { battery, location, mapLink, triggeredBy } = req.body;
    const { id, full_name } = req.session.user;

    // Save SOS message to chat
    const message = `🚨 SOS ALERT! [${triggeredBy}] I need help! Battery: ${battery}. Location: ${mapLink || location}`;

    db.query(
        'INSERT INTO family_chat (user_id, sender_name, message, is_sos) VALUES (?, ?, ?, 1)',
        [id, full_name, message],
        (err) => { if (err) console.log('Chat save error:', err); }
    );

    // Get all trusted contacts with emails
    db.query(
        'SELECT * FROM trusted_contacts WHERE user_id = ? AND contact_email IS NOT NULL AND contact_email != ""',
        [id],
        async (err, contacts) => {
            if (err) return res.json({ success: false, message: 'Database error' });

            if (contacts.length === 0) {
                return res.json({
                    success: true,
                    message: 'SOS saved to chat but no contacts with email found',
                    emailsSent: 0
                });
            }

            // Send email to each contact
            const emailPromises = contacts.map(contact => {
    return sendEmail({
        to: contact.contact_email,
        subject: `🚨 SOS ALERT - ${full_name} needs help!`,
        html: sosEmailTemplate(
            full_name,
            location || 'Unknown',
            battery || 'Unknown',
            mapLink || '',
            triggeredBy || 'SOS Button'
        )
    })
    .then(() => console.log(`✅ SOS email sent to ${contact.contact_name}`))
    .catch(err => console.log(`❌ Failed to send to ${contact.contact_email}:`, err.message));
});

            await Promise.all(emailPromises);

            res.json({
                success: true,
                message: `SOS sent! Alerted ${contacts.length} contact(s)`,
                emailsSent: contacts.length
            });
        }
    );
});

// ── AUDIO UPLOAD ROUTE ──────────────────────
router.post('/upload-audio', upload.single('audio'), (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Not logged in' });
    }

    if (!req.file) {
        return res.json({ success: false, message: 'No audio file received' });
    }

    const { id, full_name } = req.session.user;
    const audioPath = req.file.path;
    const audioName = req.file.filename;

    console.log(`🎙️ Audio recording saved: ${audioName}`);

    // Save audio alert message to chat
    const message = `🎙️ SOS Audio Recording captured — [${audioName}]`;

    db.query(
        'INSERT INTO family_chat (user_id, sender_name, message, is_sos) VALUES (?, ?, ?, 1)',
        [id, full_name, message],
        (err) => { if (err) console.log('Audio chat save error:', err); }
    );

    // Send email with audio notification to contacts
    db.query(
        'SELECT * FROM trusted_contacts WHERE user_id = ? AND contact_email IS NOT NULL AND contact_email != ""',
        [id],
        async (err, contacts) => {
            if (err) return res.json({ success: false });

            const audioEmailPromises = contacts.map(contact => {
    return sendEmail({
        to: contact.contact_email,
        subject: `🎙️ SOS Audio Recording - ${full_name}`,
        html: `
            <div style="font-family:sans-serif; max-width:500px; margin:0 auto;">
                <div style="background:linear-gradient(135deg,#ff4d6d,#c9184a); padding:24px; text-align:center; border-radius:16px 16px 0 0;">
                    <div style="font-size:40px;">🎙️</div>
                    <h2 style="color:white; margin:8px 0 0;">Audio Recording Captured</h2>
                </div>
                <div style="background:white; padding:24px; border-radius:0 0 16px 16px; border:1px solid #eee;">
                    <p style="color:#1a1a2e; font-size:14px;">
                        <strong>${full_name}</strong> triggered an SOS alert and an audio recording was captured.
                    </p>
                    <div style="background:#f7f8fc; border-radius:12px; padding:16px; margin:16px 0; font-size:13px; color:#4a4a6a;">
                        📁 Recording: <strong>${audioName}</strong><br>
                        ⏱️ Duration: 15 seconds<br>
                        🕐 Time: ${new Date().toLocaleString()}<br>
                        📍 Location: <strong>${req.body.location || 'Unavailable'}</strong><br>
                        🔋 Battery: <strong>${req.body.battery || 'Unavailable'}</strong>
                    </div>
                </div>
            </div>
        `
    })
    .then(() => console.log(`✅ Audio email sent to ${contact.contact_name}`))
    .catch(err => console.log(`❌ Audio email failed:`, err.message));
});

            await Promise.all(emailPromises);

// Send WhatsApp to all contacts with phone numbers
const whatsappPromises = contacts
    .filter(c => c.contact_phone)
    .map(contact => {
        const mapLink = req.body.mapLink || '';
        const battery = req.body.battery || 'Unknown';
        const location = req.body.location || 'Unknown';

        const whatsappMsg = `🚨 *SOS ALERT from SheSafe!*\n\n` +
            `*${full_name}* needs help immediately!\n\n` +
            `🔋 Battery: ${battery}\n` +
            `📍 Location: ${mapLink || location}\n\n` +
            `Please check on them right away!`;

        return sendWhatsApp(contact.contact_phone, whatsappMsg);
    });

await Promise.all(whatsappPromises);

res.json({
    success: true,
    message: `SOS sent! Alerted ${contacts.length} contact(s)`,
    emailsSent: contacts.length,
    whatsappSent: whatsappPromises.length
});
        }
    );
});

// Serve audio files
router.get('/recording/:filename', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Not logged in' });
    }
    const filePath = path.join(__dirname, '../uploads/recordings', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(path.resolve(filePath));
    } else {
        res.status(404).json({ message: 'Recording not found' });
    }
});
// AI Fake Call conversation route
router.post('/fake-call-ai', async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Not logged in' });
    }

    const { userSpeech } = req.body;
    const { getFakeCallResponse } = require('../config/ai');

    try {
        const result = await getFakeCallResponse(userSpeech);
        res.json({ success: true, ...result });
    } catch (e) {
        res.json({
            success: false,
            response: "Hello? Are you okay beta?",
            dangerDetected: false
        });
    }
});

// Reset fake call conversation
router.post('/fake-call-reset', (req, res) => {
    const { resetConversation } = require('../config/ai');
    resetConversation();
    res.json({ success: true });
});
// Send WhatsApp message to a contact
async function sendWhatsApp(toPhone, message) {
    try {
        await twilioClient.messages.create({
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: `whatsapp:+91${toPhone.replace(/\D/g, '').slice(-10)}`,
            body: message
        });
        console.log(`✅ WhatsApp sent to ${toPhone}`);
    } catch (err) {
        console.log(`❌ WhatsApp failed to ${toPhone}:`, err.message);
    }
}
module.exports = router;