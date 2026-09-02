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
  PlusCircle,
  Edit3,
  MapPin,
  Layers,
  Filter
} from 'lucide-react';
import { translations } from '../languages';
import '../styles/MandalPortal.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

const ALL_DISTRICTS = [
  'Sangareddy / Medak',
  'Nizamabad',
  'Karimnagar',
  'Warangal / Hanamkonda',
  'Nalgonda'
];

const ALL_AVAILABLE_CROPS = [
  'Paddy (Common)',
  'Paddy (Grade A)',
  'Wheat',
  'Cotton',
  'Maize',
  'Soyabean',
  'Pulses'
];

function GovernmentOfficerPortal({ language = 'en' }) {
  // eslint-disable-next-line no-unused-vars
  const t = translations[language] || translations.en;

  const [officer, setOfficer] = useState(
    JSON.parse(localStorage.getItem('governmentOfficer') || 'null')
  );
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('districtOverview'); // 'districtOverview' | 'mandalStats' | 'centersManage' | 'sanction' | 'history'

  // Auth States
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Sangareddy / Medak');
  const [authStep, setAuthStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Register Form (MANDATORY DISTRICT!)
  const [registerForm, setRegisterForm] = useState({
    name: '',
    phone: '',
    district: 'Sangareddy / Medak', // Mandatory!
    designation: 'District Agricultural Officer (DAO) / Joint Director',
    employeeId: '',
    department: 'Department of Agriculture & Food Procurement, Govt of Telangana'
  });

  // District & Mandal Data
  const [districtStats, setDistrictStats] = useState(null);
  const [districtCenters, setDistrictCenters] = useState([]);
  const [mandalFilter, setMandalFilter] = useState('all');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Sanction NetBanking Modal State
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [targetCenter, setTargetCenter] = useState(null);
  const [sanctionForm, setSanctionForm] = useState({
    amount: 2500000,
    bankUsed: 'State Bank of India - Govt Treasury NetBanking',
    netbankingUserId: 'GOV_TS_DIST_TREASURY',
    authPin: '9988',
    gatewayOtp: '741258'
  });
  const [netbankingStep, setNetbankingStep] = useState(1); // 1: Form, 2: 2FA, 3: Receipt
  const [sanctionReceipt, setSanctionReceipt] = useState(null);

  // Center Create / Edit Modal State (Government Officer Exclusive)
  const [centerModalOpen, setCenterModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [centerForm, setCenterForm] = useState({
    centerCode: '',
    name: '',
    mandal: 'Patancheru',
    district: 'Sangareddy / Medak',
    adminName: '',
    adminPhone: '',
    adminPin: '1234',
    totalCapacityTonnes: 1000,
    acceptedCrops: ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize'],
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '38920192831',
      ifscCode: 'SBIN0020145',
      branch: 'APMC Market Yard Branch',
      accountHolderName: 'Procurement Center Operations A/C'
    }
  });

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (officer && officer.district) {
      loadDistrictData(officer.district);
    }
  }, [officer, activeTab]);

  const loadDistrictData = async (distName) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/government/${encodeURIComponent(distName)}/stats`);
      setDistrictStats(res.data);
      setDistrictCenters(res.data.centers || []);
    } catch (err) {
      console.error('Error loading district statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auth Handlers (Mobile + OTP)
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
        purpose: 'government_login'
      });

      if (res.data.success) {
        setAuthStep(2);
        setDemoOtp(res.data.otp);
        setResendTimer(30);
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Failed to send OTP to Officer mobile number.');
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
        purpose: 'government'
      });

      if (res.data.success) {
        const officerObj = res.data.officer || {
          name: 'Dr. K. Sudhakar Rao',
          phone: phone.trim(),
          district: selectedDistrict,
          designation: 'District Agricultural Officer'
        };
        setOfficer(officerObj);
        localStorage.setItem('governmentOfficer', JSON.stringify(officerObj));
      } else {
        setAuthError('OTP verified, but no Government Officer profile linked.');
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Invalid or expired OTP code.');
    }
  };

  const handleRegisterOfficer = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!registerForm.name || !registerForm.phone || !registerForm.district) {
      setAuthError('Name, Official Mobile Number, and Assigned District are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/government/register`, registerForm);
      if (res.data.success) {
        setOfficer(res.data.officer);
        localStorage.setItem('governmentOfficer', JSON.stringify(res.data.officer));
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setOfficer(null);
    localStorage.removeItem('governmentOfficer');
    setAuthStep(1);
    setPhone('');
    setOtp('');
  };

  // Center Management (EXCLUSIVELY BY GOVERNMENT OFFICER)
  const openCreateCenterModal = () => {
    setEditingCenter(null);
    setCenterForm({
      centerCode: '',
      name: '',
      mandal: 'Patancheru',
      district: officer?.district || 'Sangareddy / Medak',
      adminName: '',
      adminPhone: '',
      adminPin: '1234',
      totalCapacityTonnes: 1000,
      acceptedCrops: ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize'],
      bankDetails: {
        bankName: 'State Bank of India',
        accountNumber: '38920192831',
        ifscCode: 'SBIN0020145',
        branch: 'APMC Market Yard Branch',
        accountHolderName: 'Procurement Center Operations A/C'
      }
    });
    setCenterModalOpen(true);
  };

  const openEditCenterModal = (center) => {
    setEditingCenter(center);
    setCenterForm({
      centerCode: center.centerCode,
      name: center.name,
      mandal: center.mandal,
      district: center.district,
      adminName: center.adminName || '',
      adminPhone: center.adminPhone || '',
      adminPin: center.adminPin || '1234',
      totalCapacityTonnes: center.totalCapacityTonnes || 1000,
      acceptedCrops: center.acceptedCrops || ['Paddy (Common)', 'Wheat', 'Cotton'],
      bankDetails: center.bankDetails || {
        bankName: 'State Bank of India',
        accountNumber: '38920192831',
        ifscCode: 'SBIN0020145',
        branch: 'APMC Market Yard Branch',
        accountHolderName: `${center.name} Operations A/C`
      }
    });
    setCenterModalOpen(true);
  };

  const handleSaveCenter = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    try {
      if (editingCenter) {
        // Update existing center
        const res = await axios.put(
          `${API_BASE}/government/centers/${editingCenter.centerCode}/update`,
          centerForm
        );
        if (res.data.success) {
          setActionSuccess(res.data.message);
          setCenterModalOpen(false);
          loadDistrictData(officer.district);
          setTimeout(() => setActionSuccess(''), 4000);
        }
      } else {
        // Create new center
        const res = await axios.post(`${API_BASE}/government/centers/create`, centerForm);
        if (res.data.success) {
          setActionSuccess(res.data.message);
          setCenterModalOpen(false);
          loadDistrictData(officer.district);
          setTimeout(() => setActionSuccess(''), 4000);
        }
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to save procurement center.');
    }
  };

  // Fund Sanction Flow (NetBanking 2FA)
  const openSanctionModal = (center) => {
    setTargetCenter(center);
    setNetbankingStep(1);
    setSanctionReceipt(null);
    setSanctionForm({
      amount: 2500000,
      bankUsed: 'State Bank of India - Govt Treasury NetBanking Gateway',
      netbankingUserId: 'GOV_TS_DIST_TREASURY',
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
      const res = await axios.post(`${API_BASE}/government/sanction-funds`, {
        district: officer.district,
        mandal: targetCenter.mandal,
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
        setNetbankingStep(3); // Receipt view
        loadDistrictData(officer.district);
      }
    } catch (err) {
      alert('Fund sanction failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const govtBanks = [
    'State Bank of India - Govt Treasury NetBanking Gateway',
    'Telangana Grameena Bank - Corporate Treasury Portal',
    'Andhra Pragathi Grameena Bank - Treasury Gateway',
    'Union Bank of India - Agricultural Fund Portal',
    'Canara Bank - Public Sector NetBanking',
    'Punjab National Bank - e-Treasury Platform'
  ];

  // ========================================================
  // VIEW 1: AUTHENTICATION WINDOW (MOBILE + OTP + MANDATORY DISTRICT)
  // ========================================================
  if (!officer) {
    return (
      <div className="mandal-portal-wrapper">
        <div className="officer-auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="gov-emblem">
                <Landmark size={32} />
              </div>
              <h2>🏛️ Superior Government Officer Portal</h2>
              <p>District & Mandal Wise Oversight, Center Management & Treasury Fund Sanctions</p>
            </div>

            {/* Auth Toggle Tabs */}
            <div className="officer-auth-tabs">
              <button
                className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                <ShieldCheck size={16} /> Officer Mobile OTP Login
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
                  <strong>Government Officer OTP: </strong>
                  <span className="otp-pill">{demoOtp}</span>
                </div>
              </div>
            )}

            {authMode === 'login' ? (
              <AnimatePresence mode="wait">
                {authStep === 1 ? (
                  <motion.form
                    key="gov-login-step1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onSubmit={handleSendOtp}
                    className="officer-form"
                  >
                    <div className="form-group">
                      <label>
                        <Phone size={15} /> Registered Official Mobile Number *
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
                        Demo Government Officer Phone: <strong>9848099887</strong>
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
                    key="gov-login-step2"
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
                      {loading ? 'Verifying...' : 'Verify & Access District Portal'}
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
              /* Register Officer Profile Form (MANDATORY DISTRICT) */
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
                      placeholder="10-digit mobile"
                      value={registerForm.phone}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, phone: e.target.value.replace(/\D/g, '') })
                      }
                      required
                    />
                  </div>
                </div>

                {/* MANDATORY DISTRICT SELECTION */}
                <div className="form-group mandatory-district-field">
                  <label>
                    <MapPin size={16} /> Assigned District * (MANDATORY - Scopes all Data)
                  </label>
                  <select
                    value={registerForm.district}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, district: e.target.value })
                    }
                    className="district-select-box"
                    required
                  >
                    {ALL_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d} District
                      </option>
                    ))}
                  </select>
                  <span className="field-hint text-green">
                    ✓ You will receive aggregated and mandal-wise statistics strictly for this district.
                  </span>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Designation *</label>
                    <input
                      type="text"
                      placeholder="e.g. District Agricultural Officer (DAO)"
                      value={registerForm.designation}
                      onChange={(e) =>
                        setRegisterForm({ ...registerForm, designation: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Government Employee ID *</label>
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
                  {loading ? 'Creating Profile...' : '✓ Register & Enter District Portal'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Filter centers based on selected mandal filter
  const filteredCenters =
    mandalFilter === 'all'
      ? districtCenters
      : districtCenters.filter(
          (c) => c.mandal && c.mandal.toLowerCase() === mandalFilter.toLowerCase()
        );

  // ========================================================
  // VIEW 2: FULL SUPERIOR GOVERNMENT OFFICER DASHBOARD
  // ========================================================
  return (
    <div className="mandal-portal-wrapper">
      {/* Top Header */}
      <div className="officer-top-header">
        <div className="officer-profile-card">
          <div className="officer-avatar">🏛️</div>
          <div>
            <div className="officer-badge">
              <ShieldCheck size={14} />
              <span>Superior Government User Authority</span>
            </div>
            <h2>{officer.name}</h2>
            <div className="officer-meta">
              <span>💼 {officer.designation}</span>
              <span className="highlight-mandal">
                📍 Mandatory District: <strong>{officer.district}</strong>
              </span>
              <span>🆔 {officer.employeeId || 'GOV-TS-2026'}</span>
            </div>
          </div>
        </div>

        <div className="header-right-actions">
          <button
            type="button"
            onClick={() => loadDistrictData(officer.district)}
            className="refresh-mandal-btn"
          >
            ↻ Refresh District Data
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

      {/* Notifications */}
      {actionSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-alert alert-success"
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </motion.div>
      )}

      {actionError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="admin-alert alert-error"
        >
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="mandal-tabs">
        <button
          className={`tab-btn ${activeTab === 'districtOverview' ? 'active' : ''}`}
          onClick={() => setActiveTab('districtOverview')}
        >
          <TrendingUp size={16} /> District Overview ({officer.district})
        </button>
        <button
          className={`tab-btn ${activeTab === 'mandalStats' ? 'active' : ''}`}
          onClick={() => setActiveTab('mandalStats')}
        >
          <Layers size={16} /> Mandal-Wise Statistics
        </button>
        <button
          className={`tab-btn ${activeTab === 'centersManage' ? 'active' : ''}`}
          onClick={() => setActiveTab('centersManage')}
        >
          <Building size={16} /> Manage Procurement Centres (Govt Exclusive)
        </button>
        <button
          className={`tab-btn ${activeTab === 'sanction' ? 'active' : ''}`}
          onClick={() => setActiveTab('sanction')}
        >
          <CreditCard size={16} /> Sanction Money to Centre Admins
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <FileText size={16} /> Treasury Sanction Orders
        </button>
      </div>

      {/* ========================================================
          TAB 1: DISTRICT OVERVIEW
      ======================================================== */}
      {activeTab === 'districtOverview' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-view"
        >
          {/* Metrics Grid */}
          <div className="mandal-metrics-grid">
            <div className="mandal-metric-box primary">
              <div className="box-top">
                <span>Total District Budget Sanctioned</span>
                <Landmark size={24} className="box-icon" />
              </div>
              <strong className="box-val">
                ₹{(districtStats?.totalAllocatedBudget || 0).toLocaleString('en-IN')}
              </strong>
              <span className="box-sub">Sanctioned by Superior Officer</span>
            </div>

            <div className="mandal-metric-box green">
              <div className="box-top">
                <span>Total Grain Procured in {officer.district}</span>
                <Package size={24} className="box-icon" />
              </div>
              <strong className="box-val">
                {districtStats?.totalQuintalsProcured || 0} <span className="unit">Quintals</span>
              </strong>
              <span className="box-sub">≈ {districtStats?.totalTonnesProcured || 0} Tonnes</span>
            </div>

            <div className="mandal-metric-box blue">
              <div className="box-top">
                <span>DBT Paid to Farmers</span>
                <CreditCard size={24} className="box-icon" />
              </div>
              <strong className="box-val">
                ₹{(districtStats?.totalDisbursedToFarmers || 0).toLocaleString('en-IN')}
              </strong>
              <span className="box-sub">Direct Benefit Transfers</span>
            </div>

            <div className="mandal-metric-box orange">
              <div className="box-top">
                <span>Active Mandis in District</span>
                <Building size={24} className="box-icon" />
              </div>
              <strong className="box-val">
                {districtStats?.totalCenters || 0} Centres
              </strong>
              <span className="box-sub">Across all Mandals</span>
            </div>
          </div>

          {/* Crop Breakdown Panel */}
          <div className="mandal-section-card">
            <h3>🌾 District-Wide Crop Procurement Breakdown</h3>
            <p>Aggregated grain procurement data across all centers in {officer.district}</p>

            <div className="crop-analytics-grid">
              {districtStats?.cropBreakdown &&
                Object.entries(districtStats.cropBreakdown).map(([crop, data]) => (
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
          TAB 2: MANDAL-WISE STATISTICS (MANDATORY REQUIREMENT)
      ======================================================== */}
      {activeTab === 'mandalStats' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-view"
        >
          <div className="mandal-section-card">
            <div className="section-title-row">
              <div>
                <h3>📊 Mandal-Wise Statistics for {officer.district} District</h3>
                <p>Granular procurement statistics, budget allocations, and grain metrics for each mandal</p>
              </div>
            </div>

            <div className="centers-table-wrapper">
              <table className="mandal-table">
                <thead>
                  <tr>
                    <th>Mandal Name</th>
                    <th>Active Centres</th>
                    <th>Allocated Budget</th>
                    <th>DBT Disbursed</th>
                    <th>Grain Procured (Quintals)</th>
                    <th>Grain Procured (Tonnes)</th>
                    <th>Farmers Served</th>
                  </tr>
                </thead>
                <tbody>
                  {districtStats?.mandalWiseStats &&
                    Object.entries(districtStats.mandalWiseStats).map(([mName, mData]) => (
                      <tr key={mName}>
                        <td>
                          <strong className="text-primary text-base">📍 {mName} Mandal</strong>
                        </td>
                        <td>
                          <span className="badge-centers-count">{mData.centersCount} Centres</span>
                        </td>
                        <td>
                          <strong className="text-primary">
                            ₹{(mData.allocatedBudget || 0).toLocaleString('en-IN')}
                          </strong>
                        </td>
                        <td>
                          <strong className="text-green">
                            ₹{(mData.disbursedToFarmers || 0).toLocaleString('en-IN')}
                          </strong>
                        </td>
                        <td>
                          <strong>{mData.quintalsProcured || 0} q</strong>
                        </td>
                        <td>
                          <span>{mData.tonnesProcured || 0} Tonnes</span>
                        </td>
                        <td>
                          <span className="farmers-pill">{mData.farmersServed || 0} Farmers</span>
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
          TAB 3: MANAGE PROCUREMENT CENTRES (GOVT EXCLUSIVE)
      ======================================================== */}
      {activeTab === 'centersManage' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-view"
        >
          <div className="mandal-section-card">
            <div className="section-title-row">
              <div>
                <h3>🏢 Procurement Centres in {officer.district}</h3>
                <p>Government Officer Exclusive: Register new centers, update bank accounts & edit parameters</p>
              </div>
              <button
                type="button"
                onClick={openCreateCenterModal}
                className="gov-action-btn primary"
              >
                <PlusCircle size={16} /> Register New Procurement Center
              </button>
            </div>

            {/* Mandal Filter Bar */}
            <div className="mandal-filter-bar">
              <span className="filter-label">
                <Filter size={14} /> Filter by Mandal:
              </span>
              <button
                type="button"
                className={`filter-chip ${mandalFilter === 'all' ? 'active' : ''}`}
                onClick={() => setMandalFilter('all')}
              >
                All Mandals ({districtCenters.length})
              </button>
              {districtStats?.mandalWiseStats &&
                Object.keys(districtStats.mandalWiseStats).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`filter-chip ${mandalFilter === m ? 'active' : ''}`}
                    onClick={() => setMandalFilter(m)}
                  >
                    {m}
                  </button>
                ))}
            </div>

            {/* Centres Grid */}
            <div className="centers-grid">
              {filteredCenters.map((center) => (
                <div key={center.centerCode} className="center-card">
                  <div className="center-card-header">
                    <span className="center-code-badge">{center.centerCode}</span>
                    <span className="mandal-tag">📍 {center.mandal} Mandal</span>
                  </div>

                  <h4>{center.name}</h4>
                  <div className="center-detail-line">
                    <span>Admin Incharge:</span> <strong>{center.adminName} (+91 {center.adminPhone})</strong>
                  </div>

                  {/* Bank Account */}
                  <div className="center-bank-box">
                    <div className="bank-box-header">
                      <Landmark size={14} />
                      <span>Linked Mandi Bank Account</span>
                    </div>
                    <div className="bank-info-row">
                      <span>Bank: <strong>{center.bankDetails?.bankName}</strong></span>
                      <span>IFSC: <strong>{center.bankDetails?.ifscCode}</strong></span>
                    </div>
                    <div className="bank-acc-line">
                      <span>A/C: <strong>••••{center.bankDetails?.accountNumber?.slice(-4) || '8283'}</strong></span>
                      <span className="verified-badge">✓ Verified</span>
                    </div>
                  </div>

                  {/* Financial Stats */}
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
                      onClick={() => openEditCenterModal(center)}
                      className="edit-center-btn"
                    >
                      <Edit3 size={15} /> Edit Center Details
                    </button>
                    <button
                      type="button"
                      onClick={() => openSanctionModal(center)}
                      className="sanction-btn"
                    >
                      <CreditCard size={15} /> Sanction Funds →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          TAB 4: SANCTION MONEY TO CENTRE ADMINS (NETBANKING GATEWAY)
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
                <h3>💳 Sanction Government Treasury Funds to Procurement Centre Admins</h3>
                <p>Authorize and transfer treasury funds directly to procurement centre bank accounts via Government NetBanking</p>
              </div>
            </div>

            <div className="centers-table-wrapper">
              <table className="mandal-table">
                <thead>
                  <tr>
                    <th>Center Code & Name</th>
                    <th>Mandal</th>
                    <th>Centre Bank Account</th>
                    <th>Current Sanctioned Budget</th>
                    <th>Paid to Farmers</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {districtCenters.map((c) => (
                    <tr key={c.centerCode}>
                      <td>
                        <strong className="text-primary">[{c.centerCode}]</strong>
                        <div>{c.name}</div>
                        <div className="small-text">Incharge: {c.adminName}</div>
                      </td>
                      <td>
                        <span className="mandal-pill">📍 {c.mandal}</span>
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
          TAB 5: TREASURY SANCTION ORDERS HISTORY
      ======================================================== */}
      {activeTab === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-view"
        >
          <div className="mandal-section-card">
            <h3>📜 Government Treasury Sanction Orders [{officer.district}]</h3>
            <p>Official records of all NetBanking fund sanctions released to procurement centers</p>

            {districtStats?.recentSanctions?.length === 0 ? (
              <div className="empty-state">
                <FileText size={40} />
                <p>No fund sanction orders recorded yet in {officer.district}.</p>
              </div>
            ) : (
              <div className="centers-table-wrapper">
                <table className="mandal-table">
                  <thead>
                    <tr>
                      <th>Sanction Order ID</th>
                      <th>Center Code & Name</th>
                      <th>Mandal</th>
                      <th>Amount Sanctioned</th>
                      <th>NetBanking Portal</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtStats?.recentSanctions?.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <strong className="order-id-code">{order.treasuryOrderId}</strong>
                          <div className="small-text">Ref: {order.paymentGatewayRef}</div>
                        </td>
                        <td>
                          <strong>[{order.centerCode}]</strong> {order.centerName}
                        </td>
                        <td>
                          <span>📍 {order.mandal}</span>
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

      {/* ========================================================
          MODAL 1: CREATE / EDIT PROCUREMENT CENTER
          (EXCLUSIVELY BY GOVERNMENT OFFICER)
      ======================================================== */}
      <AnimatePresence>
        {centerModalOpen && (
          <div className="netbanking-modal-backdrop" onClick={() => setCenterModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="center-edit-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="netbanking-modal-header">
                <div className="gateway-badge">
                  <Building size={18} />
                  <span>
                    {editingCenter ? 'Edit Procurement Center' : 'Register New Procurement Center'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCenterModalOpen(false)}
                  className="close-btn"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCenter} className="center-edit-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Unique Center Code * (e.g. CENT-PAT-01)</label>
                    <input
                      type="text"
                      placeholder="e.g. CENT-SNG-03"
                      value={centerForm.centerCode}
                      onChange={(e) =>
                        setCenterForm({
                          ...centerForm,
                          centerCode: e.target.value.toUpperCase()
                        })
                      }
                      disabled={!!editingCenter}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Procurement Center Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Sangareddy Central Rythu Vedika"
                      value={centerForm.name}
                      onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
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
                      value={centerForm.mandal}
                      onChange={(e) => setCenterForm({ ...centerForm, mandal: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>District * (Locked to Officer District)</label>
                    <input
                      type="text"
                      value={centerForm.district}
                      disabled
                      className="bg-disabled"
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Mandi Admin Incharge Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. R. K. Sharma"
                      value={centerForm.adminName}
                      onChange={(e) => setCenterForm({ ...centerForm, adminName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Admin Mobile Phone *</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="10-digit phone"
                      value={centerForm.adminPhone}
                      onChange={(e) => setCenterForm({ ...centerForm, adminPhone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Storage Capacity (Tonnes) *</label>
                  <input
                    type="number"
                    min="100"
                    max="10000"
                    value={centerForm.totalCapacityTonnes}
                    onChange={(e) =>
                      setCenterForm({
                        ...centerForm,
                        totalCapacityTonnes: Number(e.target.value)
                      })
                    }
                    required
                  />
                </div>

                {/* Bank Details */}
                <div className="bank-section-box">
                  <h4>🏦 Procurement Center Bank Details</h4>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        value={centerForm.bankDetails?.bankName}
                        onChange={(e) =>
                          setCenterForm({
                            ...centerForm,
                            bankDetails: { ...centerForm.bankDetails, bankName: e.target.value }
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Account Number</label>
                      <input
                        type="text"
                        value={centerForm.bankDetails?.accountNumber}
                        onChange={(e) =>
                          setCenterForm({
                            ...centerForm,
                            bankDetails: {
                              ...centerForm.bankDetails,
                              accountNumber: e.target.value
                            }
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>IFSC Code</label>
                      <input
                        type="text"
                        value={centerForm.bankDetails?.ifscCode}
                        onChange={(e) =>
                          setCenterForm({
                            ...centerForm,
                            bankDetails: { ...centerForm.bankDetails, ifscCode: e.target.value }
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Branch Name</label>
                      <input
                        type="text"
                        value={centerForm.bankDetails?.branch}
                        onChange={(e) =>
                          setCenterForm({
                            ...centerForm,
                            bankDetails: { ...centerForm.bankDetails, branch: e.target.value }
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer-btns">
                  <button
                    type="button"
                    onClick={() => setCenterModalOpen(false)}
                    className="back-btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="confirm-sanction-btn">
                    {editingCenter ? '✓ Save Changes' : '✓ Register Procurement Center'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          MODAL 2: NETBANKING TREASURY FUND SANCTION (2FA)
      ======================================================== */}
      <AnimatePresence>
        {sanctionModalOpen && targetCenter && (
          <div className="netbanking-modal-backdrop" onClick={() => setSanctionModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="netbanking-modal"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Bar */}
              <div className="netbanking-modal-header">
                <div className="gateway-badge">
                  <Landmark size={18} />
                  <span>Government Treasury NetBanking Gateway</span>
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
                    setNetbankingStep(2);
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
                    <span>
                      Sanctioning <strong>₹{sanctionForm.amount.toLocaleString('en-IN')}</strong> to{' '}
                      <strong>{targetCenter.name}</strong>
                    </span>
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
                      {loading
                        ? 'Processing via NetBanking...'
                        : `✓ Authorize & Sanction ₹${sanctionForm.amount.toLocaleString('en-IN')}`}
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
                      <strong>{sanctionReceipt.officerName} ({officer.district} District)</strong>
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

export default GovernmentOfficerPortal;
