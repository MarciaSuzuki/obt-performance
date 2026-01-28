/**
 * Voice Performance Studio v4
 * Tripod Method · Oral Bible Translation
 * 
 * FIXED: Uses ElevenLabs Eleven v3 Audio Tags for AUDIBLE emotion control
 * 
 * Key insight: Eleven v3 model interprets [tags] as performance directions,
 * NOT as text to be spoken. This is different from other models.
 * 
 * Also uses the `next_text` parameter hack for additional emotion context.
 */

// ===================================
// Configuration & State
// ===================================

const CONFIG = {
    languages: {
        'hi-IN': {
            name: 'Hindi',
            nativeName: 'हिन्दी',
            speechRecognitionLang: 'hi-IN',
            sampleText: 'आदि में परमेश्‍वर ने आकाश और पृथ्वी की सृष्टि की।'
        },
        'en-IN': {
            name: 'Indian English',
            nativeName: 'Indian English',
            speechRecognitionLang: 'en-IN',
            sampleText: 'In the beginning, God created the heavens and the earth.'
        },
        'pt-BR': {
            name: 'Portuguese (Sertanejo)',
            nativeName: 'Português Sertanejo',
            speechRecognitionLang: 'pt-BR',
            sampleText: 'No princípio, Deus criou os céus e a terra.'
        }
    },
    
    // ElevenLabs v3 Audio Tags that WORK (not spoken, interpreted as directions)
    // These produce AUDIBLE differences in the output
    audioTags: {
        // Emotional tags
        'reverent': { 
            tag: '[solemn]', 
            description: 'Solemn, respectful tone',
            nextText: 'he said with deep reverence and respect.'
        },
        'joyful': { 
            tag: '[happily]', 
            description: 'Happy, bright, celebratory',
            nextText: 'she exclaimed with joy and excitement!'
        },
        'sorrowful': { 
            tag: '[sad]', 
            description: 'Sad, melancholic, grieving',
            nextText: 'he said sorrowfully, with grief in his voice.'
        },
        'urgent': { 
            tag: '[urgently]', 
            description: 'Pressing, important, intense',
            nextText: 'she shouted urgently!'
        },
        'whisper': { 
            tag: '[whispers]', 
            description: 'Soft, intimate, quiet',
            nextText: 'he whispered softly.'
        },
        'peaceful': { 
            tag: '[calmly]', 
            description: 'Calm, serene, tranquil',
            nextText: 'she said peacefully and calmly.'
        },
        'emphasis': { 
            tag: '[firmly]', 
            description: 'Strong, clear, emphatic',
            nextText: 'he declared firmly with conviction.'
        },
        'awe': { 
            tag: '[in awe]', 
            description: 'Wonder, amazement, astonishment',
            nextText: 'she gasped in complete awe and wonder.'
        },
        'warning': { 
            tag: '[sternly]', 
            description: 'Serious warning, grave',
            nextText: 'he warned sternly.'
        },
        'gentle': { 
            tag: '[softly]', 
            description: 'Tender, kind, gentle',
            nextText: 'she said gently and tenderly.'
        },
        // Delivery tags
        'slow': { 
            tag: '[slowly]', 
            description: 'Deliberate, measured pace',
            nextText: 'he spoke slowly and deliberately.'
        },
        'fast': { 
            tag: '[quickly]', 
            description: 'Rapid, energetic pace',
            nextText: 'she said quickly.'
        },
        'pause': { 
            tag: '[pause]', 
            description: 'Insert a dramatic pause',
            nextText: null,
            insertAfter: true
        },
        // Reactions (v3 can generate these as sounds)
        'sigh': { 
            tag: '[sighs]', 
            description: 'Audible sigh',
            nextText: null
        },
        'breath': { 
            tag: '[takes a deep breath]', 
            description: 'Deep breath before speaking',
            nextText: null
        }
    },
    
    playbackSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2],
    
    defaultVoices: [
        { id: 'pMsXgVXv3BLzUgSXRplE', name: 'Aria (Female)' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Female)' },
        { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Male)' },
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Female)' },
        { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (Male)' }
    ]
};

