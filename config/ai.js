// ============================================
// SheSafe - AI powered by Google Gemini (FREE)
// Distress Detection + Fake Call AI
// ============================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });

// ── AI DISTRESS DETECTION ─────────────────────
async function analyzeMessage(message) {
    try {
        const prompt = `You are a safety AI for SheSafe, a women's safety app.

Analyze this message and detect if the person is in danger or distress.

Message: "${message}"

Reply ONLY in this exact JSON format, nothing else, no extra text:
{
    "is_distress": true or false,
    "confidence": "high" or "medium" or "low",
    "reason": "one short sentence why",
    "suggested_action": "trigger_sos" or "monitor" or "none"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Clean response in case Gemini adds extra text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        const parsed = JSON.parse(jsonMatch[0]);
        console.log('🤖 Gemini Analysis:', parsed);
        return parsed;

    } catch (err) {
        console.log('❌ Gemini analysis error:', err.message);
        // Fallback to keyword detection if Gemini fails
        return fallbackAnalysis(message);
    }
}

// ── FALLBACK KEYWORD DETECTION ────────────────
// Used if Gemini API fails for any reason
function fallbackAnalysis(message) {
    const lowerMessage = message.toLowerCase();
    const highWords = ['help me', 'save me', 'attacking', 'assault', 'knife', 'gun', 'threat', 'emergency'];
    const mediumWords = ['scared', 'following me', 'unsafe', 'in danger', 'need help', 'please come', 'hurry'];

    let is_distress = false;
    let confidence = 'low';
    let reason = 'No distress detected';
    let suggested_action = 'none';
    let detectedWord = '';

    for (const word of highWords) {
        if (lowerMessage.includes(word)) {
            is_distress = true;
            confidence = 'high';
            reason = `Critical distress keyword detected: "${word}"`;
            suggested_action = 'trigger_sos';
            detectedWord = word;
            break;
        }
    }

    if (!is_distress) {
        for (const word of mediumWords) {
            if (lowerMessage.includes(word)) {
                is_distress = true;
                confidence = 'medium';
                reason = `Distress keyword detected: "${word}"`;
                suggested_action = 'trigger_sos';
                detectedWord = word;
                break;
            }
        }
    }

    return { is_distress, confidence, reason, suggested_action };
}

// ── AI FAKE CALL CONVERSATION ─────────────────
// Gemini acts as "Mom" during fake call
// Detects danger keywords in speech

let conversationHistory = [];

async function getFakeCallResponse(userSpeech) {
    try {
        // Add user speech to history
        conversationHistory.push({
            role: 'user',
            parts: [{ text: userSpeech }]
        });

        // Check for danger keywords in speech
        const dangerKeywords = [
            'help', 'scared', 'danger', 'uncomfortable',
            'following', 'unsafe', 'weather is hot',
            'code red', 'hurry', 'come fast', 'please come'
        ];
        const hasDanger = dangerKeywords.some(k =>
            userSpeech.toLowerCase().includes(k)
        );

        // Build prompt for Gemini
        const systemPrompt = `You are "Mom" in a fake phone call for SheSafe, a women's safety app.
The user is pretending to talk to their mom to escape an uncomfortable or dangerous situation.
Rules:
- Keep responses very SHORT (1-2 sentences only)
- Sound like a caring Indian mom
- Ask where they are and tell them to come home
- If user sounds scared or in danger, sound very worried and say you are coming
- Never reveal you are an AI
- Speak naturally like a real phone call
${hasDanger ? '- IMPORTANT: The user seems to be in DANGER. Sound very alarmed and say you are coming immediately!' : ''}

Conversation so far:
${conversationHistory.map(m => `${m.role === 'user' ? 'Child' : 'Mom'}: ${m.parts[0].text}`).join('\n')}

Mom's response:`;

        const result = await model.generateContent(systemPrompt);
        const response = result.response.text().trim();

        // Add AI response to history
        conversationHistory.push({
            role: 'model',
            parts: [{ text: response }]
        });

        // Keep history short (last 6 messages)
        if (conversationHistory.length > 6) {
            conversationHistory = conversationHistory.slice(-6);
        }

        console.log(`🤖 Fake call - User: "${userSpeech}" → Mom: "${response}"`);

        return {
            response,
            dangerDetected: hasDanger
        };

    } catch (err) {
        console.log('❌ Fake call AI error:', err.message);
        return {
            response: "Hello? Are you okay beta? Come home soon okay?",
            dangerDetected: false
        };
    }
}

function resetConversation() {
    conversationHistory = [];
}

module.exports = { analyzeMessage, getFakeCallResponse, resetConversation };