import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, Clock, ArrowRight, ShieldCheck, Banknote, Sparkles } from 'lucide-react';
import { translations } from '../languages';
import '../styles/PaymentStatus.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function PaymentStatus({ farmerId, language = 'en' }) {
  const t = translations[language] || translations.en;

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    fetchBookingsAndPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookingsAndPayments = async () => {
    try {
      const bookingsResponse = await axios.get(
        `${API_BASE}/bookings/farmer/${farmerId}`
      );
      setBookings(bookingsResponse.data || []);

      // Fetch payment status for each booking
      bookingsResponse.data.forEach((booking) => {
        fetchPaymentStatus(booking._id);
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    }
  };

  const fetchPaymentStatus = async (bookingId) => {
    try {
      const response = await axios.get(
        `${API_BASE}/payments/booking/${bookingId}`
      );
      setPayments((prev) => ({
        ...prev,
        [bookingId]: response.data
      }));
    } catch (error) {
      console.error('Error fetching payment:', error);
    }
  };

  const handlePayment = async (bookingId) => {
    setProcessingPayment(bookingId);
    try {
      const txId = 'DBT-GOV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const response = await axios.post(`${API_BASE}/payments/process`, {
        bookingId,
        amount: 23000, // standard procurement batch amount
        transactionId: txId
      });

      if (response.data.success) {
        fetchPaymentStatus(bookingId);
      }
    } catch (error) {
      alert('Payment processing failed: ' + error.response?.data?.message);
    } finally {
      setProcessingPayment(null);
    }
  };

  if (loading) {
    return (
      <div className="payment-loading">
        <div className="spinner"></div>
        <p>Loading direct benefit transfer records...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="payment-container"
    >
      <div className="payment-header">
        <div className="header-icon-wrap">
          <CreditCard size={32} />
        </div>
        <div>
          <h1>{t.payment}</h1>
          <p>Direct Benefit Transfer (DBT) & Grain MSP Settlement</p>
        </div>
      </div>

      {/* MSP Reference Card */}
      <div className="msp-info-box">
        <div className="msp-info-header">
          <Sparkles size={18} />
          <strong>Direct MSP Transfer Guarantee</strong>
        </div>
        <p>Funds are deposited directly into your linked bank account via PFMS/DBT upon procurement slip generation.</p>
      </div>

      {bookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="no-payments-card"
        >
          <Clock size={44} />
          <h3>{t.noBookings}</h3>
          <p className="sub-text">Once you book a slot and complete grain procurement at the mandi, your payment receipt will appear here.</p>
        </motion.div>
      ) : (
        <div className="payments-list">
          {bookings.map((booking, index) => {
            const payment = payments[booking._id];
            const slot = booking.slotId;
            const isPaid = payment?.status === 'completed';
            const isProcessing = processingPayment === booking._id;

            return (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`payment-card ${isPaid ? 'paid' : 'pending'}`}
              >
                <div className="payment-card-top">
                  <div className="slot-summary">
                    <span className="date-tag">📅 {slot?.date}</span>
                    <h3>{slot?.center || 'Mandi Center'}</h3>
                    <p className="time-tag">Time: {slot?.time}</p>
                  </div>

                  <div className="payment-badge-wrap">
                    {isPaid ? (
                      <span className="status-badge paid">
                        <CheckCircle size={16} /> {t.paid}
                      </span>
                    ) : (
                      <span className="status-badge pending">
                        <Clock size={16} /> {t.unpaid}
                      </span>
                    )}
                  </div>
                </div>

                <div className="payment-breakdown">
                  <div className="breakdown-item">
                    <span className="label">{t.amount}</span>
                    <strong className="value highlight">₹23,000</strong>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">{t.transactionId}</span>
                    <strong className="value code">
                      {payment?.transactionId || 'Pending Verification'}
                    </strong>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Settlement Mode</span>
                    <strong className="value">
                      <ShieldCheck size={14} className="inline-icon" /> Direct DBT Bank
                    </strong>
                  </div>
                </div>

                {!isPaid && (
                  <div className="payment-action-bar">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePayment(booking._id)}
                      disabled={isProcessing}
                      className="claim-pay-btn"
                    >
                      <Banknote size={18} />
                      <span>{isProcessing ? 'Processing DBT Transfer...' : `${t.payNow}`}</span>
                      <ArrowRight size={16} />
                    </motion.button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default PaymentStatus;
