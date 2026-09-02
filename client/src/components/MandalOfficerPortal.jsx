import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Landmark,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Package,
  Users,
  CheckCircle2,
  AlertCircle,
  Phone,
  KeyRound,
  ArrowRight,
  RotateCw,
  FileText,
  Lock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { translations } from '../languages';
import '../styles/MandalPortal.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function MandalOfficerPortal({ language = 'en' }) {
  // eslint-disable-next-line no-unused-vars
  const t = translations[language] || translations.en;

  const [officer, setOfficer] = useState(
    JSON.parse(localStorage.getItem('mandalOfficer') || 'null')
  );
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'sanction' | 'analytics' | 'history'

  // Auth States
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [authStep, setAuthStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Register Form
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    mandal: 'Patancheru',
    district: 'Medak / Sangareddy',
    designation: 'Mandal Agricultural Officer (MAO)',
    employeeId: '',
    department: 'Department of Agriculture & Food Procurement'
  });

  // Mandal Data
  const [overview, setOverview] = useState(null);
  const [mandalCenters, setMandalCenters] = useState([]);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // NetBanking Modal State
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [targetCenter, setTargetCenter] = useState(null);
  const [sanctionForm, setSanctionForm] = useState({
    amount: 2500000,
    bankUsed: 'State Bank of India - Govt Treasury NetBanking',
    netbankingUserId: 'GOV_TS_MAO_OFFICER',
    authPin: '9988',
    gatewayOtp: '741258'
  });
  const [netbankingStep, setNetbankingStep] = useState(1); // 1: Amount & Bank, 2: 2FA Auth, 3: Success Receipt
  const [sanctionReceipt, setSanctionReceipt] = useState(null);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (officer && officer.mandal) {
      loadMandalData(officer.mandal);
    }
  }, [officer, activeTab]);

  const loadMandalData = async (mandalName) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/mandal/${mandalName}/overview`);
      setOverview(res.data);
      setMandalCenters(res.data.centers || []);
    } catch (err) {
      console.error('Error loading mandal overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auth Handlers
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');

    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/send-otp`, {
        phone: cleanPhone,
        purpose: 'mandal_login'
      });

      if (res.data.success) {
        setAuthStep(2);
        setDemoOtp(res.data.otp);
        setResendTimer(30);
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Failed to send OTP to Officer.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');

    try {
      const res = await axios.post(`${API_BASE}/auth/verify-otp`, {
        phone: phone.trim(),
        otp: otp.trim(),
        purpose: 'mandal'
      });

      if (res.data.success && res.data.officer) {
        setOfficer(res.data.officer);
        localStorage.setItem('mandalOfficer', JSON.stringify(res.data.officer));
      } else {
        setAuthError('OTP verified, but no Mandal Officer profile linked to this number.');
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Invalid or expired OTP code.');
    }
  };

  const handleRegisterOfficer = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!registerForm.name || !registerForm.phone || !registerForm.mandal || !registerForm.district) {
      setAuthError('Please fill all mandatory officer profile fields');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/mandal/register`, registerForm);
      if (res.data.success) {
        setOfficer(res.data.officer);
        localStorage.setItem('mandalOfficer', JSON.stringify(res.data.officer));
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setOfficer(null);
    localStorage.removeItem('mandalOfficer');
    setAuthStep(1);
    setPhone('');
    setOtp('');
  };

  // NetBanking Sanction Flow
  const openSanctionModal = (center) => {
    setTargetCenter(center);
    setNetbankingStep(1);
    setSanctionReceipt(null);
    setSanctionForm({
      amount: 2500000,
      bankUsed: 'State Bank of India - Govt Treasury NetBanking',
      netbankingUserId: 'GOV_TS_MAO_OFFICER',
      authPin: '9988',
      gatewayOtp: '741258'
    });
    setSanctionModalOpen(true);
  };

  const handleProcessNetbankingSanction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setActionError('');

    try {
      const res = await axios.post(`${API_BASE}/mandal/sanction-funds`, {
        mandal: officer.mandal,
        centerCode: targetCenter.centerCode,
        officerId: officer._id,
        officerName: officer.name,
        officerPhone: officer.phone,
        amount: sanctionForm.amount,
        bankUsed: sanctionForm.bankUsed,
        netbankingUserId: sanctionForm.netbankingUserId
      });

      if (res.data.success) {
        setSanctionReceipt(res.data.sanctionRecord);
        setNetbankingStep(3); // Show official receipt
        loadMandalData(officer.mandal);
      }
    } catch (err) {
      alert('Fund sanction failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const govtBanks = [
    'State Bank of India - Govt Treasury NetBanking',
    'Telangana Grameena Bank - Corporate Portal',
    'Andhra Pragathi Grameena Bank - Treasury Gateway',
    'Union Bank of India - Agricultural Fund Portal',
    'Punjab National Bank - e-Treasury Platform',
    'HDFC Bank - Public Sector NetBanking'
  ];

  return (
    <div className="mandal-portal-wrapper">
      {/* ========================================================
          OFFICER NOT LOGGED IN: LOGIN / REGISTER WINDOW
      ======================================================== */}
      {!officer ? (
        <div className="officer-auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="gov-emblem">
                <Landmark size={30} />
              </div>
              <h2>🏛️ Mandal Level Authority Portal</h2>
              <p>Superior Officer Access for Mandi Funds Sanction & Grain Oversight</p>
            </div>

            {/* Auth Toggle Tabs */}
            <div className="officer-auth-tabs">
              <button
                className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                <ShieldCheck size={16} /> Officer Mobile Login
              </button>
              <button
                className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
              >
                <Building size={16} /> Register Officer Profile
              </button>
            </div>

            {authError && (
              <div className="auth-alert alert-error">
                <AlertCircle size={18} />
                <span>{authError}</span>
              </div>
            )}

            {demoOtp && authStep === 2 && (
              <div className="auth-alert alert-info">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Officer 2FA OTP: </strong>
                  <span className="otp-pill">{demoOtp}</span>
                </div>
              </div>
            )}

            {authMode === 'login' ? (
              <AnimatePresence mode="wait">
                {authStep === 1 ? (
                  <motion.form
                    key="login-step1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSendOtp}
                    className="officer-form"
                  >
                    <div className="form-group">
                      <label>
                        <Phone size={15} /> Registered Officer Mobile Number *
                      </label>
                      <div className="input-with-prefix">
                        <span className="prefix">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="e.g. 9848099887"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                          autoFocus
                          required
                        />
                      </div>
                      <span className="field-hint">
                        Default Demo Officer Phone: <strong>9848099887</strong>
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || phone.length < 10}
                      className="officer-submit-btn"
                    >
                      {loading ? 'Sending OTP...' : 'Send Officer Login OTP →'}
                    </button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="login-step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleVerifyOtp}
                    className="officer-form"
                  >
                    <div className="phone-verified-badge">
                      <span>OTP sent to: <strong>+91 {phone}</strong></span>
                      <button
                        type="button"
                        onClick={() => { setAuthStep(1); setOtp(''); }}
                        className="edit-phone-link"
                      >
                        Change
                      </button>
                    </div>

                    <div className="form-group">
                      <label>
                        <KeyRound size={15} /> Enter 6-digit Officer OTP *
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="• • • • • •"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="otp-input-box"
                        autoFocus
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length < 4}
                      className="officer-submit-btn"
                    >
                      {loading ? 'Verifying...' : 'Verify & Access Mandal Dashboard'}
                    </button>

                    <div className="resend-row">
                      {resendTimer > 0 ? (
                        <span>Resend in {resendTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="resend-link"
                        >
                          <RotateCw size={14} /> Resend OTP
                        </button>
                      )}
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            ) : (
              /* Register Officer Profile Form */
              <form onSubmit={handleRegisterOfficer} className="officer-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Full Officer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. K. Sudhakar Rao"
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Official Mobile Number *</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit phone"
                      value={registerForm.phone}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, phone: e.target.value.replace(/\D/g, '') })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Assigned Mandal *</label>
                    <input
                      type="text"
                      placeholder="e.g. Patancheru"
                      value={registerForm.mandal}
                      onChange={(e) => setRegisterForm({ ...registerForm, mandal: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>District *</label>
                    <input
                      type="text"
                      placeholder="e.g. Medak / Sangareddy"
                      value={registerForm.district}
                      onChange={(e) => setRegisterForm({ ...registerForm, district: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Designation *</label>
                    <input
                      type="text"
                      placeholder="e.g. Mandal Agricultural Officer"
                      value={registerForm.designation}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, designation: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Government Employee ID / Code *</label>
                    <input
                      type="text"
                      placeholder="e.g. GOV-TS-AGRI-2026-99"
                      value={registerForm.employeeId}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, employeeId: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="officer-submit-btn"
                >
                  {loading ? 'Creating Profile...' : '✓ Register & Enter Mandal Portal'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================
            OFFICER LOGGED IN: FULL MANDAL DASHBOARD
        ======================================================== */
        <div className="officer-dashboard">
          {/* Header Banner */}
          <div className="officer-top-header">
            <div className="officer-profile-card">
              <div className="officer-avatar">🏛️</div>
              <div>
                <div className="officer-badge">
                  <ShieldCheck size={14} />
                  <span>Verified Mandal Authority</span>
                </div>
                <h2>{officer.name}</h2>
                <div className="officer-meta">
                  <span>💼 {officer.designation}</span>
                  <span className="highlight-mandal">
                    📍 Mandal: <strong>{officer.mandal}</strong> ({officer.district})
                  </span>
                  <span>🆔 {officer.employeeId}</span>
                </div>
              </div>
            </div>

            <div className="header-right-actions">
              <button
                type="button"
                onClick={() => loadMandalData(officer.mandal)}
                className="refresh-mandal-btn"
              >
                ↻ Refresh Mandal Stream
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="officer-logout-btn"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mandal-tabs">
            <button
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Building size={16} /> Mandal Overview & Centres
            </button>
            <button
              className={`tab-btn ${activeTab === 'sanction' ? 'active' : ''}`}
              onClick={() => setActiveTab('sanction')}
            >
              <CreditCard size={16} /> Sanction Funds (NetBanking)
            </button>
            <button
              className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <TrendingUp size={16} /> Mandal Crop Analytics
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <FileText size={16} /> Treasury Sanction Orders
            </button>
          </div>

          {/* ========================================================
              TAB 1: MANDAL OVERVIEW & CENTRES IN HIS MANDAL
          ======================================================== */}
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="tab-view"
            >
              {/* Aggregated Mandal Metric Cards */}
              <div className="mandal-metrics-grid">
                <div className="mandal-metric-box primary">
                  <div className="box-top">
                    <span>Total Mandal Budget Sanctioned</span>
                    <Landmark size={24} className="box-icon" />
                  </div>
                  <strong className="box-val">
                    ₹{(overview?.totalAllocatedBudget || 0).toLocaleString('en-IN')}
                  </strong>
                  <span className="box-sub">Sanctioned by Mandal Officer</span>
                </div>

                <div className="mandal-metric-box green">
                  <div className="box-top">
                    <span>Total Grain Procured in {officer.mandal}</span>
                    <Package size={24} className="box-icon" />
                  </div>
                  <strong className="box-val">
                    {overview?.totalQuintalsProcured || 0} <span className="unit">Quintals</span>
                  </strong>
                  <span className="box-sub">≈ {overview?.totalTonnesProcured || 0} Tonnes</span>
                </div>

                <div className="mandal-metric-box blue">
                  <div className="box-top">
                    <span>DBT Paid to Farmers</span>
                    <CreditCard size={24} className="box-icon" />
                  </div>
                  <strong className="box-val">
                    ₹{(overview?.totalDisbursedToFarmers || 0).toLocaleString('en-IN')}
                  </strong>
                  <span className="box-sub">Direct Benefit Transfers</span>
                </div>

                <div className="mandal-metric-box orange">
                  <div className="box-top">
                    <span>Active Mandi Centres in Mandal</span>
                    <Building size={24} className="box-icon" />
                  </div>
                  <strong className="box-val">
                    {overview?.centersCount || 0} Centres
                  </strong>
                  <span className="box-sub">Under {officer.mandal} Jurisdiction</span>
                </div>
              </div>

              {/* Centres in This Mandal */}
              <div className="mandal-section-card">
                <div className="section-title-row">
                  <div>
                    <h3>🏢 Procurement Centres in {officer.mandal} Mandal</h3>
                    <p>Center codes, bank account details, and budget allocations</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('sanction')}
                    className="quick-sanction-btn"
                  >
                    <PlusCircle size={15} /> Sanction Funds to Center
                  </button>
                </div>

                {mandalCenters.length === 0 ? (
                  <div className="empty-state">
                    <Building size={40} />
                    <p>No procurement centers registered under {officer.mandal} Mandal yet.</p>
                  </div>
                ) : (
                  <div className="centers-grid">
                    {mandalCenters.map((center) => (
                      <div key={center.centerCode} className="center-card">
                        <div className="center-card-header">
                          <span className="center-code-badge">
                            {center.centerCode}
                          </span>
                          <span className="mandal-tag">📍 {center.mandal}</span>
                        </div>

                        <h4>{center.name}</h4>
                        <div className="center-detail-line">
                          <span>Incharge:</span> <strong>{center.adminName} ({center.adminPhone})</strong>
                        </div>

                        {/* Bank Details Box */}
                        <div className="center-bank-box">
                          <div className="bank-box-header">
                            <Landmark size={14} />
                            <span>Center Bank Account</span>
                          </div>
                          <div className="bank-info-row">
                            <span>Bank: <strong>{center.bankDetails?.bankName}</strong></span>
                            <span>IFSC: <strong>{center.bankDetails?.ifscCode}</strong></span>
                          </div>
                          <div className="bank-acc-line">
                            <span>A/C No: <strong>••••{center.bankDetails?.accountNumber?.slice(-4) || '8283'}</strong></span>
                            <span className="verified-badge">✓ Verified</span>
                          </div>
                        </div>

                        {/* Financial Treasury Allocation */}
                        <div className="center-treasury-stats">
                          <div className="stat-col">
                            <span className="stat-lbl">Sanctioned Budget</span>
                            <strong className="text-green">
                              ₹{(center.allocatedBudget || 0).toLocaleString('en-IN')}
                            </strong>
                          </div>
                          <div className="stat-col">
                            <span className="stat-lbl">Storage (Tonnes)</span>
                            <strong>
                              {center.currentStorageTonnes || 0} / {center.totalCapacityTonnes || 500} t
                            </strong>
                          </div>
                        </div>

                        <div className="center-card-actions">
                          <button
                            type="button"
                            onClick={() => openSanctionModal(center)}
                            className="sanction-btn"
                          >
                            <CreditCard size={15} /> Sanction Funds (NetBanking) →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ========================================================
              TAB 2: SANCTION FUNDS & NETBANKING GATEWAY
          ======================================================== */}
          {activeTab === 'sanction' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="tab-view"
            >
              <div className="mandal-section-card">
                <div className="section-title-row">
                  <div>
                    <h3>💳 Sanction Government Procurement Funds to Mandal Centres</h3>
                    <p>Select a procurement centre in {officer.mandal} to release treasury funds via NetBanking gateway</p>
                  </div>
                </div>

                <div className="centers-table-wrapper">
                  <table className="mandal-table">
                    <thead>
                      <tr>
                        <th>Center Code & Name</th>
                        <th>Registered Bank Account</th>
                        <th>Current Treasury Budget</th>
                        <th>Paid to Farmers</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mandalCenters.map((c) => (
                        <tr key={c.centerCode}>
                          <td>
                            <strong className="text-primary">[{c.centerCode}]</strong>
                            <div>{c.name}</div>
                            <div className="small-text">Incharge: {c.adminName}</div>
                          </td>
                          <td>
                            <strong>{c.bankDetails?.bankName}</strong>
                            <div className="small-text">A/C: {c.bankDetails?.accountNumber}</div>
                            <div className="small-text">IFSC: {c.bankDetails?.ifscCode}</div>
                          </td>
                          <td>
                            <strong className="text-green text-lg">
                              ₹{(c.allocatedBudget || 0).toLocaleString('en-IN')}
                            </strong>
                          </td>
                          <td>
                            <span>₹{(c.disbursedToFarmers || 0).toLocaleString('en-IN')}</span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => openSanctionModal(c)}
                              className="sanction-action-btn"
                            >
                              <CreditCard size={14} /> Sanction Funds
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================
              TAB 3: MANDAL CROP ANALYTICS
          ======================================================== */}
          {activeTab === 'analytics' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="tab-view"
            >
              <div className="mandal-section-card">
                <h3>🌾 Mandal-Wide Crop Procurement Analytics [{officer.mandal}]</h3>
                <p>Consolidated grain procurement statistics across all centres in this mandal</p>

                <div className="crop-analytics-grid">
                  {overview?.cropBreakdown &&
                    Object.entries(overview.cropBreakdown).map(([crop, data]) => (
                      <div key={crop} className="crop-analytics-card">
                        <div className="crop-header">
                          <h4>{crop}</h4>
                          <span className="badge-quintals">{data.quintals} Quintals</span>
                        </div>
                        <div className="crop-metric-rows">
                          <div className="metric-row">
                            <span>Farmers Benefited:</span>
                            <strong>{data.farmers} Farmers</strong>
                          </div>
                          <div className="metric-row">
                            <span>Total MSP Transferred:</span>
                            <strong className="text-green">
                              ₹{data.amount.toLocaleString('en-IN')}
                            </strong>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================
              TAB 4: TREASURY SANCTION ORDERS HISTORY
          ======================================================== */}
          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="tab-view"
            >
              <div className="mandal-section-card">
                <h3>📜 Government Treasury Sanction Orders [{officer.mandal}]</h3>
                <p>Official record of all NetBanking fund sanctions released to procurement centres</p>

                {overview?.recentSanctions?.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={40} />
                    <p>No fund sanction orders recorded yet.</p>
                  </div>
                ) : (
                  <div className="centers-table-wrapper">
                    <table className="mandal-table">
                      <thead>
                        <tr>
                          <th>Sanction Order ID</th>
                          <th>Center</th>
                          <th>Amount Sanctioned</th>
                          <th>NetBanking Gateway</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.recentSanctions?.map((order) => (
                          <tr key={order._id}>
                            <td>
                              <strong className="order-id-code">{order.treasuryOrderId}</strong>
                              <div className="small-text">Ref: {order.paymentGatewayRef}</div>
                            </td>
                            <td>
                              <strong>[{order.centerCode}]</strong> {order.centerName}
                            </td>
                            <td>
                              <strong className="text-green text-lg">
                                ₹{order.amount.toLocaleString('en-IN')}
                              </strong>
                            </td>
                            <td>
                              <span>{order.bankUsed}</span>
                            </td>
                            <td>
                              <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                            </td>
                            <td>
                              <span className="badge-transferred">✓ Transferred</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: GOVERNMENT NETBANKING PAYMENT GATEWAY
      ======================================================== */}
      <AnimatePresence>
        {sanctionModalOpen && targetCenter && (
          <div className="netbanking-modal-backdrop">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="netbanking-modal"
            >
              {/* Modal Top Bar */}
              <div className="netbanking-modal-header">
                <div className="gateway-badge">
                  <Landmark size={18} />
                  <span>Treasury NetBanking Gateway</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSanctionModalOpen(false)}
                  className="close-btn"
                >
                  ✕
                </button>
              </div>

              {netbankingStep === 1 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setNetbankingStep(2); // Move to 2FA Auth
                  }}
                  className="gateway-body"
                >
                  <div className="center-beneficiary-card">
                    <span className="lbl">Beneficiary Procurement Center:</span>
                    <h4>[{targetCenter.centerCode}] {targetCenter.name}</h4>
                    <div className="bank-meta">
                      <span>🏦 Bank: <strong>{targetCenter.bankDetails?.bankName}</strong></span>
                      <span>A/C: <strong>{targetCenter.bankDetails?.accountNumber}</strong></span>
                      <span>IFSC: <strong>{targetCenter.bankDetails?.ifscCode}</strong></span>
                    </div>
                  </div>

                  {/* Select Sanction Amount */}
                  <div className="form-group">
                    <label>Treasury Sanction Amount (₹) *</label>
                    <div className="amount-presets">
                      {[1000000, 2500000, 5000000, 10000000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className={`preset-btn ${sanctionForm.amount === amt ? 'selected' : ''}`}
                          onClick={() => setSanctionForm({ ...sanctionForm, amount: amt })}
                        >
                          ₹{(amt / 100000).toFixed(0)} Lakhs
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      step="100000"
                      min="100000"
                      value={sanctionForm.amount}
                      onChange={(e) =>
                        setSanctionForm({ ...sanctionForm, amount: Number(e.target.value) })
                      }
                      className="amount-input"
                      required
                    />
                  </div>

                  {/* Select Government NetBanking Bank */}
                  <div className="form-group">
                    <label>Select Government NetBanking Portal *</label>
                    <select
                      value={sanctionForm.bankUsed}
                      onChange={(e) => setSanctionForm({ ...sanctionForm, bankUsed: e.target.value })}
                      required
                    >
                      {govtBanks.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Government Treasury User ID *</label>
                    <input
                      type="text"
                      value={sanctionForm.netbankingUserId}
                      onChange={(e) =>
                        setSanctionForm({ ...sanctionForm, netbankingUserId: e.target.value })
                      }
                      required
                    />
                  </div>

                  <button type="submit" className="proceed-nb-btn">
                    <span>Proceed to 2FA Authorization</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {netbankingStep === 2 && (
                <form onSubmit={handleProcessNetbankingSanction} className="gateway-body">
                  <div className="security-notice">
                    <Lock size={18} />
                    <span>Government 2FA Authorization Required for Treasury Sanction</span>
                  </div>

                  <div className="sanction-summary-pill">
                    <span>Sanctioning <strong>₹{sanctionForm.amount.toLocaleString('en-IN')}</strong> to <strong>{targetCenter.name}</strong></span>
                  </div>

                  <div className="form-group">
                    <label>Treasury Authorization MPIN *</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={sanctionForm.authPin}
                      onChange={(e) => setSanctionForm({ ...sanctionForm, authPin: e.target.value })}
                      placeholder="• • • •"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>2FA Treasury OTP (Sent to Officer Phone) *</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={sanctionForm.gatewayOtp}
                      onChange={(e) => setSanctionForm({ ...sanctionForm, gatewayOtp: e.target.value })}
                      className="otp-highlight-field"
                      required
                    />
                    <span className="field-hint">Demo Auto-Filled 2FA OTP: <strong>741258</strong></span>
                  </div>

                  <div className="modal-footer-btns">
                    <button
                      type="button"
                      onClick={() => setNetbankingStep(1)}
                      className="back-btn"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="confirm-sanction-btn"
                    >
                      {loading ? 'Processing via NetBanking...' : `✓ Authorize & Sanction ₹${sanctionForm.amount.toLocaleString('en-IN')}`}
                    </button>
                  </div>
                </form>
              )}

              {netbankingStep === 3 && sanctionReceipt && (
                <div className="receipt-body">
                  <div className="receipt-seal">
                    <CheckCircle2 size={44} className="text-green" />
                    <h3>Treasury Sanction Order Approved!</h3>
                    <p>Funds successfully credited to procurement center bank account via NetBanking</p>
                  </div>

                  <div className="receipt-details-card">
                    <div className="receipt-row">
                      <span>Treasury Order ID:</span>
                      <strong>{sanctionReceipt.treasuryOrderId}</strong>
                    </div>
                    <div className="receipt-row">
                      <span>Gateway Ref:</span>
                      <strong>{sanctionReceipt.paymentGatewayRef}</strong>
                    </div>
                    <div className="receipt-row">
                      <span>Sanctioned Amount:</span>
                      <strong className="text-green text-xl">
                        ₹{sanctionReceipt.amount.toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="receipt-row">
                      <span>Beneficiary Center:</span>
                      <strong>[{sanctionReceipt.centerCode}] {sanctionReceipt.centerName}</strong>
                    </div>
                    <div className="receipt-row">
                      <span>Sanctioning Officer:</span>
                      <strong>{sanctionReceipt.officerName} ({officer.mandal} Mandal)</strong>
                    </div>
                    <div className="receipt-row">
                      <span>Date & Time:</span>
                      <span>{new Date().toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSanctionModalOpen(false)}
                    className="done-receipt-btn"
                  >
                    Done & Return to Dashboard
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PlusCircle = ({ size }) => <span style={{ fontSize: size }}>+</span>;

export default MandalOfficerPortal;
