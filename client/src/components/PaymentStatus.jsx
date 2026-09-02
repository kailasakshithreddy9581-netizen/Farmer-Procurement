import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  Landmark,
  FileCheck2,
  Calendar
} from 'lucide-react';
import VoiceSpeakerBtn from './VoiceSpeakerBtn';
import { translations } from '../languages';
import '../styles/PaymentStatus.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function PaymentStatus({ farmerId, language = 'en' }) {
  const t = translations[language] || translations.en;

  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmerId) {
      fetchFarmerPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  const fetchFarmerPayments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/payments/farmer/${farmerId}`);
      setPaymentRecords(res.data.payments || []);
    } catch (error) {
      console.error('Error fetching farmer payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAudioDescription = (rec) => {
    const isPaid = rec.paymentStatus === 'completed' || rec.bookingStatus === 'completed';
    if (language === 'te') {
      if (isPaid) {
        return `మీ ${rec.quantityQuintals || 10} క్వింటాళ్ల ${rec.crop} పంటకు గాను ₹${(rec.totalAmount || 23000).toLocaleString('en-IN')} రూపాయల మొత్తం అడ్మిన్ ద్వారా మంజూరు చేయబడి మీ బ్యాంక్ ఖాతాకు విజయవంతంగా జమ చేయబడింది. లావాదేవీ నంబర్ ${rec.transactionId}.`;
      }
      return `మీ ${rec.crop} పంట ధాన్య సేకరణకు ₹${(rec.totalAmount || 23000).toLocaleString('en-IN')} రూపాయల చెల్లింపు ప్రక్రియలో ఉంది. అడ్మిన్ తనిఖీ పూర్తయిన వెంటనే మీ బ్యాంకు ఖాతాకు జమ అవుతుంది.`;
    }
    if (language === 'hi') {
      if (isPaid) {
        return `आपकी ${rec.quantityQuintals || 10} क्विंटल ${rec.crop} फसल का ₹${(rec.totalAmount || 23000).toLocaleString('en-IN')} रुपये का भुगतान खरीद अधिकारी द्वारा स्वीकृत होकर सीधे आपके बैंक खाते में भेजा जा चुका है।`;
      }
      return `आपकी ${rec.crop} फसल का ₹${(rec.totalAmount || 23000).toLocaleString('en-IN')} रुपये का भुगतान प्रक्रियाधीन है।`;
    }
    // Default English
    if (isPaid) {
      return `Your payment of ₹${(rec.totalAmount || 23000).toLocaleString('en-IN')} for ${rec.quantityQuintals || 10} quintals of ${rec.crop} has been sanctioned by procurement admin and credited to your bank account with Transaction ID ${rec.transactionId}.`;
    }
    return `Your payment of ₹${(rec.totalAmount || 23000).toLocaleString('en-IN')} for ${rec.crop} is awaiting procurement admin sanction.`;
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
      {/* Header */}
      <div className="payment-header">
        <div className="header-icon-wrap">
          <CreditCard size={32} />
        </div>
        <div className="header-text-with-voice">
          <div>
            <h1>{t.payment}</h1>
            <p>Direct Benefit Transfer (DBT) & Government MSP Settlements</p>
          </div>
          <VoiceSpeakerBtn
            text={
              language === 'te'
                ? 'రైతు చెల్లింపుల సమాచారం. మీ ధాన్యం విక్రయించిన తర్వాత ప్రభుత్వ మద్దతు ధర మొత్తం నేరుగా మీ బ్యాంక్ ఖాతాకు జమ అవుతుంది.'
                : language === 'hi'
                ? 'किसान भुगतान विवरण। फसल बेचने के बाद एमएसपी राशि सीधे आपके बैंक खाते में भेजी जाती है।'
                : 'Farmer payments tab. Track all your crop sales and direct DBT bank transfers.'
            }
            language={language}
            label="Listen payment info"
          />
        </div>
      </div>

      {/* Direct Benefit Transfer MSP Guarantee Notice */}
      <div className="msp-info-box">
        <div className="msp-info-header">
          <Sparkles size={18} />
          <strong>Direct MSP Transfer Guarantee (PFMS / DBT)</strong>
        </div>
        <p>
          Once grain quality and weight are verified at the procurement centre, the Mandi Incharge sanctions your payment directly to your Aadhaar-linked bank account within 24–48 hours.
        </p>
      </div>

      {paymentRecords.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="no-payments-card"
        >
          <Clock size={44} />
          <h3>{t.noBookings}</h3>
          <p className="sub-text">
            Once you book a slot and bring your grain to the procurement center, your weighing slip and DBT bank payment receipts will appear here.
          </p>
          <VoiceSpeakerBtn
            text={
              language === 'te'
                ? 'ఇంకా ఎటువంటి చెల్లింపు రికార్డులు లేవు. స్లాట్ బుక్ చేసి ధాన్యం విక్రయించిన తర్వాత ఇక్కడ కనిపిస్తాయి.'
                : 'No payments found yet. Once you sell your crops at the mandi, your payment slip will appear here.'
            }
            language={language}
          />
        </motion.div>
      ) : (
        <div className="payments-list">
          {paymentRecords.map((rec, index) => {
            const isPaid = rec.paymentStatus === 'completed' || rec.bookingStatus === 'completed';
            const audioText = getAudioDescription(rec);

            return (
              <motion.div
                key={rec.bookingId || index}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`payment-card ${isPaid ? 'paid' : 'pending'}`}
              >
                {/* Top Row */}
                <div className="payment-card-top">
                  <div className="slot-summary">
                    <span className="date-tag">
                      <Calendar size={13} /> {rec.date}
                    </span>
                    <h3>{rec.centerName || 'APMC Procurement Center'}</h3>
                    <p className="crop-label-line">
                      🌾 <strong>{rec.crop}</strong> ({rec.qualityGrade || 'Grade A'})
                    </p>
                  </div>

                  <div className="payment-status-badge-wrap">
                    {/* Voice speaker for illiterate farmer */}
                    <VoiceSpeakerBtn
                      text={audioText}
                      language={language}
                      label="Listen payment status"
                      size={18}
                    />

                    {isPaid ? (
                      <span className="status-badge paid">
                        <CheckCircle2 size={16} /> {t.paid}
                      </span>
                    ) : (
                      <span className="status-badge pending">
                        <Clock size={16} /> {t.unpaid}
                      </span>
                    )}
                  </div>
                </div>

                {/* Financial Breakdown Grid */}
                <div className="payment-breakdown">
                  <div className="breakdown-item">
                    <span className="label">Quantity Sold</span>
                    <strong className="value">
                      {rec.quantityQuintals > 0 ? `${rec.quantityQuintals} Quintals` : '10 Quintals (Est.)'}
                    </strong>
                  </div>

                  <div className="breakdown-item">
                    <span className="label">MSP Rate Applied</span>
                    <strong className="value">₹{rec.mspRate}/q</strong>
                  </div>

                  <div className="breakdown-item">
                    <span className="label">Total Amount (₹)</span>
                    <strong className="value highlight text-green">
                      ₹{(rec.totalAmount || 23000).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div className="breakdown-item">
                    <span className="label">{t.transactionId}</span>
                    <strong className="value code">
                      {rec.transactionId || 'Awaiting Admin Sanction'}
                    </strong>
                  </div>

                  <div className="breakdown-item">
                    <span className="label">Linked Bank A/C</span>
                    <strong className="value">
                      <Landmark size={14} className="inline-icon" /> ••••
                      {rec.bankAccount?.slice(-4) || '8283'} ({rec.ifscCode})
                    </strong>
                  </div>

                  <div className="breakdown-item">
                    <span className="label">Settlement Mode</span>
                    <strong className="value">
                      <ShieldCheck size={14} className="inline-icon" /> Direct PFMS DBT
                    </strong>
                  </div>
                </div>

                {/* Bottom Verification Status */}
                <div className="payment-footer-meta">
                  {isPaid ? (
                    <div className="sanction-status-tag success">
                      <FileCheck2 size={16} />
                      <span>Payment sanctioned by Mandi Admin & Transferred to Bank</span>
                    </div>
                  ) : (
                    <div className="sanction-status-tag waiting">
                      <Clock size={16} />
                      <span>Grain verified. Procurement Admin will sanction DBT disbursement shortly.</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

export default PaymentStatus;
