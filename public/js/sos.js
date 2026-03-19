// ============================================
// SheSafe - SOS Features
// Shake to SOS + Voice Trigger + Offline SMS
// ============================================
// ── CALL TIMER ────────────────────────────────
let callTimerInterval = null;

function startCallTimer() {
    let seconds = 0;
    const timerEl = document.getElementById('callTimer');
    callTimerInterval = setInterval(() => {
        seconds++;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopCallTimer() {
    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
        const timerEl = document.getElementById('callTimer');
        if (timerEl) timerEl.textContent = '00:00';
    }
}
let sosTriggered = false; // prevents multiple triggers at once

// ── 1. SHAKE TO SOS ──────────────────────────
// Uses DeviceMotion API to detect phone shake
// If acceleration > 25 in any direction = SHAKE!

// ── SHAKE TO SOS ──────────────────────────────
let lastShakeTime = 0;

function initShake() {
    // iOS 13+ requires permission
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
        // iOS device - need to request permission
        console.log('📳 iOS detected - will request motion permission on user interaction');
        // We request permission when user taps anywhere first time
        document.addEventListener('click', requestiOSMotionPermission, { once: true });
    } else {
        // Android or desktop - just start listening
        startShakeListener();
    }
}

function requestiOSMotionPermission() {
    DeviceMotionEvent.requestPermission()
        .then(response => {
            if (response === 'granted') {
                console.log('✅ iOS motion permission granted');
                startShakeListener();
            } else {
                console.log('❌ iOS motion permission denied');
            }
        })
        .catch(console.error);
}

function startShakeListener() {
    window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc) return;

        const totalForce = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
        const now = Date.now();

        if (totalForce > 25 && (now - lastShakeTime) > 3000) {
            lastShakeTime = now;
            console.log('📳 Shake detected! Force:', totalForce);
            triggerSOSAlert('shake');
        }
    });
    console.log('📳 Shake listener active');
}

// Initialize shake on page load
initShake();

// ── 2. VOICE TRIGGER ─────────────────────────
// Uses Web Speech API to listen for codeword
// Say "Code Red" → SOS triggers silently

let recognition = null;
let voiceActive = false;

function startVoiceListener() {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.log('❌ Speech recognition not supported in this browser');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;       // keep listening
    recognition.interimResults = false;  // only final results
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
        // Get the latest thing the user said
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log('🎙️ Heard:', transcript);

        // Check for codewords
        if (transcript.includes('code red') || transcript.includes('weather is hot')) {
            console.log('🚨 Codeword detected!');
            triggerSOSAlert('voice');
        }
    };

    recognition.onerror = (event) => {
        console.log('Speech recognition error:', event.error);
        // Auto restart if it stops
        if (event.error === 'no-speech') {
            recognition.start();
        }
    };

    recognition.onend = () => {
        // Keep restarting so it always listens
        if (voiceActive) {
            recognition.start();
        }
    };

    recognition.start();
    voiceActive = true;
    console.log('🎙️ Voice listener started — say "Code Red" to trigger SOS');
}

function stopVoiceListener() {
    if (recognition) {
        voiceActive = false;
        recognition.stop();
        console.log('🎙️ Voice listener stopped');
    }
}

// ── 3. MAIN SOS TRIGGER FUNCTION ─────────────
// Called by: SOS button, Shake, Voice, Fake Call
// source = 'button' | 'shake' | 'voice' | 'fakecall'

async function triggerSOSAlert(source = 'button') {
    if (sosTriggered) return;
    sosTriggered = true;

    console.log(`🚨 SOS triggered by: ${source}`);

    // Get battery level
    let battery = 'Unknown';
    try {
        const b = await navigator.getBattery();
        battery = Math.round(b.level * 100) + '%';
    } catch (e) {}

    // Get location
    let locationText = 'Location unavailable';
    let mapLink = '';
    if (typeof currentLat !== 'undefined' && currentLat) {
        locationText = `${currentLat}, ${currentLng}`;
        mapLink = `https://maps.google.com/?q=${currentLat},${currentLng}`;
    }

    // Source label
    const sourceLabel = {
        button: '🔴 SOS Button',
        shake: '📳 Shake Detected',
        voice: '🎙️ Voice Triggered',
        fakecall: '📞 Fake Call Trigger'
    }[source] || 'SOS';

    // Check if offline → SMS fallback
    if (!navigator.onLine) {
        triggerSMSFallback(locationText);
        sosTriggered = false;
        return;
    }

    // Send to backend → saves to chat + sends emails
    try {
        const res = await fetch('/api/sos/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                battery,
                location: locationText,
                mapLink,
                triggeredBy: sourceLabel
            })
        });
        const data = await res.json();
        console.log('SOS result:', data.message);

        // Show how many emails were sent
        const emailInfo = document.getElementById('sosEmailInfo');
        if (emailInfo && data.emailsSent > 0) {
            emailInfo.textContent = `📧 ${data.emailsSent} contact(s) notified by email`;
            emailInfo.style.display = 'block';
        }
    } catch (e) {
        console.log('SOS trigger failed', e);
    }

    // Show overlay
    // Start audio recording silently
    startAudioRecording(locationText, battery, mapLink);

    // Show overlay
    showSOSOverlay(locationText, battery, source);
        showSOSOverlay(locationText, battery, source);

    setTimeout(() => { sosTriggered = false; }, 10000);
}

