const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/farmer-procurement';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB Connected successfully');
    await seedInitialData();
  })
  .catch(err => console.error('MongoDB Connection Error:', err.message));

// ==========================================
// Schemas & Models
// ==========================================

// 1. Farmer Schema
const farmerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, index: true },
  aadhar: { type: String },
  address: { type: String },
  bankAccount: { type: String },
  upi: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// 2. Mandal Superior Officer Schema
const mandalOfficerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true, index: true },
  mandal: { type: String, required: true, index: true },
  district: { type: String, required: true },
  state: { type: String, default: 'Telangana' },
  designation: { type: String, default: 'Mandal Agricultural Officer (MAO)' },
  employeeId: { type: String, required: true },
  department: { type: String, default: 'Department of Agriculture & Food Procurement' },
  createdAt: { type: Date, default: Date.now }
});

// 3. OTP Schema
const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: '10m' } },
  createdAt: { type: Date, default: Date.now }
});

// 4. Procurement Center Schema (with Mandal & Bank Details)
const procurementCenterSchema = new mongoose.Schema({
  centerCode: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true },
  mandal: { type: String, required: true, index: true },
  district: { type: String, required: true },
  state: { type: String, default: 'Telangana' },
  adminName: { type: String, default: 'Mandi Officer' },
  adminPhone: { type: String, default: '9876543210' },
  adminPin: { type: String, default: '1234' },
  bankDetails: {
    bankName: { type: String, default: 'State Bank of India' },
    accountNumber: { type: String, default: '38920192831' },
    ifscCode: { type: String, default: 'SBIN0001234' },
    branch: { type: String, default: 'APMC Mandi Branch' },
    accountHolderName: { type: String, default: 'Mandi Procurement Operations A/C' }
  },
  allocatedBudget: { type: Number, default: 2500000 }, // ₹25 Lakhs initial sanctioned treasury budget
  disbursedToFarmers: { type: Number, default: 0 },
  acceptedCrops: {
    type: [String],
    default: ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize', 'Soyabean', 'Pulses']
  },
  totalCapacityTonnes: { type: Number, default: 500 },
  currentStorageTonnes: { type: Number, default: 85 },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

// 5. Mandal Fund Sanction Transaction (Treasury Order)
const mandalFundSanctionSchema = new mongoose.Schema({
  mandal: { type: String, required: true, index: true },
  centerCode: { type: String, required: true, index: true },
  centerName: String,
  officerId: String,
  officerName: String,
  officerPhone: String,
  amount: { type: Number, required: true },
  bankUsed: { type: String, default: 'State Bank of India - Govt Treasury NetBanking' },
  netbankingUserId: String,
  treasuryOrderId: { type: String, unique: true, required: true },
  paymentGatewayRef: String,
  status: { type: String, enum: ['sanctioned', 'transferred'], default: 'transferred' },
  createdAt: { type: Date, default: Date.now }
});

// 6. Slots Schema
const slotSchema = new mongoose.Schema({
  centerCode: { type: String, required: true, index: true },
  center: { type: String, required: true },
  crop: { type: String, default: 'Paddy (Common)' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  capacity: { type: Number, default: 30 },
  bookedCount: { type: Number, default: 0 },
  bookings: [String],
  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

// 7. Booking Schema
const bookingSchema = new mongoose.Schema({
  farmerId: { type: String, required: true, index: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  centerCode: { type: String, index: true },
  crop: { type: String, default: 'Paddy (Common)' },
  quantityQuintals: { type: Number, default: 0 },
  qualityGrade: { type: String, default: 'Grade A' },
  ratePerQuintal: { type: Number, default: 2300 },
  totalAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'verified', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  queuePosition: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now }
});

// 8. Payment Schema
const paymentSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  farmerId: { type: String, index: true },
  centerCode: { type: String, index: true },
  crop: { type: String, default: 'Paddy (Common)' },
  quantityQuintals: { type: Number, default: 10 },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'completed' },
  transactionId: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Farmer = mongoose.model('Farmer', farmerSchema);
const MandalOfficer = mongoose.model('MandalOfficer', mandalOfficerSchema);
const OTP = mongoose.model('OTP', otpSchema);
const ProcurementCenter = mongoose.model('ProcurementCenter', procurementCenterSchema);
const MandalFundSanction = mongoose.model('MandalFundSanction', mandalFundSanctionSchema);
const Slot = mongoose.model('Slot', slotSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Payment = mongoose.model('Payment', paymentSchema);

// Government Minimum Support Price (MSP) in ₹ per Quintal
const MSP_RATES = {
  'Paddy (Common)': 2300,
  'Paddy (Grade A)': 2320,
  'Wheat': 2275,
  'Cotton': 7121,
  'Maize': 2090,
  'Soyabean': 4892,
  'Pulses': 8682
};

// Seed initial procurement centers & default data
async function seedInitialData() {
  try {
    const centerCount = await ProcurementCenter.countDocuments();
    if (centerCount === 0) {
      const initialCenters = [
        {
          centerCode: 'CENT-PAT-01',
          name: 'Main APMC Mandi Center - Patancheru',
          mandal: 'Patancheru',
          district: 'Medak / Sangareddy',
          state: 'Telangana',
          adminName: 'R. K. Sharma (Mandi Supdt.)',
          adminPhone: '9848012345',
          adminPin: '1234',
          bankDetails: {
            bankName: 'State Bank of India',
            accountNumber: '38920192831',
            ifscCode: 'SBIN0020145',
            branch: 'Patancheru APMC Branch',
            accountHolderName: 'Patancheru Mandi Operations A/C'
          },
          allocatedBudget: 5000000,
          disbursedToFarmers: 0,
          acceptedCrops: ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize'],
          totalCapacityTonnes: 1000,
          currentStorageTonnes: 340
        },
        {
          centerCode: 'CENT-KYA-02',
          name: 'Kyasaram Farmer Procurement Kendra',
          mandal: 'Patancheru',
          district: 'Medak / Sangareddy',
          state: 'Telangana',
          adminName: 'S. Narsimha Rao',
          adminPhone: '9849056789',
          adminPin: '1234',
          bankDetails: {
            bankName: 'Telangana Grameena Bank',
            accountNumber: '62149872110',
            ifscCode: 'TGB0001092',
            branch: 'Kyasaram Gram Panchayat Branch',
            accountHolderName: 'Kyasaram Procurement Center A/C'
          },
          allocatedBudget: 3500000,
          disbursedToFarmers: 0,
          acceptedCrops: ['Paddy (Common)', 'Maize', 'Pulses'],
          totalCapacityTonnes: 800,
          currentStorageTonnes: 210
        },
        {
          centerCode: 'CENT-NZB-03',
          name: 'Kisan Seva Kendra - North Nizamabad',
          mandal: 'Nizamabad North',
          district: 'Nizamabad',
          state: 'Telangana',
          adminName: 'P. Venkat Reddy',
          adminPhone: '9849991234',
          adminPin: '1234',
          bankDetails: {
            bankName: 'Union Bank of India',
            accountNumber: '5102010098451',
            ifscCode: 'UBIN0551020',
            branch: 'Nizamabad Market Yard',
            accountHolderName: 'North Nizamabad Procurement A/C'
          },
          allocatedBudget: 4000000,
          disbursedToFarmers: 0,
          acceptedCrops: ['Paddy (Common)', 'Soyabean', 'Cotton'],
          totalCapacityTonnes: 600,
          currentStorageTonnes: 145
        }
      ];
      await ProcurementCenter.insertMany(initialCenters);
      console.log('Seeded initial procurement centers with Mandals & Bank details');
    }

    // Seed default Mandal Officer if none exists
    const officerCount = await MandalOfficer.countDocuments();
    if (officerCount === 0) {
      await MandalOfficer.create({
        name: 'Dr. K. Sudhakar Rao',
        phone: '9848099887',
        mandal: 'Patancheru',
        district: 'Medak / Sangareddy',
        state: 'Telangana',
        designation: 'Mandal Agricultural Officer (MAO)',
        employeeId: 'GOV-TS-AGRI-2026-99',
        department: 'Agriculture & Cooperation Department, Govt of Telangana'
      });
      console.log('Seeded default Mandal Officer for Patancheru Mandal');
    }

    const slotCount = await Slot.countDocuments();
    if (slotCount === 0) {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];

      const initialSlots = [
        { centerCode: 'CENT-PAT-01', center: 'Main APMC Mandi Center - Patancheru', crop: 'Paddy (Common)', date: today, time: '09:00 AM - 11:00 AM', capacity: 25, bookedCount: 0, bookings: [] },
        { centerCode: 'CENT-PAT-01', center: 'Main APMC Mandi Center - Patancheru', crop: 'Cotton', date: today, time: '11:30 AM - 01:30 PM', capacity: 25, bookedCount: 0, bookings: [] },
        { centerCode: 'CENT-KYA-02', center: 'Kyasaram Farmer Procurement Kendra', crop: 'Paddy (Common)', date: today, time: '02:30 PM - 04:30 PM', capacity: 30, bookedCount: 0, bookings: [] },
        { centerCode: 'CENT-NZB-03', center: 'Kisan Seva Kendra - North Nizamabad', crop: 'Soyabean', date: tomorrow, time: '09:00 AM - 11:00 AM', capacity: 30, bookedCount: 0, bookings: [] },
        { centerCode: 'CENT-PAT-01', center: 'Main APMC Mandi Center - Patancheru', crop: 'Wheat', date: tomorrow, time: '11:30 AM - 01:30 PM', capacity: 30, bookedCount: 0, bookings: [] },
        { centerCode: 'CENT-KYA-02', center: 'Kyasaram Farmer Procurement Kendra', crop: 'Maize', date: dayAfter, time: '09:00 AM - 11:00 AM', capacity: 30, bookedCount: 0, bookings: [] }
      ];
      await Slot.insertMany(initialSlots);
      console.log('Seeded initial procurement slots with crops');
    }
  } catch (err) {
    console.error('Error seeding initial data:', err.message);
  }
}

// ==========================================
// Authentication & OTP Routes (Farmers, Officers, Admins)
// ==========================================

app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    if (!phone || phone.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number' });
    }

    const cleanPhone = phone.trim();

    // 1. Mandal Officer Flow
    if (purpose === 'mandal_login') {
      const existingOfficer = await MandalOfficer.findOne({ phone: cleanPhone });
      if (!existingOfficer) {
        return res.status(404).json({
          success: false,
          message: 'No Mandal Officer account registered with this mobile number. Please register your officer profile first.'
        });
      }
    } else if (purpose === 'mandal_register') {
      const existingOfficer = await MandalOfficer.findOne({ phone: cleanPhone });
      if (existingOfficer) {
        return res.status(400).json({
          success: false,
          alreadyRegistered: true,
          message: 'This mobile number is already registered as a Mandal Officer! Please login directly.'
        });
      }
    } else if (purpose === 'login') {
      // 2. Farmer Login Flow
      const existingFarmer = await Farmer.findOne({ phone: cleanPhone });
      if (!existingFarmer) {
        return res.status(404).json({
          success: false,
          message: 'No registered farmer found with this mobile number. Please register first.'
        });
      }
    } else if (purpose === 'register') {
      // 3. Farmer Register Flow
      const existingFarmer = await Farmer.findOne({ phone: cleanPhone });
      if (existingFarmer) {
        return res.status(400).json({
          success: false,
          alreadyRegistered: true,
          message: 'This mobile number is already registered! Please login directly using OTP.'
        });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.findOneAndUpdate(
      { phone: cleanPhone },
      { otp, expiresAt, createdAt: new Date() },
      { upsert: true, new: true }
    );

    console.log(`📲 [SMS GATEWAY OTP] Mobile: ${cleanPhone} | Purpose: ${purpose || 'general'} | OTP: ${otp}`);

    res.json({
      success: true,
      message: `OTP sent successfully to ${cleanPhone}`,
      phone: cleanPhone,
      otp
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { phone, otp, purpose } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }

    const cleanPhone = phone.trim();
    const cleanOtp = otp.trim();

    const record = await OTP.findOne({ phone: cleanPhone });
    if (!record || record.otp !== cleanOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please check the code and try again.' });
    }

    if (new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    await OTP.deleteOne({ _id: record._id });

    // Check if purpose is mandal officer or officer exists
    const officer = await MandalOfficer.findOne({ phone: cleanPhone });
    if (officer) {
      return res.json({
        success: true,
        message: 'Mandal Officer verified and logged in successfully',
        role: 'mandal_officer',
        officerId: officer._id,
        officer
      });
    }

    // Check if farmer exists
    const farmer = await Farmer.findOne({ phone: cleanPhone });
    if (farmer) {
      return res.json({
        success: true,
        message: 'Logged in successfully',
        role: 'farmer',
        farmerId: farmer._id,
        farmer
      });
    }

    res.json({
      success: true,
      verified: true,
      phone: cleanPhone,
      message: 'Mobile number verified successfully'
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// Mandal Superior Officer Registration & APIs
// ==========================================

// 1. Register new Mandal Officer
app.post('/api/mandal/register', async (req, res) => {
  try {
    const { name, phone, mandal, district, state, designation, employeeId, department } = req.body;

    if (!name || !phone || !mandal || !district) {
      return res.status(400).json({ success: false, message: 'Name, Mobile Number, Mandal, and District are mandatory.' });
    }

    const cleanPhone = phone.trim();
    const existing = await MandalOfficer.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(400).json({
        success: false,
        alreadyRegistered: true,
        message: 'A Mandal Officer with this mobile number is already registered! Please login with OTP.'
      });
    }

    const officer = new MandalOfficer({
      name: name.trim(),
      phone: cleanPhone,
      mandal: mandal.trim(),
      district: district.trim(),
      state: state || 'Telangana',
      designation: designation || 'Mandal Agricultural Officer (MAO)',
      employeeId: employeeId || 'EMP-' + Math.floor(100000 + Math.random() * 900000),
      department: department || 'Department of Agriculture'
    });

    await officer.save();
    console.log(`🏛️ Registered new Mandal Officer: ${officer.name} for Mandal [${officer.mandal}]`);

    res.json({
      success: true,
      message: `Mandal Officer profile created successfully for ${officer.mandal} Mandal!`,
      officerId: officer._id,
      officer
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get Procurement Centers for Officer's Mandal
app.get('/api/mandal/:mandalName/centers', async (req, res) => {
  try {
    const mandalQuery = new RegExp(`^${req.params.mandalName.trim()}$`, 'i');
    const centers = await ProcurementCenter.find({ mandal: mandalQuery });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Get Full Aggregated Mandal Overview & Stats
app.get('/api/mandal/:mandalName/overview', async (req, res) => {
  try {
    const mandalQuery = new RegExp(`^${req.params.mandalName.trim()}$`, 'i');
    const centers = await ProcurementCenter.find({ mandal: mandalQuery });
    const centerCodes = centers.map(c => c.centerCode);

    const slots = await Slot.find({ centerCode: { $in: centerCodes } });
    const slotIds = slots.map(s => s._id);

    const bookings = await Booking.find({ slotId: { $in: slotIds } });
    const sanctions = await MandalFundSanction.find({ mandal: mandalQuery }).sort({ createdAt: -1 });

    let totalQuintals = 0;
    let totalDisbursedToFarmers = 0;
    const cropBreakdown = {};

    bookings.forEach(b => {
      const c = b.crop || 'Paddy (Common)';
      if (!cropBreakdown[c]) {
        cropBreakdown[c] = { quintals: 0, farmers: 0, amount: 0 };
      }
      if (b.status === 'verified' || b.status === 'completed') {
        const weight = b.quantityQuintals || 10;
        const val = b.totalAmount || weight * (MSP_RATES[c] || 2300);
        totalQuintals += weight;
        totalDisbursedToFarmers += val;
        cropBreakdown[c].quintals += weight;
        cropBreakdown[c].farmers += 1;
        cropBreakdown[c].amount += val;
      }
    });

    const totalAllocatedBudget = centers.reduce((sum, c) => sum + (c.allocatedBudget || 0), 0);
    const totalStorageCapacity = centers.reduce((sum, c) => sum + (c.totalCapacityTonnes || 0), 0);
    const currentStoredTonnes = centers.reduce((sum, c) => sum + (c.currentStorageTonnes || 0), 0);

    res.json({
      success: true,
      mandal: req.params.mandalName,
      centersCount: centers.length,
      centers,
      totalAllocatedBudget,
      totalDisbursedToFarmers,
      remainingTreasuryBalance: totalAllocatedBudget - totalDisbursedToFarmers,
      totalQuintalsProcured: totalQuintals,
      totalTonnesProcured: Math.round(totalQuintals / 10),
      totalStorageCapacity,
      currentStoredTonnes,
      cropBreakdown,
      recentSanctions: sanctions.slice(0, 5),
      totalSanctionsCount: sanctions.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Sanction Funds via NetBanking Gateway to a Center
app.post('/api/mandal/sanction-funds', async (req, res) => {
  try {
    const { mandal, centerCode, officerId, officerName, officerPhone, amount, bankUsed, netbankingUserId } = req.body;

    if (!mandal || !centerCode || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Mandal, Center Code, and valid Sanction Amount are required' });
    }

    const center = await ProcurementCenter.findOne({ centerCode: centerCode.toUpperCase() });
    if (!center) {
      return res.status(404).json({ success: false, message: 'Procurement center not found' });
    }

    const sanctionAmount = Number(amount);
    const orderId = `SANCTION-TS-${center.district.substring(0, 3).toUpperCase()}-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    const gatewayRef = `NB-TXN-${Date.now().toString(36).toUpperCase()}`;

    // Create Sanction Record
    const sanctionRecord = new MandalFundSanction({
      mandal: mandal.trim(),
      centerCode: center.centerCode,
      centerName: center.name,
      officerId,
      officerName: officerName || 'Mandal Agricultural Officer',
      officerPhone: officerPhone || '',
      amount: sanctionAmount,
      bankUsed: bankUsed || 'State Bank of India - Govt NetBanking Gateway',
      netbankingUserId: netbankingUserId || 'GOV_TREASURY_USER',
      treasuryOrderId: orderId,
      paymentGatewayRef: gatewayRef,
      status: 'transferred'
    });

    await sanctionRecord.save();

    // Increment Allocated Budget for Center
    center.allocatedBudget = (center.allocatedBudget || 0) + sanctionAmount;
    await center.save();

    console.log(`💳 [NETBANKING TREASURY GATEWAY] Sanctioned ₹${sanctionAmount.toLocaleString('en-IN')} to Center [${center.centerCode}] via Order ID: ${orderId}`);

    // Emit Socket Update
    io.emit('budget-sanctioned', {
      centerCode: center.centerCode,
      newAllocatedBudget: center.allocatedBudget,
      sanctionAmount,
      orderId
    });

    res.json({
      success: true,
      message: `Funds of ₹${sanctionAmount.toLocaleString('en-IN')} sanctioned and transferred via NetBanking to ${center.name}!`,
      sanctionRecord,
      center
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Update Center Bank Details (By Center Admin)
app.put('/api/admin/centers/:code/bank-details', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { bankName, accountNumber, ifscCode, branch, accountHolderName } = req.body;

    const center = await ProcurementCenter.findOne({ centerCode: code });
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    center.bankDetails = {
      bankName: bankName || center.bankDetails.bankName,
      accountNumber: accountNumber || center.bankDetails.accountNumber,
      ifscCode: ifscCode || center.bankDetails.ifscCode,
      branch: branch || center.bankDetails.branch,
      accountHolderName: accountHolderName || center.bankDetails.accountHolderName
    };

    await center.save();

    res.json({
      success: true,
      bankDetails: center.bankDetails,
      message: `Bank account details updated for Procurement Center [${code}]`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// Farmer Registration & Profile Routes
// ==========================================

app.post('/api/farmers/register', async (req, res) => {
  try {
    const { name, phone, aadhar, address, bankAccount, upi } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Farmer name and mobile number are required' });
    }

    const cleanPhone = phone.trim();

    const existingPhone = await Farmer.findOne({ phone: cleanPhone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        alreadyRegistered: true,
        message: 'This mobile number is already registered! Please login using your mobile number and OTP.',
        farmerId: existingPhone._id
      });
    }

    if (aadhar && aadhar.trim()) {
      const existingAadhar = await Farmer.findOne({ aadhar: aadhar.trim() });
      if (existingAadhar) {
        return res.status(400).json({
          success: false,
          alreadyRegistered: true,
          message: 'A farmer with this Aadhar number is already registered! Please login with your mobile number.',
          farmerId: existingAadhar._id
        });
      }
    }

    const farmer = new Farmer({
      name: name.trim(),
      phone: cleanPhone,
      aadhar: aadhar ? aadhar.trim() : '',
      address: address ? address.trim() : '',
      bankAccount: bankAccount ? bankAccount.trim() : '',
      upi: upi ? upi.trim() : ''
    });

    await farmer.save();

    res.json({
      success: true,
      message: 'Registration successful! Welcome to the Farmer Procurement Platform.',
      farmerId: farmer._id,
      farmer
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        alreadyRegistered: true,
        message: 'This mobile number is already registered. Please login with OTP.'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/farmers/:id', async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id);
    if (!farmer) {
      return res.status(404).json({ message: 'Farmer not found' });
    }
    res.json(farmer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// Slots & Booking Routes (Farmer Facing)
// ==========================================

app.get('/api/slots', async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (req.query.centerCode) {
      filter.centerCode = req.query.centerCode.toUpperCase();
    }
    if (req.query.crop) {
      filter.crop = req.query.crop;
    }
    const slots = await Slot.find(filter).sort({ date: 1, time: 1 });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/bookings/create', async (req, res) => {
  try {
    const { farmerId, slotId } = req.body;
    const slot = await Slot.findById(slotId);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    if (slot.bookedCount >= slot.capacity) {
      return res.status(400).json({ success: false, message: 'This slot is fully booked. Please choose another time.' });
    }

    if (slot.bookings.includes(farmerId)) {
      return res.status(400).json({ success: false, message: 'You have already booked this slot.' });
    }

    const booking = new Booking({
      farmerId,
      slotId,
      centerCode: slot.centerCode,
      crop: slot.crop || 'Paddy (Common)',
      ratePerQuintal: MSP_RATES[slot.crop] || 2300,
      queuePosition: slot.bookedCount + 1,
      status: 'confirmed'
    });

    slot.bookedCount += 1;
    slot.bookings.push(farmerId);
    await slot.save();
    await booking.save();

    io.emit('queue-update', { slotId, centerCode: slot.centerCode, newCount: slot.bookedCount });

    res.json({
      success: true,
      bookingId: booking._id,
      queuePosition: booking.queuePosition,
      message: `Slot booked successfully! Your queue token is #${booking.queuePosition}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/bookings/farmer/:farmerId', async (req, res) => {
  try {
    const bookings = await Booking.find({ farmerId: req.params.farmerId })
      .populate('slotId')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/queue/:slotId', async (req, res) => {
  try {
    const bookings = await Booking.find({ slotId: req.params.slotId }).sort({ createdAt: 1 });
    const slot = await Slot.findById(req.params.slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    res.json({
      totalInQueue: bookings.length,
      capacity: slot.capacity,
      center: slot.center,
      centerCode: slot.centerCode,
      crop: slot.crop,
      date: slot.date,
      time: slot.time,
      queue: bookings.map((b, i) => ({
        position: i + 1,
        bookingId: b._id,
        farmerId: b.farmerId,
        status: b.status,
        quantityQuintals: b.quantityQuintals,
        totalAmount: b.totalAmount,
        createdAt: b.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/payments/booking/:bookingId', async (req, res) => {
  try {
    const payment = await Payment.findOne({ bookingId: req.params.bookingId });
    res.json(payment || { status: 'pending' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// Admin Portal & Procurement Center Management APIs
// ==========================================

app.get('/api/admin/centers', async (req, res) => {
  try {
    const centers = await ProcurementCenter.find().sort({ name: 1 });
    res.json(centers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/centers/create', async (req, res) => {
  try {
    const { centerCode, name, mandal, district, state, adminName, adminPhone, adminPin, acceptedCrops, totalCapacityTonnes, bankDetails } = req.body;

    if (!centerCode || !name || !district) {
      return res.status(400).json({ success: false, message: 'Center Code, Name, and District are required' });
    }

    const cleanCode = centerCode.trim().toUpperCase();
    const existing = await ProcurementCenter.findOne({ centerCode: cleanCode });
    if (existing) {
      return res.status(400).json({ success: false, message: `Center Code "${cleanCode}" is already in use.` });
    }

    const newCenter = new ProcurementCenter({
      centerCode: cleanCode,
      name: name.trim(),
      mandal: mandal ? mandal.trim() : 'Patancheru',
      district: district.trim(),
      state: state || 'Telangana',
      adminName: adminName || 'Mandi Incharge',
      adminPhone: adminPhone || '',
      adminPin: adminPin || '1234',
      bankDetails: bankDetails || {
        bankName: 'State Bank of India',
        accountNumber: '38920192831',
        ifscCode: 'SBIN0001234',
        branch: 'APMC Mandi Branch',
        accountHolderName: `${name} Operations A/C`
      },
      acceptedCrops: acceptedCrops && acceptedCrops.length ? acceptedCrops : ['Paddy (Common)', 'Wheat', 'Cotton', 'Maize'],
      totalCapacityTonnes: Number(totalCapacityTonnes) || 500,
      currentStorageTonnes: 0
    });

    await newCenter.save();
    res.json({ success: true, center: newCenter, message: `Procurement Center [${cleanCode}] created successfully in ${newCenter.mandal} Mandal!` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.put('/api/admin/centers/:code/crops', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const { acceptedCrops, totalCapacityTonnes, currentStorageTonnes } = req.body;

    const center = await ProcurementCenter.findOne({ centerCode: code });
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    if (acceptedCrops) center.acceptedCrops = acceptedCrops;
    if (totalCapacityTonnes !== undefined) center.totalCapacityTonnes = Number(totalCapacityTonnes);
    if (currentStorageTonnes !== undefined) center.currentStorageTonnes = Number(currentStorageTonnes);

    await center.save();
    res.json({ success: true, center, message: 'Center configuration and accepted crops updated!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/slots/create', async (req, res) => {
  try {
    const { centerCode, date, time, capacity, crop } = req.body;

    if (!centerCode || !date || !time) {
      return res.status(400).json({ success: false, message: 'Center code, date, and time are required' });
    }

    const code = centerCode.toUpperCase();
    const center = await ProcurementCenter.findOne({ centerCode: code });
    if (!center) {
      return res.status(404).json({ success: false, message: 'Procurement center not found' });
    }

    const newSlot = new Slot({
      centerCode: code,
      center: center.name,
      crop: crop || center.acceptedCrops[0] || 'Paddy (Common)',
      date,
      time,
      capacity: Number(capacity) || 30,
      bookedCount: 0,
      bookings: []
    });

    await newSlot.save();
    io.emit('slots-updated', { centerCode: code });

    res.json({ success: true, slot: newSlot, message: 'New procurement slot released successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/admin/slots/:id', async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    await Slot.findByIdAndDelete(req.params.id);
    io.emit('slots-updated', { centerCode: slot.centerCode });

    res.json({ success: true, message: 'Slot cancelled and removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/centers/:code/slots', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const slots = await Slot.find({ centerCode: code }).sort({ date: 1, time: 1 });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/centers/:code/farmers', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const slots = await Slot.find({ centerCode: code });
    const slotIds = slots.map(s => s._id);

    const bookings = await Booking.find({ slotId: { $in: slotIds } })
      .populate('slotId')
      .sort({ createdAt: -1 });

    const farmerIds = bookings.map(b => b.farmerId);
    const farmers = await Farmer.find({ _id: { $in: farmerIds } });
    const farmerMap = {};
    farmers.forEach(f => { farmerMap[f._id.toString()] = f; });

    const enriched = bookings.map(b => ({
      _id: b._id,
      bookingId: b._id,
      farmerId: b.farmerId,
      farmer: farmerMap[b.farmerId] || { name: 'Registered Farmer', phone: 'N/A' },
      slot: b.slotId,
      crop: b.crop || b.slotId?.crop || 'Paddy (Common)',
      quantityQuintals: b.quantityQuintals || 0,
      qualityGrade: b.qualityGrade || 'Grade A',
      ratePerQuintal: b.ratePerQuintal || MSP_RATES[b.crop] || 2300,
      totalAmount: b.totalAmount || 0,
      status: b.status,
      queuePosition: b.queuePosition,
      createdAt: b.createdAt
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/procurement/verify', async (req, res) => {
  try {
    const { bookingId, quantityQuintals, qualityGrade, crop } = req.body;

    const booking = await Booking.findById(bookingId).populate('slotId');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const weight = Number(quantityQuintals) || 10;
    const selectedCrop = crop || booking.crop || 'Paddy (Common)';
    const rate = MSP_RATES[selectedCrop] || 2300;
    const totalAmount = Math.round(weight * rate);

    booking.quantityQuintals = weight;
    booking.qualityGrade = qualityGrade || 'Grade A';
    booking.crop = selectedCrop;
    booking.ratePerQuintal = rate;
    booking.totalAmount = totalAmount;
    booking.status = 'verified';

    await booking.save();

    if (booking.centerCode) {
      await ProcurementCenter.findOneAndUpdate(
        { centerCode: booking.centerCode },
        { $inc: { currentStorageTonnes: Math.round(weight / 10) } }
      );
    }

    io.emit('farmer-verified', {
      bookingId: booking._id,
      farmerId: booking.farmerId,
      totalAmount,
      quantityQuintals: weight
    });

    res.json({
      success: true,
      booking,
      totalAmount,
      message: `Farmer grain verified: ${weight} quintals of ${selectedCrop} @ ₹${rate}/q = ₹${totalAmount.toLocaleString('en-IN')}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/admin/procurement/pay', async (req, res) => {
  try {
    const { bookingId, amount } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const payAmount = Number(amount) || booking.totalAmount || 23000;
    const txId = 'DBT-GOV-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const payment = new Payment({
      bookingId: booking._id,
      farmerId: booking.farmerId,
      centerCode: booking.centerCode,
      crop: booking.crop,
      quantityQuintals: booking.quantityQuintals || 10,
      amount: payAmount,
      transactionId: txId,
      status: 'completed'
    });

    booking.status = 'completed';
    await booking.save();
    await payment.save();

    // Update center disbursed amount
    if (booking.centerCode) {
      await ProcurementCenter.findOneAndUpdate(
        { centerCode: booking.centerCode },
        { $inc: { disbursedToFarmers: payAmount } }
      );
    }

    io.emit('payment-update', {
      bookingId: booking._id,
      farmerId: booking.farmerId,
      status: 'completed',
      transactionId: txId,
      amount: payAmount
    });

    res.json({
      success: true,
      payment,
      transactionId: txId,
      message: `DBT Payment of ₹${payAmount.toLocaleString('en-IN')} approved with TxID: ${txId}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/centers/:code/stats', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const center = await ProcurementCenter.findOne({ centerCode: code });
    if (!center) {
      return res.status(404).json({ success: false, message: 'Center not found' });
    }

    const slots = await Slot.find({ centerCode: code });
    const slotIds = slots.map(s => s._id);

    const bookings = await Booking.find({ slotId: { $in: slotIds } });
    const payments = await Payment.find({ centerCode: code, status: 'completed' });

    const cropStats = {};
    center.acceptedCrops.forEach(c => {
      cropStats[c] = { procuredQuintals: 0, farmersCount: 0, totalValue: 0, mspRate: MSP_RATES[c] || 2300 };
    });

    bookings.forEach(b => {
      const c = b.crop || 'Paddy (Common)';
      if (!cropStats[c]) {
        cropStats[c] = { procuredQuintals: 0, farmersCount: 0, totalValue: 0, mspRate: MSP_RATES[c] || 2300 };
      }
      if (b.status === 'verified' || b.status === 'completed') {
        cropStats[c].procuredQuintals += (b.quantityQuintals || 10);
        cropStats[c].totalValue += (b.totalAmount || (b.quantityQuintals || 10) * (MSP_RATES[c] || 2300));
        cropStats[c].farmersCount += 1;
      }
    });

    const totalQuintals = Object.values(cropStats).reduce((acc, curr) => acc + curr.procuredQuintals, 0);
    const totalDisbursed = payments.reduce((acc, curr) => acc + curr.amount, 0);
    const waitingFarmers = bookings.filter(b => b.status === 'confirmed').length;
    const completedFarmers = bookings.filter(b => b.status === 'completed').length;

    res.json({
      success: true,
      center,
      totalSlots: slots.length,
      totalQuintalsProcured: totalQuintals,
      totalTonnesProcured: Math.round(totalQuintals / 10),
      totalDisbursedINR: totalDisbursed,
      allocatedBudget: center.allocatedBudget || 2500000,
      remainingBudget: (center.allocatedBudget || 2500000) - totalDisbursed,
      waitingFarmers,
      completedFarmers,
      totalFarmersServed: completedFarmers,
      cropBreakdown: cropStats,
      mspRates: MSP_RATES
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected to WebSocket:', socket.id);
  socket.on('join-center', (centerCode) => {
    socket.join(`center-${centerCode}`);
  });
  socket.on('join-mandal', (mandal) => {
    socket.join(`mandal-${mandal}`);
  });
  socket.on('join-queue', (slotId) => {
    socket.join(`queue-${slotId}`);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Farmer Procurement, Mandi & Mandal Treasury Server running on port ${PORT}`);
});