// Application state
const state = {
    currentLanguage: 'hi-IN',
    sacredText: '',
    performanceInstructions: [], // Array of {tag, position, word}
    currentVersion: 0,
    versions: [],
    audioBlob: null,
    audioUrl: null,
    isPlaying: false,
    isRecording: false,
    playbackSpeed: 1,
    feedbackHistory: [],
    settings: {
        elevenLabsKey: '',
        anthropicKey: '',
        ttsModel: 'eleven_v3_alpha', // Changed to v3 for audio tag support!
        customVoices: [],
        selectedVoiceHindi: '',
        selectedVoiceEnglishIN: '',
        selectedVoicePortuguese: ''
    }
};

// Audio elements
let audioContext = null;
let audioElement = null;
let speechRecognition = null;

// ===================================
// DOM Elements
// ===================================

const elements = {
    languageSelect: document.getElementById('languageSelect'),
    sacredText: document.getElementById('sacredText'),
    charCount: document.getElementById('charCount'),
    wordCount: document.getElementById('wordCount'),
    versionBadge: document.getElementById('versionBadge'),
    waveformCanvas: document.getElementById('waveformCanvas'),
    waveformContainer: document.getElementById('waveformContainer'),
    playhead: document.getElementById('playhead'),
    playBtn: document.getElementById('playBtn'),
    currentTime: document.getElementById('currentTime'),
    totalTime: document.getElementById('totalTime'),
    speedBtn: document.getElementById('speedBtn'),
    generateBtn: document.getElementById('generateBtn'),
    markupDisplay: document.getElementById('markupDisplay'),
    copyMarkupBtn: document.getElementById('copyMarkupBtn'),
    recordBtn: document.getElementById('recordBtn'),
    feedbackList: document.getElementById('feedbackList'),
    textFeedbackInput: document.getElementById('textFeedbackInput'),
    sendFeedbackBtn: document.getElementById('sendFeedbackBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
    elevenLabsKey: document.getElementById('elevenLabsKey'),
    anthropicKey: document.getElementById('anthropicKey'),
    ttsModel: document.getElementById('ttsModel'),
    toast: document.getElementById('toast')
};

// ===================================
// Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    loadSettings();
    setupEventListeners();
    setupSpeechRecognition();
    updateTextCounts();
    drawEmptyWaveform();
    
    const lang = CONFIG.languages[state.currentLanguage];
    elements.sacredText.value = lang.sampleText;
    state.sacredText = lang.sampleText;
    updateTextCounts();
    updateInstructionsDisplay();
}

// ===================================
// Event Listeners
// ===================================

function setupEventListeners() {
    elements.languageSelect.addEventListener('change', handleLanguageChange);
    elements.sacredText.addEventListener('input', handleTextInput);
    elements.playBtn.addEventListener('click', togglePlayback);
    elements.speedBtn.addEventListener('click', cyclePlaybackSpeed);
    elements.generateBtn.addEventListener('click', generatePerformance);
    elements.copyMarkupBtn.addEventListener('click', copyMarkup);
    
    elements.recordBtn.addEventListener('mousedown', startRecording);
    elements.recordBtn.addEventListener('mouseup', stopRecording);
    elements.recordBtn.addEventListener('mouseleave', stopRecording);
    elements.recordBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRecording(); });
    elements.recordBtn.addEventListener('touchend', stopRecording);
    
    elements.sendFeedbackBtn.addEventListener('click', sendTextFeedback);
    elements.textFeedbackInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendTextFeedback(); });
    
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.closeSettingsBtn.addEventListener('click', closeSettings);
    elements.settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettings);
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    
    // Show tag description on click
    document.querySelectorAll('.tags-grid .tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const tagName = tag.dataset.tag.replace(/[\[\]]/g, '');
            const audioTag = CONFIG.audioTags[tagName];
            showToast(`${tagName}: ${audioTag?.description || 'Performance modifier'}`);
        });
    });
    
    elements.versionBadge.addEventListener('click', showVersionHistory);
}

// ===================================
// Text Handling
// ===================================

function handleLanguageChange(e) {
    state.currentLanguage = e.target.value;
    const lang = CONFIG.languages[state.currentLanguage];
    if (speechRecognition) {
        speechRecognition.lang = lang.speechRecognitionLang;
    }
    showToast(`Language: ${lang.name}`);
}

function handleTextInput() {
    state.sacredText = elements.sacredText.value;
    state.performanceInstructions = [];
    updateTextCounts();
    updateInstructionsDisplay();
}

