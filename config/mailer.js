const axios = require('axios');
require('dotenv').config();

// Send email using Brevo HTTP API (works on Railway!)
async function sendEmail({ to, subject, html }) {
    try {
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: {
                name: 'SheSafe 🛡️',
                email: process.env.EMAIL_USER
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html
        }, {
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (err) {
        console.log('❌ Email send failed:', err.response?.data || err.message);
        throw err;
    }
}

console.log('✅ Email system ready! (Brevo HTTP API)');

module.exports = { sendEmail };