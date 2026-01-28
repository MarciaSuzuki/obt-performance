/**
 * Voice Performance Studio v3
 * Tripod Method · Oral Bible Translation
 * 
 * FIXED: Properly controls ElevenLabs voice performance without speaking tags
 * 
 * ElevenLabs emotion control methods:
 * 1. Voice settings (stability, similarity, style)
 * 2. Text formatting (punctuation, emphasis markers)
 * 3. Model selection (eleven_v3 for audio tags)
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
    
    // Performance presets that map to actual ElevenLabs voice settings
    // These are NOT spoken - they control the voice synthesis
    performancePresets: {
        'reverent': {
            description: 'Slow, solemn, respectful',
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.3,
            speed: 0.85,
            textTransform: (text) => text.toLowerCase().replace(/!/g, '.'),
            pauseAfter: true
        },
        'joyful': {
            description: 'Bright, energetic, happy',
            stability: 0.4,
            similarity_boost: 0.75,
            style: 0.8,
            speed: 1.1,
            textTransform: (text) => text + '!',
            pauseAfter: false
        },
        'sorrowful': {
            description: 'Slow, melancholic, heavy',
            stability: 0.75,
            similarity_boost: 0.8,
            style: 0.4,
            speed: 0.8,
            textTransform: (text) => text.replace(/!/g, '...'),
            pauseAfter: true
        },
        'urgent': {
            description: 'Fast, intense, pressing',
            stability: 0.35,
            similarity_boost: 0.7,
            style: 0.7,
            speed: 1.25,
            textTransform: (text) => text.replace(/\./g, '!'),
            pauseAfter: false
        },
        'whisper': {
            description: 'Soft, intimate, quiet',
            stability: 0.8,
            similarity_boost: 0.9,
            style: 0.2,
            speed: 0.9,
            textTransform: (text) => text.toLowerCase(),
            pauseAfter: true
        },
        'peaceful': {
            description: 'Calm, gentle, serene',
            stability: 0.8,
            similarity_boost: 0.8,
            style: 0.3,
            speed: 0.9,
            textTransform: (text) => text,
            pauseAfter: true
        },
        'emphasis': {
            description: 'Strong, clear, important',
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.6,
            speed: 0.95,
            textTransform: (text) => text.toUpperCase(),
            pauseAfter: false
        },
        'slow': {
            description: 'Deliberately paced',
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.4,
            speed: 0.75,
            textTransform: (text) => text,
            pauseAfter: true
        },
        'fast': {
            description: 'Quick paced',
            stability: 0.4,
            similarity_boost: 0.7,
            style: 0.5,
            speed: 1.3,
            textTransform: (text) => text,
            pauseAfter: false
        },
        'awe': {
            description: 'Wonder, amazement',
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.6,
            speed: 0.85,
            textTransform: (text) => text + '...',
            pauseAfter: true
        },
        'pause': {
            description: 'Insert a pause',
            stability: 0.7,
            similarity_boost: 0.8,
            style: 0.4,
            speed: 1.0,
            textTransform: (text) => text,
            pauseAfter: true,
            isPause: true
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
        ttsModel: 'eleven_multilingual_v2',
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
    elements.copyMarkupBtn.addEventListener('click', copyInstructions);
    
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
    
    document.querySelectorAll('.tags-grid .tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const tagName = tag.dataset.tag.replace(/[\[\]]/g, '');
            showToast(`"${tagName}" - ${CONFIG.performancePresets[tagName]?.description || 'Performance modifier'}`);
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
// Performance Generation - FIXED
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
        
        // Generate audio with performance instructions applied
        const audioBlob = await generateWithInstructions(text, voiceId);
        
        state.audioBlob = audioBlob;
        state.audioUrl = URL.createObjectURL(audioBlob);
        
        state.currentVersion++;
        state.versions.push({
            version: state.currentVersion,
            text: text,
            instructions: [...state.performanceInstructions],
            timestamp: new Date(),
            audioUrl: state.audioUrl
        });
        
        elements.versionBadge.textContent = `Version ${state.currentVersion}`;
        setupAudioPlayer(state.audioUrl);
        
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
 * Generate audio by applying performance instructions to voice settings
 * NOT by adding text tags
 */
async function generateWithInstructions(originalText, voiceId) {
    // If no instructions, generate with default settings
    if (state.performanceInstructions.length === 0) {
        return await callElevenLabsAPI(originalText, voiceId, getDefaultVoiceSettings());
    }
    
    // Determine the dominant emotion/style from instructions
    const dominantInstruction = state.performanceInstructions[state.performanceInstructions.length - 1];
    const preset = CONFIG.performancePresets[dominantInstruction?.tag] || CONFIG.performancePresets['reverent'];
    
    // Build voice settings based on the performance preset
    const voiceSettings = {
        stability: preset.stability,
        similarity_boost: preset.similarity_boost,
        style: preset.style,
        use_speaker_boost: true
    };
    
    // The text stays UNCHANGED - we only modify voice settings
    // No tags are added to the text!
    const textToSpeak = originalText;
    
    // For pauses, we can insert actual silence characters that ElevenLabs understands
    // ElevenLabs interprets "..." as a natural pause
    let processedText = textToSpeak;
    
    // Apply text-based modifications that ElevenLabs understands
    // These are punctuation-based, not spoken tags
    for (const instruction of state.performanceInstructions) {
        const preset = CONFIG.performancePresets[instruction.tag];
        if (!preset) continue;
        
        if (instruction.tag === 'pause' && instruction.position !== undefined) {
            // Insert natural pause (ellipsis) at the specified position
            processedText = insertPauseAtPosition(processedText, instruction.position);
        }
        
        if (instruction.tag === 'emphasis' && instruction.word) {
            // For emphasis, we can use CAPS which affects some voices
            // But this is subtle - the main control is via voice settings
        }
    }
    
    return await callElevenLabsAPI(processedText, voiceId, voiceSettings);
}

