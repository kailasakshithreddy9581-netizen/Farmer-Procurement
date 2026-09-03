import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Calendar,
  Users,
  CreditCard,
  PlusCircle,
  TrendingUp,
  Package,
  CheckCircle2,
  Trash2,
  Scale,
  ShieldCheck,
  AlertCircle,
  Phone,
  KeyRound,
  RotateCw,
  LogOut,
  Landmark,
  Info,
  User,
  MapPin,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { translations } from '../languages';
import '../styles/AdminPanel.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

const MSP_RATES = {
  'Paddy (Common)': 2300,
  'Paddy (Grade A)': 2320,
  'Wheat': 2275,
  'Cotton': 7121,
  'Maize': 2090,
  'Soyabean': 4892,
  'Pulses': 8682
};

const REGIONS_MANDALS = {
  // Kerala Regions (Major Agricultural & Paddy Procurement Hubs)
  'Palakkad (Nellara / Rice Bowl)': ['Alathur', 'Chittur', 'Palakkad', 'Ottapalam', 'Pattambi', 'Mannarkkad', 'Kuzhalmannam'],
  'Alappuzha (Kuttanad)': ['Kuttanad', 'Ambalappuzha', 'Chengannur', 'Cherthala', 'Karthikappally', 'Mavelikkara'],
  'Thrissur': ['Thrissur', 'Chalakudy', 'Chavakkad', 'Kodungallur', 'Mukundapuram', 'Thalapilly'],
  'Wayanad': ['Mananthavady', 'Sulthan Bathery', 'Vythiri', 'Kalpetta'],
  'Kozhikode': ['Kozhikode', 'Koyilandy', 'Vadakara', 'Thamarassery'],
  'Ernakulam / Kochi': ['Aluva', 'Kochi', 'Kanayannur', 'Kunnathunad', 'Muvattupuzha', 'North Paravur', 'Angamaly'],
  'Thiruvananthapuram': ['Thiruvananthapuram', 'Neyyattinkara', 'Nedumangad', 'Chirayinkeezhu', 'Varkala', 'Kattakada'],
  'Kottayam': ['Kottayam', 'Changanassery', 'Vaikom', 'Meenachil', 'Kanjirappally'],
  'Kannur': ['Kannur', 'Thalassery', 'Taliparamba', 'Payyanur', 'Iritty'],
  'Idukki': ['Thodupuzha', 'Devikulam', 'Peerumade', 'Udumbanchola', 'Idukki'],

  // Telangana Regions
  'Sangareddy / Medak': ['Patancheru', 'Sangareddy', 'Zaheerabad', 'Narayankhed', 'Andole', 'Kandi', 'Ameenpur'],
  'Nizamabad': ['Nizamabad North', 'Nizamabad South', 'Bodhan', 'Armoor', 'Banswada', 'Dichpally'],
  'Karimnagar': ['Karimnagar Urban', 'Huzurabad', 'Choppadandi', 'Manakondur', 'Thimmapur'],
  'Warangal / Hanamkonda': ['Warangal Urban', 'Hanamkonda', 'Narsampet', 'Parkal', 'Wardhannapet'],
  'Nalgonda': ['Nalgonda Urban', 'Miryalaguda', 'Devarakonda', 'Nakrekal']
};

