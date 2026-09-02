import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, KeyRound, ArrowRight, RotateCw, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { translations } from '../languages';
import '../styles/Registration.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function FarmerLogin({ onLoginSuccess, onSwitchToRegister, language = 'en' }) {
  const t = translations[language] || translations.en;
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setError(t.phoneRequired || 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth/send-otp`, {
        phone: cleanPhone,
        purpose: 'login'
      });

      if (response.data.success) {
        setStep(2);
        setDemoOtp(response.data.otp);
        setResendTimer(30);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please check your number.';
      setError(msg);
      if (err.response?.status === 404) {
        // Not registered
        setTimeout(() => {
          if (onSwitchToRegister) onSwitchToRegister(cleanPhone);
        }, 2200);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setError(t.invalidOtp || 'Please enter the 6-digit OTP code');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth/verify-otp`, {
        phone: phone.trim(),
        otp: cleanOtp
      });

      if (response.data.success && response.data.farmerId) {
        onLoginSuccess(response.data.farmerId, response.data.farmer);
      } else {
        setError(response.data.message || 'OTP Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-wrapper">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="registration-card"
      >
        <div className="form-header">
          <div className="header-badge">
            <ShieldCheck size={18} />
            <span>{t.otpVerification}</span>
          </div>
          <h2>{t.login}</h2>
          <p className="subtitle">{t.tagline}</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="alert alert-error"
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </motion.div>
        )}

        {demoOtp && step === 2 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="alert alert-info demo-otp-box"
          >
            <CheckCircle2 size={18} />
            <div>
              <strong>{t.demoOtpBadge} </strong>
              <span className="otp-highlight">{demoOtp}</span>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleSendOtp}
              className="form-body"
            >
              <div className="form-group">
                <label>
                  <Phone size={16} /> {t.enterMobile} *
                </label>
                <div className="input-with-prefix">
                  <span className="prefix">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="submit-btn"
              >
                {loading ? (
                  <span>{t.sendingOtp}</span>
                ) : (
                  <>
                    <span>{t.sendOtp}</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleVerifyOtp}
              className="form-body"
            >
              <div className="phone-badge">
                <span>{t.otpSentTo}: <strong>+91 {phone}</strong></span>
                <button
                  type="button"
                  onClick={() => { setStep(1); setOtp(''); }}
                  className="edit-phone-btn"
                >
                  Edit
                </button>
              </div>

              <div className="form-group">
                <label>
                  <KeyRound size={16} /> {t.enterOtp} *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="otp-input"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="submit-btn"
              >
                {loading ? (
                  <span>{t.verifyingOtp}</span>
                ) : (
                  <>
                    <span>{t.verifyOtp}</span>
                    <CheckCircle2 size={18} />
                  </>
                )}
              </button>

              <div className="resend-container">
                {resendTimer > 0 ? (
                  <span className="timer-text">
                    Resend OTP in <strong>{resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="resend-btn"
                  >
                    <RotateCw size={14} /> {t.resendOtp}
                  </button>
                )}
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="form-footer">
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="switch-auth-btn"
          >
            {t.newFarmer} →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default FarmerLogin;
