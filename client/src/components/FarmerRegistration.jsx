import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  CreditCard,
  MapPin,
  Building,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  RotateCw,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import VoiceSpeakerBtn from './VoiceSpeakerBtn';
import { translations } from '../languages';
import '../styles/Registration.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function FarmerRegistration({ onRegistrationSuccess, onSwitchToLogin, language = 'en' }) {
  const t = translations[language] || translations.en;
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();

  const [step, setStep] = useState(1); // 1: Fill Registration Details, 2: Enter OTP
  const [formData, setFormData] = useState(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
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

  const handleDemoFill = () => {
    setValue('name', 'Ramesh Nair');
    setValue('phone', '9876543210');
    setValue('aadhar', '5421-9876-1234');
    setValue('address', 'Alathur Gramam, Palakkad District, Kerala - 678541');
    setValue('bankAccount', '987612345678');
    setValue('upi', 'ramesh@upi');
    setErrorMessage('');
  };

  // Step 1: Submit form details -> Request OTP directly to mobile number
  const onInitiateRegistration = async (data) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const cleanPhone = data.phone.trim();
      setFormData(data);

      const response = await axios.post(`${API_BASE}/auth/send-otp`, {
        phone: cleanPhone,
        purpose: 'farmer_register'
      });

      if (response.data.success) {
        const receivedOtp = response.data.otp || response.data.demoOtp || '123456';
        setStep(2);
        setDemoOtp(receivedOtp);
        setOtp(receivedOtp);
        setResendTimer(30);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to dispatch verification OTP. Please check your mobile number.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and finalize registration
  const handleVerifyFarmerOtp = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMessage(t.invalidOtp || 'Please enter the 6-digit OTP code received on your phone');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/farmers/register`, {
        ...formData,
        otp: cleanOtp
      });

      if (response.data.success) {
        setSuccessMessage(t.regSuccess || 'Registration successful! Welcome to the hub.');
        reset();
        setTimeout(() => {
          onRegistrationSuccess(response.data.farmerId, response.data.farmer);
        }, 1200);
      }
    } catch (error) {
      if (error.response?.data?.farmerId) {
        setSuccessMessage('Farmer profile verified & loaded successfully!');
        reset();
        setTimeout(() => {
          onRegistrationSuccess(error.response.data.farmerId, error.response.data.farmer);
        }, 1200);
        return;
      }
      const msg = error.response?.data?.message || 'OTP verification failed. Please check the code received on your handset.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || !formData?.phone) return;
    setErrorMessage('');
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/auth/send-otp`, {
        phone: formData.phone.trim(),
        purpose: 'farmer_register'
      });
      if (response.data?.success) {
        setDemoOtp(response.data.otp || response.data.demoOtp || '123456');
        setResendTimer(30);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to resend OTP.');
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
            {step === 1 ? <Sparkles size={18} /> : <ShieldCheck size={18} />}
            <span>{step === 1 ? 'Kisan DBT Registration' : 'Mobile Verification'}</span>
          </div>
          <div className="title-with-speaker">
            <h2>{step === 1 ? t.register : t.otpVerification}</h2>
            <VoiceSpeakerBtn
              text={
                step === 1
                  ? language === 'te'
                    ? 'రైతు నమోదు ఫారమ్. దయచేసి మీ పేరు, 10 అంకెల మొబైల్ నంబర్, గ్రామం మరియు బ్యాంక్ ఖాతా వివరాలను నమోదు చేయండి.'
                    : language === 'hi'
                    ? 'किसान पंजीकरण फॉर्म। कृपया अपना नाम, मोबाइल नंबर, गाँव और बैंक खाता दर्ज करें।'
                    : 'Farmer registration form. Please enter your name, mobile number, address, and bank details.'
                  : t.speakOtpPrompt
              }
              language={language}
              label="Listen instructions"
              size={18}
            />
          </div>
          <p className="subtitle">{t.tagline}</p>
        </div>

        {/* Demo Auto-Fill Shortcut (only on Step 1) */}
        {step === 1 && (
          <div
            style={{
              margin: '0 0 1rem 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              background: '#ecfdf5',
              border: '1.5px dashed #059669',
              borderRadius: '10px',
              padding: '0.65rem 0.95rem'
            }}
          >
            <button
              type="button"
              onClick={handleDemoFill}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: '#059669',
                border: 'none',
                color: '#ffffff',
                padding: '0.4rem 0.85rem',
                borderRadius: '7px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={16} /> ⚡ Fill Demo Farmer (9876543210)
            </button>
          </div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="alert alert-error"
          >
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {successMessage ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="alert alert-success"
          >
            <CheckCircle2 size={24} />
            <div>
              <h3>{t.regSuccess}</h3>
              <p>Preparing your dashboard & procurement slots...</p>
            </div>
          </motion.div>
        ) : step === 1 ? (
          /* Step 1: Farmer Registration Details Form */
          <form onSubmit={handleSubmit(onInitiateRegistration)} className="form-body">
            <div className="form-grid">
              {/* Full Name */}
              <div className="form-group">
                <div className="label-row-with-voice">
                  <label>
                    <User size={16} /> {t.fullName} *
                  </label>
                  <VoiceSpeakerBtn
                    text={t.speakNamePrompt}
                    language={language}
                    size={14}
                  />
                </div>
                <input
                  {...register('name', { required: 'Name is required' })}
                  placeholder="e.g. Ramesh Kumar"
                  className="form-input"
                  autoFocus
                />
                {errors.name && <span className="field-error">{errors.name.message}</span>}
              </div>

              {/* Mobile Phone */}
              <div className="form-group">
                <div className="label-row-with-voice">
                  <label>
                    <Phone size={16} /> {t.phone} *
                  </label>
                  <VoiceSpeakerBtn
                    text={t.speakMobilePrompt}
                    language={language}
                    size={14}
                  />
                </div>
                <div className="input-with-prefix">
                  <span className="prefix">+91</span>
                  <input
                    {...register('phone', {
                      required: '10-digit mobile number required',
                      pattern: { value: /^[0-9]{10}$/, message: 'Must be exact 10 digits' }
                    })}
                    type="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    className="form-input"
                  />
                </div>
                {errors.phone && <span className="field-error">{errors.phone.message}</span>}
              </div>
            </div>

            <div className="form-grid">
              {/* Aadhaar Number */}
              <div className="form-group">
                <div className="label-row-with-voice">
                  <label>
                    <CreditCard size={16} /> {t.aadhar}
                  </label>
                  <VoiceSpeakerBtn
                    text={t.speakAadharPrompt}
                    language={language}
                    size={14}
                  />
                </div>
                <input
                  {...register('aadhar')}
                  maxLength={16}
                  placeholder="12-digit Aadhaar (Optional)"
                  className="form-input"
                />
              </div>

              {/* Address */}
              <div className="form-group">
                <div className="label-row-with-voice">
                  <label>
                    <MapPin size={16} /> {t.address} *
                  </label>
                  <VoiceSpeakerBtn
                    text={t.speakAddressPrompt}
                    language={language}
                    size={14}
                  />
                </div>
                <input
                  {...register('address', { required: 'Village / District address is required' })}
                  placeholder="Village, Mandal, District"
                  className="form-input"
                />
                {errors.address && <span className="field-error">{errors.address.message}</span>}
              </div>
            </div>

            <div className="form-grid">
              {/* Bank Account */}
              <div className="form-group">
                <div className="label-row-with-voice">
                  <label>
                    <Building size={16} /> {t.bankAccount}
                  </label>
                  <VoiceSpeakerBtn
                    text={t.speakBankPrompt}
                    language={language}
                    size={14}
                  />
                </div>
                <input
                  {...register('bankAccount')}
                  placeholder="For direct MSP payment"
                  className="form-input"
                />
              </div>

              {/* UPI */}
              <div className="form-group">
                <div className="label-row-with-voice">
                  <label>
                    <CreditCard size={16} /> {t.upi}
                  </label>
                  <VoiceSpeakerBtn
                    text={t.speakUpiPrompt}
                    language={language}
                    size={14}
                  />
                </div>
                <input
                  {...register('upi')}
                  placeholder="farmer@upi (Optional)"
                  className="form-input"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="submit-btn"
            >
              {loading ? (
                <span>Dispatching SMS OTP...</span>
              ) : (
                <>
                  <span>Register & Send Mobile OTP →</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>
        ) : (
          /* Step 2: Real OTP Verification Screen */
          <motion.form
            key="farmer-otp-step"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleVerifyFarmerOtp}
            className="form-body"
          >
            {/* Demo OTP for Testing Box */}
            <div
              className="alert alert-info demo-otp-box"
              style={{ cursor: 'pointer', marginBottom: '1rem' }}
              onClick={() => setOtp(demoOtp || '123456')}
              title="Click to auto-fill OTP"
            >
              <CheckCircle2 size={18} />
              <div>
                <strong>{t.demoOtpBadge || 'Demo OTP for Testing:'} </strong>
                <span className="otp-highlight">{demoOtp || '123456'}</span>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#047857', fontWeight: 'bold' }}>
                  (👆 Click to auto-fill)
                </span>
              </div>
            </div>

            <div className="form-group">
              <div className="label-row-with-voice">
                <label>
                  <KeyRound size={16} /> Enter 6-Digit OTP Code *
                </label>
                <VoiceSpeakerBtn
                  text={t.speakOtpPrompt}
                  language={language}
                  size={14}
                />
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="form-input otp-input"
                autoFocus
                required
                style={{
                  fontSize: '1.4rem',
                  letterSpacing: '0.35rem',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading || otp.length < 4}
              className="submit-btn"
            >
              {loading ? (
                <span>Verifying Code...</span>
              ) : (
                <>
                  <span>Verify OTP & Complete Registration</span>
                  <CheckCircle2 size={18} />
                </>
              )}
            </motion.button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setErrorMessage('');
                }}
                className="switch-auth-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <ArrowLeft size={15} /> Edit Mobile / Details
              </button>

              {resendTimer > 0 ? (
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Resend in {resendTimer}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="switch-auth-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#047857' }}
                >
                  <RotateCw size={14} /> Resend SMS Code
                </button>
              )}
            </div>
          </motion.form>
        )}

        {step === 1 && (
          <div className="form-footer">
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="switch-auth-btn"
            >
              {t.alreadyRegistered} →
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default FarmerRegistration;
