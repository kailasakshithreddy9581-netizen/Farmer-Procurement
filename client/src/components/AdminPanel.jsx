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
  Tag
} from 'lucide-react';
import { translations } from '../languages';
import '../styles/AdminPanel.css';

const API_BASE = process.env.REACT_APP_API || 'http://localhost:5000/api';

function AdminPanel({ language = 'en' }) {
  // eslint-disable-next-line no-unused-vars
  const t = translations[language] || translations.en;

  const [centers, setCenters] = useState([]);
  const [selectedCenterCode, setSelectedCenterCode] = useState('');
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'slots' | 'farmers' | 'payments' | 'newCenter'
  const [stats, setStats] = useState(null);
  const [slots, setSlots] = useState([]);
  const [farmersQueue, setFarmersQueue] = useState([]);
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

  // Create Center Form State
  const [newCenterForm, setNewCenterForm] = useState({
    centerCode: '',
    name: '',
    district: '',
    state: 'Telangana',
    adminName: '',
    adminPhone: '',
    totalCapacityTonnes: 500,
    acceptedCrops: ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize']
  });

  // Verify Farmer Modal State
  const [verifyingBooking, setVerifyingBooking] = useState(null);
  const [verifyForm, setVerifyForm] = useState({
    quantityQuintals: 15,
    qualityGrade: 'Grade A',
    crop: 'Paddy (Common)'
  });

  const allAvailableCrops = [
    'Paddy (Common)',
    'Paddy (Grade A)',
    'Wheat',
    'Cotton',
    'Maize',
    'Soyabean',
    'Pulses'
  ];

  useEffect(() => {
    fetchCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (res.data && res.data.length > 0 && !selectedCenterCode) {
        setSelectedCenterCode(res.data[0].centerCode);
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
      }
    } catch (err) {
      console.error('Error loading center data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCenter = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (!newCenterForm.centerCode || !newCenterForm.name || !newCenterForm.district) {
      setActionError('Center Code, Name, and District are required');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/admin/centers/create`, newCenterForm);
      if (res.data.success) {
        setActionSuccess(res.data.message);
        await fetchCenters();
        setSelectedCenterCode(newCenterForm.centerCode.toUpperCase());
        setActiveTab('stats');
        setNewCenterForm({
          centerCode: '',
          name: '',
          district: '',
          state: 'Telangana',
          adminName: '',
          adminPhone: '',
          totalCapacityTonnes: 500,
          acceptedCrops: ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize']
        });
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to create procurement center');
    }
  };

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

  const handleApprovePayment = async (booking) => {
    try {
      const res = await axios.post(`${API_BASE}/admin/procurement/pay`, {
        bookingId: booking._id,
        amount: booking.totalAmount || 23000
      });

      if (res.data.success) {
        setActionSuccess(res.data.message);
        loadCenterData(selectedCenterCode);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      alert('Payment disbursement failed: ' + err.message);
    }
  };

  const handleToggleCrop = async (cropName) => {
    const center = centers.find((c) => c.centerCode === selectedCenterCode);
    if (!center) return;

    let updatedCrops;
    if (center.acceptedCrops.includes(cropName)) {
      if (center.acceptedCrops.length === 1) {
        alert('A center must accept at least one crop.');
        return;
      }
      updatedCrops = center.acceptedCrops.filter((c) => c !== cropName);
    } else {
      updatedCrops = [...center.acceptedCrops, cropName];
    }

    try {
      const res = await axios.put(`${API_BASE}/admin/centers/${selectedCenterCode}/crops`, {
        acceptedCrops: updatedCrops
      });

      if (res.data.success) {
        setCenters(centers.map((c) => (c.centerCode === selectedCenterCode ? res.data.center : c)));
        loadCenterData(selectedCenterCode);
      }
    } catch (err) {
      alert('Failed to update accepted crops');
    }
  };

  const currentCenter = centers.find((c) => c.centerCode === selectedCenterCode);

  return (
    <div className="admin-portal-wrapper">
      {/* Header & Center Code Switcher */}
      <div className="admin-top-banner">
        <div className="admin-title-area">
          <div className="admin-badge">
            <ShieldCheck size={18} />
            <span>Mandi Admin Authority</span>
          </div>
          <h2>🏢 Procurement Center Control Portal</h2>
          <p>Manage Centre Slots, Live Farmer Queue, Grain Quality Testing & DBT Settlements</p>
        </div>

        {/* Center Selector Dropdown */}
        <div className="center-selector-box">
          <label>
            <Building2 size={16} /> Active Procurement Center:
          </label>
          <div className="center-select-row">
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
            <button
              type="button"
              onClick={() => setActiveTab('newCenter')}
              className="add-center-btn"
              title="Add New Procurement Center"
            >
              <PlusCircle size={16} /> Add Center
            </button>
          </div>
        </div>
      </div>

      {/* Action Notifications */}
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

      {/* Admin Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          className={`tab-link ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <TrendingUp size={16} />
          <span>Overview & Crop Stats</span>
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
          <span>Farmer Arrivals & Weighing</span>
        </button>
        <button
          className={`tab-link ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={16} />
          <span>DBT MSP Payments</span>
        </button>
      </div>

      {/* ========================================================
          TAB 1: STATS & CROP INVENTORY OVERVIEW
      ======================================================== */}
      {activeTab === 'stats' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-content"
        >
          {loading && !stats ? (
            <div className="admin-loading">
              <div className="spinner"></div>
              <p>Loading center statistics...</p>
            </div>
          ) : (
            <div className="stats-dashboard">
              {/* Summary Metric Cards */}
              <div className="metrics-summary-grid">
                <div className="metric-card">
                  <div className="metric-header">
                    <span className="card-label">Total Grain Procured</span>
                    <Package size={22} className="card-icon" />
                  </div>
                  <strong className="metric-number">
                    {stats?.totalQuintalsProcured || 0} <span className="unit">Quintals</span>
                  </strong>
                  <span className="sub-stat">≈ {stats?.totalTonnesProcured || 0} Tonnes</span>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="card-label">DBT Funds Disbursed</span>
                    <CreditCard size={22} className="card-icon green" />
                  </div>
                  <strong className="metric-number text-green">
                    ₹{(stats?.totalDisbursedINR || 0).toLocaleString('en-IN')}
                  </strong>
                  <span className="sub-stat">Direct Bank Transfers</span>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="card-label">Farmers Served</span>
                    <Users size={22} className="card-icon orange" />
                  </div>
                  <strong className="metric-number">
                    {stats?.totalFarmersServed || 0}
                  </strong>
                  <span className="sub-stat">{stats?.waitingFarmers || 0} in active queue</span>
                </div>

                <div className="metric-card">
                  <div className="metric-header">
                    <span className="card-label">Warehouse Capacity</span>
                    <Building2 size={22} className="card-icon" />
                  </div>
                  <strong className="metric-number">
                    {currentCenter?.currentStorageTonnes || 0} / {currentCenter?.totalCapacityTonnes || 500}
                    <span className="unit"> Tonnes</span>
                  </strong>
                  <div className="storage-track">
                    <div
                      className="storage-bar"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            ((currentCenter?.currentStorageTonnes || 0) /
                              (currentCenter?.totalCapacityTonnes || 500)) *
                              100
                          )
                        )}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Crop-wise Procurement Statistics */}
              <div className="crops-analytics-panel">
                <div className="panel-title-bar">
                  <h3>🌾 Crop-Wise Procurement Breakdown</h3>
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
                            <span className="label">Batches Processed:</span>
                            <span>{cropData.farmersCount} Farmers</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Accepted Crops Configuration */}
              <div className="manage-crops-section">
                <h3>🏷️ Manage Crops Accepted at [{selectedCenterCode}]</h3>
                <p>Click on any crop tag to toggle buying status for this procurement center:</p>
                <div className="crop-tags-selector">
                  {allAvailableCrops.map((crop) => {
                    const isAccepted = currentCenter?.acceptedCrops?.includes(crop);
                    return (
                      <button
                        key={crop}
                        type="button"
                        onClick={() => handleToggleCrop(crop)}
                        className={`crop-tag-pill ${isAccepted ? 'accepted' : 'inactive'}`}
                      >
                        <Tag size={14} />
                        <span>{crop}</span>
                        <span className="status-indicator">
                          {isAccepted ? '✓ Buying' : '+ Disabled'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
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
              <h3>📅 Release New Procurement Slot</h3>
              <p className="subtitle">
                Schedule a time window for farmers at <strong>[{selectedCenterCode}] {currentCenter?.name}</strong>
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
                    <label>Farmer Capacity (Max Farmers) *</label>
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
              <h3>📋 Released Slots for [{selectedCenterCode}]</h3>
              {slots.length === 0 ? (
                <div className="no-data-box">
                  <Calendar size={36} />
                  <p>No active slots released yet for this center. Create one above!</p>
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
          TAB 3: LIVE FARMER ARRIVALS & WEIGHING
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
                <h3>🌾 Registered Farmer Queue & Grain Verification</h3>
                <p>Record grain weights in Quintals, test quality grade, and approve procurement</p>
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
                <p>No farmers currently in queue for this center.</p>
              </div>
            ) : (
              <div className="slots-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Farmer Info</th>
                      <th>Slot & Crop</th>
                      <th>Weight & MSP</th>
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
                              onClick={() => handleApprovePayment(item)}
                              className="action-btn pay-btn"
                            >
                              <CreditCard size={14} /> Pay DBT
                            </button>
                          )}
                          {item.status === 'completed' && (
                            <span className="done-label">
                              <CheckCircle2 size={16} /> Paid
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
          TAB 4: DBT PAYMENTS DISBURSEMENT
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
                <h3>💳 Direct Benefit Transfer (DBT) MSP Settlements</h3>
                <p>Authorize government MSP payments directly to verified farmers' bank accounts</p>
              </div>
            </div>

            <div className="slots-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Crop & Weight</th>
                    <th>MSP Rate</th>
                    <th>Settlement Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {farmersQueue
                    .filter((f) => f.status === 'verified' || f.status === 'completed')
                    .map((item) => (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.farmer?.name}</strong>
                          <div className="small-text">A/C: {item.farmer?.bankAccount || 'Linked Bank'}</div>
                          <div className="small-text">📱 {item.farmer?.phone}</div>
                        </td>
                        <td>
                          <strong>{item.crop}</strong>
                          <div className="small-text">{item.quantityQuintals || 10} Quintals ({item.qualityGrade})</div>
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
                            {item.status === 'completed' ? 'Paid to Bank' : 'Ready for Payment'}
                          </span>
                        </td>
                        <td>
                          {item.status === 'verified' ? (
                            <button
                              type="button"
                              onClick={() => handleApprovePayment(item)}
                              className="action-btn pay-btn"
                            >
                              <ShieldCheck size={16} /> Disburse DBT Funds
                            </button>
                          ) : (
                            <span className="done-label">
                              <CheckCircle2 size={16} /> DBT Completed
                            </span>
                          )}
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
          TAB 5: ADD NEW PROCUREMENT CENTER
      ======================================================== */}
      {activeTab === 'newCenter' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tab-content"
        >
          <div className="new-center-card">
            <h3>🏢 Register New Procurement Center</h3>
            <p className="subtitle">Assign a unique Center Code, location, capacity, and accepted crop types</p>

            <form onSubmit={handleCreateCenter} className="center-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Unique Center Code * (e.g. CENT-KRN-04)</label>
                  <input
                    type="text"
                    placeholder="e.g. CENT-HYD-04"
                    value={newCenterForm.centerCode}
                    onChange={(e) =>
                      setNewCenterForm({
                        ...newCenterForm,
                        centerCode: e.target.value.toUpperCase()
                      })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Procurement Center Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Karimnagar APMC Main Mandi"
                    value={newCenterForm.name}
                    onChange={(e) =>
                      setNewCenterForm({ ...newCenterForm, name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>District *</label>
                  <input
                    type="text"
                    placeholder="e.g. Karimnagar"
                    value={newCenterForm.district}
                    onChange={(e) =>
                      setNewCenterForm({ ...newCenterForm, district: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Storage Capacity (Tonnes)</label>
                  <input
                    type="number"
                    value={newCenterForm.totalCapacityTonnes}
                    onChange={(e) =>
                      setNewCenterForm({
                        ...newCenterForm,
                        totalCapacityTonnes: e.target.value
                      })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Mandi Officer Name</label>
                  <input
                    type="text"
                    placeholder="Officer In-charge"
                    value={newCenterForm.adminName}
                    onChange={(e) =>
                      setNewCenterForm({ ...newCenterForm, adminName: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="10-digit phone"
                    value={newCenterForm.adminPhone}
                    onChange={(e) =>
                      setNewCenterForm({ ...newCenterForm, adminPhone: e.target.value })
                    }
                  />
                </div>
              </div>

              <button type="submit" className="submit-center-btn">
                <PlusCircle size={18} /> Register Procurement Center
              </button>
            </form>
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
                  <div className="small-text">Phone: {verifyingBooking.farmer?.phone}</div>
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
                    {allAvailableCrops.map((c) => (
                      <option key={c} value={c}>
                        {c} (MSP: ₹{MSP_RATES[c] || 2300}/q)
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

const MSP_RATES = {
  'Paddy (Common)': 2300,
  'Paddy (Grade A)': 2320,
  'Wheat': 2275,
  'Cotton': 7121,
  'Maize': 2090,
  'Soyabean': 4892,
  'Pulses': 8682
};

export default AdminPanel;
