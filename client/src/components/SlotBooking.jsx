import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, CheckCircle2, AlertCircle, PhoneCall, Sparkles } from 'lucide-react';
import VoiceSpeakerBtn from './VoiceSpeakerBtn';
import IVRBookingModal from './IVRBookingModal';
import { translations } from '../languages';
import '../styles/SlotBooking.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function SlotBooking({ farmerId, language = 'en' }) {
  const t = translations[language] || translations.en;

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [ivrModalOpen, setIvrModalOpen] = useState(false);

  useEffect(() => {
    fetchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSlots = async () => {
    try {
      const response = await axios.get(`${API_BASE}/slots`);
      setSlots(response.data || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const handleBookSlot = async (slot) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await axios.post(`${API_BASE}/bookings/create`, {
        farmerId,
        slotId: slot._id
      });
      if (response.data.success) {
        setSelectedSlot(slot);
        setBooked(true);
        setBookingMessage(response.data.message || t.bookedSuccessfully || 'Slot booked successfully!');
        fetchSlots(); // Refresh capacities
        setTimeout(() => setBooked(false), 5000);
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Booking failed. Please try another slot.');
    } finally {
      setLoading(false);
    }
  };

  const getSlotAudioText = (slot) => {
    if (language === 'te') {
      return `తేదీ ${slot.date}, సమయం ${slot.time}, కేంద్రం ${slot.center}, పంట ${slot.crop}. ఈ స్లాట్‌ను బుక్ చేయడానికి బటన్‌పై నొక్కండి.`;
    }
    if (language === 'hi') {
      return `दिनांक ${slot.date}, समय ${slot.time}, खरीद केंद्र ${slot.center}, फसल ${slot.crop}। इस स्लॉट को बुक करने के लिए बटन दबाएं।`;
    }
    return `Procurement slot on date ${slot.date}, time ${slot.time} at ${slot.center} for crop ${slot.crop}. Tap to book this slot.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="slot-booking-container"
    >
      {/* Header */}
      <div className="booking-header">
        <div className="header-icon-wrap">
          <Calendar size={32} />
        </div>
        <div className="header-text-with-voice">
          <div>
            <h1>{t.selectSlot}</h1>
            <p>{t.tagline}</p>
          </div>
          <VoiceSpeakerBtn
            text={
              language === 'te'
                ? 'ధాన్య సేకరణ స్లాట్ బుకింగ్. మీకు నచ్చిన కేంద్రం, తేదీ మరియు సమయాన్ని ఎంచుకుని బుక్ చేసుకోండి.'
                : language === 'hi'
                ? 'फसल खरीद स्लॉट बुकिंग। अपनी सुविधानुसार खरीद केंद्र, तिथि और समय चुनें।'
                : 'Select a procurement slot to bring your crops to the mandi.'
            }
            language={language}
            size={18}
          />
        </div>
      </div>

      {/* Non-Smartphone IVR Helpline Banner */}
      <div className="ivr-cta-banner">
        <div className="ivr-banner-left">
          <div className="ivr-icon-circle">
            <PhoneCall size={22} />
          </div>
          <div>
            <h4>{t.ivrTollFree || '📞 Phone Dial-in Slot Booking (No Smartphone Required)'}</h4>
            <p>
              {t.ivrSubtitle ||
                'Farmers without a smartphone can book slots by dialing toll-free 1800-890-2026.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIvrModalOpen(true)}
          className="dial-ivr-btn"
        >
          <PhoneCall size={16} />
          <span>{t.dialNow || 'Dial Toll-Free (1800-890-2026)'}</span>
        </button>
      </div>

      {booked && selectedSlot && (
        <motion.div
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="booking-success-alert"
        >
          <CheckCircle2 size={24} />
          <div className="success-msg-content">
            <h3>{bookingMessage}</h3>
            <p>
              📅 {selectedSlot.date} | ⏰ {selectedSlot.time} | 📍 {selectedSlot.center}
            </p>
          </div>
          <VoiceSpeakerBtn
            text={
              language === 'te'
                ? `స్లాట్ విజయవంతంగా బుక్ చేయబడింది! తేదీ ${selectedSlot.date}, సమయం ${selectedSlot.time}, కేంద్రం ${selectedSlot.center}.`
                : `Slot booked successfully on ${selectedSlot.date} at ${selectedSlot.center}.`
            }
            language={language}
          />
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="alert alert-error"
        >
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {/* Slots Grid */}
      <div className="slots-grid">
        {slots.map((slot, index) => {
          const isFull = slot.bookedCount >= slot.capacity;
          const percentage = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));
          const audioText = getSlotAudioText(slot);

          return (
            <motion.div
              key={slot._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`slot-card ${isFull ? 'full' : ''}`}
            >
              <div className="slot-header">
                <span className="date-badge">📅 {slot.date}</span>
                <span className="time-badge">⏰ {slot.time}</span>
                {/* Voice Speaker for illiterate farmer */}
                <VoiceSpeakerBtn
                  text={audioText}
                  language={language}
                  size={15}
                  label="Listen slot details"
                />
              </div>

              <div className="slot-center-row">
                <MapPin size={16} />
                <span>{slot.center}</span>
              </div>

              <div className="slot-crop-badge">
                <Sparkles size={14} />
                <span>Crop: <strong>{slot.crop || 'Paddy (Common)'}</strong></span>
              </div>

              <div className="slot-capacity">
                <div className="capacity-labels">
                  <span>
                    <Users size={14} /> {t.capacity}
                  </span>
                  <span>
                    {slot.bookedCount} / {slot.capacity}
                  </span>
                </div>
                <div className="capacity-bar">
                  <div
                    className={`capacity-fill ${percentage > 80 ? 'high' : ''}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: isFull ? 1 : 1.02 }}
                whileTap={{ scale: isFull ? 1 : 0.98 }}
                onClick={() => handleBookSlot(slot)}
                disabled={loading || isFull || booked}
                className={`book-btn ${isFull ? 'disabled' : ''}`}
              >
                {isFull
                  ? 'Slot Full'
                  : loading
                  ? 'Processing...'
                  : `✓ ${t.bookSlot}`}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {slots.length === 0 && (
        <div className="no-slots-card">
          <AlertCircle size={36} />
          <p>{t.noSlots}</p>
        </div>
      )}

      {/* Interactive Telephone IVR Modal */}
      <IVRBookingModal
        isOpen={ivrModalOpen}
        onClose={() => setIvrModalOpen(false)}
        language={language}
        onBookingSuccess={() => fetchSlots()}
      />
    </motion.div>
  );
}

export default SlotBooking;
