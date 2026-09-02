import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  CreditCard,
  LogOut,
  User,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Wheat,
  Landmark,
  PhoneCall
} from 'lucide-react';
import FarmerRegistration from './components/FarmerRegistration';
import FarmerLogin from './components/FarmerLogin';
import SlotBooking from './components/SlotBooking';
import QueueDashboard from './components/QueueDashboard';
import PaymentStatus from './components/PaymentStatus';
import AdminPanel from './components/AdminPanel';
import GovernmentOfficerPortal from './components/GovernmentOfficerPortal';
import IVRBookingModal from './components/IVRBookingModal';
import LanguageSelector from './components/LanguageSelector';
import VoiceSpeakerBtn from './components/VoiceSpeakerBtn';
import Chatbot from './components/Chatbot';
import { translations } from './languages';
import './App.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function App() {
  const [portalMode, setPortalMode] = useState('farmer'); // 'farmer' | 'admin' | 'government'
  const [currentScreen, setCurrentScreen] = useState('home');
  const [farmerId, setFarmerId] = useState(localStorage.getItem('farmerId') || null);
  const [farmerData, setFarmerData] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [ivrModalOpen, setIvrModalOpen] = useState(false);

  const t = translations[language] || translations.en;

  useEffect(() => {
    localStorage.setItem('language', language);
    if (farmerId) {
      fetchFarmerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId, language]);

  const fetchFarmerData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/farmers/${farmerId}`);
      setFarmerData(response.data);
    } catch (error) {
      console.error('Error fetching farmer data:', error);
    }
  };

  const handleAuthSuccess = (id, data) => {
    setFarmerId(id);
    if (data) setFarmerData(data);
    localStorage.setItem('farmerId', id);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setFarmerId(null);
    setFarmerData(null);
    localStorage.removeItem('farmerId');
    setCurrentScreen('home');
    setAuthMode('login');
  };

  return (
    <div className="app-container">
      {/* Top Header & Navigation */}
      <header className="navbar">
        <div className="nav-content">
          <div className="brand-group">
            <h1 className="app-title">{t.title}</h1>
            <span className="brand-badge">SIH 2026</span>
          </div>

          <div className="nav-actions">
            {/* Global Portal Switcher (Farmer vs Mandi Admin vs Superior Govt Officer) */}
            <div className="portal-switcher">
              <button
                type="button"
                className={`portal-btn ${portalMode === 'farmer' ? 'active' : ''}`}
                onClick={() => setPortalMode('farmer')}
              >
                <Wheat size={15} />
                <span>🌾 Farmer Mode</span>
              </button>

              <button
                type="button"
                className={`portal-btn ${portalMode === 'admin' ? 'active' : ''}`}
                onClick={() => setPortalMode('admin')}
              >
                <Building2 size={15} />
                <span>🏢 Centre Admin</span>
              </button>

              <button
                type="button"
                className={`portal-btn ${portalMode === 'government' ? 'active' : ''}`}
                onClick={() => setPortalMode('government')}
              >
                <Landmark size={15} />
                <span>🏛️ Superior Govt Officer</span>
              </button>
            </div>

            {/* Toll-Free IVR Quick Trigger */}
            <button
              type="button"
              className="ivr-header-btn"
              onClick={() => setIvrModalOpen(true)}
              title="Toll-Free Telephone Slot Booking for farmers without smartphone"
            >
              <PhoneCall size={14} />
              <span>📞 Toll-Free (1800-890-2026)</span>
            </button>

            {/* Global Language Selector */}
            <LanguageSelector language={language} setLanguage={setLanguage} />

            {/* Authenticated Farmer Nav Buttons */}
            {portalMode === 'farmer' && farmerId && (
              <div className="nav-links">
                <button
                  onClick={() => setCurrentScreen('home')}
                  className={`nav-btn ${currentScreen === 'home' ? 'active' : ''}`}
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setCurrentScreen('booking')}
                  className={`nav-btn ${currentScreen === 'booking' ? 'active' : ''}`}
                >
                  <Calendar size={16} />
                  <span>{t.bookSlot}</span>
                </button>
                <button
                  onClick={() => setCurrentScreen('queue')}
                  className={`nav-btn ${currentScreen === 'queue' ? 'active' : ''}`}
                >
                  <Users size={16} />
                  <span>{t.queueStatus}</span>
                </button>
                <button
                  onClick={() => setCurrentScreen('payment')}
                  className={`nav-btn ${currentScreen === 'payment' ? 'active' : ''}`}
                >
                  <CreditCard size={16} />
                  <span>{t.payment}</span>
                </button>
                <button onClick={handleLogout} className="nav-btn logout-btn" title="Logout">
                  <LogOut size={16} />
                  <span>{t.logout}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Multilingual Voice/Text Chatbot with Strict Guardrail */}
      <Chatbot language={language} />

      {/* Main Content Body */}
      <main className="main-content">
        {portalMode === 'government' ? (
          /* 1. Superior Government User Mode (Mandal/District Stats, Treasury Sanctions & Center Editing) */
          <GovernmentOfficerPortal language={language} />
        ) : portalMode === 'admin' ? (
          /* 2. Procurement Centre Admin Mode (Mobile OTP, Slot Release, Grain Weighing, Farmer Payment Sanctions) */
          <AdminPanel language={language} />
        ) : !farmerId ? (
          /* 3. Farmer Authentication Mode (Mobile OTP Login / Registration) */
          <div className="auth-view-container">
            {/* Auth Toggle Tabs */}
            <div className="auth-tab-bar">
              <button
                className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                <ShieldCheck size={18} />
                <span>{t.login}</span>
              </button>
              <button
                className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                <User size={18} />
                <span>{t.register}</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {authMode === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <FarmerLogin
                    onLoginSuccess={handleAuthSuccess}
                    onSwitchToRegister={() => setAuthMode('register')}
                    language={language}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <FarmerRegistration
                    onRegistrationSuccess={handleAuthSuccess}
                    onSwitchToLogin={() => setAuthMode('login')}
                    language={language}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Offline IVR Help Card for farmers without smartphones */}
            <div className="offline-ivr-card" onClick={() => setIvrModalOpen(true)}>
              <div className="ivr-card-icon">
                <PhoneCall size={22} />
              </div>
              <div>
                <h4>{t.ivrTollFree || '📞 Phone Dial-in Slot Booking (No Smartphone Required)'}</h4>
                <p>
                  Illiterate or non-smartphone farmers can dial <strong>1800-890-2026</strong> directly to book a procurement slot.
                </p>
              </div>
              <span className="open-dialer-tag">Open Dialer →</span>
            </div>
          </div>
        ) : (
          /* 4. Authenticated Farmer App Screens */
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="screen-container"
            >
              {currentScreen === 'home' && (
                <Dashboard
                  farmerData={farmerData}
                  setCurrentScreen={setCurrentScreen}
                  onOpenAdmin={() => setPortalMode('admin')}
                  onOpenGov={() => setPortalMode('government')}
                  onOpenIvr={() => setIvrModalOpen(true)}
                  language={language}
                />
              )}
              {currentScreen === 'booking' && (
                <SlotBooking farmerId={farmerId} language={language} />
              )}
              {currentScreen === 'queue' && (
                <QueueDashboard farmerId={farmerId} language={language} />
              )}
              {currentScreen === 'payment' && (
                <PaymentStatus farmerId={farmerId} language={language} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Global Interactive Telephone IVR Modal */}
      <IVRBookingModal
        isOpen={ivrModalOpen}
        onClose={() => setIvrModalOpen(false)}
        language={language}
      />
    </div>
  );
}

// Dashboard Screen Component
function Dashboard({ farmerData, setCurrentScreen, onOpenAdmin, onOpenGov, onOpenIvr, language }) {
  const t = translations[language] || translations.en;

  const welcomeAudio =
    language === 'te'
      ? `స్వాగతం ${farmerData?.name || 'రైతు సోదరులారా'}! మీ ధాన్య సేకరణ డాష్‌బోర్డ్ సిద్ధంగా ఉంది. ఇక్కడి నుండి మీరు స్లాట్ బుక్ చేసుకోవచ్చు, లైవ్ క్యూ టోకెన్ చూడవచ్చు మరియు బ్యాంకు చెల్లింపు వివరాలను తనిఖీ చేయవచ్చు.`
      : language === 'hi'
      ? `स्वागत है ${farmerData?.name || 'किसान साथी'}! आप यहाँ से स्लॉट बुक कर सकते हैं, कतार टोकन देख सकते हैं और भुगतान जांच सकते हैं।`
      : `Welcome back, ${farmerData?.name || 'Farmer'}! Manage your slot bookings, live queue tokens, and DBT payments.`;

  return (
    <div className="dashboard-content">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="welcome-card"
      >
        <div className="welcome-avatar">🌾</div>
        <div className="welcome-info">
          <div className="welcome-title-row">
            <h2>{t.welcome}, {farmerData?.name || 'Farmer'}! 👋</h2>
            <VoiceSpeakerBtn
              text={welcomeAudio}
              language={language}
              label="Listen welcome info"
              size={18}
            />
          </div>
          <div className="farmer-meta-chips">
            <span>📱 +91 {farmerData?.phone}</span>
            {farmerData?.address && <span>📍 {farmerData.address}</span>}
            {farmerData?.bankAccount && <span>🏦 A/C: ••••{farmerData.bankAccount.slice(-4)}</span>}
          </div>
        </div>
      </motion.div>

      {/* MSP Ticker & Live Rates with Voice Button */}
      <div className="msp-banner">
        <div className="msp-title">
          <Sparkles size={18} />
          <span>Government Minimum Support Price (MSP 2026):</span>
          <VoiceSpeakerBtn
            text={
              language === 'te'
                ? 'ప్రభుత్వ మద్దతు ధరలు: వరి సాధారణం క్వింటాకు 2,300 రూపాయలు, పత్తి క్వింటాకు 7,121 రూపాయలు, గోధుమలు 2,275 రూపాయలు, మొక్కజొన్న 2,090 రూపాయలు.'
                : 'Government MSP Rates: Paddy 2300 rupees per quintal, Cotton 7121 rupees, Wheat 2275 rupees, Maize 2090 rupees.'
            }
            language={language}
            size={15}
          />
        </div>
        <div className="msp-chips-row">
          <span className="msp-chip">🌾 Paddy: ₹2,300/q</span>
          <span className="msp-chip">🌱 Wheat: ₹2,275/q</span>
          <span className="msp-chip">🧵 Cotton: ₹7,121/q</span>
          <span className="msp-chip">🌽 Maize: ₹2,090/q</span>
          <span className="msp-chip">🫘 Soyabean: ₹4,892/q</span>
          <span className="msp-chip">🫘 Pulses: ₹8,682/q</span>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="quick-actions-grid">
        <ActionCard
          icon="📅"
          title={t.bookSlot}
          description="Reserve a procurement slot at your nearest APMC mandi"
          badge="Fast Booking"
          onClick={() => setCurrentScreen('booking')}
          speakTextPrompt={
            language === 'te'
              ? 'స్లాట్ బుకింగ్. ధాన్యాన్ని కేంద్రానికి తీసుకురావడానికి స్లాట్ ఎంచుకోండి.'
              : 'Book a procurement slot at your nearby mandi center.'
          }
          language={language}
        />
        <ActionCard
          icon="📊"
          title={t.queueStatus}
          description="Track live digital queue tokens and real-time wait estimation"
          badge="Live Token"
          onClick={() => setCurrentScreen('queue')}
          speakTextPrompt={
            language === 'te'
              ? 'లైవ్ క్యూ సమాచారం. మీ టోకెన్ నంబర్ మరియు వేచి ఉండే సమయాన్ని చూడండి.'
              : 'Track live queue token and wait time estimation.'
          }
          language={language}
        />
        <ActionCard
          icon="💳"
          title={t.payment}
          description="Check procurement payment status and DBT bank transfer"
          badge="Direct DBT"
          onClick={() => setCurrentScreen('payment')}
          speakTextPrompt={
            language === 'te'
              ? 'చెల్లింపుల సమాచారం. మీ ధాన్యం విక్రయించిన తర్వాత బ్యాంకులో జమ అయిన డబ్బుల వివరాలు చూడండి.'
              : 'Check procurement payment status and DBT transfers.'
          }
          language={language}
        />
        <ActionCard
          icon="📞"
          title="Toll-Free IVR Booking"
          description="Book a slot directly via telephone call without smartphone"
          badge="1800-890-2026"
          onClick={onOpenIvr}
          speakTextPrompt={
            language === 'te'
              ? 'ఫోన్ కాల్ ద్వారా స్లాట్ బుకింగ్. 1800-890-2026 కు కాల్ చేసి స్లాట్ బుక్ చేసుకోవచ్చు.'
              : 'Dial toll-free telephone 1800-890-2026 to book slot without smartphone.'
          }
          language={language}
        />
      </div>
    </div>
  );
}

function ActionCard({ icon, title, description, badge, onClick, speakTextPrompt, language }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="action-card"
      onClick={onClick}
    >
      <div className="card-top-bar">
        <div className="card-icon">{icon}</div>
        <div className="top-badge-group">
          {speakTextPrompt && (
            <VoiceSpeakerBtn
              text={speakTextPrompt}
              language={language}
              size={14}
            />
          )}
          {badge && <span className="action-badge">{badge}</span>}
        </div>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="action-link">Open & Proceed →</span>
    </motion.div>
  );
}

export default App;
