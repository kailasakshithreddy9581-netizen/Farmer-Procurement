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
  Wheat
} from 'lucide-react';
import FarmerRegistration from './components/FarmerRegistration';
import FarmerLogin from './components/FarmerLogin';
import SlotBooking from './components/SlotBooking';
import QueueDashboard from './components/QueueDashboard';
import PaymentStatus from './components/PaymentStatus';
import AdminPanel from './components/AdminPanel';
import LanguageSelector from './components/LanguageSelector';
import Chatbot from './components/Chatbot';
import { translations } from './languages';
import './App.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function App() {
  const [portalMode, setPortalMode] = useState('farmer'); // 'farmer' | 'admin'
  const [currentScreen, setCurrentScreen] = useState('home');
  const [farmerId, setFarmerId] = useState(localStorage.getItem('farmerId') || null);
  const [farmerData, setFarmerData] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

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
            {/* Global Portal Switcher (Farmer Mode vs Mandi Admin) */}
            <div className="portal-switcher">
              <button
                type="button"
                className={`portal-btn ${portalMode === 'farmer' ? 'active' : ''}`}
                onClick={() => setPortalMode('farmer')}
              >
                <Wheat size={15} />
                <span>Farmer Mode</span>
              </button>
              <button
                type="button"
                className={`portal-btn ${portalMode === 'admin' ? 'active' : ''}`}
                onClick={() => setPortalMode('admin')}
              >
                <Building2 size={15} />
                <span>🏢 Admin Portal</span>
              </button>
            </div>

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

      {/* Multilingual Voice/Text Chatbot */}
      <Chatbot language={language} />

      {/* Main Content Body */}
      <main className="main-content">
        {portalMode === 'admin' ? (
          /* Admin Window / Mandi Authority Mode */
          <AdminPanel language={language} />
        ) : !farmerId ? (
          /* Farmer Authentication Mode */
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
          </div>
        ) : (
          /* Authenticated Farmer App Screens */
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
    </div>
  );
}

// Dashboard Screen Component
function Dashboard({ farmerData, setCurrentScreen, onOpenAdmin, language }) {
  const t = translations[language] || translations.en;

  return (
    <div className="dashboard-content">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="welcome-card"
      >
        <div className="welcome-avatar">🌾</div>
        <div className="welcome-info">
          <h2>{t.welcome}, {farmerData?.name || 'Farmer'}! 👋</h2>
          <div className="farmer-meta-chips">
            <span>📱 +91 {farmerData?.phone}</span>
            {farmerData?.address && <span>📍 {farmerData.address}</span>}
            {farmerData?.bankAccount && <span>🏦 A/C: ••••{farmerData.bankAccount.slice(-4)}</span>}
          </div>
        </div>
      </motion.div>

      {/* MSP Ticker & Live Rates */}
      <div className="msp-banner">
        <div className="msp-title">
          <Sparkles size={18} />
          <span>Government Minimum Support Price (MSP 2026):</span>
        </div>
        <div className="msp-chips-row">
          <span className="msp-chip">🌾 Paddy: ₹2,300/q</span>
          <span className="msp-chip">🌱 Wheat: ₹2,275/q</span>
          <span className="msp-chip">🧵 Cotton: ₹7,121/q</span>
          <span className="msp-chip">🌽 Maize: ₹2,090/q</span>
          <span className="msp-chip">🫘 Soyabean: ₹4,892/q</span>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="quick-actions-grid">
        <ActionCard
          icon="📅"
          title={t.bookSlot}
          description="Reserve a procurement slot at your nearest mandi"
          badge="Fast Booking"
          onClick={() => setCurrentScreen('booking')}
        />
        <ActionCard
          icon="📊"
          title={t.queueStatus}
          description="Track live queue tokens and real-time wait estimation"
          badge="Live Token"
          onClick={() => setCurrentScreen('queue')}
        />
        <ActionCard
          icon="💳"
          title={t.payment}
          description="Check procurement payment status and DBT bank transfer"
          badge="Direct DBT"
          onClick={() => setCurrentScreen('payment')}
        />
        <ActionCard
          icon="🏢"
          title="Mandi Center Management"
          description="Access Procurement Center Portal to release slots & inspect crops"
          badge="Admin Authority"
          onClick={onOpenAdmin}
        />
      </div>
    </div>
  );
}

function ActionCard({ icon, title, description, badge, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="action-card"
      onClick={onClick}
    >
      <div className="card-top-bar">
        <div className="card-icon">{icon}</div>
        {badge && <span className="action-badge">{badge}</span>}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="action-link">Open & Proceed →</span>
    </motion.div>
  );
}

export default App;
