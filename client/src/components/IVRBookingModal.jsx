import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneCall, PhoneOff, CheckCircle2, AlertCircle, Volume2, Sparkles, X } from 'lucide-react';
import { speakText, stopSpeech } from '../utils/speech';
import { translations } from '../languages';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function IVRBookingModal({ isOpen, onClose, language = 'en', onBookingSuccess }) {
  const t = translations[language] || translations.en;

  const [callActive, setCallActive] = useState(false);
  const [callStep, setCallStep] = useState(1); // 1: Dialing/Language, 2: Mobile Number, 3: Crop Choice, 4: Confirmed
  const [dialpadInput, setDialpadInput] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');

  useEffect(() => {
    if (!isOpen) {
      handleEndCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleStartCall = () => {
    setCallActive(true);
    setCallStep(1);
    setDialpadInput('');
    setErrorMessage('');
    setConfirmedBooking(null);

    const promptText =
      language === 'te'
        ? 'రైతు ధాన్య సేకరణ టోల్‌ఫ్రీ సేవకు స్వాగతం. తెలుగు కొరకు 1 నొక్కండి, హిందీ కొరకు 2, ఇంగ్లీష్ కొరకు 3 నొక్కండి.'
        : language === 'hi'
        ? 'किसान खरीद टोल-फ्री सेवा में आपका स्वागत है। तेलुगु के लिए 1, हिंदी के लिए 2, अंग्रेजी के लिए 3 दबाएं।'
        : 'Welcome to Kisan Procurement IVR Toll-Free service. For Telugu press 1, for Hindi press 2, for English press 3.';

    setCurrentPrompt(promptText);
    speakText(promptText, language);
  };

  const handleEndCall = () => {
    setCallActive(false);
    setCallStep(1);
    setDialpadInput('');
    stopSpeech();
  };

  const handleDialpadPress = (digit) => {
    if (!callActive) return;

    if (callStep === 1) {
      // Language choice pressed -> Move to Mobile Number
      setCallStep(2);
      setDialpadInput('');
      const promptText =
        language === 'te'
          ? 'దయచేసి మీ 10 అంకెల మొబైల్ నంబర్‌ను డయల్ ప్యాడ్ ద్వారా నమోదు చేసి # కీ నొక్కండి.'
          : language === 'hi'
          ? 'कृपया अपने 10 अंकों का मोबाइल नंबर डायलपैड से दर्ज करें और # दबाएं।'
          : 'Please enter your 10-digit mobile number using the dialpad followed by the hash key.';

      setCurrentPrompt(promptText);
      speakText(promptText, language);
    } else if (callStep === 2) {
      // Entering mobile number
      if (digit === '#') {
        if (dialpadInput.length < 10) {
          const errText =
            language === 'te'
              ? 'దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి.'
              : language === 'hi'
              ? 'कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।'
              : 'Please enter a valid 10-digit mobile number.';
          setErrorMessage(errText);
          speakText(errText, language);
          return;
        }
        // Move to Crop selection
        setCallStep(3);
        setErrorMessage('');
        const promptText =
          language === 'te'
            ? 'పంటను ఎంచుకోండి: వరి ధాన్యం కొరకు 1, పత్తి కొరకు 2, మొక్కజొన్న కొరకు 3, గోధుమ కొరకు 4 నొక్కండి.'
            : language === 'hi'
            ? 'फसल चुनें: धान के लिए 1, कपास के लिए 2, मक्का के लिए 3, गेहूं के लिए 4 दबाएं।'
            : 'Select crop to sell: Press 1 for Paddy, Press 2 for Cotton, Press 3 for Maize, Press 4 for Wheat.';

        setCurrentPrompt(promptText);
        speakText(promptText, language);
      } else {
        if (dialpadInput.length < 10) {
          setDialpadInput((prev) => prev + digit);
        }
      }
    } else if (callStep === 3) {
      // Crop selected
      const cropMap = {
        '1': 'Paddy (Common)',
        '2': 'Cotton',
        '3': 'Maize',
        '4': 'Wheat'
      };
      const chosenCrop = cropMap[digit] || 'Paddy (Common)';
      setSelectedCrop(chosenCrop);
      submitIVRBooking(dialpadInput, digit, chosenCrop);
    }
  };

  const submitIVRBooking = async (farmerPhone, cropDigit, cropName) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/ivr/book-slot`, {
        phone: farmerPhone || '9876543210',
        cropChoice: cropDigit,
        centerCode: 'CENT-PAT-01'
      });

      if (res.data.success) {
        setConfirmedBooking(res.data);
        setCallStep(4);
        const confirmSpeech =
          language === 'te'
            ? `మీ స్లాట్ విజయవంతంగా బుక్ చేయబడింది! మీ క్యూ టోకెన్ నంబర్ #${res.data.queuePosition}. ఎస్ఎమ్ఎస్ మీ మొబైల్‌కు పంపబడింది.`
            : language === 'hi'
            ? `आपका स्लॉट सफलतापूर्वक बुक हो गया है! आपका टोकन नंबर #${res.data.queuePosition} है। एसएमएस आपके मोबाइल पर भेज दिया गया है।`
            : `Your procurement slot is confirmed! Your Queue Token number is #${res.data.queuePosition}. Confirmation SMS sent to your phone.`;

        setCurrentPrompt(confirmSpeech);
        speakText(confirmSpeech, language);

        if (onBookingSuccess) {
          onBookingSuccess(res.data);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'IVR booking failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ivr-modal-backdrop" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="ivr-phone-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ivr-modal-header">
          <div className="ivr-badge">
            <Phone size={18} />
            <span>Kisan Toll-Free Telephone (IVR)</span>
          </div>
          <button type="button" onClick={onClose} className="ivr-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Toll-Free Number Banner */}
        <div className="ivr-banner-card">
          <span className="toll-label">Government Toll-Free Booking Number:</span>
          <strong className="toll-number">📞 1800-890-2026</strong>
          <p className="toll-sub">
            Works from any basic mobile / button phone or landline without internet or smartphone.
          </p>
        </div>

        {/* Phone Device Screen & Dialer */}
        <div className="phone-device-container">
          {/* Top Status Bar */}
          <div className="device-screen">
            {!callActive ? (
              <div className="screen-idle">
                <div className="phone-icon-pulse">
                  <PhoneCall size={32} />
                </div>
                <h4>Ready to Call</h4>
                <p>Tap "Start Call" below to simulate or test telephone voice booking</p>
              </div>
            ) : (
              <div className="screen-in-call">
                <div className="call-live-header">
                  <span className="live-pill">● In Call: 1800-890-2026</span>
                  <button
                    type="button"
                    onClick={() => speakText(currentPrompt, language)}
                    className="repeat-audio-btn"
                    title="Repeat voice prompt"
                  >
                    <Volume2 size={16} /> Repeat Voice
                  </button>
                </div>

                <div className="voice-prompt-box">
                  <p>{currentPrompt}</p>
                </div>

                {callStep === 2 && (
                  <div className="typed-input-display">
                    <span className="input-label">Entered Mobile Number:</span>
                    <strong className="number-typed">
                      {dialpadInput || '• • • • • • • • • •'}
                    </strong>
                    <span className="hint-text">Type digits & press # to confirm</span>
                  </div>
                )}

                {callStep === 3 && (
                  <div className="crop-options-list">
                    <span>1: 🌾 Paddy (Common)</span>
                    <span>2: 🧵 Cotton</span>
                    <span>3: 🌽 Maize</span>
                    <span>4: 🌱 Wheat</span>
                  </div>
                )}

                {callStep === 4 && confirmedBooking && (
                  <div className="ivr-success-card">
                    <CheckCircle2 size={36} className="text-green" />
                    <h4>Slot Booked via Telephone!</h4>
                    <div className="token-highlight">
                      Token #{confirmedBooking.queuePosition}
                    </div>
                    <p className="small-text">
                      📍 {confirmedBooking.centerName} | 🌾 {confirmedBooking.crop}
                    </p>
                    <div className="sms-dispatched-tag">
                      📱 SMS sent to +91 {confirmedBooking.farmerPhone}
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="ivr-error-badge">
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dialpad Keys Grid */}
          <div className="dialpad-grid">
            {[
              { num: '1', sub: '.,' },
              { num: '2', sub: 'ABC' },
              { num: '3', sub: 'DEF' },
              { num: '4', sub: 'GHI' },
              { num: '5', sub: 'JKL' },
              { num: '6', sub: 'MNO' },
              { num: '7', sub: 'PQRS' },
              { num: '8', sub: 'TUV' },
              { num: '9', sub: 'WXYZ' },
              { num: '*', sub: '' },
              { num: '0', sub: '+' },
              { num: '#', sub: 'Enter' }
            ].map((k) => (
              <motion.button
                key={k.num}
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={() => handleDialpadPress(k.num)}
                disabled={!callActive || callStep === 4}
                className="dial-key-btn"
              >
                <span className="key-num">{k.num}</span>
                {k.sub && <span className="key-sub">{k.sub}</span>}
              </motion.button>
            ))}
          </div>

          {/* Call / Hangup Buttons */}
          <div className="call-actions-row">
            {!callActive ? (
              <button
                type="button"
                onClick={handleStartCall}
                className="start-call-btn"
              >
                <PhoneCall size={20} />
                <span>Start Toll-Free Call (1800-890-2026)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEndCall}
                className="end-call-btn"
              >
                <PhoneOff size={20} />
                <span>End Call</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default IVRBookingModal;
