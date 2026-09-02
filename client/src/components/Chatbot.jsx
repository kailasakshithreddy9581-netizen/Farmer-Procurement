import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Mic, MicOff, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { translations, languagesList, chatbotResponses, getChatbotReply } from '../languages';
import '../styles/Chatbot.css';

function Chatbot({ language = 'en' }) {
  const t = translations[language] || translations.en;
  const currentLangObj = languagesList.find((l) => l.code === language) || languagesList[0];
  const speechCode = currentLangObj.speechCode || 'en-IN';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [listeningStatus, setListeningStatus] = useState('');
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize or update initial greeting when language changes
  useEffect(() => {
    const responses = chatbotResponses[language] || chatbotResponses.en;
    const initialGreeting = responses.greetings[0];
    setMessages([
      {
        id: 'init-1',
        type: 'bot',
        text: initialGreeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [language]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Text to Speech (TTS)
  const speakText = (text) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // cancel any previous utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechCode;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Try to find native regional voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang === speechCode || v.lang.startsWith(language));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  // Voice Recognition (STT)
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setListeningStatus('');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t.voiceNotSupported || 'Voice recognition is not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechCode;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setListeningStatus(t.voiceListening || 'Listening...');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setListeningStatus('');
        if (transcript && transcript.trim()) {
          handleSendMessage(transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setListeningStatus('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setListeningStatus('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setListeningStatus('');
    }
  };

  const handleSendMessage = (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMessage = {
      id: 'msg-' + Date.now(),
      type: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const replyText = getChatbotReply(query, language);
    const botMessage = {
      id: 'bot-' + Date.now(),
      type: 'bot',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput('');
    speakText(replyText);
  };

  const quickPrompts = [
    { label: '🌾 MSP Rates', query: 'MSP price rates' },
    { label: '📅 Book Slot', query: 'How to book a slot?' },
    { label: '📊 Queue Token', query: 'Check queue status and wait time' },
    { label: '💳 Payment', query: 'Payment and DBT process' },
    { label: '📞 Helpline', query: 'Kisan helpline number' }
  ];

  return (
    <div className="chatbot-root">
      {/* Floating Action Button */}
      <motion.button
        className="chatbot-fab"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Toggle AI Assistant"
      >
        <MessageSquare size={26} />
        {!isOpen && <span className="fab-badge">AI</span>}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-modal"
            initial={{ opacity: 0, y: 25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="chatbot-header">
              <div className="header-info">
                <div className="bot-avatar">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h4>{t.chatbotTitle || '🌾 Krishi Sahayak'}</h4>
                  <span className="online-indicator">
                    <span className="dot"></span> {currentLangObj.flag} {currentLangObj.nativeName} (Active)
                  </span>
                </div>
              </div>

              <div className="header-actions">
                <button
                  type="button"
                  onClick={() => {
                    if (voiceEnabled) window.speechSynthesis?.cancel();
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  className={`icon-btn ${voiceEnabled ? 'active' : 'muted'}`}
                  title={voiceEnabled ? 'Mute Voice' : 'Enable Voice'}
                >
                  {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="icon-btn close-btn"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="quick-chips-bar">
              {quickPrompts.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip.query)}
                  className="chip-btn"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Messages List */}
            <div className="chatbot-messages-area">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-row ${msg.type === 'user' ? 'user-row' : 'bot-row'}`}
                >
                  <div className={`message-bubble ${msg.type}`}>
                    <p>{msg.text}</p>
                    <span className="message-timestamp">{msg.time}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Listening Banner */}
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="listening-banner"
              >
                <span className="pulse-ring"></span>
                <span>{listeningStatus || 'Listening in ' + currentLangObj.name + '... Speak now'}</span>
              </motion.div>
            )}

            {/* Input Bar */}
            <div className="chatbot-input-bar">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={t.chatPlaceholder || 'Ask anything or use voice...'}
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`voice-record-btn ${isListening ? 'recording' : ''}`}
                title="Voice Input"
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!input.trim()}
                className="send-message-btn"
                title="Send Message"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Chatbot;
