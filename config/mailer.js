const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_LOGIN,
        pass: process.env.BREVO_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

transporter.verify((err, success) => {
    if (err) {
        console.log('❌ Email setup failed:', err.message);
    } else {
        console.log('✅ Email system ready!');
    }
});

module.exports = transporter;