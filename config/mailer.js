const nodemailer = require('nodemailer');
require('dotenv').config();

// Create email transporter using Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify connection
transporter.verify((err, success) => {
    if (err) {
        console.log('❌ Email setup failed:', err.message);
    } else {
        console.log('✅ Email system ready!');
    }
});

module.exports = transporter;