function insertPauseAtPosition(text, position) {
    const words = text.split(/\s+/);
    if (position >= 0 && position < words.length) {
        words[position] = words[position] + '...';
    }
    return words.join(' ');
}

function getDefaultVoiceSettings() {
    return {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.5,
        use_speaker_boost: true
    };
}

async function callElevenLabsAPI(text, voiceId, voiceSettings) {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': state.settings.elevenLabsKey
        },
        body: JSON.stringify({
            text: text,
            model_id: state.settings.ttsModel,
            voice_settings: voiceSettings
        })
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
// Instructions Display (not spoken)
// ===================================

function updateInstructionsDisplay() {
    if (state.performanceInstructions.length === 0) {
        elements.markupDisplay.innerHTML = '<span class="placeholder">Performance instructions will appear here...</span>';
        return;
    }
    
    const instructionsList = state.performanceInstructions.map(inst => {
        const preset = CONFIG.performancePresets[inst.tag];
        const desc = preset ? preset.description : '';
        const location = inst.word ? `at "${inst.word}"` : (inst.position === 'start' ? 'at beginning' : inst.position === 'end' ? 'at end' : '');
        return `<div class="instruction-item">
            <span class="tag">[${inst.tag}]</span> 
            <span class="instruction-desc">${desc}</span>
            ${location ? `<span class="instruction-location">${location}</span>` : ''}
        </div>`;
    }).join('');
    
    elements.markupDisplay.innerHTML = instructionsList;
}

function copyInstructions() {
    const text = state.performanceInstructions.map(i => `[${i.tag}] ${i.word || i.position || ''}`).join('\n');
    navigator.clipboard.writeText(text || state.sacredText).then(() => {
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
// Feedback Processing - FIXED
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
        // Parse feedback to extract instructions (NOT to add text tags)
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

/**
 * Parse user feedback into a performance instruction
 * Returns an object like {tag: 'reverent', position: 'start', word: null}
 * NOT a modified text string
 */
async function parseFeedbackToInstruction(sacredText, feedback) {
    // If we have Claude API, use it for better parsing
    if (state.settings.anthropicKey) {
        return await parseWithClaude(sacredText, feedback);
    }
    
    // Otherwise use rule-based parsing
    return parseWithRules(sacredText, feedback);
}

async function parseWithClaude(sacredText, feedback) {
    const systemPrompt = `You parse voice performance feedback into structured instructions.

Available performance styles: reverent, joyful, sorrowful, urgent, whisper, peaceful, emphasis, slow, fast, awe, pause

Return ONLY a JSON object with these fields:
- tag: the performance style to apply (from the list above)
- position: "start", "end", "middle", or a word index number
- word: the specific word mentioned (if any), or null

Examples:
Feedback: "make it more reverent"
Output: {"tag": "reverent", "position": "start", "word": null}

Feedback: "add a pause after heavens"
Output: {"tag": "pause", "position": 4, "word": "heavens"}

Feedback: "whisper at the end"
Output: {"tag": "whisper", "position": "end", "word": null}

Feedback: "make 'earth' more emphasized"
Output: {"tag": "emphasis", "position": 7, "word": "earth"}

Return ONLY valid JSON, no explanation.`;

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
        
        // Parse JSON response
        const parsed = JSON.parse(jsonText);
        return {
            tag: parsed.tag || 'reverent',
            position: parsed.position || 'start',
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
    let tag = 'reverent'; // default
    const tagMappings = {
        'reverent': ['reverent', 'reverence', 'respectful', 'solemn', 'holy'],
        'joyful': ['joyful', 'happy', 'joy', 'cheerful', 'bright'],
        'sorrowful': ['sorrowful', 'sad', 'grief', 'melancholy'],
        'urgent': ['urgent', 'fast', 'quick', 'hurry'],
        'whisper': ['whisper', 'soft', 'quiet'],
        'peaceful': ['peaceful', 'calm', 'serene'],
        'emphasis': ['emphasis', 'stress', 'emphasize', 'important'],
        'slow': ['slow', 'slower', 'deliberate'],
        'fast': ['fast', 'faster', 'quick', 'rapid'],
        'awe': ['awe', 'wonder', 'amazed'],
        'pause': ['pause', 'break', 'stop', 'wait']
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
    } else if (feedbackLower.includes('middle')) {
        position = 'middle';
    }
    
    // Check for quoted word
    const quotedMatch = feedback.match(/['"]([^'"]+)['"]/);
    if (quotedMatch) {
        word = quotedMatch[1];
        // Find position of this word
        const wordIndex = words.findIndex(w => 
            w.toLowerCase().replace(/[.,!?;:।]/g, '') === word.toLowerCase()
        );
        if (wordIndex >= 0) position = wordIndex;
    }
    
    // Check for "at/after/before WORD" pattern
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
                <p>No feedback yet. Speak or type to refine the performance.</p>
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
            const key = 'selectedV' + id.substring(1);
            select.value = state.settings[key] || voices[0]?.id || '';
        }
    });
}

function closeSettings() {
    elements.settingsModal.classList.remove('open');
}

async function fetchElevenLabsVoices() {
    if (!state.settings.elevenLabsKey) {
        // Try to get from the input field
        const keyInput = document.getElementById('elevenLabsKey');
        if (keyInput?.value) {
            state.settings.elevenLabsKey = keyInput.value.trim();
        } else {
            showToast('Please enter your ElevenLabs API key first');
            return;
        }
    }
    
    try {
        showToast('Fetching voices...');
        
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': state.settings.elevenLabsKey }
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