// ── 4. OFFLINE SMS FALLBACK ───────────────────
// If no internet → open SMS app with pre-filled message

function triggerSMSFallback(location) {
    console.log('📵 Offline! Using SMS fallback...');

    const message = `🚨 SOS! I need help! My last location: ${location}. Please call me immediately!`;

    // This opens the phone's native SMS app
    window.location.href = `sms:?body=${encodeURIComponent(message)}`;
}

// ── 5. SHOW SOS OVERLAY ───────────────────────
function showSOSOverlay(location, battery, source) {
    const overlay = document.getElementById('sosOverlay');
    if (!overlay) return;

    document.getElementById('sosLocation').textContent = '📍 ' + location;
    document.getElementById('sosBattery').textContent = '🔋 Battery: ' + battery;

    // Add source info
    const sourceEl = document.getElementById('sosSource');
    if (sourceEl) {
        const labels = {
            button: 'Triggered by SOS Button',
            shake: 'Triggered by Phone Shake 📳',
            voice: 'Triggered by Voice Command 🎙️',
            fakecall: 'Triggered via Fake Call 📞'
        };
        sourceEl.textContent = labels[source] || '';
    }

    overlay.classList.add('show');
}

function dismissSOS() {
    const overlay = document.getElementById('sosOverlay');
    if (overlay) overlay.classList.remove('show');
    sosTriggered = false;
}

// ── 6. FAKE CALL ──────────────────────────────
// Shows a fake incoming call screen
// If user says codeword while "on call" → SOS triggers

let fakeCallRecognition = null;

function startFakeCall() {
    const screen = document.getElementById('fakeCallScreen');
    if (screen) {
        screen.classList.add('show');
        playRingtone();
    }
}

function answerFakeCall() {
    stopRingtone();
    startCallTimer();
    startAIFakeCall();

    const ringUI = document.getElementById('fakeCallRinging');
    const callUI = document.getElementById('fakeCallActive');
    if (ringUI) ringUI.style.display = 'none';
    if (callUI) callUI.style.display = 'flex';
}

function endFakeCall() {
    fakeCallActive = false;
    stopRingtone();
    stopCallTimer();
    window.speechSynthesis.cancel();

    if (fakeCallSpeechRecognition) {
        fakeCallSpeechRecognition.stop();
        fakeCallSpeechRecognition = null;
    }

    const ringUI = document.getElementById('fakeCallRinging');
    const callUI = document.getElementById('fakeCallActive');
    if (ringUI) ringUI.style.display = 'flex';
    if (callUI) callUI.style.display = 'none';

    const screen = document.getElementById('fakeCallScreen');
    if (screen) screen.classList.remove('show');
}

function startFakeCallVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    fakeCallRecognition = new SpeechRecognition();
    fakeCallRecognition.continuous = true;
    fakeCallRecognition.lang = 'en-US';

    fakeCallRecognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('📞 Fake call heard:', transcript);

        // Secret codeword during fake call
        if (transcript.includes('weather is hot') || transcript.includes('code red')) {
            endFakeCall();
            triggerSOSAlert('fakecall');
        }
    };

    fakeCallRecognition.start();
}

function stopFakeCallVoice() {
    if (fakeCallRecognition) {
        fakeCallRecognition.stop();
        fakeCallRecognition = null;
    }
}

// ── 7. RINGTONE ───────────────────────────────
let ringtoneInterval = null;

function playRingtone() {
    // Use AudioContext to generate a ringtone sound
    // (no need for an mp3 file!)
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function beep() {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 440;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.8);
        }

        beep();
        ringtoneInterval = setInterval(beep, 1500);
    } catch (e) {
        console.log('Audio not supported', e);
    }
}

function stopRingtone() {
    if (ringtoneInterval) {
        clearInterval(ringtoneInterval);
        ringtoneInterval = null;
    }
}
// ── AUTO AUDIO RECORDING ──────────────────────
// Records 15 seconds of audio when SOS triggers
// Sends recording to server + emails to contacts