function updateTextCounts() {
    const text = elements.sacredText.value;
    elements.charCount.textContent = `${text.length} characters`;
    elements.wordCount.textContent = `${text.trim() ? text.trim().split(/\s+/).length : 0} words`;
}

// ===================================
// Performance Generation - ELEVEN V3
// ===================================

async function generatePerformance() {
    if (!state.settings.elevenLabsKey) {
        showToast('Please add your ElevenLabs API key in Settings');
        openSettings();
        return;
    }
    
    const text = elements.sacredText.value.trim();
    if (!text) {
        showToast('Please enter some text first');
        return;
    }
    
    elements.generateBtn.classList.add('loading');
    elements.generateBtn.disabled = true;
    
    try {
        const voiceId = getVoiceForLanguage(state.currentLanguage);
        if (!voiceId) {
            showToast('Please select a voice in Settings');
            openSettings();
            return;
        }
        
        // Build the text WITH audio tags for v3
        const { markedText, nextText } = buildMarkedText(text);
        
        console.log('Generating with text:', markedText);
        console.log('Next text context:', nextText);
        
        // Generate audio
        const audioBlob = await callElevenLabsV3API(markedText, voiceId, nextText);
        
        state.audioBlob = audioBlob;
        state.audioUrl = URL.createObjectURL(audioBlob);
        
        state.currentVersion++;
        state.versions.push({
            version: state.currentVersion,
            text: text,
            markedText: markedText,
            instructions: [...state.performanceInstructions],
            timestamp: new Date(),
            audioUrl: state.audioUrl
        });
        
        elements.versionBadge.textContent = `Version ${state.currentVersion}`;
        setupAudioPlayer(state.audioUrl);
        updateMarkupDisplay(markedText);
        
        showToast('Performance generated!');
        
    } catch (error) {
        console.error('Generation error:', error);
        showToast(`Error: ${error.message}`);
    } finally {
        elements.generateBtn.classList.remove('loading');
        elements.generateBtn.disabled = false;
    }
}

/**
 * Build text with ElevenLabs v3 Audio Tags embedded
 * These tags are NOT spoken - v3 interprets them as directions
 */
function buildMarkedText(originalText) {
    if (state.performanceInstructions.length === 0) {
        return { markedText: originalText, nextText: null };
    }
    
    let markedText = originalText;
    let nextText = null;
    const words = originalText.split(/(\s+)/); // Keep whitespace
    
    // Sort instructions by position (descending) to insert from end to start
    const sortedInstructions = [...state.performanceInstructions].sort((a, b) => {
        const posA = typeof a.position === 'number' ? a.position : (a.position === 'start' ? -1 : 999);
        const posB = typeof b.position === 'number' ? b.position : (b.position === 'start' ? -1 : 999);
        return posB - posA;
    });
    
    // Collect all next_text hints
    const nextTextHints = [];
    
    for (const instruction of state.performanceInstructions) {
        const audioTagConfig = CONFIG.audioTags[instruction.tag];
        if (audioTagConfig?.nextText) {
            nextTextHints.push(audioTagConfig.nextText);
        }
    }
    
    if (nextTextHints.length > 0) {
        nextText = nextTextHints[0]; // Use the first/most recent one
    }
    
    // Now insert audio tags into the text
    // For Eleven v3, we insert [tag] BEFORE the word/section it affects
    
    for (const instruction of sortedInstructions) {
        const audioTagConfig = CONFIG.audioTags[instruction.tag];
        if (!audioTagConfig) continue;
        
        const tag = audioTagConfig.tag;
        
        if (instruction.position === 'start' || instruction.position === -1) {
            // Add at the beginning
            markedText = `${tag} ${markedText}`;
        } else if (instruction.position === 'end') {
            // Add before the last part
            const parts = markedText.split(/\s+/);
            if (parts.length > 2) {
                const lastWords = parts.slice(-3).join(' ');
                const rest = parts.slice(0, -3).join(' ');
                markedText = `${rest} ${tag} ${lastWords}`;
            } else {
                markedText = `${tag} ${markedText}`;
            }
        } else if (typeof instruction.position === 'number') {
            // Insert before specific word position
            const textWords = markedText.split(/\s+/);
            if (instruction.position < textWords.length) {
                textWords.splice(instruction.position, 0, tag);
                markedText = textWords.join(' ');
            }
        }
    }
    
    return { markedText, nextText };
}

