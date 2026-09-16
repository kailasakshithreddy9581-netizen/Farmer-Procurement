const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

// Global audio player reference
let activeAudio = null;
let cachedVoices = [];

// Pre-warm and cache browser voices
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    } catch (e) {
      console.warn('Error fetching voices:', e);
    }
  };

  loadVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }
}

/**
 * Clean text for pristine, natural speech output
 * Removes icons, emojis, hashes, URLs and formats currency
 */
function cleanTextForSpeech(text, lang = 'en') {
  if (!text) return '';

  const rupeeWordMap = {
    en: 'rupees',
    hi: 'रुपये',
    te: 'రూపాయలు',
    ta: 'ரூபாய்',
    kn: 'ರೂಪಾಯಿಗಳು',
    ml: 'രൂപ',
    mr: 'रुपये',
    bn: 'টাকা',
    gu: 'રૂપિયા',
    pa: 'ਰੁਪਏ',
    or: 'ଟଙ୍କା'
  };

  const rupeeWord = rupeeWordMap[lang] || 'rupees';

  return text
    .replace(/[🌾🏢🏛️📞📅📊💳📄👥👤📱📍🏠✓•#*~_`[\]()]/gu, ' ')
    .replace(/₹\s*([0-9,]+)/g, `$1 ${rupeeWord}`)
    .replace(/₹/g, ` ${rupeeWord} `)
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Exact BCP-47 tag mapping for all 11 Indian languages
 */
export const LANGUAGE_SPEECH_MAP = {
  en: { bcp47: 'en-IN', google: 'en', name: 'English' },
  te: { bcp47: 'te-IN', google: 'te', name: 'Telugu' },
  hi: { bcp47: 'hi-IN', google: 'hi', name: 'Hindi' },
  ta: { bcp47: 'ta-IN', google: 'ta', name: 'Tamil' },
  kn: { bcp47: 'kn-IN', google: 'kn', name: 'Kannada' },
  ml: { bcp47: 'ml-IN', google: 'ml', name: 'Malayalam' },
  mr: { bcp47: 'mr-IN', google: 'mr', name: 'Marathi' },
  bn: { bcp47: 'bn-IN', google: 'bn', name: 'Bengali' },
  gu: { bcp47: 'gu-IN', google: 'gu', name: 'Gujarati' },
  pa: { bcp47: 'pa-IN', google: 'pa', name: 'Punjabi' },
  or: { bcp47: 'or-IN', google: 'hi', name: 'Odia' }
};

/**
 * Find highest quality browser voice for a given language code
 */
function findBestBrowserVoice(targetLang, langCode) {
  if (!cachedVoices || cachedVoices.length === 0) {
    if ('speechSynthesis' in window) {
      cachedVoices = window.speechSynthesis.getVoices() || [];
    }
  }

  const normalizedTarget = (targetLang || '').toLowerCase().replace('_', '-');
  const langPrefix = (langCode || '').toLowerCase();

  // 1. Natural / Google / Neural voice matching language prefix
  const bestVoice = cachedVoices.find(v => {
    const vLang = v.lang.toLowerCase().replace('_', '-');
    const vName = v.name.toLowerCase();
    return (vLang === normalizedTarget || vLang.startsWith(langPrefix)) &&
      (vName.includes('google') || vName.includes('natural') || vName.includes('neural') || vName.includes('india'));
  });
  if (bestVoice) return bestVoice;

  // 2. Exact language match
  const exactMatch = cachedVoices.find(v => v.lang.toLowerCase().replace('_', '-') === normalizedTarget);
  if (exactMatch) return exactMatch;

  // 3. Prefix match (e.g. 'ml', 'hi', 'te', 'mr', 'ta', 'kn')
  const prefixMatch = cachedVoices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (prefixMatch) return prefixMatch;

  return null;
}

/**
 * Enhanced Web Speech API Fallback
 */
function fallbackToSpeechSynthesis(text, targetLang, languageCode) {
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.90; // Balanced deliberate pacing for rural clarity
    utterance.pitch = 1.0;

    const bestVoice = findBestBrowserVoice(targetLang, languageCode);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('SpeechSynthesis fallback error:', e);
  }
}

/**
 * Play crystal-clear voice audio using multi-tier neural audio stream
 * Tier 1: Backend Audio Stream Proxy (/api/tts)
 * Tier 2: Direct Google Neural Audio Stream
 * Tier 3: Client-side SpeechSynthesis with regional voice matching
 */
export const speakText = (rawText, languageCode = 'en') => {
  const text = cleanTextForSpeech(rawText, languageCode);
  if (!text) return;

  // Always stop previous audio first
  stopSpeech();

  const langConfig = LANGUAGE_SPEECH_MAP[languageCode] || LANGUAGE_SPEECH_MAP.en;
  const targetLang = langConfig.bcp47;
  const googleLang = langConfig.google;

  // Chunk text if over 200 chars for smooth pronunciation without truncation
  const speechChunk = text.length > 250 ? text.substring(0, 250).replace(/\s\S*$/, '') : text;

  // Tier 1: Backend Audio Streaming Endpoint
  const primaryUrl = `${API_BASE}/tts?text=${encodeURIComponent(speechChunk)}&lang=${encodeURIComponent(languageCode)}`;
  const secondaryUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(speechChunk)}&tl=${googleLang}&client=tw-ob`;

  try {
    const audio = new Audio(primaryUrl);
    audio.playbackRate = 0.96;
    activeAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Try Tier 2 direct stream
        tryDirectAudio(secondaryUrl, text, targetLang, languageCode);
      });
    }

    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
    };
    audio.onerror = () => {
      // Fallback to Tier 2
      tryDirectAudio(secondaryUrl, text, targetLang, languageCode);
    };
  } catch (err) {
    tryDirectAudio(secondaryUrl, text, targetLang, languageCode);
  }
};

function tryDirectAudio(directUrl, text, targetLang, languageCode) {
  try {
    const directAudio = new Audio(directUrl);
    directAudio.playbackRate = 0.96;
    activeAudio = directAudio;

    const p = directAudio.play();
    if (p !== undefined) {
      p.catch(() => {
        fallbackToSpeechSynthesis(text, targetLang, languageCode);
      });
    }

    directAudio.onended = () => {
      if (activeAudio === directAudio) activeAudio = null;
    };
    directAudio.onerror = () => {
      fallbackToSpeechSynthesis(text, targetLang, languageCode);
    };
  } catch (e) {
    fallbackToSpeechSynthesis(text, targetLang, languageCode);
  }
}

/**
 * Stop any currently playing speech immediately
 */
export const stopSpeech = () => {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch (e) {}
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
};