async function startAudioRecording(locationText, batteryLevel, mapLink) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Detect best supported format
        let mimeType = '';
        if (MediaRecorder.isTypeSupported('audio/mp4;codecs=mp4a')) {
            mimeType = 'audio/mp4;codecs=mp4a';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
        }

        const options = mimeType ? { mimeType } : {};
        const mediaRecorder = new MediaRecorder(stream, options);
        console.log('🎙️ Recording format:', mimeType || 'default');

        const audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            console.log('🎙️ Recording stopped, uploading...');
            stream.getTracks().forEach(track => track.stop());

            const audioBlob = new Blob(audioChunks, { type: mimeType || 'audio/webm' });
            const fileExtension = mimeType.includes('mp4') ? 'mp4'
                : mimeType.includes('ogg') ? 'ogg'
                : 'webm';

            // ✅ Audio file + location all in one formData
            const formData = new FormData();
            formData.append('audio', audioBlob, `sos_recording.${fileExtension}`);
            formData.append('location', locationText || 'Unavailable');
            formData.append('battery', batteryLevel || 'Unavailable');
            formData.append('mapLink', mapLink || '');

            try {
                const res = await fetch('/api/sos/upload-audio', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                console.log('✅ Audio uploaded:', data.message);

                const audioInfo = document.getElementById('sosAudioInfo');
                if (audioInfo) {
                    audioInfo.textContent = '🎙️ Audio recording captured & sent!';
                    audioInfo.style.display = 'block';
                }
            } catch (e) {
                console.log('❌ Audio upload failed:', e);
            }
        };

        mediaRecorder.start();
        console.log('🎙️ Recording started...');

        setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                console.log('🎙️ 15 seconds recorded');
            }
        }, 15000);

    } catch (err) {
        console.log('❌ Microphone access denied:', err.message);
    }
}
// ── AI FAKE CALL WITH GEMINI ──────────────────
// AI acts as Mom, listens to user, responds with voice

let fakeCallActive = false;
let fakeCallSpeechRecognition = null;

async function startAIFakeCall() {
    fakeCallActive = true;

    // Reset conversation on server
    await fetch('/api/sos/fake-call-reset', { method: 'POST' });

    // AI Mom speaks first
    speakText("Hello beta! Where are you? When are you coming home?");

    // Start listening after Mom finishes speaking
    setTimeout(() => {
        if (fakeCallActive) startFakeCallListening();
    }, 3000);
}

function startFakeCallListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    fakeCallSpeechRecognition = new SpeechRecognition();
    fakeCallSpeechRecognition.continuous = false;
    fakeCallSpeechRecognition.lang = 'en-US';
    fakeCallSpeechRecognition.interimResults = false;

    fakeCallSpeechRecognition.onresult = async (event) => {
        const userSpeech = event.results[0][0].transcript;
        console.log('📞 User said:', userSpeech);

        // Update UI to show what user said
        const callStatus = document.getElementById('callStatus');
        if (callStatus) callStatus.textContent = `You: "${userSpeech}"`;

        // Send to Gemini AI
        try {
            const res = await fetch('/api/sos/fake-call-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userSpeech })
            });
            const data = await res.json();

            if (data.success) {
                // AI Mom speaks the response
                speakText(data.response);

                // Show Mom's response in UI
                if (callStatus) {
                    setTimeout(() => {
                        callStatus.textContent = `Mom: "${data.response}"`;
                    }, 500);
                }

                // If danger detected → trigger SOS silently
                if (data.dangerDetected) {
                    console.log('🚨 Danger detected in fake call!');
                    // Speak alarmed response first then trigger SOS
                    speakText(data.response);
                    setTimeout(() => {
                        endFakeCall();
                        // Small delay to let speech finish
                        setTimeout(() => {
                            triggerSOSAlert('fakecall');
                        }, 1000);
                    }, 3000);
                } else {
                    speakText(data.response);
                    // Keep listening after Mom responds
                    setTimeout(() => {
                        if (fakeCallActive) startFakeCallListening();
                    }, 3500);
                }
            }
        } catch (e) {
            console.log('Fake call AI error:', e);
            // Still check danger keywords even if AI fails
            const dangerWords = ['help', 'scared', 'danger', 'following', 'unsafe', 'code red', 'weather is hot'];
            const hasDanger = dangerWords.some(k => userSpeech && userSpeech.toLowerCase().includes(k));

            if (hasDanger) {
                speakText("Beta I'm coming right now! Stay calm!");
                setTimeout(() => {
                    endFakeCall();
                    setTimeout(() => triggerSOSAlert('fakecall'), 1000);
                }, 3000);
            } else {
                speakText("Hello? Are you there beta?");
                setTimeout(() => {
                    if (fakeCallActive) startFakeCallListening();
                }, 3000);
            }
        }
    };

    fakeCallSpeechRecognition.onerror = () => {
        // Keep listening even on error
        setTimeout(() => {
            if (fakeCallActive) startFakeCallListening();
        }, 2000);
    };

    fakeCallSpeechRecognition.start();
}

// Text to Speech - Mom's voice
function speakText(text) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN'; // Indian English accent
    utterance.rate = 0.9;     // Slightly slower
    utterance.pitch = 1.2;    // Slightly higher pitch for female voice

    // Try to use a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
        v.name.includes('Female') ||
        v.name.includes('female') ||
        v.name.includes('Zira') ||
        v.name.includes('Samantha') ||
        v.name.includes('Google UK English Female')
    );
    if (femaleVoice) utterance.voice = femaleVoice;

    window.speechSynthesis.speak(utterance);
    console.log('🔊 Mom says:', text);
}