/**
 * Call ElevenLabs API with v3 model and audio tags
 * Uses next_text parameter for additional emotion context
 */
async function callElevenLabsV3API(text, voiceId, nextText = null) {
    const model = state.settings.ttsModel;
    
    // Build request body
    const requestBody = {
        text: text,
        model_id: model
    };
    
    // Eleven v3 has stricter voice_settings requirements
    // Only add voice_settings for non-v3 models
    if (model !== 'eleven_v3_alpha') {
        requestBody.voice_settings = {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true
        };
    }
    
    // Add next_text for emotion context (works with all models)
    if (nextText) {
        requestBody.next_text = nextText;
    }
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': state.settings.elevenLabsKey
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail?.message || `API Error: ${response.status}`);
    }
    
    return await response.blob();
}

function getVoiceForLanguage(langCode) {
    switch (langCode) {
        case 'hi-IN': return state.settings.selectedVoiceHindi;
        case 'en-IN': return state.settings.selectedVoiceEnglishIN;
        case 'pt-BR': return state.settings.selectedVoicePortuguese;
        default: return state.settings.selectedVoiceHindi;
    }
}

// ===================================
// Markup Display
// ===================================

function updateMarkupDisplay(markedText) {
    // Highlight the v3 audio tags
    const highlighted = markedText.replace(/\[([^\]]+)\]/g, '<span class="tag">[$1]</span>');
    elements.markupDisplay.innerHTML = highlighted;
}

function updateInstructionsDisplay() {
    if (state.performanceInstructions.length === 0) {
        elements.markupDisplay.innerHTML = '<span class="placeholder">Add performance directions using voice or text feedback...</span>';
        return;
    }
    
    const { markedText } = buildMarkedText(elements.sacredText.value);
    updateMarkupDisplay(markedText);
}

function copyMarkup() {
    const { markedText } = buildMarkedText(elements.sacredText.value);
    navigator.clipboard.writeText(markedText || state.sacredText).then(() => {
        showToast('Copied!');
    });
}

// ===================================
// Audio Player
// ===================================

function setupAudioPlayer(audioUrl) {
    if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
    }
    
    audioElement = new Audio(audioUrl);
    audioElement.playbackRate = state.playbackSpeed;
    
    audioElement.addEventListener('loadedmetadata', () => {
        elements.totalTime.textContent = formatTime(audioElement.duration);
        elements.playBtn.disabled = false;
        drawWaveform();
    });
    
    audioElement.addEventListener('timeupdate', () => {
        elements.currentTime.textContent = formatTime(audioElement.currentTime);
        updatePlayhead();
    });
    
    audioElement.addEventListener('ended', () => {
        state.isPlaying = false;
        elements.playBtn.classList.remove('playing');
        elements.waveformContainer.classList.remove('playing');
    });
}

function togglePlayback() {
    if (!audioElement) return;
    
    if (state.isPlaying) {
        audioElement.pause();
        state.isPlaying = false;
        elements.playBtn.classList.remove('playing');
        elements.waveformContainer.classList.remove('playing');
    } else {
        audioElement.play();
        state.isPlaying = true;
        elements.playBtn.classList.add('playing');
        elements.waveformContainer.classList.add('playing');
    }
}

function cyclePlaybackSpeed() {
    const currentIndex = CONFIG.playbackSpeeds.indexOf(state.playbackSpeed);
    state.playbackSpeed = CONFIG.playbackSpeeds[(currentIndex + 1) % CONFIG.playbackSpeeds.length];
    if (audioElement) audioElement.playbackRate = state.playbackSpeed;
    elements.speedBtn.textContent = `${state.playbackSpeed}x`;
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function updatePlayhead() {
    if (!audioElement?.duration) return;
    const progress = audioElement.currentTime / audioElement.duration;
    elements.playhead.style.left = `${progress * elements.waveformContainer.offsetWidth}px`;
}

// ===================================
// Waveform
// ===================================

function drawEmptyWaveform() {
    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.strokeStyle = '#e6dfd3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();
}

async function drawWaveform() {
    if (!state.audioBlob) { drawEmptyWaveform(); return; }
    
    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    try {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const arrayBuffer = await state.audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const rawData = audioBuffer.getChannelData(0);
        
        const samples = Math.floor(rect.width);
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData = [];
        
        for (let i = 0; i < samples; i++) {
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(rawData[blockSize * i + j]);
            }
            filteredData.push(sum / blockSize);
        }
        
        const max = Math.max(...filteredData);
        const normalizedData = filteredData.map(n => n / max);
        
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = '#8b5a2b';
        
        const centerY = rect.height / 2;
        for (let i = 0; i < normalizedData.length; i += 3) {
            const barHeight = normalizedData[i] * centerY * 0.9;
            ctx.fillRect(i, centerY - barHeight, 2, barHeight * 2);
        }
    } catch (error) {
        console.error('Waveform error:', error);
        drawEmptyWaveform();
    }
}