function AdminPanel({ language = 'en' }) {
  // eslint-disable-next-line no-unused-vars
  const t = translations[language] || translations.en;

  // Authentication State for Procurement Center Admin (Mobile + OTP + Name + Address)
  const [adminUser, setAdminUser] = useState(
    JSON.parse(localStorage.getItem('procurementAdmin') || 'null')
  );
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authPhone, setAuthPhone] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [authStep, setAuthStep] = useState(1); // 1: Form, 2: OTP, 3: Address Check
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [demoOtp, setDemoOtp] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  // Admin Registration & Details State (Name, Address, Kerala & Telangana Regions)
  const [adminNameInput, setAdminNameInput] = useState('');
  const [adminAddressInput, setAdminAddressInput] = useState('');
  const [adminDistrictInput, setAdminDistrictInput] = useState('Palakkad (Nellara / Rice Bowl)');
  const [adminMandalInput, setAdminMandalInput] = useState('Alathur');
  const [adminCenterNameInput, setAdminCenterNameInput] = useState('');

  const handleDemoAdminFill = () => {
    setAdminNameInput('K. Balakrishnan Nair');
    setAdminAddressInput('Civil Station Road, Alathur Post, Palakkad District, Kerala - 678541');
    setAdminDistrictInput('Palakkad (Nellara / Rice Bowl)');
    setAdminMandalInput('Alathur');
    setAdminCenterNameInput('Palakkad Primary Paddy Procurement Hub (Nellara Mandi)');
    setAuthPhone('9447012345');
    setAuthError('');
  };

  // Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(adminUser?.name || '');
  const [editAddress, setEditAddress] = useState(adminUser?.address || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Portal State
  const [centers, setCenters] = useState([]);
  const [selectedCenterCode, setSelectedCenterCode] = useState(
    adminUser?.centerCode || ''
  );
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'slots' | 'farmers' | 'payments'
  const [stats, setStats] = useState(null);
  const [slots, setSlots] = useState([]);
  const [farmersQueue, setFarmersQueue] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Release Slot Form State
  const [newSlot, setNewSlot] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '09:00 AM - 11:00 AM',
    crop: 'Paddy (Common)',
    capacity: 30
  });

  // Verify Farmer Modal State
  const [verifyingBooking, setVerifyingBooking] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    quantityQuintals: 15,
    qualityGrade: 'Grade A',
    crop: 'Paddy (Common)'
  });

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    fetchCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminUser]);

  useEffect(() => {
    if (selectedCenterCode) {
      loadCenterData(selectedCenterCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCenterCode, activeTab]);

  const fetchCenters = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/centers`);
      setCenters(res.data || []);
      if (res.data && res.data.length > 0) {
        if (!selectedCenterCode) {
          setSelectedCenterCode(adminUser?.centerCode || res.data[0].centerCode);
        }
      }
    } catch (err) {
      console.error('Error fetching centers:', err);
    }
  };

  const loadCenterData = async (code) => {
    setLoading(true);
    try {
      if (activeTab === 'stats') {
        const res = await axios.get(`${API_BASE}/admin/centers/${code}/stats`);
        setStats(res.data);
      } else if (activeTab === 'slots') {
        const res = await axios.get(`${API_BASE}/admin/centers/${code}/slots`);
        setSlots(res.data || []);
      } else if (activeTab === 'farmers' || activeTab === 'payments') {
        const res = await axios.get(`${API_BASE}/admin/centers/${code}/farmers`);
        setFarmersQueue(res.data || []);
        const statsRes = await axios.get(`${API_BASE}/admin/centers/${code}/stats`);
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Error loading center data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auth Handlers (Mobile + OTP + Name + Address)
  const handleSendAdminOtp = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');

    const cleanPhone = authPhone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      setAuthError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (authMode === 'register') {
      if (!adminNameInput.trim()) {
        setAuthError('Please enter Admin Full Name');
        return;
      }
      if (!adminAddressInput.trim()) {
        setAuthError('Please enter Admin Office / Mandi Address');
        return;
      }
    }

    setAuthLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/send-otp`, {
        phone: cleanPhone,
        purpose: authMode === 'register' ? 'admin_register' : 'admin_login'
      });

      if (res.data.success) {
        setAuthStep(2);
        setDemoOtp(res.data.otp);
        setResendTimer(30);
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Failed to send OTP to Admin mobile number.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyAdminOtp = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');

    const cleanOtp = authOtp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setAuthError('Please enter the 6-digit OTP');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const regRes = await axios.post(`${API_BASE}/admin/register`, {
          name: adminNameInput.trim(),
          phone: authPhone.trim(),
          otp: cleanOtp,
          address: adminAddressInput.trim(),
          district: adminDistrictInput,
          mandal: adminMandalInput,
          centerName: adminCenterNameInput.trim() || `${adminMandalInput} Primary Procurement Hub`
        });

        if (regRes.data.success) {
          const adminData = regRes.data.admin;
          setAdminUser(adminData);
          setSelectedCenterCode(regRes.data.centerCode || adminData.centerCode || 'CENT-KER-PLK-01');
          localStorage.setItem('procurementAdmin', JSON.stringify(adminData));
          fetchCenters();
          return;
        }
      }

      // Login verification
      const res = await axios.post(`${API_BASE}/auth/verify-otp`, {
        phone: authPhone.trim(),
        otp: cleanOtp,
        purpose: 'admin',
        name: adminNameInput.trim() || undefined,
        address: adminAddressInput.trim() || undefined
      });

      if (res.data.success) {
        const adminData = res.data.admin || {
          phone: authPhone.trim(),
          name: res.data.center?.adminName || 'Procurement Admin',
          address: res.data.center?.adminAddress || '',
          centerCode: res.data.centerCode || 'CENT-PAT-01'
        };
        setAdminUser(adminData);
        setSelectedCenterCode(adminData.centerCode || res.data.centerCode || 'CENT-PAT-01');
        localStorage.setItem('procurementAdmin', JSON.stringify(adminData));
        fetchCenters();
      } else {
        setAuthError(res.data.message || 'OTP verification failed.');
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!editName.trim() || !editAddress.trim()) {
      alert('Name and Address are required');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await axios.put(`${API_BASE}/admin/profile`, {
        phone: adminUser.phone,
        name: editName.trim(),
        address: editAddress.trim(),
        centerCode: selectedCenterCode
      });

      if (res.data.success) {
        const updated = {
          ...adminUser,
          name: editName.trim(),
          address: editAddress.trim()
        };
        setAdminUser(updated);
        localStorage.setItem('procurementAdmin', JSON.stringify(updated));
        setIsEditProfileOpen(false);
        setActionSuccess('Admin profile (Name & Address) updated successfully!');
        fetchCenters();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAdminLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('procurementAdmin');
    setAuthStep(1);
    setAuthPhone('');
    setAuthOtp('');
  };

  // Slot Management
  const handleReleaseSlot = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    try {
      const res = await axios.post(`${API_BASE}/admin/slots/create`, {
        centerCode: selectedCenterCode,
        ...newSlot
      });

      if (res.data.success) {
        setActionSuccess(res.data.message);
        loadCenterData(selectedCenterCode);
        setTimeout(() => setActionSuccess(''), 3500);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to release slot');
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to cancel and remove this slot?')) return;
    try {
      const res = await axios.delete(`${API_BASE}/admin/slots/${slotId}`);
      if (res.data.success) {
        setActionSuccess('Slot removed successfully');
        loadCenterData(selectedCenterCode);
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      alert('Error cancelling slot: ' + err.message);
    }
  };

  // Grain Weighing & Verification
  const handleVerifyFarmer = async (e) => {
    e.preventDefault();
    if (!verifyingBooking) return;

    try {
      const res = await axios.post(`${API_BASE}/admin/procurement/verify`, {
        bookingId: verifyingBooking._id,
        ...verifyForm
      });

      if (res.data.success) {
        setActionSuccess(res.data.message);
        setVerifyingBooking(null);
        loadCenterData(selectedCenterCode);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      alert('Verification failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Payment Sanction to Farmer (By Procurement Admin)
  const handleSanctionPaymentToFarmer = async (booking) => {
    try {
      const res = await axios.post(`${API_BASE}/admin/procurement/pay`, {
        bookingId: booking._id,
        amount: booking.totalAmount || 23000
      });

      if (res.data.success) {
        setActionSuccess(res.data.message);
        loadCenterData(selectedCenterCode);
        setTimeout(() => setActionSuccess(''), 5000);
      }
    } catch (err) {
      alert('Payment sanction failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const currentCenter = centers.find((c) => c.centerCode === selectedCenterCode);

  // ==========================================================
  // VIEW 1: AUTHENTICATION WINDOW (MOBILE + OTP + NAME + ADDRESS) FOR ADMIN
  // ==========================================================
  if (!adminUser) {
    return (
      <div className="admin-portal-wrapper">
        <div className="admin-auth-card">
          <div className="admin-auth-header">
            <div className="admin-auth-badge">
              <Building2 size={24} />
            </div>
            <h2>🏢 Procurement Centre Admin Portal</h2>
            <p>Direct login or register your Admin profile with Name and Address</p>
          </div>

          {/* Mode Switcher: Login vs Register Admin */}
          <div className="admin-auth-mode-switch">
            <button
              type="button"
              className={`mode-tab-btn ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('login');
                setAuthStep(1);
                setAuthError('');
              }}
            >
              🏢 Admin Login
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setAuthMode('register');
                setAuthStep(1);
                setAuthError('');
              }}
            >
              📝 Register Admin Profile
            </button>
          </div>

          {authError && (
            <div className="admin-alert alert-error">
              <AlertCircle size={18} />
              <span>{authError}</span>
            </div>
          )}

          {authStep === 2 && (
            <div
              className="admin-alert alert-info"
              style={{ cursor: 'pointer' }}
              onClick={() => setAuthOtp(demoOtp || '123456')}
              title="Click to auto-fill OTP"
            >
              <CheckCircle2 size={18} />
              <div>
                <strong>Centre Admin Login OTP: </strong>
                <span className="otp-pill">{demoOtp || '123456'}</span>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: '#047857', fontWeight: 'bold' }}>
                  (👆 Click to auto-fill)
                </span>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {authStep === 1 ? (
              <motion.form
                key="admin-step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSendAdminOtp}
                className="admin-login-form"
              >
                {authMode === 'register' && (
                  <>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={handleDemoAdminFill}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: '#ecfdf5',
                          border: '1.5px dashed #059669',
                          color: '#047857',
                          padding: '0.45rem 1rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        ⚡ Fill Demo Admin (K. Balakrishnan Nair - 9447012345)
                      </button>
                    </div>

                    {/* Admin Full Name */}
                    <div className="form-group">
                      <label>
                        <User size={15} /> Admin Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. K. Balakrishnan Nair / R. K. Sharma"
                        value={adminNameInput}
                        onChange={(e) => setAdminNameInput(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>

                    {/* Admin Official Address */}
                    <div className="form-group">
                      <label>
                        <MapPin size={15} /> Admin Office / Mandi Address *
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Civil Station Road, Alathur Post, Palakkad, Kerala - 678541"
                        value={adminAddressInput}
                        onChange={(e) => setAdminAddressInput(e.target.value)}
                        required
                        className="admin-textarea"
                      />
                      <span className="field-hint">
                        Official correspondence & verification address
                      </span>
                    </div>

                    {/* Region Selection including Kerala Regions */}
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>
                          <Landmark size={15} /> State / District *
                        </label>
                        <select
                          value={adminDistrictInput}
                          onChange={(e) => {
                            const newDist = e.target.value;
                            setAdminDistrictInput(newDist);
                            const mandals = REGIONS_MANDALS[newDist] || [];
                            if (mandals.length > 0) setAdminMandalInput(mandals[0]);
                          }}
                          className="admin-select"
                          required
                        >
                          <optgroup label="🌴 Kerala Regions">
                            <option value="Palakkad (Nellara / Rice Bowl)">Palakkad (Nellara / Rice Bowl)</option>
                            <option value="Alappuzha (Kuttanad)">Alappuzha (Kuttanad)</option>
                            <option value="Thrissur">Thrissur</option>
                            <option value="Wayanad">Wayanad</option>
                            <option value="Kozhikode">Kozhikode</option>
                            <option value="Ernakulam / Kochi">Ernakulam / Kochi</option>
                            <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                            <option value="Kottayam">Kottayam</option>
                            <option value="Kannur">Kannur</option>
                            <option value="Idukki">Idukki</option>
                          </optgroup>
                          <optgroup label="🌾 Telangana Regions">
                            <option value="Sangareddy / Medak">Sangareddy / Medak</option>
                            <option value="Nizamabad">Nizamabad</option>
                            <option value="Karimnagar">Karimnagar</option>
                            <option value="Warangal / Hanamkonda">Warangal / Hanamkonda</option>
                            <option value="Nalgonda">Nalgonda</option>
                          </optgroup>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Mandal / Taluk *</label>
                        <select
                          value={adminMandalInput}
                          onChange={(e) => setAdminMandalInput(e.target.value)}
                          className="admin-select"
                          required
                        >
                          {(REGIONS_MANDALS[adminDistrictInput] || []).map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Center Name */}
                    <div className="form-group">
                      <label>
                        <Building2 size={15} /> Procurement Center Name
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g. ${adminMandalInput} Primary Procurement Yard`}
                        value={adminCenterNameInput}
                        onChange={(e) => setAdminCenterNameInput(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Mobile Number */}
                <div className="form-group">
                  <label>
                    <Phone size={15} /> {authMode === 'register' ? 'Official Mobile Number *' : 'Registered Admin Mobile Number *'}
                  </label>
                  <div className="input-with-prefix">
                    <span className="prefix">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder={authMode === 'register' ? '9447012345' : 'e.g. 9447012345 or 9848012345'}
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value.replace(/\D/g, ''))}
                      autoFocus={authMode === 'login'}
                      required
                    />
                  </div>
                  {authMode === 'login' && (
                    <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold' }}>Demo Admins:</span>
                      <button
                        type="button"
                        onClick={() => setAuthPhone('9447012345')}
                        style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        9447012345 (Palakkad)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthPhone('9447054321')}
                        style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        9447054321 (Alappuzha)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthPhone('9848012345')}
                        style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                      >
                        9848012345 (Telangana)
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading || authPhone.length < 10}
                  className="admin-submit-btn"
                >
                  {authLoading
                    ? 'Sending OTP...'
                    : authMode === 'register'
                    ? 'Register Admin & Send OTP →'
                    : 'Send Login OTP →'}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="admin-step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleVerifyAdminOtp}
                className="admin-login-form"
              >
                <div className="phone-verified-badge">
                  <span>
                    OTP sent to: <strong>+91 {authPhone}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep(1);
                      setAuthOtp('');
                    }}
                    className="edit-phone-link"
                  >
                    Change
                  </button>
                </div>

                <div className="form-group">
                  <label>
                    <KeyRound size={15} /> Enter 6-digit Admin OTP *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={authOtp}
                    onChange={(e) => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                    className="otp-input-field"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading || authOtp.length < 4}
                  className="admin-submit-btn"
                >
                  {authLoading ? 'Verifying...' : 'Verify & Enter Centre Dashboard'}
                </button>

                <div className="resend-row">
                  {resendTimer > 0 ? (
                    <span>Resend in {resendTimer}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendAdminOtp}
                      className="resend-link"
                    >
                      <RotateCw size={14} /> Resend OTP
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ==========================================================
  // VIEW 2: FULL PROCUREMENT CENTRE ADMIN DASHBOARD
  // ==========================================================
  return (
    <div className="admin-portal-wrapper">
      {/* Top Banner & Active Center Switcher */}
      <div className="admin-top-banner">
        <div className="admin-title-area">
          <div className="admin-badge">
            <ShieldCheck size={18} />
            <span>Procurement Centre Admin Authority</span>
          </div>
          <h2>🏢 {currentCenter?.name || 'APMC Procurement Center'}</h2>
          <div className="admin-meta-info">
            <span>
              👤 Incharge: <strong>{adminUser.name || currentCenter?.adminName || 'Procurement Admin'}</strong>
            </span>
            <span>📱 +91 {adminUser.phone}</span>
            <span>
              📍 {currentCenter?.mandal || adminUser.mandal || 'Alathur'} Mandal ({currentCenter?.district || adminUser.district || 'Palakkad'})
            </span>
            <span className="admin-address-tag">
              🏠 Office: <strong>{adminUser.address || currentCenter?.adminAddress || 'Mandi Complex, Civil Road'}</strong>
            </span>
            <button
              type="button"
              className="edit-profile-badge-btn"
              onClick={() => {
                setEditName(adminUser.name || currentCenter?.adminName || '');
                setEditAddress(adminUser.address || currentCenter?.adminAddress || '');
                setIsEditProfileOpen(true);
              }}
              title="Update Admin Name and Address"
            >
              <Edit3 size={13} /> Edit Name & Address
            </button>
          </div>
        </div>

        <div className="top-right-controls">
          {/* Active Center Dropdown */}
          <div className="center-selector-box">
            <label>
              <Building2 size={16} /> Selected Center:
            </label>
            <select
              value={selectedCenterCode}
              onChange={(e) => setSelectedCenterCode(e.target.value)}
              className="center-dropdown"
            >
              {centers.map((c) => (
                <option key={c.centerCode} value={c.centerCode}>
                  [{c.centerCode}] {c.name} - ({c.district})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="admin-logout-btn"
            title="Logout"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Edit Admin Profile Modal (Name & Address) */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div className="admin-modal-overlay">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="admin-modal-card"
            >
              <div className="modal-header">
                <div className="modal-title-with-icon">
                  <User size={22} />
                  <div>
                    <h3>Edit Admin Profile</h3>
                    <p>Update Incharge Name & Official Mandi Address</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setIsEditProfileOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="modal-form">
                <div className="form-group">
                  <label>
                    <User size={15} /> Admin Full Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. K. Balakrishnan Nair"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <MapPin size={15} /> Official Procurement Center / Office Address *
                  </label>
                  <textarea
                    rows={3}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="e.g. Civil Station Road, Alathur Post, Palakkad District, Kerala - 678541"
                    required
                    className="admin-textarea"
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn-cancel"
                    onClick={() => setIsEditProfileOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="modal-btn-primary"
                  >
                    <Save size={16} />
                    <span>{profileSaving ? 'Saving...' : 'Save Profile Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Center Editing Restricted Notice (Requirement: ONLY Government Officer edits centers) */}
      <div className="gov-only-notice">
        <Info size={16} />
        <span>
          <strong>Procurement Center Authority Notice:</strong> Center creation, storage capacity, and location editing are managed strictly by the <strong>Superior Government Officer</strong>.
        </span>
      </div>

      {/* Action Alerts */}
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
      <div className="admin-nav-tabs">
        <button
          className={`tab-link ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <TrendingUp size={16} />
          <span>Overview & Treasury Budget</span>
        </button>
        <button
          className={`tab-link ${activeTab === 'slots' ? 'active' : ''}`}
          onClick={() => setActiveTab('slots')}
        >
          <Calendar size={16} />
          <span>Release & Manage Slots</span>
        </button>
        <button
          className={`tab-link ${activeTab === 'farmers' ? 'active' : ''}`}
          onClick={() => setActiveTab('farmers')}
        >
          <Users size={16} />
          <span>Live Farmer Queue & Weighing</span>
        </button>
        <button
          className={`tab-link ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={16} />
          <span>Sanction Farmer Payments (DBT)</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: STATS & CENTER BUDGET OVERVIEW
      ======================================================== */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-content"
        >
          <div className="stats-dashboard">
            {/* Metric Summary Cards */}
            <div className="metrics-summary-grid">
              <div className="metric-card">
                <div className="metric-header">
                  <span className="card-label">Sanctioned Treasury Budget</span>
                  <Landmark size={22} className="card-icon blue" />
                </div>
                <strong className="metric-number text-primary">
                  ₹{(stats?.allocatedBudget || currentCenter?.allocatedBudget || 0).toLocaleString('en-IN')}
                </strong>
                <span className="sub-stat">Sanctioned by Superior Govt Officer</span>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="card-label">DBT Disbursed to Farmers</span>
                  <CreditCard size={22} className="card-icon green" />
                </div>
                <strong className="metric-number text-green">
                  ₹{(stats?.totalDisbursedINR || currentCenter?.disbursedToFarmers || 0).toLocaleString('en-IN')}
                </strong>
                <span className="sub-stat">Sanctioned by Centre Admin</span>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="card-label">Remaining Centre Balance</span>
                  <ShieldCheck size={22} className="card-icon orange" />
                </div>
                <strong className="metric-number">
                  ₹{(
                    (stats?.allocatedBudget || currentCenter?.allocatedBudget || 2500000) -
                    (stats?.totalDisbursedINR || currentCenter?.disbursedToFarmers || 0)
                  ).toLocaleString('en-IN')}
                </strong>
                <span className="sub-stat">Available for Farmer Payouts</span>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="card-label">Grain Procured</span>
                  <Package size={22} className="card-icon" />
                </div>
                <strong className="metric-number">
                  {stats?.totalQuintalsProcured || 0} <span className="unit">Quintals</span>
                </strong>
                <span className="sub-stat">≈ {stats?.totalTonnesProcured || 0} Tonnes</span>
              </div>
            </div>

            {/* Crop-wise Analytics */}
            <div className="crops-analytics-panel">
              <div className="panel-title-bar">
                <h3>🌾 Crop-Wise Procurement Breakdown [{selectedCenterCode}]</h3>
                <span className="info-tag">Government MSP Rates Linked</span>
              </div>

              <div className="crop-cards-grid">
                {stats?.cropBreakdown &&
                  Object.entries(stats.cropBreakdown).map(([cropName, cropData]) => (
                    <div key={cropName} className="crop-stat-card">
                      <div className="crop-card-top">
                        <h4>{cropName}</h4>
                        <span className="msp-badge">
                          MSP: ₹{cropData.mspRate}/q
                        </span>
                      </div>
                      <div className="crop-card-metrics">
                        <div>
                          <span className="label">Procured:</span>
                          <strong>{cropData.procuredQuintals} Quintals</strong>
                        </div>
                        <div>
                          <span className="label">Total Value:</span>
                          <strong className="text-green">
                            ₹{cropData.totalValue.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div>
                          <span className="label">Farmers Served:</span>
                          <span>{cropData.farmersCount} Farmers</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          TAB 2: RELEASE & MANAGE SLOTS
      ======================================================== */}
      {activeTab === 'slots' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-content"
        >
          <div className="slots-manager-layout">
            {/* Form to Release New Slot */}
            <div className="release-slot-card">
              <h3>📅 Release Procurement Slot</h3>
              <p className="subtitle">
                Schedule a procurement window for farmers at <strong>[{selectedCenterCode}] {currentCenter?.name}</strong>
              </p>

              <form onSubmit={handleReleaseSlot} className="release-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Target Crop Type *</label>
                    <select
                      value={newSlot.crop}
                      onChange={(e) => setNewSlot({ ...newSlot, crop: e.target.value })}
                      required
                    >
                      {currentCenter?.acceptedCrops?.map((crop) => (
                        <option key={crop} value={crop}>
                          {crop} (MSP: ₹{MSP_RATES[crop] || 2300}/q)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Procurement Date *</label>
                    <input
                      type="date"
                      value={newSlot.date}
                      onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Time Window *</label>
                    <select
                      value={newSlot.time}
                      onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
                      required
                    >
                      <option value="08:30 AM - 10:30 AM">08:30 AM - 10:30 AM</option>
                      <option value="10:30 AM - 12:30 PM">10:30 AM - 12:30 PM</option>
                      <option value="01:30 PM - 03:30 PM">01:30 PM - 03:30 PM</option>
                      <option value="03:30 PM - 05:30 PM">03:30 PM - 05:30 PM</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Farmer Capacity *</label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={newSlot.capacity}
                      onChange={(e) => setNewSlot({ ...newSlot, capacity: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="release-btn">
                  <PlusCircle size={18} /> Release Slot to Farmers
                </button>
              </form>
            </div>

            {/* List of Active Scheduled Slots */}
            <div className="active-slots-list-panel">
              <h3>📋 Active Slots for [{selectedCenterCode}]</h3>
              {slots.length === 0 ? (
                <div className="no-data-box">
                  <Calendar size={36} />
                  <p>No active slots scheduled yet for this center. Release one above!</p>
                </div>
              ) : (
                <div className="slots-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Crop</th>
                        <th>Booked / Capacity</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slots.map((s) => (
                        <tr key={s._id}>
                          <td>
                            <strong>{s.date}</strong>
                            <div className="small-text">{s.time}</div>
                          </td>
                          <td>
                            <span className="crop-badge">{s.crop || 'Paddy'}</span>
                          </td>
                          <td>
                            <div className="capacity-stat">
                              <span>
                                {s.bookedCount} / {s.capacity}
                              </span>
                              <div className="mini-progress">
                                <div
                                  className="mini-bar"
                                  style={{
                                    width: `${Math.min(100, (s.bookedCount / s.capacity) * 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`status-chip ${
                                s.bookedCount >= s.capacity ? 'full' : 'active'
                              }`}
                            >
                              {s.bookedCount >= s.capacity ? 'Full' : 'Open'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => handleDeleteSlot(s._id)}
                              className="delete-icon-btn"
                              title="Cancel and Remove Slot"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          TAB 3: LIVE FARMER QUEUE & WEIGHING
      ======================================================== */}
      {activeTab === 'farmers' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-content"
        >
          <div className="farmers-queue-section">
            <div className="section-header">
              <div>
                <h3>🌾 Live Farmer Queue & Grain Verification</h3>
                <p>Record grain weights in Quintals, test quality grade, and approve procurement batches</p>
              </div>
              <button
                type="button"
                onClick={() => loadCenterData(selectedCenterCode)}
                className="refresh-btn"
              >
                ↻ Refresh Live Queue
              </button>
            </div>

            {farmersQueue.length === 0 ? (
              <div className="no-data-box">
                <Users size={36} />
                <p>No farmers currently in queue for this procurement center.</p>
              </div>
            ) : (
              <div className="slots-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Farmer Info</th>
                      <th>Slot & Crop</th>
                      <th>Weight & Value</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmersQueue.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <span className="token-number">#{item.queuePosition}</span>
                        </td>
                        <td>
                          <strong>{item.farmer?.name || 'Farmer'}</strong>
                          <div className="small-text">📱 {item.farmer?.phone}</div>
                          {item.farmer?.aadhar && (
                            <div className="small-text">ID: {item.farmer.aadhar}</div>
                          )}
                        </td>
                        <td>
                          <span className="crop-badge">{item.crop}</span>
                          <div className="small-text">{item.slot?.date}</div>
                        </td>
                        <td>
                          {item.quantityQuintals > 0 ? (
                            <div>
                              <strong>{item.quantityQuintals} Quintals</strong>
                              <div className="small-text text-green">
                                ₹{(item.totalAmount || 0).toLocaleString('en-IN')} ({item.qualityGrade})
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted">Pending Weighing</span>
                          )}
                        </td>
                        <td>
                          <span className={`status-chip ${item.status}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          {item.status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => {
                                setVerifyingBooking(item);
                                setVerifyForm({
                                  quantityQuintals: 15,
                                  qualityGrade: 'Grade A',
                                  crop: item.crop || 'Paddy (Common)'
                                });
                              }}
                              className="action-btn verify-btn"
                            >
                              <Scale size={14} /> Weigh & Verify
                            </button>
                          )}
                          {item.status === 'verified' && (
                            <button
                              type="button"
                              onClick={() => handleSanctionPaymentToFarmer(item)}
                              className="action-btn pay-btn"
                            >
                              <CreditCard size={14} /> Sanction DBT Payment
                            </button>
                          )}
                          {item.status === 'completed' && (
                            <span className="done-label">
                              <CheckCircle2 size={16} /> Sanctioned & Paid
                            </span>
                          )}
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
          TAB 4: SANCTION PAYMENTS TO FARMERS (PROCUREMENT ADMIN)
      ======================================================== */}
      {activeTab === 'payments' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-content"
        >
          <div className="payments-management-section">
            <div className="section-header">
              <div>
                <h3>💳 Procurement Admin DBT Payment Sanctioning</h3>
                <p>Sanction and disburse direct MSP payments from your Centre Treasury Budget to verified farmers</p>
              </div>
              <div className="budget-capsule">
                <span>Available Centre Budget:</span>
                <strong className="text-green">
                  ₹{(
                    (stats?.allocatedBudget || currentCenter?.allocatedBudget || 2500000) -
                    (stats?.totalDisbursedINR || currentCenter?.disbursedToFarmers || 0)
                  ).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>

            <div className="slots-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Farmer Details</th>
                    <th>Crop & Weight</th>
                    <th>MSP Rate</th>
                    <th>Sanction Amount</th>
                    <th>Status</th>
                    <th>Admin Action</th>
                  </tr>
                </thead>
                <tbody>
                  {farmersQueue
                    .filter((f) => f.status === 'verified' || f.status === 'completed')
                    .map((item) => (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.farmer?.name}</strong>
                          <div className="small-text">A/C: {item.farmer?.bankAccount || '••••8283'}</div>
                          <div className="small-text">📱 {item.farmer?.phone}</div>
                        </td>
                        <td>
                          <strong>{item.crop}</strong>
                          <div className="small-text">
                            {item.quantityQuintals || 10} Quintals ({item.qualityGrade || 'Grade A'})
                          </div>
                        </td>
                        <td>
                          ₹{item.ratePerQuintal || MSP_RATES[item.crop] || 2300}/q
                        </td>
                        <td>
                          <strong className="text-green text-lg">
                            ₹{(item.totalAmount || 23000).toLocaleString('en-IN')}
                          </strong>
                        </td>
                        <td>
                          <span className={`status-chip ${item.status}`}>
                            {item.status === 'completed' ? 'Sanctioned (Paid)' : 'Awaiting Admin Sanction'}
                          </span>
                        </td>
                        <td>
                          {item.status === 'verified' ? (
                            <button
                              type="button"
                              onClick={() => handleSanctionPaymentToFarmer(item)}
                              className="action-btn pay-btn"
                            >
                              <ShieldCheck size={16} /> Sanction & Pay DBT
                            </button>
                          ) : (
                            <span className="done-label">
                              <CheckCircle2 size={16} /> DBT Disbursed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {farmersQueue.filter((f) => f.status === 'verified' || f.status === 'completed').length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">
                        No verified grain batches pending payment. Go to "Live Farmer Queue & Weighing" to weigh and verify farmer grain.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================
          MODAL: WEIGHING & QUALITY VERIFICATION
      ======================================================== */}
      <AnimatePresence>
        {verifyingBooking && (
          <div className="admin-modal-backdrop">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="admin-modal"
            >
              <div className="modal-header">
                <h3>⚖️ Grain Weighing & Quality Grading</h3>
                <button
                  type="button"
                  onClick={() => setVerifyingBooking(null)}
                  className="close-modal-btn"
                >
                  ✕
                </button>
              </div>

              <div className="farmer-summary-banner">
                <div>
                  <strong>Farmer: {verifyingBooking.farmer?.name}</strong>
                  <div className="small-text">Phone: +91 {verifyingBooking.farmer?.phone}</div>
                </div>
                <div className="token-pill">Token #{verifyingBooking.queuePosition}</div>
              </div>

              <form onSubmit={handleVerifyFarmer} className="modal-form">
                <div className="form-group">
                  <label>Crop Type</label>
                  <select
                    value={verifyForm.crop}
                    onChange={(e) => setVerifyForm({ ...verifyForm, crop: e.target.value })}
                  >
                    {Object.keys(MSP_RATES).map((c) => (
                      <option key={c} value={c}>
                        {c} (MSP: ₹{MSP_RATES[c]}/q)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Measured Grain Weight (in Quintals) *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="500"
                    value={verifyForm.quantityQuintals}
                    onChange={(e) =>
                      setVerifyForm({ ...verifyForm, quantityQuintals: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quality Grade</label>
                  <select
                    value={verifyForm.qualityGrade}
                    onChange={(e) =>
                      setVerifyForm({ ...verifyForm, qualityGrade: e.target.value })
                    }
                  >
                    <option value="Grade A">Grade A (100% MSP Rate)</option>
                    <option value="FAQ">FAQ - Fair Average Quality (100% MSP)</option>
                    <option value="Grade B">Grade B (Standard)</option>
                  </select>
                </div>

                {/* Live Payout Preview */}
                <div className="payout-preview-box">
                  <span className="payout-label">Calculated Payout Amount:</span>
                  <strong className="payout-amount">
                    ₹
                    {(
                      (Number(verifyForm.quantityQuintals) || 0) *
                      (MSP_RATES[verifyForm.crop] || 2300)
                    ).toLocaleString('en-IN')}
                  </strong>
                  <div className="small-text">
                    {verifyForm.quantityQuintals} q × ₹{MSP_RATES[verifyForm.crop] || 2300}/q
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setVerifyingBooking(null)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="confirm-btn">
                    ✓ Confirm & Approve Weight
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AdminPanel;
