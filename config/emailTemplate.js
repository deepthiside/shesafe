// Beautiful HTML email template for SOS alerts

function sosEmailTemplate(userName, location, battery, mapLink, triggeredBy) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SheSafe SOS Alert</title>
    </head>
    <body style="margin:0; padding:0; background:#f7f8fc; font-family:'Segoe UI', sans-serif;">

        <!-- HEADER -->
        <div style="background:linear-gradient(135deg, #ff4d6d, #c9184a); padding:30px 20px; text-align:center;">
            <div style="font-size:48px; margin-bottom:10px;">🚨</div>
            <h1 style="color:white; margin:0; font-size:26px; letter-spacing:1px;">SOS ALERT</h1>
            <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:14px;">
                This is an emergency alert from SheSafe
            </p>
        </div>

        <!-- BODY -->
        <div style="max-width:500px; margin:0 auto; padding:24px 16px;">

            <!-- ALERT CARD -->
            <div style="background:white; border-radius:16px; padding:24px; margin-bottom:16px; border:1px solid #ebebf0; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
                <h2 style="color:#1a1a2e; font-size:18px; margin:0 0 16px;">
                    ⚠️ ${userName} needs help!
                </h2>
                <p style="color:#4a4a6a; font-size:14px; line-height:1.6; margin:0 0 20px;">
                    <strong>${userName}</strong> has triggered an SOS alert on SheSafe.
                    Please check on them immediately.
                </p>

                <!-- DETAILS -->
                <div style="background:#f7f8fc; border-radius:12px; padding:16px; margin-bottom:20px;">
                    <div style="display:flex; margin-bottom:12px;">
                        <span style="font-size:18px; margin-right:10px;">📍</span>
                        <div>
                            <div style="font-size:11px; color:#4a4a6a; font-weight:600; letter-spacing:0.5px; text-transform:uppercase;">Location</div>
                            <div style="font-size:13px; color:#1a1a2e; margin-top:2px;">${location}</div>
                        </div>
                    </div>
                    <div style="display:flex; margin-bottom:12px;">
                        <span style="font-size:18px; margin-right:10px;">🔋</span>
                        <div>
                            <div style="font-size:11px; color:#4a4a6a; font-weight:600; letter-spacing:0.5px; text-transform:uppercase;">Battery Level</div>
                            <div style="font-size:13px; color:#1a1a2e; margin-top:2px;">${battery}</div>
                        </div>
                    </div>
                    <div style="display:flex;">
                        <span style="font-size:18px; margin-right:10px;">⚡</span>
                        <div>
                            <div style="font-size:11px; color:#4a4a6a; font-weight:600; letter-spacing:0.5px; text-transform:uppercase;">Triggered By</div>
                            <div style="font-size:13px; color:#1a1a2e; margin-top:2px;">${triggeredBy}</div>
                        </div>
                    </div>
                </div>

                <!-- MAP BUTTON -->
                ${mapLink ? `
                <a href="${mapLink}"
                   style="display:block; background:linear-gradient(135deg,#ff4d6d,#c9184a); color:white; text-decoration:none; padding:14px; border-radius:12px; text-align:center; font-size:14px; font-weight:600;">
                    📍 View Live Location on Google Maps
                </a>` : ''}
            </div>

            <!-- WHAT TO DO -->
            <div style="background:white; border-radius:16px; padding:20px; margin-bottom:16px; border:1px solid #ebebf0;">
                <h3 style="color:#1a1a2e; font-size:14px; margin:0 0 12px;">What to do now:</h3>
                <div style="color:#4a4a6a; font-size:13px; line-height:2;">
                    ✅ Try calling ${userName} immediately<br>
                    ✅ Check their live location on the map<br>
                    ✅ Contact local authorities if unreachable<br>
                    ✅ Stay calm and act quickly
                </div>
            </div>

            <!-- FOOTER -->
            <div style="text-align:center; padding:16px; color:#4a4a6a; font-size:11px;">
                <div style="font-size:20px; margin-bottom:6px;">🛡️</div>
                <strong style="color:#ff4d6d;">SheSafe</strong> — Private Family Safety Hub<br>
                <span style="opacity:0.7;">This alert was sent automatically. Do not reply to this email.</span>
            </div>

        </div>
    </body>
    </html>
    `;
}

module.exports = sosEmailTemplate;