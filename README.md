# Voice Performance Studio

**Tripod Method · Oral Bible Translation**

A web application for refining voice performances through audio feedback. Designed for Bible translation teams working with oral communities in Hindi, Indian English, and Brazilian Sertanejo Portuguese.

![Voice Performance Studio](screenshot.png)

## Features

- **Fixed Text Protection**: The sacred text is never modified—only the performance markup changes
- **Voice Feedback**: Speak your refinement instructions naturally
- **Multi-language Support**: Hindi, Indian English, and Portuguese (Sertanejo)
- **Emotion Tags**: Apply tags like `[reverent]`, `[joyful]`, `[whisper]`, `[pause]` etc.
- **Version History**: Track and compare different performances
- **Waveform Visualization**: Visual feedback of generated audio

## How It Works

1. **Enter Sacred Text**: Paste your source text (words will never be changed)
2. **Generate Performance**: Creates initial voice rendering via ElevenLabs
3. **Give Voice Feedback**: Hold the record button and describe changes
   - "Make the beginning more reverent"
   - "Slow down at 'heavens and earth'"
   - "Add a pause before the last phrase"
4. **Iterate**: The system applies your feedback and regenerates
5. **Export**: Download final audio for use in translation projects

## Technology Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework dependencies)
- **TTS**: ElevenLabs API (Multilingual v2 or Eleven v3)
- **Speech Recognition**: Web Speech API (browser-native)
- **Feedback Interpretation**: Claude API (optional) or rule-based fallback

## Setup

### Prerequisites

1. An [ElevenLabs](https://elevenlabs.io) account and API key
2. (Optional) An [Anthropic](https://console.anthropic.com) API key for advanced feedback interpretation

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/voice-performance-studio.git

# Navigate to the project
cd voice-performance-studio

# Serve locally (any static server works)
python -m http.server 8000
# or
npx serve .
# or just open index.html in a browser
```

### GitHub Pages Deployment

1. Fork or clone this repository
2. Go to **Settings** > **Pages**
3. Under "Source", select **main** branch
4. Click **Save**
5. Your app will be live at `https://YOUR_USERNAME.github.io/voice-performance-studio/`

### Configuration

1. Open the app in your browser
2. Click the **Settings** (gear icon) in the top right
3. Enter your **ElevenLabs API Key**
4. (Optional) Enter your **Anthropic API Key** for smarter feedback interpretation
5. Select preferred voices for each language
6. Click **Save Settings**

Settings are stored in your browser's localStorage and persist across sessions.

## Usage Guide

### Supported Languages

| Language | Code | Speech Recognition | Notes |
|----------|------|-------------------|-------|
| Hindi | hi-IN | ✅ Native | Devanagari script supported |
| Indian English | en-IN | ✅ Native | Indian accent recognition |
| Portuguese (Sertanejo) | pt-BR | ✅ Native | Brazilian Portuguese |

### Available Performance Tags

| Tag | Effect | Usage |
|-----|--------|-------|
| `[reverent]` | Solemn, respectful tone | Sacred passages, prayer |
| `[joyful]` | Happy, celebratory | Praise, thanksgiving |
| `[sorrowful]` | Sad, lamenting | Grief, confession |
| `[urgent]` | Fast, pressing | Warnings, commands |
| `[whisper]` | Soft, quiet | Intimate moments |
| `[pause]` | Brief silence | Dramatic effect |
| `[slow]` | Reduced speed | Emphasis, clarity |
| `[fast]` | Increased speed | Excitement, urgency |
| `[emphasis]` | Stressed delivery | Key words |
| `[peaceful]` | Calm, serene | Comfort, rest |
| `[awe]` | Wonder, amazement | Divine encounters |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause audio |
| `Ctrl/Cmd + Enter` | Generate performance |
| `Escape` | Close settings modal |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Voice Performance Studio            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Sacred Text │→ │ Performance  │→ │  Audio    │  │
│  │   Input     │  │   Markup     │  │  Output   │  │
│  └─────────────┘  └──────────────┘  └───────────┘  │
│         ↑                ↑                         │
│         │                │                         │
│  ┌──────┴────────────────┴──────────────────────┐  │
│  │            Voice Feedback Loop               │  │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐  │  │
│  │  │ Speech  │ →  │ Claude  │ →  │ Markup  │  │  │
│  │  │ to Text │    │   API   │    │ Update  │  │  │
│  │  └─────────┘    └─────────┘    └─────────┘  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## API Costs

- **ElevenLabs**: ~$0.30 per 1,000 characters (varies by plan)
- **Anthropic Claude**: ~$0.003 per 1,000 input tokens (optional)

For Bible translation projects, typical daily usage might cost $1-5 depending on iteration frequency.

## Browser Support

| Browser | Speech Recognition | Audio Playback |
|---------|-------------------|----------------|
| Chrome | ✅ Full support | ✅ |
| Edge | ✅ Full support | ✅ |
| Safari | ⚠️ Limited | ✅ |
| Firefox | ❌ Not supported | ✅ |

For best results, use **Chrome** or **Edge**.

## Integration with Tripod Method

This tool is designed to work with the Tripod Method for Oral Bible Translation:

1. **Meaning Maps**: Use the semantic annotations to inform performance choices
2. **Language Archive**: Generated performances can be tagged and archived
3. **Concept Bank**: Validated terms maintain consistent pronunciation

## Troubleshooting

### "Speech recognition not available"
- Ensure you're using Chrome or Edge
- Check that microphone permissions are granted
- Verify HTTPS (required for speech recognition)

### "API Error: 401"
- Check that your API key is correct
- Verify the key has not expired
- Ensure you have available credits

### Audio doesn't play
- Check browser audio permissions
- Try a different voice in settings
- Verify the text isn't too long (>5000 chars may timeout)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) file

## Acknowledgments

- [ElevenLabs](https://elevenlabs.io) for voice synthesis
- [Anthropic](https://anthropic.com) for Claude API
- Shema Bible Translation for the Tripod Method
- YWAM Kansas City / University of the Nations

---

**Built for oral communities. Preserving the Word in voice.**
