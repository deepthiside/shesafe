// ============================================
// SheSafe - Chat with AI Distress Detection
// ============================================

// Show AI distress warning
function showDistressWarning(analysis) {
    // Remove existing warning if any
    const existing = document.getElementById('distressWarning');
    if (existing) existing.remove();

    // Create warning banner
    const warning = document.createElement('div');
    warning.id = 'distressWarning';
    warning.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 32px);
        max-width: 448px;
        background: white;
        border: 2px solid #ff4d6d;
        border-radius: 16px;
        padding: 16px;
        z-index: 500;
        box-shadow: 0 8px 32px rgba(255,77,109,0.25);
        animation: slideUp 0.3s ease;
    `;

    warning.innerHTML = `
        <div style="display:flex; align-items:flex-start; gap:12px;">
            <div style="font-size:28px;">🤖</div>
            <div style="flex:1;">
                <div style="font-size:13px; font-weight:700; color:#1a1a2e; margin-bottom:4px;">
                    AI Detected Possible Distress
                </div>
                <div style="font-size:12px; color:#4a4a6a; margin-bottom:12px;">
                    ${analysis.reason}
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="triggerSOSAlert('button'); removeDistressWarning();"
                        style="flex:1; padding:10px; background:linear-gradient(135deg,#ff4d6d,#c9184a); color:white; border:none; border-radius:10px; font-size:12px; font-weight:600; cursor:pointer; font-family:'Sora',sans-serif;">
                        🚨 Trigger SOS
                    </button>
                    <button onclick="removeDistressWarning()"
                        style="padding:10px 14px; background:#f7f8fc; color:#4a4a6a; border:1px solid #ebebf0; border-radius:10px; font-size:12px; cursor:pointer; font-family:'Sora',sans-serif;">
                        I'm Safe
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(warning);

    // Auto remove after 15 seconds
    setTimeout(removeDistressWarning, 15000);
}

function removeDistressWarning() {
    const warning = document.getElementById('distressWarning');
    if (warning) warning.remove();
}