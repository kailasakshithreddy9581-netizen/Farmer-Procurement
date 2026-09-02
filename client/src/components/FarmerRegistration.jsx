import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import VoiceSpeakerBtn from './VoiceSpeakerBtn';
import { translations } from '../languages';
import '../styles/Registration.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function FarmerRegistration({ onRegistrationSuccess, onSwitchToLogin, language = 'en' }) {
  const t = translations[language] || translations.en;
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await axios.post(`${API_BASE}/farmers/register`, data);
      if (response.data.success) {
        setSuccessMessage(t.regSuccess || 'Registration successful! Welcome to the hub.');
        reset();
        setTimeout(() => {
          onRegistrationSuccess(response.data.farmerId, response.data.farmer);
        }, 1500);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed. Please check your details.';
      setErrorMessage(msg);
      if (error.response?.data?.alreadyRegistered) {
        setTimeout(() => {
          if (onSwitchToLogin) onSwitchToLogin(data.phone);
        }, 2500);
      }
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
            <Sparkles size={18} />
            <span>Kisan DBT Portal</span>
          </div>
          <div className="title-with-speaker">
            <h2>{t.register}</h2>
            <VoiceSpeakerBtn
              text={
                language === 'te'
                  ? 'రైతు నమోదు ఫారమ్. దయచేసి మీ పేరు, 10 అంకెల మొబైల్ నంబర్, గ్రామం మరియు బ్యాంక్ ఖాతా వివరాలను నమోదు చేయండి.'
                  : language === 'hi'
                  ? 'किसान पंजीकरण फॉर्म। कृपया अपना नाम, मोबाइल नंबर, गाँव और बैंक खाता दर्ज करें।'
                  : 'Farmer registration form. Please enter your name, mobile number, address, and bank details.'
              }
              language={language}
              label="Listen form instructions"
              size={18}
            />
          </div>
          <p className="subtitle">{t.tagline}</p>
        </div>

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
              <p>Preparing your dashboard & slots...</p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="form-body">
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
                <span>Registering...</span>
              ) : (
                <>
                  <span>{t.registerBtn}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>
        )}

        <div className="form-footer">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="switch-auth-btn"
          >
            {t.alreadyRegistered} →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default FarmerRegistration;
