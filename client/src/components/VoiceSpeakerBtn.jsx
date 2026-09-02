import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { speakText } from '../utils/speech';

function VoiceSpeakerBtn({ text, language = 'en', label = 'Listen', size = 16, className = '' }) {
  const [speaking, setSpeaking] = useState(false);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSpeaking(true);
    speakText(text, language);
    setTimeout(() => setSpeaking(false), 3000);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`voice-speaker-btn ${speaking ? 'active-speaking' : ''} ${className}`}
      title={label || 'Click to hear audio'}
      aria-label={label}
    >
      <Volume2 size={size} />
      {speaking && <span className="sound-wave-dot"></span>}
    </button>
  );
}

export default VoiceSpeakerBtn;
