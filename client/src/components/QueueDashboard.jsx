import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Users, Clock, AlertCircle, Sparkles, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import io from 'socket.io-client';
import { translations } from '../languages';
import '../styles/QueueDashboard.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET || 'http://localhost:5000';

function QueueDashboard({ farmerId, language = 'en' }) {
  const t = translations[language] || translations.en;
  
  const [bookings, setBookings] = useState([]);
  const [queues, setQueues] = useState({});
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchBookings();
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('queue-update', () => {
      fetchBookings();
    });

    return () => newSocket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE}/bookings/farmer/${farmerId}`);
      setBookings(response.data || []);

      // Fetch queue info for each booking
      response.data.forEach((booking) => {
        if (booking.slotId?._id) {
          fetchQueueInfo(booking.slotId._id);
        }
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    }
  };

  const fetchQueueInfo = async (slotId) => {
    try {
      const response = await axios.get(`${API_BASE}/queue/${slotId}`);
      setQueues((prev) => ({
        ...prev,
        [slotId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  };

  if (loading) {
    return (
      <div className="queue-loading">
        <div className="spinner"></div>
        <p>Connecting to live queue stream...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="queue-container"
    >
      <div className="queue-header">
        <div className="header-icon-wrap">
          <Users size={32} />
        </div>
        <div>
          <h1>{t.queueStatus}</h1>
          <p className="live-status-pill">
            <span className="live-dot"></span> {t.liveQueueUpdates}
          </p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="no-bookings-card"
        >
          <AlertCircle size={44} />
          <h3>{t.noBookings}</h3>
          <p className="sub-text">Please book an appointment slot at a procurement center to receive your live digital queue token.</p>
        </motion.div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking, index) => {
            const queueInfo = queues[booking.slotId?._id];
            const slot = booking.slotId;
            const aheadCount = Math.max(0, (booking.queuePosition || 1) - 1);
            const estWaitMins = aheadCount * 8; // 8 mins per farmer avg

            return (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`booking-card ${booking.status}`}
              >
                <div className="booking-top">
                  <div className="slot-meta">
                    <span className="token-chip">Token #{booking.queuePosition || 1}</span>
                    <h3>
                      <Calendar size={16} /> {slot?.date} • {slot?.time}
                    </h3>
                    <p className="center-name">
                      <MapPin size={14} /> {slot?.center}
                    </p>
                  </div>

                  <div className="status-badge-wrap">
                    <span className={`status-pill ${booking.status}`}>
                      <CheckCircle2 size={14} />
                      {booking.status === 'confirmed' ? t.confirmed : booking.status === 'completed' ? t.completed : t.pending}
                    </span>
                  </div>
                </div>

                <div className="queue-metrics-grid">
                  <div className="metric-box">
                    <Sparkles size={20} className="metric-icon" />
                    <div>
                      <span className="metric-label">{t.queuePosition}</span>
                      <strong className="metric-val highlight">
                        #{booking.queuePosition}
                      </strong>
                    </div>
                  </div>

                  <div className="metric-box">
                    <Users size={20} className="metric-icon" />
                    <div>
                      <span className="metric-label">{t.totalInQueue}</span>
                      <strong className="metric-val">
                        {queueInfo?.totalInQueue || 1} Farmers
                      </strong>
                    </div>
                  </div>

                  <div className="metric-box">
                    <Clock size={20} className="metric-icon" />
                    <div>
                      <span className="metric-label">{t.estimatedWait}</span>
                      <strong className="metric-val">
                        ~{estWaitMins} mins
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="queue-progress-section">
                  <div className="progress-labels">
                    <span>Queue Progress</span>
                    <span>{aheadCount === 0 ? 'Your turn next!' : `${aheadCount} ahead`}</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill-bar"
                      style={{
                        width: `${Math.min(100, Math.max(15, 100 - (aheadCount * 15)))}%`
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default QueueDashboard;