// ===================================
// Speech Recognition
// ===================================

function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    
    speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = CONFIG.languages[state.currentLanguage].speechRecognitionLang;
    
    let finalTranscript = '';
    
    speechRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }
    };
    
    speechRecognition.onend = () => {
        if (finalTranscript.trim()) {
            processFeedback(finalTranscript.trim());
        }
        finalTranscript = '';
    };
    
    speechRecognition.onerror = (event) => {
        if (event.error !== 'aborted') showToast(`Recognition error: ${event.error}`);
    };
}

function startRecording() {
    if (!speechRecognition) { showToast('Speech recognition not available'); return; }
    
    state.isRecording = true;
    elements.recordBtn.classList.add('recording');
    elements.recordBtn.querySelector('.record-text').textContent = 'Listening...';
    
    try { speechRecognition.start(); } catch (e) {}
}

function stopRecording() {
    if (!state.isRecording) return;
    
    state.isRecording = false;
    elements.recordBtn.classList.remove('recording');
    elements.recordBtn.querySelector('.record-text').textContent = 'Hold to Speak';
    
    if (speechRecognition) speechRecognition.stop();
}

// ===================================
// Feedback Processing
// ===================================

function sendTextFeedback() {
    const feedback = elements.textFeedbackInput.value.trim();
    if (!feedback) return;
    elements.textFeedbackInput.value = '';
    processFeedback(feedback);
}

async function processFeedback(feedbackText) {
    addFeedbackToHistory(feedbackText);
    
    const sacredText = elements.sacredText.value.trim();
    if (!sacredText) {
        showToast('Please enter sacred text first');
        return;
    }
    
    showToast('Processing feedback...');
    
    try {
        const instruction = await parseFeedbackToInstruction(sacredText, feedbackText);
        
        if (instruction) {
            state.performanceInstructions.push(instruction);
            updateInstructionsDisplay();
            
            // Auto-regenerate
            if (state.settings.elevenLabsKey) {
                generatePerformance();
            }
        }
        
    } catch (error) {
        console.error('Feedback error:', error);
        showToast('Error processing feedback');
    }
}

async function parseFeedbackToInstruction(sacredText, feedback) {
    if (state.settings.anthropicKey) {
        return await parseWithClaude(sacredText, feedback);
    }
    return parseWithRules(sacredText, feedback);
}

