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
 * Removes icons, emojis, hashes, URLs and excessive symbols
 */
function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[🌾🏢🏛️📞📅📊💳📄👥👤📱📍🏠✓•#*~_`[\]()]/gu, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

  // 1. Exact match with premium / natural / google in name
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

  // 3. Prefix match (e.g. 'ml', 'hi', 'te')
  const prefixMatch = cachedVoices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
  if (prefixMatch) return prefixMatch;

  return null;
}

/**
 * Play crystal-clear voice audio using High-Definition Neural Audio Stream
 * Falls back to enhanced Web SpeechSynthesis if network is unavailable.
 */
export const speakText = (rawText, languageCode = 'en') => {
  const text = cleanTextForSpeech(rawText);
  if (!text) return;

  // Always stop previous audio first
  stopSpeech();

  const langMap = {
    en: 'en-IN',
    te: 'te-IN',
    hi: 'hi-IN',
    ta: 'ta-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    mr: 'mr-IN',
    bn: 'bn-IN',
    gu: 'gu-IN',
    pa: 'pa-IN',
    or: 'or-IN'
  };

  const targetLang = langMap[languageCode] || 'en-IN';

  // Strategy 1: High-Definition Neural Audio Stream via Backend API / Google TTS
  // This provides 100% crystal-clear, authentic regional studio pronunciation
  // especially for Malayalam, Telugu, Hindi, Tamil, Kannada, etc.
  try {
    const audioUrl = `${API_BASE}/tts?text=${encodeURIComponent(text.slice(0, 280))}&lang=${encodeURIComponent(languageCode)}`;
    const audio = new Audio(audioUrl);
    audio.playbackRate = 0.94; // slightly relaxed for optimal clarity
    activeAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to SpeechSynthesis
        fallbackToSpeechSynthesis(text, targetLang, languageCode);
      });
    }

    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
    };
    audio.onerror = () => {
      fallbackToSpeechSynthesis(text, targetLang, languageCode);
    };
  } catch (err) {
    fallbackToSpeechSynthesis(text, targetLang, languageCode);
  }
};

/**
 * Enhanced Web Speech API Fallback
 */
function fallbackToSpeechSynthesis(text, targetLang, languageCode) {
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.88; // Slow, deliberate, clear pacing for rural clarity
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

