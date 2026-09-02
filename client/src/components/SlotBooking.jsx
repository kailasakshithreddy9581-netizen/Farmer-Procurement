import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, CheckCircle2, AlertCircle } from 'lucide-react';
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
        fetchSlots(); // Refresh slot capacities
        setTimeout(() => setBooked(false), 4000);
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Booking failed. Please try another slot.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="slot-booking-container"
    >
      <div className="booking-header">
        <div className="header-icon-wrap">
          <Calendar size={32} />
        </div>
        <div>
          <h1>{t.selectSlot}</h1>
          <p>{t.tagline}</p>
        </div>
      </div>

      {booked && selectedSlot && (
        <motion.div
          initial={{ y: -15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="booking-success-alert"
        >
          <CheckCircle2 size={24} />
          <div>
            <h3>{bookingMessage}</h3>
            <p>
              📅 {selectedSlot.date} | ⏰ {selectedSlot.time} | 📍 {selectedSlot.center}
            </p>
          </div>
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

      <div className="slots-grid">
        {slots.map((slot, index) => {
          const isFull = slot.bookedCount >= slot.capacity;
          const percentage = Math.min(100, Math.round((slot.bookedCount / slot.capacity) * 100));

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
              </div>

              <div className="slot-center-row">
                <MapPin size={16} />
                <span>{slot.center}</span>
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
    </motion.div>
  );
}

export default SlotBooking;