async function parseWithClaude(sacredText, feedback) {
    const availableTags = Object.keys(CONFIG.audioTags).join(', ');
    
    const systemPrompt = `You parse voice performance feedback into structured instructions for ElevenLabs v3.

Available performance tags: ${availableTags}

Return ONLY a JSON object:
- tag: one of the available tags
- position: "start", "end", or a word index number
- word: the specific word mentioned (if any)

Examples:
"make it more reverent" → {"tag": "reverent", "position": "start", "word": null}
"whisper at the end" → {"tag": "whisper", "position": "end", "word": null}
"add a pause after heavens" → {"tag": "pause", "position": 4, "word": "heavens"}
"say 'earth' with awe" → {"tag": "awe", "position": 7, "word": "earth"}
"make it joyful" → {"tag": "joyful", "position": "start", "word": null}
"speak slowly" → {"tag": "slow", "position": "start", "word": null}

Return ONLY valid JSON.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': state.settings.anthropicKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 256,
                system: systemPrompt,
                messages: [{ 
                    role: 'user', 
                    content: `Sacred text: "${sacredText}"\nFeedback: "${feedback}"\n\nReturn JSON:` 
                }]
            })
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        const jsonText = data.content[0].text.trim();
        const parsed = JSON.parse(jsonText.replace(/```json?|```/g, ''));
        
        return {
            tag: parsed.tag || 'reverent',
            position: parsed.position ?? 'start',
            word: parsed.word || null
        };
        
    } catch (error) {
        console.error('Claude parsing error:', error);
        return parseWithRules(sacredText, feedback);
    }
}

function parseWithRules(sacredText, feedback) {
    const feedbackLower = feedback.toLowerCase();
    const words = sacredText.split(/\s+/);
    
    // Detect the performance tag
    let tag = 'reverent';
    const tagMappings = {
        'reverent': ['reverent', 'reverence', 'respectful', 'solemn', 'holy', 'sacred'],
        'joyful': ['joyful', 'happy', 'joy', 'cheerful', 'bright', 'excited'],
        'sorrowful': ['sorrowful', 'sad', 'grief', 'melancholy', 'mournful'],
        'urgent': ['urgent', 'hurry', 'pressing', 'important'],
        'whisper': ['whisper', 'soft', 'quiet', 'softly'],
        'peaceful': ['peaceful', 'calm', 'serene', 'gentle'],
        'emphasis': ['emphasis', 'stress', 'emphasize', 'strong', 'firmly'],
        'slow': ['slow', 'slower', 'deliberate', 'carefully'],
        'fast': ['fast', 'faster', 'quick', 'rapid', 'quickly'],
        'awe': ['awe', 'wonder', 'amazed', 'astonished'],
        'warning': ['warning', 'warn', 'serious', 'stern'],
        'gentle': ['gentle', 'tender', 'kind', 'loving'],
        'pause': ['pause', 'break', 'stop', 'wait'],
        'sigh': ['sigh', 'sighing'],
        'breath': ['breath', 'breathing', 'deep breath']
    };
    
    for (const [t, keywords] of Object.entries(tagMappings)) {
        if (keywords.some(kw => feedbackLower.includes(kw))) {
            tag = t;
            break;
        }
    }
    
    // Detect position
    let position = 'start';
    let word = null;
    
    if (feedbackLower.includes('end') || feedbackLower.includes('last')) {
        position = 'end';
    }
    
    // Check for quoted word
    const quotedMatch = feedback.match(/['"]([^'"]+)['"]/);
    if (quotedMatch) {
        word = quotedMatch[1];
        const wordIndex = words.findIndex(w => 
            w.toLowerCase().replace(/[.,!?;:।]/g, '') === word.toLowerCase()
        );
        if (wordIndex >= 0) position = wordIndex;
    }
    
    // Check for "at/after/before WORD"
    const atMatch = feedbackLower.match(/(?:at|after|before|near)\s+['"]?(\w+)['"]?/);
    if (atMatch && !word) {
        word = atMatch[1];
        const wordIndex = words.findIndex(w => 
            w.toLowerCase().replace(/[.,!?;:।]/g, '').includes(word.toLowerCase())
        );
        if (wordIndex >= 0) position = wordIndex;
    }
    
    return { tag, position, word };
}

function addFeedbackToHistory(feedbackText) {
    state.feedbackHistory.unshift({ text: feedbackText, timestamp: new Date() });
    if (state.feedbackHistory.length > 20) state.feedbackHistory.pop();
    renderFeedbackHistory();
}

function renderFeedbackHistory() {
    if (state.feedbackHistory.length === 0) {
        elements.feedbackList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 18.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z"/>
                    <path d="M12 14v-4M12 8h.01"/>
                </svg>
                <p>Speak or type to add performance directions.</p>
            </div>`;
        return;
    }
    
    elements.feedbackList.innerHTML = state.feedbackHistory.map(item => `
        <div class="feedback-item">
            <div class="feedback-text">"${escapeHtml(item.text)}"</div>
            <div class="feedback-time">${formatTimeAgo(item.timestamp)}</div>
        </div>
    `).join('');
}

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===================================
// Settings
// ===================================

function loadSettings() {
    const saved = localStorage.getItem('voicePerformanceStudioSettings');
    if (saved) {
        try {
            state.settings = { ...state.settings, ...JSON.parse(saved) };
        } catch (e) {}
    }
    
    // Default to v3 for audio tag support
    if (!state.settings.ttsModel || state.settings.ttsModel === 'eleven_multilingual_v2') {
        state.settings.ttsModel = 'eleven_v3_alpha';
    }
    
    if (!state.settings.customVoices?.length) {
        state.settings.customVoices = [...CONFIG.defaultVoices];
    }
}

function saveSettings() {
    state.settings.elevenLabsKey = elements.elevenLabsKey.value.trim();
    state.settings.anthropicKey = elements.anthropicKey.value.trim();
    state.settings.ttsModel = elements.ttsModel.value;
    
    const voiceHindiSelect = document.getElementById('voiceHindi');
    const voiceEnglishINSelect = document.getElementById('voiceEnglishIN');
    const voicePortugueseSelect = document.getElementById('voicePortuguese');
    
    if (voiceHindiSelect) state.settings.selectedVoiceHindi = voiceHindiSelect.value;
    if (voiceEnglishINSelect) state.settings.selectedVoiceEnglishIN = voiceEnglishINSelect.value;
    if (voicePortugueseSelect) state.settings.selectedVoicePortuguese = voicePortugueseSelect.value;
    
    const customVoicesTextarea = document.getElementById('customVoicesTextarea');
    if (customVoicesTextarea) {
        const lines = customVoicesTextarea.value.trim().split('\n').filter(l => l.trim());
        const newVoices = lines.map(line => {
            const parts = line.split('|').map(p => p.trim());
            return parts.length === 2 
                ? { name: parts[0], id: parts[1] }
                : { name: parts[0], id: parts[0] };
        }).filter(v => v.id);
        
        if (newVoices.length) state.settings.customVoices = newVoices;
    }
    
    localStorage.setItem('voicePerformanceStudioSettings', JSON.stringify(state.settings));
    closeSettings();
    showToast('Settings saved');
}

function openSettings() {
    elements.elevenLabsKey.value = state.settings.elevenLabsKey || '';
    elements.anthropicKey.value = state.settings.anthropicKey || '';
    elements.ttsModel.value = state.settings.ttsModel;
    
    populateVoiceSelectors();
    
    const customVoicesTextarea = document.getElementById('customVoicesTextarea');
    if (customVoicesTextarea && state.settings.customVoices) {
        customVoicesTextarea.value = state.settings.customVoices.map(v => `${v.name} | ${v.id}`).join('\n');
    }
    
    elements.settingsModal.classList.add('open');
}

function populateVoiceSelectors() {
    const voices = state.settings.customVoices || CONFIG.defaultVoices;
    const options = voices.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
    
    ['voiceHindi', 'voiceEnglishIN', 'voicePortuguese'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = options;
            const settingKey = id === 'voiceHindi' ? 'selectedVoiceHindi' : 
                              id === 'voiceEnglishIN' ? 'selectedVoiceEnglishIN' : 
                              'selectedVoicePortuguese';
            select.value = state.settings[settingKey] || voices[0]?.id || '';
        }
    });
}

function closeSettings() {
    elements.settingsModal.classList.remove('open');
}

async function fetchElevenLabsVoices() {
    let apiKey = state.settings.elevenLabsKey;
    if (!apiKey) {
        const keyInput = document.getElementById('elevenLabsKey');
        if (keyInput?.value) {
            apiKey = keyInput.value.trim();
        } else {
            showToast('Please enter your ElevenLabs API key first');
            return;
        }
    }
    
    try {
        showToast('Fetching voices...');
        
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': apiKey }
        });
        
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        
        const data = await response.json();
        state.settings.customVoices = data.voices.map(v => ({ id: v.voice_id, name: v.name }));
        
        const textarea = document.getElementById('customVoicesTextarea');
        if (textarea) {
            textarea.value = state.settings.customVoices.map(v => `${v.name} | ${v.id}`).join('\n');
        }
        
        populateVoiceSelectors();
        showToast(`Found ${data.voices.length} voices!`);
        
    } catch (error) {
        showToast(`Error: ${error.message}`);
    }
}

window.fetchElevenLabsVoices = fetchElevenLabsVoices;

// ===================================
// Utilities
// ===================================

function showVersionHistory() {
    if (!state.versions.length) {
        showToast('No versions yet');
        return;
    }
    showToast(`${state.versions.length} versions generated`);
}

function showToast(message) {
    elements.toast.querySelector('.toast-message').textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        togglePlayback();
    }
    if (e.code === 'Escape') closeSettings();
    if ((e.ctrlKey || e.metaKey) && e.code === 'Enter') {
        e.preventDefault();
        generatePerformance();
    }
});

window.addEventListener('resize', () => {
    state.audioBlob ? drawWaveform() : drawEmptyWaveform();
});
